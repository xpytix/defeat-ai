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

    let humanCooldownRemainingMs = 0;
    if (nullifierHash) {
      const lastStrike = await getHumanLastStrike(nullifierHash);
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
      type = 'free', 
      proofPayload,
      paymentPayload,
      hasSword, 
      hasBow 
    } = body || {};

    const raid = await getRaidState();
    let player = await getPlayerProfile(playerId);

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
        raid,
        player
      };
    }

    if (action === 'claim') {
      const { recipientAddress, amount } = body || {};
      const claimAmount = Math.floor(Number(amount));

      if (!recipientAddress || typeof recipientAddress !== 'string' || !recipientAddress.startsWith('0x') || recipientAddress.length !== 42) {
        setResponseStatus(event, 400);
        return { success: false, error: 'Valid World Chain wallet address required (0x...)' };
      }

      if (isNaN(claimAmount) || claimAmount <= 0) {
        setResponseStatus(event, 400);
        return { success: false, error: 'Invalid claim amount' };
      }

      if (claimAmount < 20) {
        setResponseStatus(event, 400);
        return { success: false, error: 'Minimum claim amount is 20 $DEF' };
      }

      if (player.tokens < claimAmount) {
        setResponseStatus(event, 400);
        return { 
          success: false, 
          error: `Insufficient $DEF balance. You have ${player.tokens} $DEF available.`,
          availableTokens: player.tokens
        };
      }

      player.tokens -= claimAmount;
      (player as any).claimedTokens = ((player as any).claimedTokens || 0) + claimAmount;
      player.address = recipientAddress;
      await savePlayerProfile(player);

      return {
        success: true,
        claimedAmount: claimAmount,
        remainingTokens: player.tokens,
        totalClaimed: (player as any).claimedTokens,
        recipientAddress,
        player,
        message: `🎉 Claimed ${claimAmount} $DEF to ${recipientAddress.slice(0, 6)}...${recipientAddress.slice(-4)}!`
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
