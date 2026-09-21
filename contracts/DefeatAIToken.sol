// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Defeat AI Token ($DEF)
 * @notice Official game utility token on World Chain (Chain ID: 480).
 * 
 * Tokenomics Distribution (Total: 100,000,000 DEF):
 * - 30% (30,000,000 DEF) -> Creator / Founder Private Wallet
 * - 20% (20,000,000 DEF) -> Liquidity Pool (Uniswap DEF/WLD)
 * - 40% (40,000,000 DEF) -> Community Raid Rewards (In-Game Claims)
 * - 10% (10,000,000 DEF) -> Reserve / Secondary Wallet
 */
contract DefeatAIToken is ERC20, Ownable {
    uint256 public constant TOTAL_SUPPLY = 100_000_000 * 10**18;

    constructor(
        address creatorWallet,
        address liquidityWallet,
        address communityVault,
        address reserveWallet
    ) ERC20("Defeat AI", "DEF") Ownable(creatorWallet) {
        require(creatorWallet != address(0), "Invalid creator address");
        require(liquidityWallet != address(0), "Invalid liquidity address");
        require(communityVault != address(0), "Invalid community vault address");
        require(reserveWallet != address(0), "Invalid reserve address");

        // 30% (30M DEF) - Private creator wallet
        _mint(creatorWallet, 30_000_000 * 10**18);

        // 20% (20M DEF) - For DEX liquidity pool
        _mint(liquidityWallet, 20_000_000 * 10**18);

        // 40% (40M DEF) - Community rewards for daily strikes & boss claims
        _mint(communityVault, 40_000_000 * 10**18);

        // 10% (10M DEF) - Secondary reserve wallet
        _mint(reserveWallet, 10_000_000 * 10**18);
    }
}
