import { getBlobsStore } from './db';

const DEFAULT_DEV_KEY = 'api_a2V5XzA4OTIwOWZiZGE5MDNhZmNlZDY1ZGY2NzRjZDYzNzRjOnNrXzQ3MzE4OTk2NTdlYjA2ODU3Mjc4ZDVhYmYyM2UxOGQzZDNiODRiN2FiNDdlNGZkZA';
const DEV_PORTAL_API_KEY = process.env.WORLD_DEVELOPER_API_KEY || DEFAULT_DEV_KEY;
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
      addresses = ['0x435cf6a63fbc5bc8f4d2b8d0dd02ab16ac45e9aa'];
    }

    // Deduplicate and validate
    addresses = Array.from(new Set(addresses.filter(a => a && a.startsWith('0x') && a.length === 42)));
    if (addresses.length === 0) {
      return { success: false, error: 'No valid recipient addresses found' };
    }

    let localisations: Array<{ language: string; title: string; message: string }> = [];

    switch (type) {
      case 'daily_ready':
        localisations = [
          {
            language: 'en',
            title: 'Daily Strike Ready!',
            message: 'Your daily strike is ready! Attack the rogue AI boss and claim your $DEF tokens on World Chain.'
          },
          {
            language: 'pl',
            title: 'Twój claim jest gotowy!',
            message: 'Twoje darmowe uderzenie jest już dostępne! Zaatakuj bossa AI i odbierz swoje tokeny $DEF.'
          },
          {
            language: 'es',
            title: '¡Golpe diario listo!',
            message: '¡Tu golpe diario está listo! Ataca al jefe de IA y reclama tus tokens $DEF en World Chain.'
          }
        ];
        break;

      case 'new_boss':
        localisations = [
          {
            language: 'en',
            title: 'New Boss Spawned!',
            message: params?.bossName 
              ? `A new rogue AI boss (${params.bossName}) has appeared in the arena! Join humanity to defeat it.` 
              : 'A new rogue AI entity has arrived in the arena! Join humanity to defeat it.'
          },
          {
            language: 'pl',
            title: 'Nowy boss wylądował!',
            message: params?.bossName 
              ? `Nowy boss AI (${params.bossName}) pojawił się na arenie! Pomóż nam go pokonać.` 
              : 'Nowy boss AI pojawił się na arenie! Pomóż nam go pokonać.'
          },
          {
            language: 'es',
            title: '¡Nuevo jefe ha aparecido!',
            message: params?.bossName 
              ? `¡Un nuevo jefe de IA (${params.bossName}) ha llegado! Únete a la humanidad para vencerlo.` 
              : '¡Un nuevo jefe de IA ha llegado! Únete a la humanidad para vencerlo.'
          }
        ];
        break;

      case 'boss_50_pct':
        localisations = [
          {
            language: 'en',
            title: 'Boss at 50% HP Alert!',
            message: params?.bossName 
              ? `${params.bossName} is down to 50% HP! Strike now to deal heavy damage and secure your $DEF bounty before it falls.` 
              : 'The rogue AI boss is down to 50% HP! Strike now to claim your $DEF bounty before it falls.'
          },
          {
            language: 'pl',
            title: 'Zostało 50% HP bossa!',
            message: params?.bossName 
              ? `${params.bossName} ma już tylko 50% życia! Uderz teraz i zgarnij swoje tokeny $DEF, zanim padnie.` 
              : 'Boss ma już tylko 50% życia! Uderz teraz i zgarnij swoje tokeny $DEF, zanim padnie.'
          },
          {
            language: 'es',
            title: '¡Jefe al 50% de vida!',
            message: params?.bossName 
              ? `¡${params.bossName} tiene solo el 50% de vida! Ataca ahora para asegurar tus tokens $DEF.` 
              : '¡El jefe tiene solo el 50% de vida! Ataca ahora para asegurar tus tokens $DEF.'
          }
        ];
        break;
    }

    if (params?.customMessage) {
      localisations.forEach(l => {
        l.message = params.customMessage!;
      });
    }

    const payload = {
      app_id: APP_ID,
      wallet_addresses: addresses,
      localisations,
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
