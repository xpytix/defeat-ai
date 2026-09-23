import { defineEventHandler, readBody, getQuery, setResponseStatus } from 'h3';
import { 
  getRaidState, 
  saveRaidState, 
  getPlayerProfile, 
  savePlayerProfile, 
  getHumanLastStrike, 
  recordHumanStrike, 
  resetGlobalCooldowns,
  markTransactionUsed,
  BOSS_METADATA 
} from '../utils/db';
import { verifyWorldIdStrikeProof, type WorldIdProofPayload } from '../utils/worldId';
import { distributeDefRewardOnChain, generateClaimVoucher, getOnChainClaimedToday } from '../utils/distributor';
import { verifyWorldAppPayment } from '../utils/payment';
import { sendWorldAppNotification } from '../utils/notifications';

const STAKING_APY = 0.30; // 30% APY
const MS_IN_YEAR = 365.25 * 24 * 3600 * 1000;

export function calculateAccruedStakeYield(player: any): number {
  if (!player.stakedAmount || player.stakedAmount <= 0 || !player.stakedAt) {
    return player.accumulatedStakeYield || 0;
  }
  const now = Date.now();
  const elapsedMs = Math.max(0, now - player.stakedAt);
  const newlyAccrued = (player.stakedAmount * STAKING_APY * elapsedMs) / MS_IN_YEAR;
  return (player.accumulatedStakeYield || 0) + newlyAccrued;
}

export function updatePlayerStakeYield(player: any) {
  const totalAccrued = calculateAccruedStakeYield(player);
  player.accumulatedStakeYield = totalAccrued;
  player.stakedAt = player.stakedAmount > 0 ? Date.now() : 0;
}

function getNextUtcMidnight(): number {
  const d = new Date();
  d.setUTCHours(24, 0, 0, 0);
  return d.getTime();
}

export default defineEventHandler(async (event) => {
  const method = event.node.req.method;

  // GET: Fetch Global Raid State & Player Profile
  if (method === 'GET') {
    const query = getQuery(event);
    const playerId = (query.playerId as string | undefined) || 'anon-player';
    const walletAddress = (query.walletAddress as string | undefined) || undefined;
    const nullifierHash = query.nullifierHash as string | undefined;
    const isView = query.isView === '1' || query.isView === 'true';

    const raid = await getRaidState();
    if (typeof raid.totalViews !== 'number') raid.totalViews = 0;

    if (isView) {
      raid.totalViews += 1;
      await saveRaidState(raid);
    }

    const player = await getPlayerProfile(playerId, nullifierHash, walletAddress);
    if (raid.cooldownResetAt && player.lastFreeHitTime && player.lastFreeHitTime < raid.cooldownResetAt) {
      player.lastFreeHitTime = 0;
      await savePlayerProfile(player);
    }

    const now = Date.now();
    const MAX_DAILY_CLAIM = 500;

    // Daily Claim Limit Cycle (Aligned with smart contract 24h window at 00:00 UTC)
    if (!player.dailyClaimResetAt || now >= player.dailyClaimResetAt) {
      player.dailyClaimedTokens = 0;
      player.dailyClaimResetAt = getNextUtcMidnight();
      await savePlayerProfile(player);
    }

    const targetAddr = walletAddress || player.address;
    let onChainClaimed = 0;
    if (targetAddr) {
      onChainClaimed = await getOnChainClaimedToday(targetAddr);
    }

    const dailyClaimedTokens = Math.max(player.dailyClaimedTokens || 0, onChainClaimed);
    const minTokensPerStrike = player.hasSword ? 80 : 40;
    const dailyClaimRemaining = Math.max(0, MAX_DAILY_CLAIM - dailyClaimedTokens);
    const dailyLimitReached = (dailyClaimedTokens >= MAX_DAILY_CLAIM || dailyClaimRemaining < minTokensPerStrike) && now < (player.dailyClaimResetAt || 0);
    const dailyClaimResetAt = player.dailyClaimResetAt || getNextUtcMidnight();

    const accruedYield = calculateAccruedStakeYield(player);

    const effectiveNullifier = nullifierHash || player.nullifierHash || (walletAddress && walletAddress.startsWith('0x') ? walletAddress : undefined) || (playerId && playerId.startsWith('0x') ? playerId : undefined);
    let humanCooldownRemainingMs = 0;
    if (effectiveNullifier) {
      const lastStrike = await getHumanLastStrike(effectiveNullifier);
      const cooldownHours = player.hasBow ? 12 : 24;
      const cooldownMs = cooldownHours * 60 * 60 * 1000;
      const elapsed = Date.now() - lastStrike;
      if (lastStrike > 0 && elapsed < cooldownMs) {
        humanCooldownRemainingMs = cooldownMs - elapsed;
      }
    }

    return {
      success: true,
      raid,
      player: {
        ...player,
        dailyClaimedTokens,
        dailyClaimResetAt,
        dailyLimitReached,
        dailyClaimRemaining,
        stakedAmount: player.stakedAmount || 0,
        stakedAt: player.stakedAt || 0,
        accumulatedStakeYield: accruedYield
      },
      dailyLimitReached,
      dailyClaimResetAt,
      dailyClaimedTokens,
      dailyClaimRemaining,
      humanCooldownRemainingMs,
      stakedAmount: player.stakedAmount || 0,
      stakedAt: player.stakedAt || 0,
      accumulatedStakeYield: accruedYield,
      bossMetadata: BOSS_METADATA
    };
  }

  // POST: Execute Game Action (Strike / Sync)
  if (method === 'POST') {
    const body = await readBody(event);
    const { 
      action, 
      playerId = 'anon-player', 
      playerName, 
      walletAddress,
      nullifierHash,
      type = 'free', 
      proofPayload,
      paymentPayload,
    } = body || {};

    const raid = await getRaidState();
    let player = await getPlayerProfile(playerId, nullifierHash, walletAddress);

    if (nullifierHash && !player.nullifierHash) player.nullifierHash = nullifierHash;
    if (walletAddress && typeof walletAddress === 'string' && walletAddress.startsWith('0x')) {
      player.address = walletAddress;
    }

    const targetAddress = walletAddress || (paymentPayload && paymentPayload.from) || player.address || (playerId.startsWith('0x') ? playerId : undefined);
    if (targetAddress && !player.address) {
      player.address = targetAddress;
    }

    if (action === 'buy_item') {
      const { item } = body || {};
      if (item !== 'sword' && item !== 'bow') {
        setResponseStatus(event, 400);
        return { success: false, error: 'Invalid item. Must be sword or bow.' };
      }

      if (item === 'sword' && player.hasSword) {
        return { success: true, player, message: 'Plasma Blade already equipped.' };
      }
      if (item === 'bow' && player.hasBow) {
        return { success: true, player, message: 'Tachyon Chrono-Bow already equipped.' };
      }

      // Verify 200 WLD payment strictly
      const paymentCheck = await verifyWorldAppPayment(paymentPayload, 200, item);
      if (!paymentCheck.valid) {
        setResponseStatus(event, 400);
        return { success: false, error: paymentCheck.error || 'Payment verification failed for 200 WLD.' };
      }

      await markTransactionUsed(paymentCheck.txId!, {
        action: 'buy_item',
        item,
        playerId: player.id,
        walletAddress: targetAddress
      });

      if (item === 'sword') player.hasSword = true;
      if (item === 'bow') player.hasBow = true;

      await savePlayerProfile(player);

      return {
        success: true,
        item,
        player,
        message: `🎉 Successfully equipped ${item === 'sword' ? 'Quantum Plasma Blade' : 'Tachyon Chrono-Bow'}!`
      };
    }

    if (action === 'strike') {
      const now = Date.now();
      const MAX_DAILY_CLAIM = 500;

      // Daily Claim Limit Cycle (Aligned with smart contract 24h window at 00:00 UTC)
      if (!player.dailyClaimResetAt || now >= player.dailyClaimResetAt) {
        player.dailyClaimedTokens = 0;
        player.dailyClaimResetAt = getNextUtcMidnight();
      }

      const targetAddr = targetAddress || player.address;
      let onChainClaimed = 0;
      if (targetAddr) {
        onChainClaimed = await getOnChainClaimedToday(targetAddr);
      }

      const dailyClaimedTokens = Math.max(player.dailyClaimedTokens || 0, onChainClaimed);
      const minTokensPerStrike = player.hasSword ? 80 : 40;
      const dailyClaimRemaining = Math.max(0, MAX_DAILY_CLAIM - dailyClaimedTokens);
      const dailyLimitReached = (dailyClaimedTokens >= MAX_DAILY_CLAIM || dailyClaimRemaining < minTokensPerStrike) && now < (player.dailyClaimResetAt || 0);
      const dailyClaimResetAt = player.dailyClaimResetAt || getNextUtcMidnight();

      // Block Power Strike if daily token claim limit is reached
      if (type === 'power' && dailyLimitReached) {
        setResponseStatus(event, 400);
        const remainingMs = Math.max(0, dailyClaimResetAt - now);
        const h = Math.floor(remainingMs / (1000 * 60 * 60));
        const m = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((remainingMs % (1000 * 60)) / 1000);
        const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        return {
          success: false,
          error: `Daily claim limit reached (500/500 $DEF). Power Strike unlocks in ${timeStr}.`,
          dailyLimitReached: true,
          dailyClaimResetAt,
          dailyClaimedTokens,
          dailyClaimRemaining
        };
      }

      let damage = 1;
      let tokensEarned = 20;
      let weapon = 'Base Strike';
      const cooldownHours = player.hasBow ? 12 : 24;
      const cooldownMs = cooldownHours * 60 * 60 * 1000;

      let verifiedNullifierHash: string | undefined;

      if (type === 'free') {
        // === WORLD ID & HUMAN IDENTITY VERIFICATION ===
        if (proofPayload && !proofPayload.is_test_mock) {
          const verifyResult = await verifyWorldIdStrikeProof(proofPayload as WorldIdProofPayload, playerId);
          if (verifyResult.valid) {
            verifiedNullifierHash = verifyResult.nullifierHash;
            player.nullifierHash = verifiedNullifierHash;
          } else {
            setResponseStatus(event, 401);
            return {
              success: false,
              error: verifyResult.error || 'Invalid World ID verification proof.',
              details: verifyResult.details
            };
          }
        } else if (player.nullifierHash) {
          verifiedNullifierHash = player.nullifierHash;
        } else if (targetAddress && targetAddress.startsWith('0x') && targetAddress.length === 42) {
          verifiedNullifierHash = player.nullifierHash;
        } else if (process.env.NODE_ENV !== 'production' && proofPayload?.is_test_mock) {
          verifiedNullifierHash = `dev_human_${playerId}`;
        } else {
          setResponseStatus(event, 401);
          return {
            success: false,
            error: 'World ID verification or authenticated World Chain wallet required to execute daily strike.',
            requiresWorldId: true
          };
        }

        // === STRICT SERVER COOLDOWN BY NULLIFIER HASH / WALLET ===
        const trackingKey = verifiedNullifierHash || player.nullifierHash || targetAddress || player.id;
        const lastStrike = await getHumanLastStrike(trackingKey);
        if (lastStrike > 0 && (now - lastStrike < cooldownMs)) {
          const nextTime = lastStrike + cooldownMs;
          setResponseStatus(event, 429);
          return {
            success: false,
            error: `Cooldown active. Next strike available in ${Math.ceil((nextTime - now) / (1000 * 60))} minutes.`,
            nextFreeHitTime: nextTime,
            raid,
            player
          };
        }

        // Record human strike cooldown in Netlify Blobs / storage
        await recordHumanStrike(trackingKey, now);
        if (verifiedNullifierHash && !player.nullifierHash) {
          player.nullifierHash = verifiedNullifierHash;
        }
        if (targetAddress && !player.address) {
          player.address = targetAddress;
        }

        player.lastFreeHitTime = now;
        damage = player.hasSword ? 2 : 1;
        tokensEarned = player.hasSword ? 40 : 20;
        weapon = player.hasSword ? 'Plasma Blade (2x)' : 'Verified Human Strike';
      } else {
        // === POWER STRIKE (2 WLD) - STRICT VERIFICATION & REPLAY PROTECTION ===
        const paymentCheck = await verifyWorldAppPayment(paymentPayload, 2, 'power_strike');
        if (!paymentCheck.valid) {
          setResponseStatus(event, 400);
          return {
            success: false,
            error: paymentCheck.error || 'Payment verification failed for 2 WLD Power Strike.'
          };
        }

        // Mark transaction as redeemed immediately (Replay Attack Protection)
        await markTransactionUsed(paymentCheck.txId!, {
          action: 'power_strike',
          playerId: player.id,
          walletAddress: targetAddress
        });

        damage = player.hasSword ? 4 : 2;
        tokensEarned = player.hasSword ? 80 : 40;
        weapon = player.hasSword ? 'Plasma Power Strike (4x)' : 'Power Strike (2 WLD)';
      }

      // Cyber Staking Perk (+1 DMG if staked >= 2000 $DEF)
      const isStaker = Boolean(player.stakedAmount && player.stakedAmount >= 2000);
      if (isStaker) {
        damage += 1;
        weapon += ' [+1 Staker DMG]';
      }

      // Deduct Boss HP globally
      raid.currentHp = Math.max(0, raid.currentHp - damage);
      raid.totalStrikes += 1;

      // 1. Notification: Boss down to 50% HP Alert (triggers once per boss level)
      if (raid.currentHp > 0 && raid.currentHp <= Math.floor(raid.maxHp * 0.5) && raid.notified50PercentLevel !== raid.currentLevel) {
        raid.notified50PercentLevel = raid.currentLevel;
        sendWorldAppNotification('boss_50_pct', undefined, { 
          bossName: raid.bossName,
          currentHp: raid.currentHp,
          maxHp: raid.maxHp
        }).catch((err) => {
          console.warn('[Notification] Failed to send 50% HP alert:', err);
        });
      }

      // Boss Defeated progression
      let bossDefeated = false;
      if (raid.currentHp <= 0) {
        bossDefeated = true;
        if (!raid.defeatedBosses.includes(raid.currentLevel)) {
          raid.defeatedBosses.push(raid.currentLevel);
        }

        if (raid.currentLevel < 8) {
          raid.currentLevel += 1;
          const nextBoss = BOSS_METADATA[raid.currentLevel - 1];
          raid.maxHp = nextBoss.maxHp;
          raid.currentHp = nextBoss.maxHp;
          raid.bossName = nextBoss.name;
          raid.notified50PercentLevel = undefined; // Reset 50% flag for the newly spawned boss

          // 2. Notification: New Boss Spawned!
          sendWorldAppNotification('new_boss', undefined, { 
            bossName: nextBoss.name 
          }).catch((err) => {
            console.warn('[Notification] Failed to send new boss notification:', err);
          });
        }
      }

      // Format display name for public raid feed
      let displayName = playerName;
      if (!displayName) {
        if (verifiedNullifierHash) {
          displayName = `Human #${verifiedNullifierHash.slice(2, 6)}`;
        } else if (playerId.startsWith('0x')) {
          displayName = `${playerId.slice(0, 6)}...${playerId.slice(-4)}`;
        } else {
          displayName = 'Verified Human';
        }
      }

      // Add to Recent Strikes Feed
      raid.recentStrikes.unshift({
        id: `strike-${now}-${Math.random().toString(36).substring(2, 6)}`,
        playerId,
        playerName: displayName,
        nullifierHash: verifiedNullifierHash,
        type,
        damage,
        tokensEarned,
        weapon,
        timestamp: now
      });
      if (raid.recentStrikes.length > 20) {
        raid.recentStrikes.pop();
      }

      // Update Contributor Stats
      const contributorKey = verifiedNullifierHash ? `human_${verifiedNullifierHash.slice(0, 10)}` : displayName;
      const currentStats = raid.contributors[contributorKey] || {
        address: displayName,
        hits: 0,
        damage: 0,
        rewardEarned: 0,
        lastHit: now
      };
      currentStats.hits += 1;
      currentStats.damage += damage;
      currentStats.rewardEarned += tokensEarned;
      currentStats.lastHit = now;
      raid.contributors[contributorKey] = currentStats;

      // Update Player Profile
      player.tokens += tokensEarned;
      player.totalDamageDealt += damage;
      player.totalStrikes += 1;

      // Always increment player's daily claimed tokens for this strike
      player.dailyClaimedTokens = (dailyClaimedTokens || 0) + tokensEarned;
      const finalDailyClaimed = player.dailyClaimedTokens;
      const finalDailyRemaining = Math.max(0, MAX_DAILY_CLAIM - finalDailyClaimed);
      const finalLimitReached = (finalDailyClaimed >= MAX_DAILY_CLAIM || finalDailyRemaining < minTokensPerStrike);

      // Target recipient wallet address
      let voucher: any = null;
      let onChainPayout: any = null;
      
      if (targetAddress && targetAddress.startsWith('0x') && targetAddress.length === 42) {
        player.address = targetAddress;

        // 1. Attempt direct on-chain payout (Transfers real $DEF immediately to wallet!)
        const payout = await distributeDefRewardOnChain(targetAddress, tokensEarned);
        if (payout.success) {
          onChainPayout = payout;
          (player as any).claimedTokens = ((player as any).claimedTokens || 0) + tokensEarned;
          console.log(`[Strike Payout] Direct transfer of ${tokensEarned} $DEF to ${targetAddress} confirmed: ${payout.txHash}`);
        } else {
          console.warn(`[Strike Payout] Direct payout not executed (${payout.error}), falling back to EIP-712 voucher.`);
          // 2. Fallback: generate cryptographic voucher for claim
          const vResult = await generateClaimVoucher(targetAddress, tokensEarned);
          if (vResult.success) {
            voucher = vResult.voucher;
          }
        }
      }

      // Persist global raid state and player profile
      await Promise.all([
        saveRaidState(raid),
        savePlayerProfile(player)
      ]);

      return {
        success: true,
        damage,
        tokensEarned,
        bossDefeated,
        nullifierHash: verifiedNullifierHash,
        nextFreeHitTime: type === 'free' ? now + cooldownMs : undefined,
        voucher,
        onChainPayout,
        raid,
        player: {
          ...player,
          dailyClaimedTokens: finalDailyClaimed,
          dailyClaimResetAt,
          dailyLimitReached: finalLimitReached,
          dailyClaimRemaining: finalDailyRemaining
        },
        dailyLimitReached: finalLimitReached,
        dailyClaimResetAt,
        dailyClaimedTokens: finalDailyClaimed,
        dailyClaimRemaining: finalDailyRemaining
      };
    }

    if (action === 'claim') {
      const now = Date.now();
      const MAX_DAILY_CLAIM = 500;

      // Daily Claim Limit Cycle (Aligned with smart contract 24h window at 00:00 UTC)
      if (!player.dailyClaimResetAt || now >= player.dailyClaimResetAt) {
        player.dailyClaimedTokens = 0;
        player.dailyClaimResetAt = getNextUtcMidnight();
      }

      const { recipientAddress, amount } = body || {};
      const targetAddr = recipientAddress || targetAddress || player.address;
      let onChainClaimed = 0;
      if (targetAddr) {
        onChainClaimed = await getOnChainClaimedToday(targetAddr);
      }

      const dailyClaimedTokens = Math.max(player.dailyClaimedTokens || 0, onChainClaimed);
      const dailyClaimRemaining = Math.max(0, MAX_DAILY_CLAIM - dailyClaimedTokens);
      const dailyClaimResetAt = player.dailyClaimResetAt || getNextUtcMidnight();
      const requestedAmount = Math.floor(Number(amount));

      if (!recipientAddress || typeof recipientAddress !== 'string' || !recipientAddress.startsWith('0x') || recipientAddress.length !== 42) {
        setResponseStatus(event, 400);
        return { success: false, error: 'Valid World Chain wallet address required (0x...)' };
      }

      if (isNaN(requestedAmount) || requestedAmount <= 0) {
        setResponseStatus(event, 400);
        return { success: false, error: 'Invalid claim amount' };
      }

      if (dailyClaimRemaining <= 0) {
        setResponseStatus(event, 400);
        const remainingMs = Math.max(0, dailyClaimResetAt - now);
        const h = Math.floor(remainingMs / (1000 * 60 * 60));
        const m = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((remainingMs % (1000 * 60)) / 1000);
        const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        return {
          success: false,
          error: `Daily claim limit of 500 $DEF reached for today. Power Strike and claims unlock in ${timeStr}.`,
          dailyLimitReached: true,
          dailyClaimResetAt,
          dailyClaimedTokens,
          dailyClaimRemaining: 0
        };
      }

      if (player.tokens < 20) {
        setResponseStatus(event, 400);
        return { 
          success: false, 
          error: `Minimum claim amount is 20 $DEF. You have ${player.tokens} $DEF available.`,
          availableTokens: player.tokens
        };
      }

      // Maximum claimable within remaining daily quota
      const claimAmount = Math.min(Math.min(requestedAmount, player.tokens), dailyClaimRemaining);

      if (claimAmount < 20) {
        setResponseStatus(event, 400);
        return { success: false, error: 'Minimum claim amount is 20 $DEF' };
      }

      // 1. Attempt direct on-chain transfer from DefeatAiDistributor
      const payout = await distributeDefRewardOnChain(recipientAddress, claimAmount);
      if (payout.success) {
        player.tokens = Math.max(0, player.tokens - claimAmount);
        player.dailyClaimedTokens = (player.dailyClaimedTokens || 0) + claimAmount;
        (player as any).claimedTokens = ((player as any).claimedTokens || 0) + claimAmount;
        player.address = recipientAddress;
        await savePlayerProfile(player);

        return {
          success: true,
          directTransfer: true,
          txHash: payout.txHash,
          worldscanUrl: payout.worldscanUrl,
          claimedAmount: claimAmount,
          remainingTokens: player.tokens,
          totalClaimed: (player as any).claimedTokens,
          recipientAddress,
          player: {
            ...player,
            dailyClaimedTokens: player.dailyClaimedTokens,
            dailyClaimResetAt: player.dailyClaimResetAt,
            dailyLimitReached: player.dailyClaimedTokens >= MAX_DAILY_CLAIM,
            dailyClaimRemaining: Math.max(0, MAX_DAILY_CLAIM - player.dailyClaimedTokens)
          },
          dailyLimitReached: player.dailyClaimedTokens >= MAX_DAILY_CLAIM,
          dailyClaimResetAt: player.dailyClaimResetAt,
          dailyClaimedTokens: player.dailyClaimedTokens,
          dailyClaimRemaining: Math.max(0, MAX_DAILY_CLAIM - player.dailyClaimedTokens),
          message: `🎉 Transferred ${claimAmount} $DEF on-chain to ${recipientAddress.slice(0, 6)}...${recipientAddress.slice(-4)}!`
        };
      }

      // 2. Fallback: Generate EIP-712 claim voucher for player to claim via World App
      (player as any).claimNonce = ((player as any).claimNonce || 0) + 1;
      const vResult = await generateClaimVoucher(recipientAddress, claimAmount, (player as any).claimNonce);
      if (!vResult.success || !vResult.voucher) {
        setResponseStatus(event, 500);
        return {
          success: false,
          error: `Failed to process claim: ${payout.error || vResult.error}`
        };
      }

      player.tokens = Math.max(0, player.tokens - claimAmount);
      player.dailyClaimedTokens = (player.dailyClaimedTokens || 0) + claimAmount;
      (player as any).claimedTokens = ((player as any).claimedTokens || 0) + claimAmount;
      player.address = recipientAddress;
      await savePlayerProfile(player);

      return {
        success: true,
        voucher: vResult.voucher,
        claimedAmount: claimAmount,
        remainingTokens: player.tokens,
        totalClaimed: (player as any).claimedTokens,
        recipientAddress,
        player: {
          ...player,
          dailyClaimedTokens: player.dailyClaimedTokens,
          dailyClaimResetAt: player.dailyClaimResetAt,
          dailyLimitReached: player.dailyClaimedTokens >= MAX_DAILY_CLAIM,
          dailyClaimRemaining: Math.max(0, MAX_DAILY_CLAIM - player.dailyClaimedTokens)
        },
        dailyLimitReached: player.dailyClaimedTokens >= MAX_DAILY_CLAIM,
        dailyClaimResetAt: player.dailyClaimResetAt,
        dailyClaimedTokens: player.dailyClaimedTokens,
        dailyClaimRemaining: Math.max(0, MAX_DAILY_CLAIM - player.dailyClaimedTokens),
        message: `🎉 Generated on-chain claim voucher for ${claimAmount} $DEF (Daily Limit: 500 $DEF)!`
      };
    }

    // === ACTION: STAKE $DEF (30% APY VAULT) ===
    if (action === 'stake') {
      const stakeAmount = Math.floor(Number(body?.amount));
      if (isNaN(stakeAmount) || stakeAmount <= 0) {
        setResponseStatus(event, 400);
        return { success: false, error: 'Invalid stake amount' };
      }

      const currentStaked = player.stakedAmount || 0;
      const newTotalStaked = currentStaked + stakeAmount;

      if (newTotalStaked < 2000) {
        setResponseStatus(event, 400);
        return { success: false, error: 'Minimum total stake is 2,000 $DEF' };
      }

      if (newTotalStaked > 10000) {
        setResponseStatus(event, 400);
        return { 
          success: false, 
          error: `Maximum stake limit is 10,000 $DEF (you currently have ${currentStaked.toLocaleString()} $DEF staked)` 
        };
      }

      if (player.tokens < stakeAmount) {
        setResponseStatus(event, 400);
        return { 
          success: false, 
          error: `Insufficient $DEF balance. You have ${player.tokens.toLocaleString()} $DEF available.` 
        };
      }

      // 1. Accrue pending yield before updating stake
      updatePlayerStakeYield(player);

      // 2. Transfer tokens to vault
      player.tokens = Math.max(0, player.tokens - stakeAmount);
      player.stakedAmount = newTotalStaked;
      player.stakedAt = Date.now();

      await savePlayerProfile(player);

      const liveYield = calculateAccruedStakeYield(player);

      return {
        success: true,
        stakedAmount: player.stakedAmount,
        stakedAt: player.stakedAt,
        accumulatedStakeYield: liveYield,
        remainingTokens: player.tokens,
        player: {
          ...player,
          accumulatedStakeYield: liveYield
        },
        message: `🛡️ Successfully staked ${stakeAmount.toLocaleString()} $DEF into 30% APY Vault!`
      };
    }

    // === ACTION: UNSTAKE $DEF ===
    if (action === 'unstake') {
      const currentStaked = player.stakedAmount || 0;
      if (currentStaked <= 0) {
        setResponseStatus(event, 400);
        return { success: false, error: 'No $DEF currently staked in vault' };
      }

      const requested = body?.amount ? Math.floor(Number(body.amount)) : currentStaked;
      const unstakeAmount = Math.min(requested, currentStaked);

      if (unstakeAmount <= 0) {
        setResponseStatus(event, 400);
        return { success: false, error: 'Invalid unstake amount' };
      }

      const remainingStaked = currentStaked - unstakeAmount;
      if (remainingStaked > 0 && remainingStaked < 2000) {
        setResponseStatus(event, 400);
        return { 
          success: false, 
          error: 'Remaining stake cannot be less than 2,000 $DEF. Either unstake all or leave at least 2,000 $DEF.' 
        };
      }

      // 1. Accrue pending yield before withdrawing
      updatePlayerStakeYield(player);

      // 2. Return staked tokens to player balance
      player.stakedAmount = remainingStaked;
      player.tokens += unstakeAmount;
      if (remainingStaked === 0) {
        player.stakedAt = 0;
      } else {
        player.stakedAt = Date.now();
      }

      await savePlayerProfile(player);

      const liveYield = calculateAccruedStakeYield(player);

      return {
        success: true,
        unstakedAmount: unstakeAmount,
        stakedAmount: player.stakedAmount,
        stakedAt: player.stakedAt,
        accumulatedStakeYield: liveYield,
        remainingTokens: player.tokens,
        player: {
          ...player,
          accumulatedStakeYield: liveYield
        },
        message: `🔓 Successfully unstaked ${unstakeAmount.toLocaleString()} $DEF from Vault!`
      };
    }

    // === ACTION: CLAIM STAKING YIELD ===
    if (action === 'claim_stake_yield') {
      updatePlayerStakeYield(player);
      const claimable = Math.floor(player.accumulatedStakeYield || 0);

      if (claimable < 1) {
        setResponseStatus(event, 400);
        return { success: false, error: 'Minimum claimable staking yield is 1 $DEF' };
      }

      player.accumulatedStakeYield = Math.max(0, (player.accumulatedStakeYield || 0) - claimable);
      player.tokens += claimable;

      await savePlayerProfile(player);

      const liveYield = calculateAccruedStakeYield(player);

      return {
        success: true,
        claimedYield: claimable,
        stakedAmount: player.stakedAmount || 0,
        stakedAt: player.stakedAt || 0,
        accumulatedStakeYield: liveYield,
        remainingTokens: player.tokens,
        player: {
          ...player,
          accumulatedStakeYield: liveYield
        },
        message: `🎉 Claimed +${claimable.toLocaleString()} $DEF staking rewards!`
      };
    }

    if (action === 'sync') {
      await savePlayerProfile(player);
      return {
        success: true,
        raid,
        player
      };
    }

    return { success: true, raid, player };
  }

  return { success: false, error: 'Method not allowed' };
});
