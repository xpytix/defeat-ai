<script setup lang="ts">
import { ref, onMounted } from 'vue';
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
  }, 2500);
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
      showToast('🎉 AutoCorrect defeated! Unlocking reCAPTCHA...');
      setTimeout(() => {
        currentBossLevel.value = 2;
        maxHp.value = 200;
        currentHp.value = 200;
        bossName.value = 'reCAPTCHA';
        if (typeof window !== 'undefined') {
          localStorage.setItem('defeat_ai_current_hp', '200');
        }
      }, 1500);
    }
  }
};
</script>

<template>
  <div class="h-[100dvh] max-h-[100dvh] w-screen overflow-hidden flex flex-col bg-black text-white font-sans select-none relative">
    
    <!-- Top Ambient Glow -->
    <div class="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-32 bg-cyan-500/10 rounded-full blur-[90px] pointer-events-none -z-10" />

    <!-- Sleek Minimal Floating Toast -->
    <transition name="fade">
      <div v-if="toastMessage" class="fixed top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
        <div class="px-4 py-2 bg-zinc-900/95 border border-white/10 rounded-full shadow-2xl backdrop-blur-xl text-center text-xs font-mono font-bold tracking-wider text-zinc-200">
          {{ toastMessage }}
        </div>
      </div>
    </transition>

    <!-- Clean Safe-Area Header Spacer -->
    <div class="pt-safe shrink-0" />

    <!-- Main View Switcher -->
    <main class="flex-1 flex flex-col overflow-hidden relative">
      <transition name="fade" mode="out-in">
        <BossView 
          v-if="activeTab === 'boss'" 
          :current-hp="currentHp"
          :max-hp="maxHp"
          :level="currentBossLevel"
          :boss-name="bossName"
          :free-hit-available="freeHitAvailable"
          :next-free-hit-time="nextFreeHitTime"
          :user-tokens="userTokens"
          @hit="handleHit"
        />
        <CharactersView 
          v-else-if="activeTab === 'characters'" 
          :current-level="currentBossLevel"
          @fight="activeTab = 'boss'"
        />
      </transition>
    </main>

    <!-- Minimalist Bottom Navigation -->
    <BottomNav 
      :active-tab="activeTab" 
      @update:active-tab="activeTab = $event" 
    />

  </div>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
