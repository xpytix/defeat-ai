import { defineEventHandler, getQuery, setResponseStatus } from 'h3';
import { resetRaidState, resetGlobalCooldowns, getRaidState } from '../../utils/db';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const secret = query.secret as string | undefined;
  const cooldownOnly = query.cooldownOnly === '1' || query.cooldownOnly === 'true';

  // Mandatory admin secret protection
  const adminSecret = process.env.ADMIN_RESET_SECRET || 'defeat_ai_pristine_2026';
  
  if (!secret || secret !== adminSecret) {
    setResponseStatus(event, 403);
    return { success: false, error: 'Forbidden. Invalid or missing reset secret.' };
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
