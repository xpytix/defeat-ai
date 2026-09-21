<script setup lang="ts">
import { ref } from 'vue';
import { X, Check, Sparkles, Coins, ShieldCheck, ExternalLink, ArrowUpRight, Wallet } from 'lucide-vue-next';

const props = defineProps<{
  isOpen: boolean;
  userTokens: number;
  hasSword: boolean;
  hasBow: boolean;
  isWhiteTheme?: boolean;
  playerAddress?: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'buyItem', item: 'sword' | 'bow'): void;
  (e: 'claim', data: { amount: number; address: string }): void;
}>();

const isProcessing = ref<string | null>(null);
const showClaimInput = ref(false);
const claimAddressInput = ref('');

const handleStartClaim = () => {
  if (props.playerAddress && props.playerAddress.startsWith('0x')) {
    claimAddressInput.value = props.playerAddress;
  }
  showClaimInput.value = !showClaimInput.value;
};

const handleConfirmClaim = () => {
  const targetAddress = claimAddressInput.value.trim() || props.playerAddress || '';
  if (!targetAddress || !targetAddress.startsWith('0x') || targetAddress.length !== 42) {
    alert('Please enter a valid World Chain wallet address (0x...)');
    return;
  }
  if (props.userTokens < 20) {
    alert('Minimum claim is 20 $DEF tokens.');
    return;
  }
  emit('claim', { amount: props.userTokens, address: targetAddress });
  showClaimInput.value = false;
};

const handlePurchase = (item: 'sword' | 'bow') => {
  if (item === 'sword' && props.hasSword) return;
  if (item === 'bow' && props.hasBow) return;

  isProcessing.value = item;
  setTimeout(() => {
    isProcessing.value = null;
    emit('buyItem', item);
  }, 200);
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
            :class="isWhiteTheme ? 'bg-black text-white border-black' : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'"
          >
            EQUIPMENT
          </span>
          <span class="text-xs font-mono tracking-wider font-bold uppercase opacity-80">
            Armory & Active Gear
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

      <!-- Status & DEF Balance Bar -->
      <div 
        class="px-4 py-2.5 flex items-center justify-between border-b text-xs font-mono shrink-0"
        :class="isWhiteTheme ? 'bg-black/[0.02] border-black/10' : 'bg-white/[0.02] border-white/5'"
      >
        <!-- Native Payment Badge -->
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span class="text-[11px] font-semibold tracking-wide" :class="isWhiteTheme ? 'text-zinc-800' : 'text-zinc-200'">
            World App Pay
          </span>
          <span class="text-[10px] opacity-50">· World Chain</span>
        </div>

        <!-- DEF Balance -->
        <div class="flex items-center gap-1 text-amber-500 font-bold">
          <Coins class="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span>{{ formatTokens(userTokens) }} $DEF</span>
        </div>
      </div>

      <!-- DEF Community Rewards & Uniswap Actions Bar -->
      <div 
        class="px-4 py-2.5 border-b text-xs flex flex-col gap-2 shrink-0 transition-colors"
        :class="isWhiteTheme ? 'bg-amber-500/[0.04] border-black/10' : 'bg-amber-500/[0.03] border-white/5'"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1.5">
            <span class="font-mono text-[11px] font-bold text-amber-500">Community $DEF Pool</span>
          </div>

          <div class="flex items-center gap-1.5">
            <!-- Uniswap Link -->
            <a 
              href="https://app.uniswap.org/swap?chain=worldchain&inputCurrency=0x2cFc85d8E48F8EAB294be644d9E25C3030863003&outputCurrency=0xb767B50e80084330Fe2bF5F2C3CA5d6E0b73B6f6" 
              target="_blank" 
              rel="noopener noreferrer"
              class="text-[10px] font-mono font-bold px-2 py-1 rounded-md border flex items-center gap-1 transition-all active:scale-95"
              :class="isWhiteTheme ? 'bg-white border-black/15 text-zinc-800 hover:bg-black/5' : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10'"
            >
              <span>Uniswap</span>
              <ArrowUpRight class="w-3 h-3 text-pink-500" />
            </a>

            <!-- Claim to Wallet Button -->
            <button 
              @click="handleStartClaim"
              :disabled="userTokens < 20"
              class="text-[10px] font-mono font-black px-2.5 py-1 rounded-md border flex items-center gap-1 transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
              :class="isWhiteTheme 
                ? 'bg-amber-500 text-black border-amber-600 hover:bg-amber-400' 
                : 'bg-amber-500/20 text-amber-400 border-amber-500/40 hover:bg-amber-500/30'"
            >
              <Wallet class="w-3 h-3" />
              <span>Claim</span>
            </button>
          </div>
        </div>

        <!-- Inline Claim Input Form -->
        <div v-if="showClaimInput" class="p-2.5 rounded-xl border flex flex-col gap-2 mt-1"
          :class="isWhiteTheme ? 'bg-white border-black/10' : 'bg-black/60 border-white/10'">
          <div class="flex items-center justify-between text-[10px] font-mono">
            <span class="opacity-70">Transfer to World Chain Address:</span>
            <span class="font-bold text-amber-400">{{ userTokens }} $DEF available</span>
          </div>
          <div class="flex items-center gap-2">
            <input 
              v-model="claimAddressInput" 
              placeholder="0x... your wallet address" 
              class="flex-1 bg-transparent border rounded-lg px-2.5 py-1 text-xs font-mono outline-none focus:border-amber-500"
              :class="isWhiteTheme ? 'border-black/20 text-black' : 'border-white/20 text-white'"
            />
            <button 
              @click="handleConfirmClaim"
              class="px-3 py-1 bg-amber-500 text-black font-black rounded-lg text-xs font-mono active:scale-95 transition-all"
            >
              Send
            </button>
          </div>
        </div>
      </div>

      <!-- Items List (Clean & Minimalist matching app theme) -->
      <div class="p-3.5 space-y-2.5 overflow-y-auto">
        <div class="text-[10px] font-mono uppercase tracking-widest opacity-60 px-1 font-bold flex items-center justify-between">
          <span>Active Equipment Slots</span>
          <span>World Chain</span>
        </div>
        
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
