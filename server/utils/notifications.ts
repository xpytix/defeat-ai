import { getBlobsStore } from './db';

const DEV_PORTAL_API_KEY = process.env.WORLD_DEVELOPER_API_KEY || '';
const APP_ID = process.env.WORLD_APP_ID || 'app_00e63093c3a6d36ace61c9b587ffcdf8';

const memorySubscribers = new Set<string>();

export async function getSubscribedWallets(): Promise<string[]> {
  const store = getBlobsStore();
  if (store) {
    try {
      const data = await store.get('notification_subscribers', { type: 'json' }) as string[] | null;
      if (Array.isArray(data)) {
        data.forEach(addr => memorySubscribers.add(addr.toLowerCase()));
        return Array.from(memorySubscribers);
      }
    } catch (err) {
      console.warn('[Notifications] Error reading subscribers from blobs:', err);
    }
  }
  return Array.from(memorySubscribers);
}

export async function subscribeNotificationWallet(walletAddress: string): Promise<boolean> {
  if (!walletAddress || !walletAddress.startsWith('0x') || walletAddress.length !== 42) {
    return false;
  }
  const normalized = walletAddress.toLowerCase();
  memorySubscribers.add(normalized);

  const store = getBlobsStore();
  if (store) {
    try {
      const current = await getSubscribedWallets();
      const updated = Array.from(new Set([...current, normalized]));
      await store.setJSON('notification_subscribers', updated);
      return true;
    } catch (err) {
      console.error('[Notifications] Error saving subscriber to blobs:', err);
    }
  }
  return true;
}

export async function unsubscribeNotificationWallet(walletAddress: string): Promise<boolean> {
  if (!walletAddress) return false;
  const normalized = walletAddress.toLowerCase();
  memorySubscribers.delete(normalized);

  const store = getBlobsStore();
  if (store) {
    try {
      const current = await getSubscribedWallets();
      const updated = current.filter(a => a.toLowerCase() !== normalized);
      await store.setJSON('notification_subscribers', updated);
      return true;
    } catch (err) {
      console.error('[Notifications] Error removing subscriber from blobs:', err);
    }
  }
  return true;
}

export type NotificationType = 'daily_ready' | 'new_boss' | 'boss_50_pct';

export interface NotificationParams {
  bossName?: string;
  currentHp?: number;
  maxHp?: number;
  customMessage?: string;
}

export async function sendWorldAppNotification(
  type: NotificationType,
  targetWallets?: string[],
  params?: NotificationParams
): Promise<{ success: boolean; result?: any; error?: string }> {
    if (!DEV_PORTAL_API_KEY) {
      console.warn('[Notifications] WORLD_DEVELOPER_API_KEY is not configured in environment variables.');
      return { success: false, error: 'WORLD_DEVELOPER_API_KEY not configured' };
    }

  try {
    let addresses = targetWallets && targetWallets.length > 0 ? targetWallets : await getSubscribedWallets();

    // Fallback: If no subscribers registered yet, default to developer test wallet so delivery can be verified
    if (!addresses || addresses.length === 0) {
      addresses = ['0x7a9d7ce2a5c3dd2e8f73118e89a15a1aac3cdc71'];
    }

    // Deduplicate and validate
    addresses = Array.from(new Set(addresses.filter(a => a && a.startsWith('0x') && a.length === 42)));
    if (addresses.length === 0) {
      return { success: false, error: 'No valid recipient addresses found' };
    }

    let title = '';
    let message = '';

    switch (type) {
      case 'daily_ready':
        title = 'Daily Strike & Claim Ready!';
        message = 'Your daily strike is ready! Attack the rogue AI boss and claim your $DEF tokens on World Chain.';
        break;

      case 'new_boss':
        title = 'New Boss Spawned!';
        message = params?.bossName 
          ? `A new rogue AI boss (${params.bossName}) has appeared in the arena! Join humanity to defeat it.` 
          : 'A new rogue AI entity has arrived in the arena! Join humanity to defeat it.';
        break;

      case 'boss_50_pct':
        title = 'Boss at 50% HP Alert!';
        message = params?.bossName 
          ? `${params.bossName} is down to 50% HP! Strike now to deal heavy damage and secure your $DEF bounty before it falls.` 
          : 'The rogue AI boss is down to 50% HP! Strike now to claim your $DEF bounty before it falls.';
        break;
    }

    if (params?.customMessage) {
      message = params.customMessage;
    }

    const payload = {
      app_id: APP_ID,
      wallet_addresses: addresses,
      localisations: [
        {
          language: 'en',
          title,
          message
        }
      ],
      mini_app_path: `worldapp://mini-app?app_id=${APP_ID}`
    };

    const res = await fetch('https://developer.worldcoin.org/api/v2/minikit/send-notification', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DEV_PORTAL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    console.log(`[Notifications] Sent ${type} notification to ${addresses.length} addresses. Response:`, JSON.stringify(data));

    return {
      success: res.ok,
      result: data
    };
  } catch (err: any) {
    console.error(`[Notifications] Exception sending ${type}:`, err);
    return {
      success: false,
      error: err.message || 'Unknown notification error'
    };
  }
}
