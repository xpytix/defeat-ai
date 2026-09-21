import { defineEventHandler, readBody, getQuery } from 'h3';
import { getRaidState, saveRaidState, getPlayerProfile, savePlayerProfile, BOSS_METADATA } from '../utils/db';

export default defineEventHandler(async (event) => {
  const method = event.node.req.method;

  // GET: Fetch Global Raid State
  if (method === 'GET') {
    const query = getQuery(event);
    const playerId = query.playerId as string | undefined;

    const raid = await getRaidState();
    let player = null;

    if (playerId) {
      player = await getPlayerProfile(playerId);
    }

    return {
      success: true,
      raid,
      player,
      bossMetadata: BOSS_METADATA
    };
  }

  // POST: Execute Action (Strike / Sync)
  if (method === 'POST') {
    const body = await readBody(event);
    const { action, playerId = 'anon-player', playerName, type = 'free', hasSword, hasBow } = body || {};

    const raid = await getRaidState();
    const player = await getPlayerProfile(playerId);

    // Sync item flags if provided
    if (typeof hasSword === 'boolean') player.hasSword = hasSword;
    if (typeof hasBow === 'boolean') player.hasBow = hasBow;

    if (action === 'strike') {
      const now = Date.now();
      let damage = 1;
      let tokensEarned = 20;
      let weapon = 'Base Strike';
      let cooldownMs = (player.hasBow ? 12 : 24) * 60 * 60 * 1000;

      if (type === 'free') {
        // Check server cooldown
        if (player.lastFreeHitTime && (now - player.lastFreeHitTime < cooldownMs)) {
          return {
            success: false,
            error: 'Cooldown active',
            nextFreeHitTime: player.lastFreeHitTime + cooldownMs,
            raid,
            player
          };
        }

        player.lastFreeHitTime = now;
        damage = player.hasSword ? 2 : 1;
        tokensEarned = player.hasSword ? 40 : 20;
        weapon = player.hasSword ? 'Plasma Blade (2x)' : 'Daily Strike';
      } else {
        // Power Strike
        damage = 1;
        tokensEarned = 20;
        weapon = 'Power Strike';
      }

      // Deduct Boss HP
      raid.currentHp = Math.max(0, raid.currentHp - damage);
      raid.totalStrikes += 1;

      // Boss Defeated logic
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

      // Add to Recent Strikes Feed
      const displayName = playerName || (playerId.startsWith('0x') ? `${playerId.slice(0, 6)}...${playerId.slice(-4)}` : 'Resistance Human');
      raid.recentStrikes.unshift({
        id: `strike-${now}-${Math.random().toString(36).substring(2, 6)}`,
        playerId,
        playerName: displayName,
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
      const currentStats = raid.contributors[displayName] || {
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
      raid.contributors[displayName] = currentStats;

      // Update Player Profile
      player.tokens += tokensEarned;
      player.totalDamageDealt += damage;
      player.totalStrikes += 1;

      // Save both states
      await Promise.all([
        saveRaidState(raid),
        savePlayerProfile(player)
      ]);

      return {
        success: true,
        damage,
        tokensEarned,
        bossDefeated,
        nextFreeHitTime: type === 'free' ? now + cooldownMs : undefined,
        raid,
        player
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
