<script setup lang="ts">
import { Crosshair, LayoutGrid } from 'lucide-vue-next';

defineProps<{
  activeTab: 'boss' | 'characters'
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
  <nav class="fixed bottom-0 left-0 right-0 z-40 bg-[#07070A]/90 backdrop-blur-2xl border-t border-white/5 pb-safe select-none">
    <div class="max-w-xs mx-auto px-6 py-2 flex items-center justify-around">
      
      <!-- TAB 1: BOSS -->
      <button 
        @click="selectTab('boss')"
        class="flex-1 flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all duration-200"
        :class="activeTab === 'boss' 
          ? 'text-white' 
          : 'text-zinc-600 hover:text-zinc-400'"
      >
        <Crosshair class="w-5 h-5 transition-transform duration-200" :class="activeTab === 'boss' ? 'text-rose-500 scale-110' : ''" />
        <span class="text-[10px] font-mono tracking-widest uppercase mt-1 font-semibold">
          BOSS
        </span>
      </button>

      <div class="w-px h-5 bg-white/10"></div>

      <!-- TAB 2: CHARACTERS -->
      <button 
        @click="selectTab('characters')"
        class="flex-1 flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all duration-200"
        :class="activeTab === 'characters' 
          ? 'text-white' 
          : 'text-zinc-600 hover:text-zinc-400'"
      >
        <LayoutGrid class="w-5 h-5 transition-transform duration-200" :class="activeTab === 'characters' ? 'text-cyan-400 scale-110' : ''" />
        <span class="text-[10px] font-mono tracking-widest uppercase mt-1 font-semibold">
          CHARACTERS
        </span>
      </button>

    </div>
  </nav>
</template>
