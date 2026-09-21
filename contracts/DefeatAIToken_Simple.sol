// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Defeat AI Token ($DEF) - Simple 1-Wallet Mint
 * @notice Mints 100% (100,000,000 DEF) directly to creator wallet upon deployment.
 * Creator can then manually send:
 * - 30% kept in creator wallet
 * - 20% to Uniswap liquidity
 * - 40% to game reward treasury
 * - 10% to secondary reserve wallet
 */
contract DefeatAITokenSimple is ERC20, Ownable {
    uint256 public constant TOTAL_SUPPLY = 100_000_000 * 10**18;

    constructor(address creatorWallet) 
        ERC20("Defeat AI", "DEF") 
        Ownable(creatorWallet) 
    {
        require(creatorWallet != address(0), "Invalid address");
        _mint(creatorWallet, TOTAL_SUPPLY);
    }
}
