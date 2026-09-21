// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DefeatAiDistributor
 * @notice Skarbiec dystrybucji nagród $DEF z twardymi limitami dziennymi i podpisami EIP-712.
 */
interface IERC20 {
    function transfer(address to, uint256 value) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract DefeatAiDistributor {
    IERC20 public immutable defToken;
    address public owner;
    address public trustedSigner;
    bool public paused;

    uint256 public constant DAILY_WINDOW = 1 days;
    uint256 public playerDailyLimit = 500 * 10**18;        // 500 DEF na gracza / 24h
    uint256 public globalDailyLimit = 100_000 * 10**18;    // 100 000 DEF globalnie / 24h

    mapping(address => mapping(uint256 => uint256)) public playerClaimedInDay;
    mapping(uint256 => uint256) public globalClaimedInDay;
    mapping(address => mapping(uint256 => bool)) public usedNonces;

    bytes32 public immutable DOMAIN_SEPARATOR;
    bytes32 public constant CLAIM_TYPEHASH = keccak256("ClaimVoucher(address recipient,uint256 amount,uint256 nonce,uint256 expiry)");

    event Claimed(address indexed recipient, uint256 amount, uint256 nonce);
    event LimitsUpdated(uint256 newPlayerLimit, uint256 newGlobalLimit);
    event TrustedSignerUpdated(address indexed newSigner);
    event Paused(bool isPaused);
    event EmergencyWithdrawn(address indexed token, address indexed to, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }

    constructor(address _defToken, address _trustedSigner) {
        require(_defToken != address(0), "Invalid token");
        require(_trustedSigner != address(0), "Invalid signer");
        defToken = IERC20(_defToken);
        owner = msg.sender;
        trustedSigner = _trustedSigner;

        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("DefeatAiDistributor")),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );
    }

    /**
     * @notice Odbiór nagrody za pomocą vouchera EIP-712 wygenerowanego przez grę
     */
    function claim(
        address recipient,
        uint256 amount,
        uint256 nonce,
        uint256 expiry,
        bytes memory signature
    ) external whenNotPaused {
        require(block.timestamp <= expiry, "Voucher expired");
        require(!usedNonces[recipient][nonce], "Nonce already used");
        require(amount > 0, "Amount must be > 0");

        // 1. Weryfikacja podpisu EIP-712 z backendu gry
        bytes32 structHash = keccak256(abi.encode(CLAIM_TYPEHASH, recipient, amount, nonce, expiry));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));
        address signer = recoverSigner(digest, signature);
        require(signer == trustedSigner, "Invalid signature");

        // 2. Weryfikacja twardych limitów dziennych
        uint256 currentDay = block.timestamp / DAILY_WINDOW;
        require(playerClaimedInDay[recipient][currentDay] + amount <= playerDailyLimit, "Exceeds daily player limit (500 DEF)");
        require(globalClaimedInDay[currentDay] + amount <= globalDailyLimit, "Exceeds daily global limit (100k DEF)");

        // 3. Aktualizacja stanu przed transferem (ochrona przed reentrancy)
        usedNonces[recipient][nonce] = true;
        playerClaimedInDay[recipient][currentDay] += amount;
        globalClaimedInDay[currentDay] += amount;

        // 4. Wypłata tokenów ze skarbca
        require(defToken.transfer(recipient, amount), "Token transfer failed");

        emit Claimed(recipient, amount, nonce);
    }

    function recoverSigner(bytes32 digest, bytes memory sig) internal pure returns (address) {
        require(sig.length == 65, "Invalid signature length");
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
        if (v < 27) {
            v += 27;
        }
        require(v == 27 || v == 28, "Invalid signature v");
        return ecrecover(digest, v, r, s);
    }

    // --- FUNKCJE ADMINISTRACYJNE (Tylko Twój portfel) ---

    function pause() external onlyOwner {
        paused = true;
        emit Paused(true);
    }

    function unpause() external onlyOwner {
        paused = false;
        emit Paused(false);
    }

    function setLimits(uint256 newPlayerLimit, uint256 newGlobalLimit) external onlyOwner {
        playerDailyLimit = newPlayerLimit;
        globalDailyLimit = newGlobalLimit;
        emit LimitsUpdated(newPlayerLimit, newGlobalLimit);
    }

    function setTrustedSigner(address newSigner) external onlyOwner {
        require(newSigner != address(0), "Invalid signer");
        trustedSigner = newSigner;
        emit TrustedSignerUpdated(newSigner);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid new owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    /**
     * @notice Awaryjne wycofanie tokenów ze skarbca z powrotem na portfel Ownera
     */
    function emergencyWithdraw(address tokenAddress, uint256 amount) external onlyOwner {
        require(IERC20(tokenAddress).transfer(owner, amount), "Withdraw failed");
        emit EmergencyWithdrawn(tokenAddress, owner, amount);
    }
}
