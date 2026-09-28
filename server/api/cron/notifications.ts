import { defineEventHandler, getQuery, setResponseStatus } from 'h3';
import { checkAndSendDailyNotifications } from '../../utils/notifications';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const secret = query.secret as string | undefined;
  const adminSecret = process.env.ADMIN_RESET_SECRET || 'defeat_ai_pristine_2026';

  if (secret && secret !== adminSecret) {
    setResponseStatus(event, 403);
    return { success: false, error: 'Forbidden. Invalid secret.' };
  }

  const result = await checkAndSendDailyNotifications();
  return {
    success: true,
    timestamp: Date.now(),
    ...result
  };
});
