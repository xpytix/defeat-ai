<script setup lang="ts">
import { ref, computed } from 'vue';
import { 
  X, 
  Check, 
  Sparkles, 
  Coins, 
  ShieldCheck, 
  ArrowUpRight, 
  Wallet, 
  RefreshCw, 
  LogOut,
  Link as LinkIcon 
} from 'lucide-vue-next';

const props = defineProps<{
  isOpen: boolean;
  userTokens?: number;
  onChainTokens?: number;         // Live balance on World Chain
  walletAddress?: string;         // Connected World Chain wallet
  playerAddress?: string;         // Fallback alias
  isFetchingBalance?: boolean;    // Loading indicator
  hasSword: boolean;
  hasBow: boolean;
  isWhiteTheme?: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'buyItem', item: 'sword' | 'bow'): void;
  (e: 'connectWallet'): void;
  (e: 'disconnectWallet'): void;
  (e: 'refreshBalance', address?: string): void;
}>();

const isProcessing = ref<string | null>(null);

const activeWallet = computed(() => {
  return props.walletAddress || props.playerAddress || '';
});

const handlePurchase = (item: 'sword' | 'bow') => {
  if (item === 'sword' && props.hasSword) return;
  if (item === 'bow' && props.hasBow) return;

  isProcessing.value = item;
  setTimeout(() => {
    isProcessing.value = null;
    emit('buyItem', item);
  }, 200);
};

const formatTokens = (val?: number) => {
  if (val === undefined || val === null || isNaN(val)) return '0';
  if (val >= 1_000_000_000) {
    return (val / 1_000_000_000).toFixed(val % 1_000_000_000 === 0 ? 0 : 2) + 'B';
  }
  if (val >= 1_000_000) {
    return (val / 1_000_000).toFixed(val % 1_000_000 === 0 ? 0 : 2) + 'M';
  }
  if (val >= 100_000) {
    return (val / 1_000).toFixed(0) + 'k';
  }
  if (val >= 10_000) {
    return (val / 1_000).toFixed(val % 1_000 === 0 ? 0 : 1) + 'k';
  }
  return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

const formatFullNumber = (val?: number) => {
  if (val === undefined || val === null || isNaN(val)) return '0';
  return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
};
</script>

<template>
  <div 
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md select-none"
    @click.self="emit('close')"
  >
    <div 
      class="relative w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden flex flex-col transition-colors my-auto max-h-[90dvh]"
      :class="isWhiteTheme 
        ? 'bg-zinc-50 border-black/15 text-zinc-950' 
        : 'bg-[#09090b] border-white/15 text-white shadow-black/80'"
    >

      <!-- Modal Header -->
      <div 
        class="flex items-center justify-between px-4 py-3 border-b shrink-0"
        :class="isWhiteTheme ? 'border-black/10' : 'border-white/10'"
      >
        <div class="flex items-center gap-2">
          <span 
            class="text-xs font-mono font-black px-2 py-0.5 rounded border tracking-widest uppercase"
            :class="isWhiteTheme ? 'bg-black text-white border-black' : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'"
          >
            TREASURY & ARMORY
          </span>
          <span class="text-xs font-mono tracking-wider font-bold uppercase opacity-80">
            World Chain
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

      <div class="overflow-y-auto flex-1 min-h-0 divide-y divide-white/5">

        <!-- 1. LIVE WORLD CHAIN WALLET & $DEF BALANCE SECTION -->
        <div 
          class="p-4 flex flex-col gap-3 transition-colors"
          :class="isWhiteTheme ? 'bg-amber-500/[0.04]' : 'bg-gradient-to-b from-amber-500/[0.06] to-transparent'"
        >
          <!-- Wallet Address Status Row -->
          <div class="flex items-center justify-between gap-2 text-xs font-mono">
            <div class="flex items-center gap-1.5 min-w-0">
              <span 
                class="w-2 h-2 rounded-full shrink-0"
                :class="activeWallet ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'"
              />
              <span v-if="activeWallet" class="font-bold truncate" :title="activeWallet">
                {{ activeWallet.slice(0, 6) }}...{{ activeWallet.slice(-4) }}
              </span>
              <span v-else class="text-zinc-400 text-[11px]">
                No wallet connected
              </span>

            </div>

            <!-- Connect / Refresh Buttons -->
            <div class="flex items-center gap-1 shrink-0">
              <button
                v-if="!activeWallet"
                @click="emit('connectWallet')"
                class="px-2.5 py-1 rounded-md bg-amber-500 text-black font-black text-[10px] tracking-wide uppercase hover:bg-amber-400 active:scale-95 transition-all flex items-center gap-1"
              >
                <Wallet class="w-3 h-3" />
                <span>Connect</span>
              </button>

              <div v-else class="flex items-center gap-1">
                <button
                  @click="emit('refreshBalance', activeWallet)"
                  :disabled="isFetchingBalance"
                  class="p-1 rounded-md border text-zinc-400 hover:text-white transition-all active:scale-95"
                  :class="isWhiteTheme ? 'border-black/10 bg-white' : 'border-white/10 bg-white/5'"
                  title="Refresh on-chain balance"
                >
                  <RefreshCw class="w-3 h-3" :class="{ 'animate-spin': isFetchingBalance }" />
                </button>

                <button
                  @click="emit('disconnectWallet')"
                  class="p-1 rounded-md border text-zinc-400 hover:text-rose-400 transition-all active:scale-95"
                  :class="isWhiteTheme ? 'border-black/10 bg-white' : 'border-white/10 bg-white/5'"
                  title="Disconnect / Log out"
                >
                  <LogOut class="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>


          <!-- Live On-Chain Balance Display Card -->
          <div 
            class="p-3.5 rounded-xl border flex items-center justify-between gap-3 shadow-inner"
            :class="isWhiteTheme 
              ? 'bg-white border-amber-500/30' 
              : 'bg-zinc-950/80 border-amber-500/25'"
          >
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                <Coins class="w-5 h-5 text-amber-500" />
              </div>
              <div class="min-w-0">
                <div class="flex items-baseline gap-1.5 flex-wrap">
                  <span class="text-lg sm:text-xl font-mono font-black tracking-tight text-amber-500">
                    {{ formatTokens(onChainTokens) }}
                  </span>
                  <span class="text-xs font-mono font-bold opacity-70">$DEF</span>
                </div>
                <p class="text-[10px] font-mono text-zinc-400 truncate">
                  Live On-Chain Balance (World Chain)
                </p>
              </div>
            </div>

            <!-- Quick Trade / Scan Links -->
            <div class="flex flex-col gap-1 shrink-0">
              <a 
                href="https://app.uniswap.org/swap?chain=worldchain&inputCurrency=0x2cFc85d8E48F8EAB294be644d9E25C3030863003&outputCurrency=0xb767B50e80084330Fe2bF5F2C3CA5d6E0b73B6f6"
                target="_blank"
                rel="noopener noreferrer"
                class="text-[10px] font-mono font-bold px-2 py-1 rounded-md border flex items-center justify-center gap-1 transition-all active:scale-95"
                :class="isWhiteTheme ? 'bg-zinc-100 border-black/10 text-zinc-900 hover:bg-zinc-200' : 'bg-white/5 border-white/10 text-zinc-200 hover:bg-white/10'"
              >
                <span>Uniswap</span>
                <ArrowUpRight class="w-2.5 h-2.5 text-pink-500" />
              </a>
              <a 
                :href="`https://worldscan.org/token/0xb767B50e80084330Fe2bF5F2C3CA5d6E0b73B6f6${activeWallet ? '?a=' + activeWallet : ''}`"
                target="_blank"
                rel="noopener noreferrer"
                class="text-[9px] font-mono opacity-60 hover:opacity-100 text-center transition-opacity"
              >
                Worldscan ↗
              </a>
            </div>
          </div>

          <!-- Exact token count subtitle if > 100k -->
          <div v-if="onChainTokens && onChainTokens > 10000" class="text-[10px] font-mono opacity-50 px-1">
            Exact: {{ formatFullNumber(onChainTokens) }} $DEF
          </div>
        </div>

        <!-- 3. CYBER ARMORY EQUIPMENT SLOTS -->
        <div class="p-4 space-y-3">
          <div class="text-[10px] font-mono uppercase tracking-widest opacity-60 font-bold flex items-center justify-between">
            <span>Cyber Armory Equipment</span>
            <span>Permanent Upgrade</span>
          </div>
          
          <!-- ITEM 1: QUANTUM PLASMA BLADE -->
          <div 
            class="rounded-xl border p-3 transition-all flex items-center gap-3"
            :class="hasSword 
              ? (isWhiteTheme ? 'bg-emerald-50/60 border-emerald-500/40' : 'bg-emerald-950/15 border-emerald-500/40')
              : (isWhiteTheme ? 'bg-white border-black/10 shadow-sm' : 'bg-zinc-900/40 border-white/10 hover:border-cyan-500/40')"
          >
            <!-- Weapon Render -->
            <div 
              class="w-20 h-20 rounded-xl bg-black border border-white/10 overflow-hidden shrink-0 flex items-center justify-center relative p-1 shadow-inner"
            >
              <img 
                src="/items/sword.png" 
                alt="Plasma Blade" 
                class="w-full h-full object-contain pointer-events-none"
              />
            </div>

            <!-- Weapon Info -->
            <div class="flex-1 min-w-0 flex flex-col justify-between h-20 py-0.5">
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
            <!-- Weapon Render -->
            <div 
              class="w-20 h-20 rounded-xl bg-black border border-white/10 overflow-hidden shrink-0 flex items-center justify-center relative p-1 shadow-inner"
            >
              <img 
                src="/items/bow.png" 
                alt="Chrono-Bow" 
                class="w-full h-full object-contain pointer-events-none"
              />
            </div>

            <!-- Weapon Info -->
            <div class="flex-1 min-w-0 flex flex-col justify-between h-20 py-0.5">
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

      </div>

      <!-- Footer Info Note -->
      <div 
        class="px-4 py-2.5 border-t text-[10px] font-mono text-center opacity-60 flex items-center justify-center gap-1.5 shrink-0"
        :class="isWhiteTheme ? 'border-black/10 bg-black/[0.02]' : 'border-white/10 bg-white/[0.02]'"
      >
        <ShieldCheck class="w-3.5 h-3.5 text-emerald-500 shrink-0" />
        <span>World Chain Smart Contract Integration · Verified Humans</span>
      </div>

    </div>
  </div>
</template>
