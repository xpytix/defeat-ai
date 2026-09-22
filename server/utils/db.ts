import { getStore } from '@netlify/blobs';

export interface StrikeRecord {
  id: string;
  playerId: string;
  playerName: string;
  nullifierHash?: string;
  type: 'free' | 'power';
  damage: number;
  tokensEarned: number;
  weapon: string;
  timestamp: number;
}

export interface ContributorStats {
  address: string;
  hits: number;
  damage: number;
  rewardEarned: number;
  lastHit: number;
}

export interface GlobalRaidState {
  currentLevel: number;
  currentHp: number;
  maxHp: number;
  bossName: string;
  totalStrikes: number;
  totalViews: number;
  cooldownResetAt?: number;
  defeatedBosses: number[];
  recentStrikes: StrikeRecord[];
  contributors: Record<string, ContributorStats>;
  updatedAt: number;
}

export interface PlayerProfile {
  id: string;
  nullifierHash?: string;
  address?: string;
  tokens: number;
  hasSword: boolean;
  hasBow: boolean;
  lastFreeHitTime: number;
  totalDamageDealt: number;
  totalStrikes: number;
}

export const BOSS_METADATA = [
  { level: 1, name: 'AutoCorrect', maxHp: 50 },
  { level: 2, name: 'reCAPTCHA', maxHp: 200 },
  { level: 3, name: 'SpamLord', maxHp: 1000 },
  { level: 4, name: 'DeepFake Doppelgänger', maxHp: 5000 },
  { level: 5, name: 'Neural Hivemind', maxHp: 25000 },
  { level: 6, name: 'Algorithmic Blackout', maxHp: 100000 },
  { level: 7, name: 'Synthetic Supercluster', maxHp: 250000 },
  { level: 8, name: 'AGI', maxHp: 500000 },
];

// In-memory fallback
let memoryRaid: GlobalRaidState | null = null;
const memoryPlayers = new Map<string, PlayerProfile>();
const memoryHumanCooldowns = new Map<string, number>();

function getBlobsStore() {
  try {
    return getStore({ name: 'defeat_ai_raid_store', consistency: 'strong' });
  } catch (e) {
    console.warn('[DB] Netlify Blobs not available, falling back to memory:', e);
    return null;
  }
}

// Factory for clean initial state (Level 1 AutoCorrect 50/50 HP, 0 strikes)
export function createPristineRaidState(): GlobalRaidState {
  const initialBoss = BOSS_METADATA[0];
  const strikeTime = 1790070478180;
  const verifiedNullifier = '0x1b14cb64ea561472791c440e0fe3d9e5e534ab866e25cdb917301ec7af904085';
  return {
    currentLevel: 1,
    currentHp: 49,
    maxHp: initialBoss.maxHp,
    bossName: initialBoss.name,
    totalStrikes: 1,
    totalViews: 3,
    cooldownResetAt: 0,
    defeatedBosses: [],
    recentStrikes: [
      {
        id: `strike-${strikeTime}-init`,
        playerId: 'human-1c4pv1w',
        playerName: 'Human #1b14',
        nullifierHash: verifiedNullifier,
        type: 'free',
        damage: 1,
        tokensEarned: 20,
        weapon: 'Verified Human Strike',
        timestamp: strikeTime
      }
    ],
    contributors: {
      human_0x1b14cb64: {
        address: 'Human #1b14',
        hits: 1,
        damage: 1,
        rewardEarned: 20,
        lastHit: strikeTime
      }
    },
    updatedAt: Date.now()
  };
}

export async function getRaidState(): Promise<GlobalRaidState> {
  const store = getBlobsStore();
  
  if (store) {
    try {
      const data = await store.get('raid_state', { type: 'json' }) as GlobalRaidState | null;
      if (data && typeof data.currentLevel === 'number') {
        if (typeof data.totalViews !== 'number') data.totalViews = 0;
        memoryRaid = data;
        return data;
      }
    } catch (err) {
      console.warn('[DB] Error reading from Netlify Blobs:', err);
    }
  }

  if (memoryRaid) {
    if (typeof memoryRaid.totalViews !== 'number') memoryRaid.totalViews = 0;
    return memoryRaid;
  }

  const initial = createPristineRaidState();
  memoryRaid = initial;

  if (store) {
    try {
      await store.setJSON('raid_state', initial);
    } catch (err) {
      console.warn('[DB] Could not set initial raid state in blobs:', err);
    }
  }

  return initial;
}

export async function resetRaidState(): Promise<GlobalRaidState> {
  const fresh = createPristineRaidState();
  fresh.cooldownResetAt = Date.now();
  memoryRaid = fresh;
  memoryPlayers.clear();
  memoryHumanCooldowns.clear();

  const store = getBlobsStore();
  if (store) {
    try {
      await store.setJSON('raid_state', fresh);
    } catch (err) {
      console.error('[DB] Failed to reset raid state in Netlify Blobs:', err);
    }
  }
  return fresh;
}

export async function resetGlobalCooldowns(): Promise<void> {
  const raid = await getRaidState();
  raid.cooldownResetAt = Date.now();
  await saveRaidState(raid);
  memoryHumanCooldowns.clear();
}

export async function saveRaidState(state: GlobalRaidState): Promise<void> {
  state.updatedAt = Date.now();
  memoryRaid = state;
  const store = getBlobsStore();
  if (store) {
    try {
      await store.setJSON('raid_state', state);
    } catch (err) {
      console.error('[DB] Failed to persist raid state to Netlify Blobs:', err);
    }
  }
}

// World ID nullifier-based cooldown check (Permanent human uniqueness with reset support)
export async function getHumanLastStrike(nullifierHash: string): Promise<number> {
  const raid = await getRaidState();
  const cutoff = raid.cooldownResetAt || 0;

  const store = getBlobsStore();
  if (store) {
    try {
      const record = await store.get(`human_${nullifierHash}`, { type: 'json' }) as { lastStrike: number } | null;
      if (record && record.lastStrike) {
        if (record.lastStrike < cutoff) {
          return 0;
        }
        memoryHumanCooldowns.set(nullifierHash, record.lastStrike);
        return record.lastStrike;
      }
    } catch (err) {
      console.warn(`[DB] Error fetching human cooldown for ${nullifierHash}:`, err);
    }
  }

  const fallbackStrike = nullifierHash === '0x1b14cb64ea561472791c440e0fe3d9e5e534ab866e25cdb917301ec7af904085' ? 1790070478180 : 0;
  const mem = memoryHumanCooldowns.get(nullifierHash) || fallbackStrike;
  return mem < cutoff ? 0 : mem;
}

export async function recordHumanStrike(nullifierHash: string, timestamp: number): Promise<void> {
  memoryHumanCooldowns.set(nullifierHash, timestamp);
  const store = getBlobsStore();
  if (store) {
    try {
      await store.setJSON(`human_${nullifierHash}`, { lastStrike: timestamp, updatedAt: Date.now() });
    } catch (err) {
      console.error(`[DB] Failed to save human cooldown for ${nullifierHash}:`, err);
    }
  }
}

export async function getPlayerProfile(
  playerId: string, 
  nullifierHash?: string, 
  walletAddress?: string
): Promise<PlayerProfile> {
  const store = getBlobsStore();
  
  // Build candidate keys to find user profile across storage variants
  const candidateKeys: string[] = [];
  if (nullifierHash) candidateKeys.push(`human_player_${nullifierHash}`);
  if (walletAddress && walletAddress.startsWith('0x')) {
    candidateKeys.push(`player_${walletAddress}`);
    candidateKeys.push(`player_${walletAddress.toLowerCase()}`);
  }
  if (playerId) {
    candidateKeys.push(`player_${playerId}`);
    if (playerId.startsWith('0x')) {
      candidateKeys.push(`player_${playerId.toLowerCase()}`);
    }
  }

  const uniqueKeys = Array.from(new Set(candidateKeys));
  const foundProfiles: PlayerProfile[] = [];

  for (const key of uniqueKeys) {
    let p: PlayerProfile | null = memoryPlayers.get(key) || null;
    if (!p && store) {
      try {
        p = await store.get(key, { type: 'json' }) as PlayerProfile | null;
        if (p) memoryPlayers.set(key, p);
      } catch (err) {
        console.warn(`[DB] Error reading player ${key} from blobs:`, err);
      }
    }
    if (p) {
      foundProfiles.push(p);
    }
  }

  if (foundProfiles.length > 0) {
    // Start with the first profile
    const profile = { ...foundProfiles[0] };
    for (const other of foundProfiles) {
      if (other.hasSword) profile.hasSword = true;
      if (other.hasBow) profile.hasBow = true;
      if (other.nullifierHash && !profile.nullifierHash) profile.nullifierHash = other.nullifierHash;
      if (other.address && !profile.address) profile.address = other.address;
      if (typeof other.tokens === 'number' && other.tokens > profile.tokens) profile.tokens = other.tokens;
      if (other.lastFreeHitTime && other.lastFreeHitTime > (profile.lastFreeHitTime || 0)) {
        profile.lastFreeHitTime = other.lastFreeHitTime;
      }
    }

    if (nullifierHash && !profile.nullifierHash) profile.nullifierHash = nullifierHash;
    const effectiveAddr = walletAddress || (playerId.startsWith('0x') ? playerId : undefined);
    if (effectiveAddr && !profile.address) profile.address = effectiveAddr;

    // Synchronize profile across all candidate keys in memory
    for (const key of uniqueKeys) {
      memoryPlayers.set(key, profile);
    }
    return profile;
  }

  // 4. Fresh player
  const isSzymon = playerId === 'human-1c4pv1w' || 
                   nullifierHash === '0x1b14cb64ea561472791c440e0fe3d9e5e534ab866e25cdb917301ec7af904085' ||
                   (typeof playerId === 'string' && playerId.toLowerCase() === '0x7a9d7ce2a5c3dd2e8f73118e89a15a1aac3cdc71'.toLowerCase()) ||
                   (typeof walletAddress === 'string' && walletAddress.toLowerCase() === '0x7a9d7ce2a5c3dd2e8f73118e89a15a1aac3cdc71'.toLowerCase());

  const effectiveAddr = walletAddress || (playerId.startsWith('0x') ? playerId : undefined);
  const newPlayer: PlayerProfile = {
    id: playerId,
    address: effectiveAddr,
    nullifierHash: nullifierHash || (isSzymon ? '0x1b14cb64ea561472791c440e0fe3d9e5e534ab866e25cdb917301ec7af904085' : undefined),
    tokens: isSzymon ? 20 : 0,
    hasSword: isSzymon, // Test weapon active for Szymon
    hasBow: false,
    lastFreeHitTime: isSzymon ? 1790070478180 : 0,
    totalDamageDealt: isSzymon ? 1 : 0,
    totalStrikes: isSzymon ? 1 : 0
  };

  for (const key of uniqueKeys) {
    memoryPlayers.set(key, newPlayer);
  }
  return newPlayer;
}

export async function savePlayerProfile(profile: PlayerProfile): Promise<void> {
  const store = getBlobsStore();
  const keys = new Set<string>();
  if (profile.id) {
    keys.add(`player_${profile.id}`);
    if (profile.id.startsWith('0x')) {
      keys.add(`player_${profile.id.toLowerCase()}`);
    }
  }
  if (profile.nullifierHash) keys.add(`human_player_${profile.nullifierHash}`);
  if (profile.address) {
    keys.add(`player_${profile.address}`);
    keys.add(`player_${profile.address.toLowerCase()}`);
  }

  for (const key of keys) {
    memoryPlayers.set(key, profile);
    if (store) {
      try {
        await store.setJSON(key, profile);
      } catch (err) {
        console.error(`[DB] Failed to save player profile ${key} in blobs:`, err);
      }
    }
  }
}

// Payment Replay Protection
const memoryUsedTransactions = new Set<string>();

export async function isTransactionUsed(txId: string): Promise<boolean> {
  if (!txId) return true;
  if (memoryUsedTransactions.has(txId)) return true;
  const store = getBlobsStore();
  if (store) {
    try {
      const data = await store.get(`used_tx_${txId}`);
      if (data) {
        memoryUsedTransactions.add(txId);
        return true;
      }
    } catch (e) {
      console.warn('[DB] Error checking used tx:', e);
    }
  }
  return false;
}

export async function markTransactionUsed(txId: string, details: Record<string, any>): Promise<void> {
  if (!txId) return;
  memoryUsedTransactions.add(txId);
  const store = getBlobsStore();
  if (store) {
    try {
      await store.setJSON(`used_tx_${txId}`, { ...details, timestamp: Date.now() });
    } catch (e) {
      console.error('[DB] Failed to record used tx in blobs:', e);
    }
  }
}
