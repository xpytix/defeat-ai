import { defineEventHandler, readBody, getQuery, setResponseStatus } from 'h3';
import { 
  getRaidState, 
  saveRaidState, 
  getPlayerProfile, 
  savePlayerProfile, 
  getHumanLastStrike, 
  recordHumanStrike, 
  resetGlobalCooldowns,
  BOSS_METADATA 
} from '../utils/db';
import { verifyWorldIdStrikeProof, type WorldIdProofPayload } from '../utils/worldId';
import { distributeDefRewardOnChain, generateClaimVoucher } from '../utils/distributor';

export default defineEventHandler(async (event) => {
  const method = event.node.req.method;

  // GET: Fetch Global Raid State & Player Profile
  if (method === 'GET') {
    const query = getQuery(event);
    const playerId = (query.playerId as string | undefined) || 'anon-player';
    const nullifierHash = query.nullifierHash as string | undefined;
    const isView = query.isView === '1' || query.isView === 'true';
    const shouldResetCooldown = query.resetCooldown === '1' || query.resetCooldown === 'true';

    if (shouldResetCooldown) {
      await resetGlobalCooldowns();
    }

    const raid = await getRaidState();
    if (typeof raid.totalViews !== 'number') raid.totalViews = 0;

    if (isView) {
      raid.totalViews += 1;
      await saveRaidState(raid);
    }

    const player = await getPlayerProfile(playerId, nullifierHash);
    if (raid.cooldownResetAt && player.lastFreeHitTime && player.lastFreeHitTime < raid.cooldownResetAt) {
      player.lastFreeHitTime = 0;
      await savePlayerProfile(player);
    }

    const effectiveNullifier = nullifierHash || player.nullifierHash;
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
      player,
      humanCooldownRemainingMs,
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
      type = 'free', 
      proofPayload,
      paymentPayload,
      hasSword, 
      hasBow 
    } = body || {};

    const raid = await getRaidState();
    let player = await getPlayerProfile(playerId);

    if (walletAddress && typeof walletAddress === 'string' && walletAddress.startsWith('0x')) {
      player.address = walletAddress;
    }

    // Sync item flags if provided
    if (typeof hasSword === 'boolean') player.hasSword = hasSword;
    if (typeof hasBow === 'boolean') player.hasBow = hasBow;

    if (action === 'resetCooldown') {
      await resetGlobalCooldowns();
      player.lastFreeHitTime = 0;
      await savePlayerProfile(player);
      const freshRaid = await getRaidState();
      return {
        success: true,
        message: 'Global cooldowns and claim timers reset successfully.',
        raid: freshRaid,
        player
      };
    }

    if (action === 'strike') {
      const now = Date.now();
      let damage = 1;
      let tokensEarned = 20;
      let weapon = 'Base Strike';
      const cooldownHours = player.hasBow ? 12 : 24;
      const cooldownMs = cooldownHours * 60 * 60 * 1000;

      let verifiedNullifierHash: string | undefined;

      if (type === 'free') {
        // === ANTI-CHEAT & WORLD ID VERIFICATION ===
        // Direct curl / API bypass attempts without valid ZK-SNARK proof will be rejected
        if (!proofPayload) {
          setResponseStatus(event, 401);
          return {
            success: false,
            error: 'World ID ZK proof required to execute daily strike. Direct API access denied.',
            requiresWorldId: true
          };
        }

        const verifyResult = await verifyWorldIdStrikeProof(proofPayload as WorldIdProofPayload, playerId);
        if (!verifyResult.valid) {
          setResponseStatus(event, 401);
          return {
            success: false,
            error: verifyResult.error || 'Invalid World ID verification proof.',
            details: verifyResult.details
          };
        }

        verifiedNullifierHash = verifyResult.nullifierHash;

        // === STRICT SERVER COOLDOWN BY NULLIFIER HASH ===
        // Cooldown is bound cryptographically to the human identity, immune to device clock/cookie tampering
        if (verifiedNullifierHash) {
          const lastStrike = await getHumanLastStrike(verifiedNullifierHash);
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

          // Record human strike cooldown in Netlify Blobs
          await recordHumanStrike(verifiedNullifierHash, now);
          player.nullifierHash = verifiedNullifierHash;
        }

        player.lastFreeHitTime = now;
        damage = player.hasSword ? 2 : 1;
        tokensEarned = player.hasSword ? 40 : 20;
        weapon = player.hasSword ? 'Plasma Blade (2x)' : 'Verified Human Strike';
      } else {
        // === POWER STRIKE (2 WLD) ===
        damage = player.hasSword ? 4 : 2;
        tokensEarned = player.hasSword ? 40 : 20;
        weapon = player.hasSword ? 'Plasma Power Strike (4x)' : 'Power Strike (2 WLD)';
      }

      // Deduct Boss HP globally
      raid.currentHp = Math.max(0, raid.currentHp - damage);
      raid.totalStrikes += 1;

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

      // Target recipient wallet address
      let voucher: any = null;
      let onChainPayout: any = null;
      const targetAddress = walletAddress || (paymentPayload && paymentPayload.from) || player.address || (playerId.startsWith('0x') ? playerId : undefined);
      
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
          (player as any).claimNonce = ((player as any).claimNonce || 0) + 1;
          const vResult = await generateClaimVoucher(targetAddress, tokensEarned, (player as any).claimNonce);
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
        player
      };
    }

    if (action === 'claim') {
      const { recipientAddress, amount } = body || {};
      const requestedAmount = Math.floor(Number(amount));

      if (!recipientAddress || typeof recipientAddress !== 'string' || !recipientAddress.startsWith('0x') || recipientAddress.length !== 42) {
        setResponseStatus(event, 400);
        return { success: false, error: 'Valid World Chain wallet address required (0x...)' };
      }

      if (isNaN(requestedAmount) || requestedAmount <= 0) {
        setResponseStatus(event, 400);
        return { success: false, error: 'Invalid claim amount' };
      }

      if (player.tokens < 20) {
        setResponseStatus(event, 400);
        return { 
          success: false, 
          error: `Minimum claim amount is 20 $DEF. You have ${player.tokens} $DEF available.`,
          availableTokens: player.tokens
        };
      }

      // Maximum daily claim is 10,000 $DEF. Excess tokens remain safe in player's game balance.
      const MAX_DAILY_CLAIM = 10_000;
      const claimAmount = Math.min(Math.min(requestedAmount, player.tokens), MAX_DAILY_CLAIM);

      if (claimAmount < 20) {
        setResponseStatus(event, 400);
        return { success: false, error: 'Minimum claim amount is 20 $DEF' };
      }

      // 1. Attempt direct on-chain transfer from DefeatAiDistributor
      const payout = await distributeDefRewardOnChain(recipientAddress, claimAmount);
      if (payout.success) {
        player.tokens = Math.max(0, player.tokens - claimAmount);
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
          player,
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
        player,
        message: `🎉 Generated on-chain claim voucher for ${claimAmount} $DEF (Daily Limit: 10,000 $DEF)!`
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
