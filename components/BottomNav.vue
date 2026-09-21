<script setup lang="ts">
import { Crosshair, LayoutGrid } from 'lucide-vue-next';

defineProps<{
  activeTab: 'boss' | 'characters';
  isWhiteTheme?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:activeTab', tab: 'boss' | 'characters'): void
}>();

const selectTab = (tab: 'boss' | 'characters') => {
  emit('update:activeTab', tab);
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
      
      <!-- TAB 1: BOSS -->
      <button 
        @click="selectTab('boss')"
        class="flex-1 flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all duration-200"
        :class="activeTab === 'boss' 
          ? (isWhiteTheme ? 'text-zinc-950 font-bold' : 'text-white') 
          : (isWhiteTheme ? 'text-zinc-400 hover:text-zinc-700' : 'text-zinc-600 hover:text-zinc-400')"
      >
        <Crosshair 
          class="w-5 h-5 transition-transform duration-200" 
          :class="activeTab === 'boss' ? 'text-rose-500 scale-110' : ''" 
        />
        <span class="text-[10px] font-mono tracking-widest uppercase mt-1 font-semibold">
          BOSS
        </span>
      </button>

      <div 
        class="w-px h-5 transition-colors"
        :class="isWhiteTheme ? 'bg-black/10' : 'bg-white/10'"
      ></div>

      <!-- TAB 2: CHARACTERS -->
      <button 
        @click="selectTab('characters')"
        class="flex-1 flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all duration-200"
        :class="activeTab === 'characters' 
          ? (isWhiteTheme ? 'text-zinc-950 font-bold' : 'text-white') 
          : (isWhiteTheme ? 'text-zinc-400 hover:text-zinc-700' : 'text-zinc-600 hover:text-zinc-400')"
      >
        <LayoutGrid 
          class="w-5 h-5 transition-transform duration-200" 
          :class="activeTab === 'characters' ? 'text-cyan-500 scale-110' : ''" 
        />
        <span class="text-[10px] font-mono tracking-widest uppercase mt-1 font-semibold">
          CHARACTERS
        </span>
      </button>

    </div>
  </nav>
</template>
