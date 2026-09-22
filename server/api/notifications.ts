import { defineEventHandler, readBody, getQuery, setResponseStatus } from 'h3';
import { 
  subscribeNotificationWallet, 
  unsubscribeNotificationWallet, 
  getSubscribedWallets, 
  sendWorldAppNotification,
  type NotificationType 
} from '../utils/notifications';

export default defineEventHandler(async (event) => {
  const method = event.node.req.method;

  if (method === 'GET') {
    const subscribers = await getSubscribedWallets();
    return {
      success: true,
      subscribersCount: subscribers.length,
      configured: true,
      supportedTypes: ['daily_ready', 'new_boss', 'boss_50_pct']
    };
  }

  if (method === 'POST') {
    const body = await readBody(event);
    const { action = 'status', walletAddress, type, targetWallets, params } = body || {};

    if (action === 'subscribe') {
      if (!walletAddress) {
        setResponseStatus(event, 400);
        return { success: false, error: 'walletAddress required' };
      }
      const ok = await subscribeNotificationWallet(walletAddress);
      return { success: ok, message: 'Subscribed to Defeat AI notifications' };
    }

    if (action === 'unsubscribe') {
      if (!walletAddress) {
        setResponseStatus(event, 400);
        return { success: false, error: 'walletAddress required' };
      }
      const ok = await unsubscribeNotificationWallet(walletAddress);
      return { success: ok, message: 'Unsubscribed from notifications' };
    }

    if (action === 'send') {
      if (!type || !['daily_ready', 'new_boss', 'boss_50_pct'].includes(type)) {
        setResponseStatus(event, 400);
        return { success: false, error: 'Invalid notification type. Must be daily_ready, new_boss, or boss_50_pct' };
      }
      const targets = targetWallets || (walletAddress ? [walletAddress] : undefined);
      const res = await sendWorldAppNotification(type as NotificationType, targets, params);
      return res;
    }

    const subscribers = await getSubscribedWallets();
    return {
      success: true,
      subscribersCount: subscribers.length,
      isSubscribed: walletAddress ? subscribers.includes(walletAddress.toLowerCase()) : false
    };
  }
});
