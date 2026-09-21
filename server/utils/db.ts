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
    if (process.env.NETLIFY) {
      return getStore({ name: 'defeat_ai_raid_store', consistency: 'strong' });
    }
  } catch (e) {
    console.warn('[DB] Netlify Blobs not available, falling back to memory:', e);
  }
  return null;
}

// Factory for clean initial state (Level 1 AutoCorrect 50/50 HP, 0 strikes)
export function createPristineRaidState(): GlobalRaidState {
  const initialBoss = BOSS_METADATA[0];
  return {
    currentLevel: 1,
    currentHp: initialBoss.maxHp, // Full 50/50 HP
    maxHp: initialBoss.maxHp,
    bossName: initialBoss.name,
    totalStrikes: 0,
    defeatedBosses: [],
    recentStrikes: [],
    contributors: {},
    updatedAt: Date.now()
  };
}

export async function getRaidState(): Promise<GlobalRaidState> {
  const store = getBlobsStore();
  
  if (store) {
    try {
      const data = await store.get('raid_state', { type: 'json' }) as GlobalRaidState | null;
      if (data && typeof data.currentLevel === 'number') {
        memoryRaid = data;
        return data;
      }
    } catch (err) {
      console.warn('[DB] Error reading from Netlify Blobs:', err);
    }
  }

  if (memoryRaid) {
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

// World ID nullifier-based cooldown check (Permanent human uniqueness)
export async function getHumanLastStrike(nullifierHash: string): Promise<number> {
  const store = getBlobsStore();
  if (store) {
    try {
      const record = await store.get(`human_${nullifierHash}`, { type: 'json' }) as { lastStrike: number } | null;
      if (record && record.lastStrike) {
        memoryHumanCooldowns.set(nullifierHash, record.lastStrike);
        return record.lastStrike;
      }
    } catch (err) {
      console.warn(`[DB] Error fetching human cooldown for ${nullifierHash}:`, err);
    }
  }

  return memoryHumanCooldowns.get(nullifierHash) || 0;
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

export async function getPlayerProfile(playerId: string, nullifierHash?: string): Promise<PlayerProfile> {
  const key = nullifierHash ? `human_player_${nullifierHash}` : `player_${playerId}`;
  const store = getBlobsStore();

  if (store) {
    try {
      const data = await store.get(key, { type: 'json' }) as PlayerProfile | null;
      if (data) {
        memoryPlayers.set(key, data);
        return data;
      }
    } catch (err) {
      console.warn(`[DB] Error reading player ${key} from blobs:`, err);
    }
  }

  if (memoryPlayers.has(key)) {
    return memoryPlayers.get(key)!;
  }

  // Clean fresh player starts with 0 $DEF and standard initial WLD
  const newPlayer: PlayerProfile = {
    id: playerId,
    nullifierHash,
    tokens: 0,
    hasSword: false,
    hasBow: false,
    lastFreeHitTime: 0,
    totalDamageDealt: 0,
    totalStrikes: 0
  };

  memoryPlayers.set(key, newPlayer);
  return newPlayer;
}

export async function savePlayerProfile(profile: PlayerProfile): Promise<void> {
  const key = profile.nullifierHash ? `human_player_${profile.nullifierHash}` : `player_${profile.id}`;
  memoryPlayers.set(key, profile);
  const store = getBlobsStore();
  if (store) {
    try {
      await store.setJSON(key, profile);
    } catch (err) {
      console.error(`[DB] Failed to save player profile ${key} in blobs:`, err);
    }
  }
}
