import { defineEventHandler, getQuery, setResponseStatus } from 'h3';
import { resetRaidState, resetGlobalCooldowns, getRaidState, getPlayerProfile, savePlayerProfile } from '../../utils/db';

function getNextUtcMidnight(): number {
  const d = new Date();
  d.setUTCHours(24, 0, 0, 0);
  return d.getTime();
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const secret = query.secret as string | undefined;
  const cooldownOnly = query.cooldownOnly === '1' || query.cooldownOnly === 'true';
  const setLimit = query.setLimit as string | undefined;
  const targetWallet = query.wallet as string | undefined;

  // Mandatory admin secret protection
  const adminSecret = process.env.ADMIN_RESET_SECRET || 'defeat_ai_pristine_2026';
  
  if (!secret || secret !== adminSecret) {
    setResponseStatus(event, 403);
    return { success: false, error: 'Forbidden. Invalid or missing reset secret.' };
  }

  if (setLimit !== undefined && targetWallet) {
    const player = await getPlayerProfile(targetWallet, undefined, targetWallet);
    player.dailyClaimedTokens = Number(setLimit);
    player.dailyClaimResetAt = getNextUtcMidnight();
    await savePlayerProfile(player);
    return {
      success: true,
      message: `Set dailyClaimedTokens to ${setLimit} for wallet ${targetWallet}`,
      dailyClaimedTokens: player.dailyClaimedTokens,
      dailyClaimResetAt: player.dailyClaimResetAt
    };
  }

  if (cooldownOnly) {
    await resetGlobalCooldowns();
    const raid = await getRaidState();
    return {
      success: true,
      message: 'Claim and attack cooldowns have been reset.',
      raid
    };
  }

  const cleanState = await resetRaidState();

  return {
    success: true,
    message: 'Global raid state and cooldowns have been completely reset to clean slate.',
    raid: cleanState
  };
});
