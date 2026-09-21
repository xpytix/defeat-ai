<script setup lang="ts">
import { ref } from 'vue';
import { X, Check, Sparkles, Coins, ShieldCheck } from 'lucide-vue-next';

const props = defineProps<{
  isOpen: boolean;
  userTokens: number;
  userWld: number;
  hasSword: boolean;
  hasBow: boolean;
  isWhiteTheme?: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'buyItem', item: 'sword' | 'bow'): void;
  (e: 'addWld', amount: number): void;
}>();

const isProcessing = ref<string | null>(null);

const handlePurchase = (item: 'sword' | 'bow') => {
  if (item === 'sword' && props.hasSword) return;
  if (item === 'bow' && props.hasBow) return;

  if (props.userWld < 200) {
    alert('Insufficient WLD balance. Click "+200" to add test funds.');
    return;
  }

  isProcessing.value = item;
  setTimeout(() => {
    isProcessing.value = null;
    emit('buyItem', item);
  }, 350);
};

const formatTokens = (val: number) => {
  if (val >= 1_000_000) {
    return (val / 1_000_000).toFixed(val % 1_000_000 === 0 ? 0 : 1) + 'M';
  }
  if (val >= 10_000) {
    return (val / 1_000).toFixed(val % 1_000 === 0 ? 0 : 1) + 'k';
  }
  return val.toLocaleString();
};
</script>

<template>
  <div 
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md select-none"
    @click.self="emit('close')"
  >
    <div 
      class="relative w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden flex flex-col transition-colors my-auto"
      :class="isWhiteTheme 
        ? 'bg-zinc-50 border-black/15 text-zinc-950' 
        : 'bg-[#09090b] border-white/15 text-white shadow-black/80'"
    >

      <!-- Modal Header -->
      <div 
        class="flex items-center justify-between px-4 py-3.5 border-b shrink-0"
        :class="isWhiteTheme ? 'border-black/10' : 'border-white/10'"
      >
        <div class="flex items-center gap-2">
          <span 
            class="text-xs font-mono font-black px-2 py-0.5 rounded border tracking-widest uppercase"
            :class="isWhiteTheme ? 'bg-black text-white border-black' : 'bg-white/10 text-white border-white/20'"
          >
            SHOP
          </span>
          <span class="text-xs font-mono tracking-wider font-bold uppercase opacity-80">
            Resistance Armory
          </span>
        </div>

        <button 
          @click="emit('close')"
          class="w-7 h-7 rounded-lg flex items-center justify-center border transition-all active:scale-90"
          :class="isWhiteTheme 
            ? 'bg-black/5 hover:bg-black/10 border-black/10 text-zinc-700' 
            : 'bg-white/5 hover:bg-white/15 border-white/10 text-zinc-400 hover:text-white'"
        >
          <X class="w-3.5 h-3.5" />
        </button>
      </div>

      <!-- Balances Bar -->
      <div 
        class="px-4 py-2 flex items-center justify-between border-b text-xs font-mono shrink-0"
        :class="isWhiteTheme ? 'bg-black/[0.02] border-black/10' : 'bg-white/[0.02] border-white/5'"
      >
        <!-- WLD Balance & Test Faucet -->
        <div class="flex items-center gap-1.5">
          <span class="text-[10px] uppercase opacity-50 font-semibold">Wallet:</span>
          <span class="font-black" :class="isWhiteTheme ? 'text-zinc-900' : 'text-zinc-100'">
            {{ userWld.toLocaleString() }} WLD
          </span>
          <button 
            @click="emit('addWld', 200)"
            class="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border transition-all active:scale-95 ml-1"
            :class="isWhiteTheme 
              ? 'bg-emerald-50 border-emerald-500/30 text-emerald-700 hover:bg-emerald-100' 
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'"
            title="Add test WLD tokens"
          >
            +200
          </button>
        </div>

        <!-- DEF Balance -->
        <div class="flex items-center gap-1 text-amber-500 font-bold">
          <Coins class="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span>{{ formatTokens(userTokens) }} $DEF</span>
        </div>
      </div>

      <!-- Items List (Clean & Minimalist matching app theme) -->
      <div class="p-3.5 space-y-3 overflow-y-auto">
        
        <!-- ITEM 1: QUANTUM PLASMA BLADE -->
        <div 
          class="rounded-xl border p-3 transition-all flex items-center gap-3"
          :class="hasSword 
            ? (isWhiteTheme ? 'bg-emerald-50/60 border-emerald-500/40' : 'bg-emerald-950/15 border-emerald-500/40')
            : (isWhiteTheme ? 'bg-white border-black/10 shadow-sm' : 'bg-zinc-900/40 border-white/10 hover:border-cyan-500/40')"
        >
          <!-- Weapon Render on Pure Black Background -->
          <div 
            class="w-20 h-20 sm:w-22 sm:h-22 rounded-xl bg-black border border-white/10 overflow-hidden shrink-0 flex items-center justify-center relative p-1 shadow-inner"
          >
            <img 
              src="/items/sword.png" 
              alt="Plasma Blade" 
              class="w-full h-full object-contain pointer-events-none transition-transform group-hover:scale-105"
            />
          </div>

          <!-- Weapon Info -->
          <div class="flex-1 min-w-0 flex flex-col justify-between h-20 sm:h-22 py-0.5">
            <div>
              <div class="flex items-center justify-between gap-1">
                <h3 class="font-extrabold text-xs sm:text-sm tracking-wide truncate">
                  Plasma Blade
                </h3>
                <span 
                  class="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border shrink-0"
                  :class="hasSword 
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' 
                    : (isWhiteTheme ? 'bg-black/5 border-black/15 text-zinc-700' : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400')"
                >
                  2X DMG & DEF
                </span>
              </div>
              <p class="text-[10px] font-mono mt-0.5 leading-tight" :class="isWhiteTheme ? 'text-zinc-600' : 'text-zinc-400'">
                Deals <strong class="text-rose-400">-2 HP</strong> & grants <strong class="text-amber-400">+40 $DEF</strong> per strike
              </p>
            </div>

            <!-- Price & Button -->
            <div class="flex items-center justify-between gap-2 mt-auto">
              <span class="text-xs font-mono font-black" :class="isWhiteTheme ? 'text-zinc-900' : 'text-zinc-200'">
                200 WLD
              </span>

              <button 
                v-if="hasSword"
                disabled
                class="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase border flex items-center gap-1 cursor-default shrink-0"
                :class="isWhiteTheme ? 'bg-emerald-100 border-emerald-400 text-emerald-800' : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'"
              >
                <Check class="w-3 h-3" />
                <span>EQUIPPED</span>
              </button>

              <button 
                v-else
                @click="handlePurchase('sword')"
                :disabled="isProcessing === 'sword'"
                class="px-3 py-1 rounded-lg text-[10px] font-mono font-black uppercase transition-all shadow-sm active:scale-95 flex items-center gap-1 shrink-0"
                :class="isWhiteTheme 
                  ? 'bg-black text-white hover:bg-zinc-800' 
                  : 'bg-white text-black hover:bg-zinc-200'"
              >
                <Sparkles class="w-2.5 h-2.5" />
                <span>{{ isProcessing === 'sword' ? 'BUYING...' : 'BUY' }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- ITEM 2: TACHYON CHRONO-BOW -->
        <div 
          class="rounded-xl border p-3 transition-all flex items-center gap-3"
          :class="hasBow 
            ? (isWhiteTheme ? 'bg-emerald-50/60 border-emerald-500/40' : 'bg-emerald-950/15 border-emerald-500/40')
            : (isWhiteTheme ? 'bg-white border-black/10 shadow-sm' : 'bg-zinc-900/40 border-white/10 hover:border-violet-500/40')"
        >
          <!-- Weapon Render on Pure Black Background -->
          <div 
            class="w-20 h-20 sm:w-22 sm:h-22 rounded-xl bg-black border border-white/10 overflow-hidden shrink-0 flex items-center justify-center relative p-1 shadow-inner"
          >
            <img 
              src="/items/bow.png" 
              alt="Chrono-Bow" 
              class="w-full h-full object-contain pointer-events-none transition-transform group-hover:scale-105"
            />
          </div>

          <!-- Weapon Info -->
          <div class="flex-1 min-w-0 flex flex-col justify-between h-20 sm:h-22 py-0.5">
            <div>
              <div class="flex items-center justify-between gap-1">
                <h3 class="font-extrabold text-xs sm:text-sm tracking-wide truncate">
                  Chrono-Bow
                </h3>
                <span 
                  class="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border shrink-0"
                  :class="hasBow 
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' 
                    : (isWhiteTheme ? 'bg-black/5 border-black/15 text-zinc-700' : 'bg-violet-500/10 border-violet-500/30 text-violet-400')"
                >
                  -50% COOLDOWN
                </span>
              </div>
              <p class="text-[10px] font-mono mt-0.5 leading-tight" :class="isWhiteTheme ? 'text-zinc-600' : 'text-zinc-400'">
                Strike cooldown reduced from 24h to <strong class="text-violet-400">12h</strong>
              </p>
            </div>

            <!-- Price & Button -->
            <div class="flex items-center justify-between gap-2 mt-auto">
              <span class="text-xs font-mono font-black" :class="isWhiteTheme ? 'text-zinc-900' : 'text-zinc-200'">
                200 WLD
              </span>

              <button 
                v-if="hasBow"
                disabled
                class="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase border flex items-center gap-1 cursor-default shrink-0"
                :class="isWhiteTheme ? 'bg-emerald-100 border-emerald-400 text-emerald-800' : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'"
              >
                <Check class="w-3 h-3" />
                <span>EQUIPPED</span>
              </button>

              <button 
                v-else
                @click="handlePurchase('bow')"
                :disabled="isProcessing === 'bow'"
                class="px-3 py-1 rounded-lg text-[10px] font-mono font-black uppercase transition-all shadow-sm active:scale-95 flex items-center gap-1 shrink-0"
                :class="isWhiteTheme 
                  ? 'bg-black text-white hover:bg-zinc-800' 
                  : 'bg-white text-black hover:bg-zinc-200'"
              >
                <Sparkles class="w-2.5 h-2.5" />
                <span>{{ isProcessing === 'bow' ? 'BUYING...' : 'BUY' }}</span>
              </button>
            </div>
          </div>
        </div>

      </div>

      <!-- Footer Info Note -->
      <div 
        class="px-4 py-2.5 border-t text-[10px] font-mono text-center opacity-60 flex items-center justify-center gap-1.5 shrink-0"
        :class="isWhiteTheme ? 'border-black/10 bg-black/[0.02]' : 'border-white/10 bg-white/[0.02]'"
      >
        <ShieldCheck class="w-3.5 h-3.5 text-emerald-500 shrink-0" />
        <span>Permanent World Chain equipment · Automatically active</span>
      </div>

    </div>
  </div>
</template>
