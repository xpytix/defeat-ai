<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import BossView from '~/components/BossView.vue';
import CharactersView from '~/components/CharactersView.vue';
import BottomNav from '~/components/BottomNav.vue';
import ShopModal from '~/components/ShopModal.vue';

// Navigation State
const activeTab = ref<'boss' | 'characters'>('boss');
const toastMessage = ref<string | null>(null);

// User Player ID & Identity
const playerId = ref('anon-human');

// User Token Balance ($DEF) & WLD Balance
const userTokens = ref(40);
const userWld = ref(250); // Pre-funded with 250 WLD for immediate testing

// Armory & Weapon Inventory
const hasSword = ref(false); // Quantum Plasma Blade: 2x daily strike damage (-2 HP) & 2x tokens (+40 $DEF)
const hasBow = ref(false);   // Tachyon Chrono-Bow: -50% cooldown (12h instead of 24h)
const isShopOpen = ref(false);

// Game State
const currentBossLevel = ref(1);
const maxHp = ref(50);
const currentHp = ref(42);
const bossName = ref('AutoCorrect');
const freeHitAvailable = ref(true);
const nextFreeHitTime = ref<number | null>(null);
const isSyncing = ref(false);
let pollTimer: ReturnType<typeof setInterval> | null = null;

// Toast notification helper
const showToast = (msg: string) => {
  toastMessage.value = msg;
  setTimeout(() => {
    if (toastMessage.value === msg) toastMessage.value = null;
  }, 2200);
};

// Boss List metadata
const BOSS_LIST = [
  { level: 1, name: 'AutoCorrect', maxHp: 50 },
  { level: 2, name: 'reCAPTCHA', maxHp: 200 },
  { level: 3, name: 'SpamLord', maxHp: 1000 },
  { level: 4, name: 'DeepFake Doppelgänger', maxHp: 5000 },
  { level: 5, name: 'Neural Hivemind', maxHp: 25000 },
  { level: 6, name: 'Algorithmic Blackout', maxHp: 100000 },
  { level: 7, name: 'Synthetic Supercluster', maxHp: 250000 },
  { level: 8, name: 'AGI', maxHp: 500000 },
];

const isWhiteTheme = computed(() => [3, 5, 8].includes(currentBossLevel.value));

// Fetch global live raid state from Netlify Blobs API
const fetchRaidState = async () => {
  try {
    isSyncing.value = true;
    const res: any = await $fetch('/api/game', {
      params: { playerId: playerId.value }
    });

    if (res && res.success && res.raid) {
      currentBossLevel.value = res.raid.currentLevel;
      bossName.value = res.raid.bossName;
      maxHp.value = res.raid.maxHp;
      currentHp.value = res.raid.currentHp;
    }

    if (res && res.player) {
      userTokens.value = res.player.tokens;
      hasSword.value = res.player.hasSword;
      hasBow.value = res.player.hasBow;

      if (res.player.lastFreeHitTime) {
        const cooldownHours = res.player.hasBow ? 12 : 24;
        const cooldown = cooldownHours * 60 * 60 * 1000;
        const expiry = res.player.lastFreeHitTime + cooldown;
        if (Date.now() < expiry) {
          freeHitAvailable.value = false;
          nextFreeHitTime.value = expiry;
        } else {
          freeHitAvailable.value = true;
          nextFreeHitTime.value = null;
        }
      }
    }
  } catch (err) {
    console.warn('[Raid Sync] Fallback to local cache:', err);
  } finally {
    isSyncing.value = false;
  }
};

// Load saved local state & initialize Global Raid Sync
onMounted(() => {
  if (typeof window !== 'undefined') {
    // Persistent Player Identity
    let storedId = localStorage.getItem('defeat_ai_player_id');
    if (!storedId) {
      storedId = 'human-' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('defeat_ai_player_id', storedId);
    }
    playerId.value = storedId;

    // Fast local restore
    const savedTokens = localStorage.getItem('defeat_ai_user_tokens');
    if (savedTokens) userTokens.value = parseInt(savedTokens, 10);

    const savedWld = localStorage.getItem('defeat_ai_user_wld');
    if (savedWld) userWld.value = parseInt(savedWld, 10);

    const savedSword = localStorage.getItem('defeat_ai_has_sword');
    if (savedSword) hasSword.value = savedSword === 'true';

    const savedBow = localStorage.getItem('defeat_ai_has_bow');
    if (savedBow) hasBow.value = savedBow === 'true';

    const savedLastHit = localStorage.getItem('defeat_ai_last_free_hit');
    if (savedLastHit) {
      const lastHitTime = parseInt(savedLastHit, 10);
      const cooldownHours = hasBow.value ? 12 : 24;
      const cooldown = cooldownHours * 60 * 60 * 1000;
      const expiry = lastHitTime + cooldown;
      if (Date.now() < expiry) {
        freeHitAvailable.value = false;
        nextFreeHitTime.value = expiry;
      } else {
        freeHitAvailable.value = true;
        nextFreeHitTime.value = null;
      }
    }

    // Connect to Netlify Blobs Backend
    fetchRaidState();
    pollTimer = setInterval(fetchRaidState, 12000);
  }
});

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer);
});

const selectBoss = (lvl: number) => {
  const target = BOSS_LIST.find(b => b.level === lvl) || BOSS_LIST[0];
  currentBossLevel.value = target.level;
  bossName.value = target.name;
  maxHp.value = target.maxHp;
  currentHp.value = Math.round(target.maxHp * 0.85);
  showToast(`[TEST] LVL 0${target.level}: ${target.name}`);
};

const handleFight = (level: number) => {
  selectBoss(level);
  activeTab.value = 'boss';
};

// Handle Hit from BossView (Synchronized globally via server API)
const handleHit = async (type: 'free' | 'power') => {
  const cooldownHours = hasBow.value ? 12 : 24;
  const cooldownMs = cooldownHours * 60 * 60 * 1000;
  const damageDealt = hasSword.value ? 2 : 1;
  const tokensEarned = hasSword.value ? 40 : 20;

  if (type === 'free') {
    if (!freeHitAvailable.value) {
      showToast(`Daily strike available once every ${cooldownHours}h`);
      return;
    }
    freeHitAvailable.value = false;
    nextFreeHitTime.value = Date.now() + cooldownMs;
    userTokens.value += tokensEarned;
    showToast(hasSword.value 
      ? '⚔️ Plasma Strike (-2 HP) · Claimed +40 $DEF' 
      : '💥 Strike confirmed (-1 HP) · Claimed +20 $DEF');
  } else {
    userTokens.value += 20;
    showToast('⚡ Power Strike confirmed (-1 HP) · +20 $DEF');
  }

  // Server API Call with fallback
  try {
    const res: any = await $fetch('/api/game', {
      method: 'POST',
      body: {
        action: 'strike',
        type,
        playerId: playerId.value,
        hasSword: hasSword.value,
        hasBow: hasBow.value
      }
    });

    if (res && res.success && res.raid) {
      currentBossLevel.value = res.raid.currentLevel;
      bossName.value = res.raid.bossName;
      maxHp.value = res.raid.maxHp;
      currentHp.value = res.raid.currentHp;
      if (res.player) userTokens.value = res.player.tokens;
      if (res.bossDefeated) {
        showToast(`🎉 Boss defeated by humanity! Advancing to next sector!`);
      }
    }
  } catch (err) {
    // Local fallback if offline
    if (currentHp.value > 0) {
      currentHp.value = Math.max(0, currentHp.value - damageDealt);
    }
  }

  if (typeof window !== 'undefined') {
    if (type === 'free') {
      localStorage.setItem('defeat_ai_last_free_hit', Date.now().toString());
    }
    localStorage.setItem('defeat_ai_user_tokens', userTokens.value.toString());
    localStorage.setItem('defeat_ai_current_hp', currentHp.value.toString());
  }
};

// Purchase Gear from Cyber Armory Shop
const handleBuyItem = (item: 'sword' | 'bow') => {
  if (userWld.value < 200) {
    showToast('Insufficient WLD balance');
    return;
  }
  userWld.value -= 200;
  if (item === 'sword') {
    hasSword.value = true;
    showToast('⚔️ Quantum Plasma Blade equipped! 2x Damage & 2x Tokens active.');
  } else if (item === 'bow') {
    hasBow.value = true;
    showToast('🏹 Tachyon Chrono-Bow equipped! Daily cooldown reduced to 12h.');
    if (nextFreeHitTime.value) {
      const remaining = Math.max(0, nextFreeHitTime.value - Date.now());
      nextFreeHitTime.value = Date.now() + Math.round(remaining / 2);
    }
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem('defeat_ai_user_wld', userWld.value.toString());
    localStorage.setItem('defeat_ai_has_sword', hasSword.value.toString());
    localStorage.setItem('defeat_ai_has_bow', hasBow.value.toString());
  }

  // Sync with Netlify Blobs
  $fetch('/api/game', {
    method: 'POST',
    body: {
      action: 'sync',
      playerId: playerId.value,
      hasSword: hasSword.value,
      hasBow: hasBow.value
    }
  }).catch(() => {});
};

const handleAddWld = (amount: number) => {
  userWld.value += amount;
  if (typeof window !== 'undefined') {
    localStorage.setItem('defeat_ai_user_wld', userWld.value.toString());
  }
  showToast(`🪙 Added +${amount} WLD test balance`);
};
</script>

<template>
  <div 
    class="h-[100dvh] max-h-[100dvh] w-screen overflow-hidden flex flex-col font-sans select-none relative transition-colors duration-500"
    :class="isWhiteTheme ? 'bg-white text-zinc-950' : 'bg-black text-white'"
  >
    
    <!-- Top Ambient Glow -->
    <div 
      class="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-36 rounded-full blur-[110px] pointer-events-none -z-10 transition-colors duration-700"
      :class="isWhiteTheme 
        ? (currentBossLevel === 8 ? 'bg-amber-400/25' : currentBossLevel === 5 ? 'bg-violet-400/20' : 'bg-fuchsia-400/20') 
        : 'bg-cyan-500/10'" 
    />

    <!-- Sleek Minimal Floating Toast -->
    <div v-if="toastMessage" class="fixed top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div 
        class="px-4 py-2 rounded-full shadow-2xl backdrop-blur-xl text-center text-xs font-mono font-bold tracking-wider transition-colors"
        :class="isWhiteTheme 
          ? 'bg-black/90 border border-black/10 text-white' 
          : 'bg-zinc-900/95 border border-white/10 text-zinc-200'"
      >
        {{ toastMessage }}
      </div>
    </div>

    <!-- Clean Safe-Area Header Spacer -->
    <div class="pt-safe shrink-0" />

    <!-- Main View Switcher (Instant crisp switching, zero fade lag) -->
    <main class="flex-1 min-h-0 flex flex-col overflow-hidden relative">
      <BossView 
        v-if="activeTab === 'boss'" 
        :current-hp="currentHp"
        :max-hp="maxHp"
        :level="currentBossLevel"
        :boss-name="bossName"
        :free-hit-available="freeHitAvailable"
        :next-free-hit-time="nextFreeHitTime"
        :user-tokens="userTokens"
        :has-sword="hasSword"
        :has-bow="hasBow"
        :is-white-theme="isWhiteTheme"
        @hit="handleHit"
        @select-level="selectBoss"
        @open-shop="isShopOpen = true"
      />
      <CharactersView 
        v-else-if="activeTab === 'characters'" 
        :current-level="currentBossLevel"
        :is-white-theme="isWhiteTheme"
        @fight="handleFight"
      />
    </main>

    <!-- Minimalist Bottom Navigation -->
    <BottomNav 
      :active-tab="activeTab" 
      :is-white-theme="isWhiteTheme"
      @update:active-tab="activeTab = $event" 
    />

    <!-- Cyber Armory Shop Modal (Triggered by clicking token balance) -->
    <ShopModal 
      :is-open="isShopOpen"
      :user-tokens="userTokens"
      :user-wld="userWld"
      :has-sword="hasSword"
      :has-bow="hasBow"
      :is-white-theme="isWhiteTheme"
      @close="isShopOpen = false"
      @buy-item="handleBuyItem"
      @add-wld="handleAddWld"
    />

  </div>
</template>
