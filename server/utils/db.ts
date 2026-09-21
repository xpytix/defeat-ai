import { getStore } from '@netlify/blobs';

export interface StrikeRecord {
  id: string;
  playerId: string;
  playerName: string;
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
  address?: string;
  tokens: number;
  wld: number;
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

  // Initial State if first run
  const initialBoss = BOSS_METADATA[0];
  const initial: GlobalRaidState = {
    currentLevel: 1,
    currentHp: Math.round(initialBoss.maxHp * 0.84), // 42/50
    maxHp: initialBoss.maxHp,
    bossName: initialBoss.name,
    totalStrikes: 8,
    defeatedBosses: [],
    recentStrikes: [
      {
        id: 'init-strike-1',
        playerId: '0x8f...39a1',
        playerName: 'Human #01',
        type: 'free',
        damage: 1,
        tokensEarned: 20,
        weapon: 'Base Strike',
        timestamp: Date.now() - 1000 * 60 * 15
      }
    ],
    contributors: {
      '0x8f...39a1': {
        address: '0x8f...39a1',
        hits: 8,
        damage: 8,
        rewardEarned: 160,
        lastHit: Date.now() - 1000 * 60 * 15
      }
    },
    updatedAt: Date.now()
  };

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

export async function getPlayerProfile(playerId: string): Promise<PlayerProfile> {
  const store = getBlobsStore();
  if (store) {
    try {
      const data = await store.get(`player_${playerId}`, { type: 'json' }) as PlayerProfile | null;
      if (data) {
        memoryPlayers.set(playerId, data);
        return data;
      }
    } catch (err) {
      console.warn(`[DB] Error reading player ${playerId} from blobs:`, err);
    }
  }

  if (memoryPlayers.has(playerId)) {
    return memoryPlayers.get(playerId)!;
  }

  // Default new player profile
  const newPlayer: PlayerProfile = {
    id: playerId,
    tokens: 40,
    wld: 250,
    hasSword: false,
    hasBow: false,
    lastFreeHitTime: 0,
    totalDamageDealt: 0,
    totalStrikes: 0
  };

  memoryPlayers.set(playerId, newPlayer);
  return newPlayer;
}

export async function savePlayerProfile(profile: PlayerProfile): Promise<void> {
  memoryPlayers.set(profile.id, profile);
  const store = getBlobsStore();
  if (store) {
    try {
      await store.setJSON(`player_${profile.id}`, profile);
    } catch (err) {
      console.error(`[DB] Failed to save player ${profile.id} in blobs:`, err);
    }
  }
}
