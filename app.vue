<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ShieldCheck, Flame, Users, Sparkles, CheckCircle2 } from 'lucide-vue-next';
import BossView from '~/components/BossView.vue';
import BestiaryView from '~/components/BestiaryView.vue';
import BottomNav from '~/components/BottomNav.vue';

// Navigation State
const activeTab = ref<'boss' | 'bestiary'>('boss');

// World ID State
const isWorldIdVerified = ref(true);
const toastMessage = ref<string | null>(null);

// Game State
const currentBossLevel = ref(1);
const maxHp = ref(50);
const currentHp = ref(42);
const bossName = ref('Synthetic Clone v0.1');
const freeHitAvailable = ref(true);
const nextFreeHitTime = ref<number | null>(null);

// Toast helper
const showToast = (msg: string) => {
  toastMessage.value = msg;
  setTimeout(() => {
    if (toastMessage.value === msg) toastMessage.value = null;
  }, 3000);
};

// Load saved state from localStorage
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
      showToast('⚠️ Darmowy cios jest dostępny raz na 24h!');
      return;
    }
    freeHitAvailable.value = false;
    const expiry = Date.now() + 24 * 60 * 60 * 1000;
    nextFreeHitTime.value = expiry;
    if (typeof window !== 'undefined') {
      localStorage.setItem('defeat_ai_last_free_hit', Date.now().toString());
    }
    showToast('💥 Zadałeś darmowy cios! (-1 HP)');
  } else {
    showToast('⚡ Zadałeś Power Strike (2 WLD)! (-1 HP)');
  }

  // Deduct HP
  if (currentHp.value > 0) {
    currentHp.value -= 1;
    if (typeof window !== 'undefined') {
      localStorage.setItem('defeat_ai_current_hp', currentHp.value.toString());
    }

    // Boss Defeated!
    if (currentHp.value <= 0) {
      showToast('🎉 BOSS POKONANY! Nagrody w tokenach zostały odblokowane!');
      setTimeout(() => {
        currentBossLevel.value += 1;
        maxHp.value = 100;
        currentHp.value = 100;
        bossName.value = 'Deepfake Weaver';
        if (typeof window !== 'undefined') {
          localStorage.setItem('defeat_ai_current_hp', '100');
        }
      }, 1500);
    }
  }
};
</script>

<template>
  <div class="h-[100dvh] max-h-[100dvh] w-screen overflow-hidden flex flex-col bg-cyber-bg text-white font-sans select-none relative">
    
    <!-- TOP AMBIENT GLOW -->
    <div class="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-40 bg-cyber-primary/10 rounded-full blur-[90px] pointer-events-none -z-10" />

    <!-- FLOATING TOAST NOTIFICATION -->
    <transition name="fade">
      <div v-if="toastMessage" class="fixed top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none w-[90%] max-w-sm">
        <div class="flex items-center gap-2.5 px-4 py-2.5 bg-cyber-surface/95 border border-cyber-primary/40 rounded-2xl shadow-[0_10px_25px_rgba(0,0,0,0.5)] backdrop-blur-xl pointer-events-auto">
          <Sparkles class="w-4 h-4 text-cyber-primary shrink-0" />
          <span class="text-xs font-bold text-white tracking-wide">
            {{ toastMessage }}
          </span>
        </div>
      </div>
    </transition>

    <!-- HEADER / TOP BAR (SAFE AREA TOP) -->
    <header class="pt-safe px-4 pt-3 pb-2.5 shrink-0 border-b border-cyber-border/40 bg-cyber-bg/80 backdrop-blur-md z-30">
      <div class="max-w-md mx-auto flex items-center justify-between">
        
        <!-- BRAND -->
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-cyber-primary to-rose-700 flex items-center justify-center shadow-[0_0_15px_rgba(255,46,85,0.4)]">
            <Flame class="w-5 h-5 text-white fill-white" />
          </div>
          <div>
            <div class="flex items-center gap-1.5">
              <h1 class="text-sm font-black tracking-wider text-white">HUMAN VS AI</h1>
              <span class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyber-primary/20 text-cyber-primary font-bold border border-cyber-primary/30">
                LTS
              </span>
            </div>
            <p class="text-[10px] font-mono text-zinc-400 tracking-wider">THE RESISTANCE</p>
          </div>
        </div>

        <!-- WORLD ID VERIFICATION BADGE -->
        <div 
          class="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-mono font-bold"
          :class="isWorldIdVerified 
            ? 'bg-cyber-emerald/10 border-cyber-emerald/30 text-cyber-emerald' 
            : 'bg-zinc-800 border-zinc-700 text-zinc-400'"
        >
          <ShieldCheck class="w-3.5 h-3.5" />
          <span>{{ isWorldIdVerified ? 'CZŁOWIEK' : 'GOŚĆ' }}</span>
          <span class="w-1.5 h-1.5 rounded-full bg-cyber-emerald animate-pulse"></span>
        </div>

      </div>

      <!-- RAID INFO SUBBAR -->
      <div class="max-w-md mx-auto mt-2 flex items-center justify-between text-[10px] font-mono text-zinc-400 px-1">
        <span class="flex items-center gap-1">
          <Users class="w-3 h-3 text-cyber-cyan" />
          <span>W RAIDZIE: <strong class="text-white">1 420 LUDZI</strong></span>
        </span>
        <span class="flex items-center gap-1 text-cyber-primary">
          <span class="w-1.5 h-1.5 rounded-full bg-cyber-primary animate-ping"></span>
          <span>1 CZŁOWIEK = 1 CIOS / 24H</span>
        </span>
      </div>
    </header>

    <!-- MAIN VIEW AREA -->
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
        <BestiaryView 
          v-else-if="activeTab === 'bestiary'" 
          :current-boss-level="currentBossLevel"
        />
      </transition>
    </main>

    <!-- BOTTOM NAVIGATION (WORLD APP RULES) -->
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
