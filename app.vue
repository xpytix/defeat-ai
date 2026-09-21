<script setup lang="ts">
import { ref, onMounted } from 'vue';
import BossView from '~/components/BossView.vue';
import CharactersView from '~/components/CharactersView.vue';
import BottomNav from '~/components/BottomNav.vue';

// Navigation State
const activeTab = ref<'boss' | 'characters'>('boss');
const toastMessage = ref<string | null>(null);

// Game State
const currentBossLevel = ref(1);
const maxHp = ref(50);
const currentHp = ref(42);
const bossName = ref('Synthetic Core');
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

// Handle Hit from BossView
const handleHit = (type: 'free' | 'power') => {
  if (type === 'free') {
    if (!freeHitAvailable.value) {
      showToast('Daily strike available once every 24h');
      return;
    }
    freeHitAvailable.value = false;
    const expiry = Date.now() + 24 * 60 * 60 * 1000;
    nextFreeHitTime.value = expiry;
    if (typeof window !== 'undefined') {
      localStorage.setItem('defeat_ai_last_free_hit', Date.now().toString());
    }
    showToast('Strike confirmed (-1 HP)');
  } else {
    showToast('Power Strike confirmed (-1 HP)');
  }

  // Deduct HP
  if (currentHp.value > 0) {
    currentHp.value -= 1;
    if (typeof window !== 'undefined') {
      localStorage.setItem('defeat_ai_current_hp', currentHp.value.toString());
    }

    // Boss Defeated
    if (currentHp.value <= 0) {
      showToast('Boss defeated! Tokens unlocked');
      setTimeout(() => {
        currentBossLevel.value += 1;
        maxHp.value = 100;
        currentHp.value = 100;
        bossName.value = 'Neural Weaver';
        if (typeof window !== 'undefined') {
          localStorage.setItem('defeat_ai_current_hp', '100');
        }
      }, 1500);
    }
  }
};
</script>

<template>
  <div class="h-[100dvh] max-h-[100dvh] w-screen overflow-hidden flex flex-col bg-[#07070A] text-white font-sans select-none relative">
    
    <!-- Top Ambient Glow -->
    <div class="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-32 bg-rose-600/10 rounded-full blur-[80px] pointer-events-none -z-10" />

    <!-- Sleek Minimal Floating Toast -->
    <transition name="fade">
      <div v-if="toastMessage" class="fixed top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
        <div class="px-4 py-2 bg-[#12121A]/95 border border-white/10 rounded-full shadow-2xl backdrop-blur-xl text-center text-xs font-mono font-bold tracking-wider text-zinc-200">
          {{ toastMessage }}
        </div>
      </div>
    </transition>

    <!-- Clean Safe-Area Header Spacer (No Clutter) -->
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
