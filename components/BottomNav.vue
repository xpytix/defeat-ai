<script setup lang="ts">
import { Crosshair, ShieldCheck } from 'lucide-vue-next';

defineProps<{
  activeTab?: string;
  isWhiteTheme?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:activeTab', tab: 'boss'): void;
  (e: 'openArmory'): void;
}>();

const handleArmory = () => {
  emit('openArmory');
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(10);
  }
};
</script>

<template>
  <nav 
    class="w-full shrink-0 z-40 backdrop-blur-2xl pb-safe select-none transition-colors duration-500"
    :class="isWhiteTheme 
      ? 'bg-white/95 border-t border-black/10 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]' 
      : 'bg-[#07070A]/90 border-t border-white/5'"
  >
    <div class="max-w-xs sm:max-w-sm mx-auto px-6 py-2 flex items-center justify-around">
      
      <!-- TAB 1: RAID ARENA -->
      <button 
        @click="emit('update:activeTab', 'boss')"
        class="flex-1 flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all duration-200"
        :class="isWhiteTheme ? 'text-zinc-950 font-bold' : 'text-white'"
      >
        <Crosshair 
          class="w-5 h-5 transition-transform duration-200 text-rose-500 scale-110" 
        />
        <span class="text-[10px] font-mono tracking-widest uppercase mt-1 font-semibold">
          RAID
        </span>
      </button>

      <div 
        class="w-px h-5 transition-colors"
        :class="isWhiteTheme ? 'bg-black/10' : 'bg-white/10'"
      ></div>

      <!-- TAB 2: ARMORY (Opens Shop & Gear) -->
      <button 
        @click="handleArmory"
        class="flex-1 flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all duration-200"
        :class="isWhiteTheme ? 'text-zinc-500 hover:text-zinc-900' : 'text-zinc-500 hover:text-zinc-200'"
      >
        <ShieldCheck 
          class="w-5 h-5 transition-transform duration-200 text-emerald-400" 
        />
        <span class="text-[10px] font-mono tracking-widest uppercase mt-1 font-semibold">
          ARMORY
        </span>
      </button>

    </div>
  </nav>
</template>
