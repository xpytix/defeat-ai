<script setup lang="ts">
import { Swords, ShieldAlert } from 'lucide-vue-next';

defineProps<{
  activeTab: 'boss' | 'bestiary'
}>();

const emit = defineEmits<{
  (e: 'update:activeTab', tab: 'boss' | 'bestiary'): void
}>();

const selectTab = (tab: 'boss' | 'bestiary') => {
  emit('update:activeTab', tab);
  // Trigger light mobile haptic if supported
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(10);
  }
};
</script>

<template>
  <nav class="fixed bottom-0 left-0 right-0 z-40 bg-cyber-surface/95 backdrop-blur-xl border-t border-cyber-border/80 pb-safe select-none transition-all">
    <div class="max-w-md mx-auto px-6 py-2.5 flex items-center justify-around">
      
      <!-- TAB 1: BOSS (ARENA) -->
      <button 
        @click="selectTab('boss')"
        class="flex-1 flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all duration-200 relative group"
        :class="activeTab === 'boss' 
          ? 'text-cyber-primary bg-cyber-primary/10 shadow-[0_0_20px_rgba(255,46,85,0.15)] border border-cyber-primary/20' 
          : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent'"
      >
        <div class="relative">
          <Swords class="w-6 h-6 transition-transform duration-200 group-active:scale-90" />
          <!-- Active Pulsing Dot -->
          <span 
            v-if="activeTab === 'boss'" 
            class="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-cyber-primary animate-ping"
          />
          <span 
            v-if="activeTab === 'boss'" 
            class="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-cyber-primary"
          />
        </div>
        <span class="text-[11px] font-black tracking-wider uppercase mt-1">
          BOSS
        </span>
      </button>

      <!-- DIVIDER -->
      <div class="w-px h-8 bg-cyber-border/60 mx-2"></div>

      <!-- TAB 2: POSTACIE (BESTIARIUSZ) -->
      <button 
        @click="selectTab('bestiary')"
        class="flex-1 flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all duration-200 relative group"
        :class="activeTab === 'bestiary' 
          ? 'text-cyber-cyan bg-cyber-cyan/10 shadow-[0_0_20px_rgba(0,240,255,0.15)] border border-cyber-cyan/20' 
          : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent'"
      >
        <div class="relative">
          <ShieldAlert class="w-6 h-6 transition-transform duration-200 group-active:scale-90" />
          <span 
            v-if="activeTab === 'bestiary'" 
            class="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-cyber-cyan animate-ping"
          />
          <span 
            v-if="activeTab === 'bestiary'" 
            class="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-cyber-cyan"
          />
        </div>
        <span class="text-[11px] font-black tracking-wider uppercase mt-1">
          POSTACIE
        </span>
      </button>

    </div>
  </nav>
</template>
