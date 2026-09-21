import { defineEventHandler, getQuery, setResponseStatus } from 'h3';
import { resetRaidState } from '../../utils/db';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const secret = query.secret as string | undefined;

  // Simple admin protection if configured, or allow in initial setup
  const adminSecret = process.env.ADMIN_RESET_SECRET || 'defeat_ai_pristine_2026';
  
  if (secret !== adminSecret && process.env.NODE_ENV === 'production') {
    setResponseStatus(event, 403);
    return { success: false, error: 'Forbidden. Invalid reset secret.' };
  }

  const cleanState = await resetRaidState();

  return {
    success: true,
    message: 'Global raid state and cooldowns have been completely reset to clean slate.',
    raid: cleanState
  };
});
