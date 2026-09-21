<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import BossView from '~/components/BossView.vue';
import CharactersView from '~/components/CharactersView.vue';
import BottomNav from '~/components/BottomNav.vue';

// Navigation State
const activeTab = ref<'boss' | 'characters'>('boss');
const toastMessage = ref<string | null>(null);

// User Token Balance (Earned from Daily Strikes & Raid Contributions)
const userTokens = ref(40);

// Game State
const currentBossLevel = ref(1);
const maxHp = ref(50);
const currentHp = ref(42);
const bossName = ref('AutoCorrect');
const freeHitAvailable = ref(true);
const nextFreeHitTime = ref<number | null>(null);

// Toast notification helper
const showToast = (msg: string) => {
  toastMessage.value = msg;
  setTimeout(() => {
    if (toastMessage.value === msg) toastMessage.value = null;
  }, 2200);
};

// Load saved local state
onMounted(() => {
  if (typeof window !== 'undefined') {
    const savedTokens = localStorage.getItem('defeat_ai_user_tokens');
    if (savedTokens) {
      userTokens.value = parseInt(savedTokens, 10);
    }

    const savedLastHit = localStorage.getItem('defeat_ai_last_free_hit');
    if (savedLastHit) {
      const lastHitTime = parseInt(savedLastHit, 10);
      const cooldown = 24 * 60 * 60 * 1000;
      const expiry = lastHitTime + cooldown;
      if (Date.now() < expiry) {
        freeHitAvailable.value = false;
        nextFreeHitTime.value = expiry;
      } else {
        freeHitAvailable.value = true;
        nextFreeHitTime.value = null;
      }
    }

    const savedHp = localStorage.getItem('defeat_ai_current_hp');
    if (savedHp) {
      currentHp.value = parseInt(savedHp, 10);
    }
  }
});

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

// Handle Hit from BossView (Flat 20 $HVAI per strike)
const handleHit = (type: 'free' | 'power') => {
  if (type === 'free') {
    if (!freeHitAvailable.value) {
      showToast('Daily strike available once every 24h');
      return;
    }
    freeHitAvailable.value = false;
    const expiry = Date.now() + 24 * 60 * 60 * 1000;
    nextFreeHitTime.value = expiry;

    // Daily strike mints / claims flat 20 tokens!
    userTokens.value += 20;

    if (typeof window !== 'undefined') {
      localStorage.setItem('defeat_ai_last_free_hit', Date.now().toString());
      localStorage.setItem('defeat_ai_user_tokens', userTokens.value.toString());
    }
    showToast('💥 Strike confirmed (-1 HP) · Claimed +20 $HVAI');
  } else {
    // Power strike gives 20 tokens + 1 extra attack
    userTokens.value += 20;
    if (typeof window !== 'undefined') {
      localStorage.setItem('defeat_ai_user_tokens', userTokens.value.toString());
    }
    showToast('⚡ Power Strike confirmed (-1 HP) · +20 $HVAI');
  }

  // Deduct HP
  if (currentHp.value > 0) {
    currentHp.value -= 1;
    if (typeof window !== 'undefined') {
      localStorage.setItem('defeat_ai_current_hp', currentHp.value.toString());
    }

    // Boss Defeated
    if (currentHp.value <= 0) {
      showToast(`🎉 ${bossName.value} defeated!`);
      setTimeout(() => {
        if (currentBossLevel.value < 8) {
          selectBoss(currentBossLevel.value + 1);
        }
      }, 1500);
    }
  }
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
        :is-white-theme="isWhiteTheme"
        @hit="handleHit"
        @select-level="selectBoss"
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

  </div>
</template>
