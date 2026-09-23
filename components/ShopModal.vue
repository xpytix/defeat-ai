<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
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
  Bell,
  BellRing,
  Lock,
  Unlock,
  TrendingUp,
  Flame,
  Award,
  Plus,
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
  isNotificationsEnabled?: boolean;
  stakedAmount?: number;
  stakedAt?: number;
  accumulatedStakeYield?: number;
  isStakingProcessing?: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'buyItem', item: 'sword' | 'bow'): void;
  (e: 'connectWallet'): void;
  (e: 'disconnectWallet'): void;
  (e: 'refreshBalance', address?: string): void;
  (e: 'toggleNotifications'): void;
  (e: 'stake', amount: number): void;
  (e: 'unstake', amount?: number): void;
  (e: 'claimStakeYield'): void;
}>();

const isProcessing = ref<string | null>(null);
const customStakeAmount = ref<number>(2000);
const isCustomStakeMode = ref(false);

const activeWallet = computed(() => {
  return props.walletAddress || props.playerAddress || '';
});

// Total $DEF available across in-game rewards and on-chain wallet
const totalAvailableDef = computed(() => {
  return (props.userTokens || 0) + (props.onChainTokens || 0);
});

// Staking Live Real-Time Yield Calculation (Smooth ticking animation)
const liveAccruedYield = ref<number>(props.accumulatedStakeYield || 0);
let liveYieldInterval: any = null;

const updateLiveYield = () => {
  const staked = props.stakedAmount || 0;
  const stakedTime = props.stakedAt || 0;
  const baseYield = props.accumulatedStakeYield || 0;
  if (staked <= 0 || stakedTime <= 0) {
    liveAccruedYield.value = baseYield;
    return;
  }
  const now = Date.now();
  const elapsedMs = Math.max(0, now - stakedTime);
  const newlyAccrued = (staked * 0.30 * elapsedMs) / (365.25 * 24 * 3600 * 1000);
  liveAccruedYield.value = baseYield + newlyAccrued;
};

onMounted(() => {
  liveYieldInterval = setInterval(updateLiveYield, 120);
});

onUnmounted(() => {
  if (liveYieldInterval) clearInterval(liveYieldInterval);
});

watch(() => [props.stakedAmount, props.stakedAt, props.accumulatedStakeYield], () => {
  updateLiveYield();
});

const handleStakeClick = (amount: number) => {
  emit('stake', amount);
};

const handleUnstakeClick = () => {
  emit('unstake');
};

const handleClaimYieldClick = () => {
  emit('claimStakeYield');
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

          <!-- Push Notifications Status Card -->
          <div 
            class="p-3 rounded-2xl border flex items-center justify-between gap-2.5 shadow-sm transition-all"
            :class="isWhiteTheme 
              ? (isNotificationsEnabled ? 'bg-cyan-50/50 border-cyan-500/30 shadow-cyan-500/5' : 'bg-black/[0.02] border-black/10') 
              : (isNotificationsEnabled ? 'bg-cyan-950/20 border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.1)]' : 'bg-zinc-950/80 border-white/10')"
          >
            <div class="flex items-center gap-2.5 min-w-0">
              <div 
                class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-all"
                :class="isNotificationsEnabled 
                  ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3)]' 
                  : 'bg-zinc-800/40 border-white/10 text-zinc-500'"
              >
                <BellRing v-if="isNotificationsEnabled" class="w-4 h-4 animate-bounce" />
                <Bell v-else class="w-4 h-4" />
              </div>
              <div class="min-w-0">
                <div class="text-xs font-mono font-bold flex items-center gap-1.5">
                  <span>World App Alerts</span>
                  <span 
                    class="text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase tracking-wider flex items-center gap-1"
                    :class="isNotificationsEnabled 
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                      : 'bg-zinc-800 text-zinc-400 border border-white/10'"
                  >
                    <span class="w-1.5 h-1.5 rounded-full" :class="isNotificationsEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'"></span>
                    <span>{{ isNotificationsEnabled ? 'Active' : 'Off' }}</span>
                  </span>
                </div>
                <p class="text-[9px] font-mono text-zinc-400 truncate mt-0.5">
                  Daily strike ready, boss 50% HP & new spawns
                </p>
              </div>
            </div>

            <!-- Interactive ON / OFF Switch Toggle -->
            <button
              @click="emit('toggleNotifications')"
              type="button"
              class="relative inline-flex h-7 w-14 items-center shrink-0 cursor-pointer rounded-full border transition-all duration-200 ease-in-out active:scale-95"
              :class="isNotificationsEnabled 
                ? 'bg-emerald-500 border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.35)]' 
                : (isWhiteTheme ? 'bg-zinc-200 border-zinc-300' : 'bg-zinc-800 border-zinc-700')"
            >
              <!-- Status text inside switch -->
              <span 
                class="absolute text-[9px] font-mono font-black uppercase tracking-wider select-none"
                :class="isNotificationsEnabled ? 'left-2 text-black' : 'right-2 text-zinc-400'"
              >
                {{ isNotificationsEnabled ? 'ON' : 'OFF' }}
              </span>
              <!-- Thumb Knob -->
              <span
                class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out"
                :class="isNotificationsEnabled ? 'translate-x-7.5' : 'translate-x-0.5'"
              />
            </button>
          </div>

          <!-- 2. QUANTUM STAKING VAULT (30% APY · 2K-10K $DEF) -->
          <div 
            class="p-3.5 rounded-2xl border transition-all relative overflow-hidden"
            :class="stakedAmount && stakedAmount > 0
              ? (isWhiteTheme ? 'bg-emerald-50/70 border-emerald-500/40 shadow-sm' : 'bg-gradient-to-b from-emerald-950/30 to-zinc-950 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.12)]')
              : (isWhiteTheme ? 'bg-white border-amber-500/30 shadow-sm' : 'bg-zinc-950/80 border-amber-500/30')"
          >
            <!-- Ambient Glow -->
            <div 
              class="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-[40px] pointer-events-none"
              :class="stakedAmount && stakedAmount > 0 ? 'bg-emerald-500/20' : 'bg-amber-500/15'"
            />

            <!-- Vault Header -->
            <div class="flex items-center justify-between gap-2 mb-2.5">
              <div class="flex items-center gap-1.5">
                <div 
                  class="w-6 h-6 rounded-lg flex items-center justify-center border"
                  :class="stakedAmount && stakedAmount > 0 
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' 
                    : 'bg-amber-500/20 border-amber-500/50 text-amber-400'"
                >
                  <Lock v-if="stakedAmount && stakedAmount > 0" class="w-3.5 h-3.5" />
                  <TrendingUp v-else class="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 class="text-xs font-mono font-black uppercase tracking-wider flex items-center gap-1.5">
                    <span>STAKING VAULT</span>
                    <span 
                      class="text-[9px] font-black px-1.5 py-0.2 rounded-full border animate-pulse"
                      :class="isWhiteTheme ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-amber-500/20 text-amber-400 border-amber-500/40'"
                    >
                      30.0% APY
                    </span>
                  </h4>
                </div>
              </div>

              <!-- Lock period / terms badge -->
              <span 
                class="text-[9px] font-mono font-bold px-2 py-0.5 rounded-md border flex items-center gap-1"
                :class="stakedAmount && stakedAmount >= 2000
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-sm'
                  : 'bg-zinc-800/60 text-zinc-400 border-white/10'"
              >
                <Lock class="w-3 h-3 text-amber-400" />
                <span>{{ stakedAmount && stakedAmount > 0 ? 'ACTIVE VAULT' : 'MIN 2K $DEF' }}</span>
              </span>
            </div>

            <!-- STATE A: USER HAS ACTIVE STAKE -->
            <div v-if="stakedAmount && stakedAmount > 0" class="space-y-3">
              <!-- Live Metrics Grid -->
              <div class="grid grid-cols-2 gap-2 text-xs font-mono">
                <!-- Staked Amount -->
                <div 
                  class="p-2.5 rounded-xl border flex flex-col justify-between"
                  :class="isWhiteTheme ? 'bg-white border-black/10' : 'bg-black/60 border-white/10'"
                >
                  <span class="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Currently Staked</span>
                  <div class="flex items-baseline gap-1 mt-1">
                    <span class="text-base font-black text-emerald-400">{{ formatFullNumber(stakedAmount) }}</span>
                    <span class="text-[10px] opacity-70">$DEF</span>
                  </div>
                  <span class="text-[9px] text-zinc-500">Max: 10,000 $DEF</span>
                </div>

                <!-- Live Accruing Yield -->
                <div 
                  class="p-2.5 rounded-xl border flex flex-col justify-between relative overflow-hidden"
                  :class="isWhiteTheme ? 'bg-white border-emerald-500/30' : 'bg-black/60 border-emerald-500/30'"
                >
                  <span class="text-[10px] text-emerald-400 uppercase tracking-wider font-semibold flex items-center justify-between">
                    <span>Accrued Yield</span>
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  </span>
                  <div class="flex items-baseline gap-1 mt-1">
                    <span class="text-base font-black text-amber-400 font-mono tracking-tight">
                      +{{ liveAccruedYield.toFixed(4) }}
                    </span>
                    <span class="text-[10px] opacity-70">$DEF</span>
                  </div>
                  <span class="text-[9px] text-zinc-400">
                    +{{ ((stakedAmount * 0.30) / 365.25).toFixed(2) }} $DEF / day
                  </span>
                </div>
              </div>

              <!-- Claim Yield & Unstake Action Buttons -->
              <div class="flex items-center gap-2">
                <button
                  @click="handleClaimYieldClick"
                  :disabled="liveAccruedYield < 1 || isStakingProcessing"
                  class="flex-1 py-2 px-3 rounded-xl font-mono font-black text-[11px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  :class="liveAccruedYield >= 1
                    ? (isWhiteTheme ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_15px_rgba(16,185,129,0.3)]')
                    : (isWhiteTheme ? 'bg-zinc-200 text-zinc-500 border border-black/10' : 'bg-zinc-800 text-zinc-500 border border-white/10')"
                >
                  <Sparkles class="w-3.5 h-3.5" />
                  <span>CLAIM YIELD (+{{ Math.floor(liveAccruedYield) }} $DEF)</span>
                </button>

                <button
                  @click="handleUnstakeClick"
                  :disabled="isStakingProcessing"
                  class="py-2 px-3 rounded-xl font-mono font-bold text-[11px] uppercase tracking-wider border transition-all active:scale-95 disabled:opacity-50"
                  :class="isWhiteTheme 
                    ? 'bg-zinc-100 hover:bg-zinc-200 border-black/10 text-zinc-800' 
                    : 'bg-zinc-900 hover:bg-zinc-800 border-white/15 text-zinc-300 hover:text-white'"
                  title="Withdraw staked tokens back to available balance"
                >
                  <Unlock class="w-3.5 h-3.5" />
                </button>
              </div>

              <!-- Top-up Stake if < 10,000 -->
              <div v-if="stakedAmount < 10000" class="flex items-center justify-between gap-2 pt-1 border-t border-white/5 text-[10px] font-mono">
                <span class="text-zinc-400">Increase Stake (up to 10k):</span>
                <div class="flex items-center gap-1">
                  <button
                    v-if="totalAvailableDef >= 2000 && (stakedAmount + 2000) <= 10000"
                    @click="handleStakeClick(2000)"
                    :disabled="isStakingProcessing"
                    class="px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 font-bold transition-all"
                  >
                    +2,000
                  </button>
                  <button
                    v-if="totalAvailableDef >= 500 && (stakedAmount + Math.min(totalAvailableDef, 10000 - stakedAmount)) >= 2000"
                    @click="handleStakeClick(Math.min(totalAvailableDef, 10000 - stakedAmount))"
                    :disabled="isStakingProcessing"
                    class="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 font-bold transition-all"
                  >
                    +MAX
                  </button>
                </div>
              </div>
            </div>

            <!-- STATE B: USER HAS NO ACTIVE STAKE (SHOW STAKE ONBOARDING & PRESETS) -->
            <div v-else class="space-y-2.5">
              <p class="text-[10px] font-mono leading-relaxed" :class="isWhiteTheme ? 'text-zinc-600' : 'text-zinc-400'">
                Lock <strong class="text-amber-400 font-bold">2,000 – 10,000 $DEF</strong> to generate passive yield at <strong class="text-emerald-400 font-bold">30% APY</strong> (calculated per-second).
              </p>

              <!-- In-Game + Wallet Token Balance Notice -->
              <div class="flex items-center justify-between text-[11px] font-mono px-1">
                <span class="text-zinc-400">Available Balance:</span>
                <span class="font-bold font-mono" :class="totalAvailableDef >= 2000 ? 'text-emerald-400' : 'text-amber-400'">
                  {{ formatTokens(totalAvailableDef) }} $DEF
                </span>
              </div>

              <!-- Preset Staking Buttons -->
              <div class="grid grid-cols-3 gap-1.5">
                <button
                  @click="customStakeAmount = 2000; handleStakeClick(2000)"
                  :disabled="totalAvailableDef < 2000 || isStakingProcessing"
                  class="py-2 px-1.5 rounded-xl border text-center transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                  :class="isWhiteTheme 
                    ? 'bg-zinc-100 hover:bg-emerald-50 border-black/10 text-zinc-900' 
                    : 'bg-white/5 hover:bg-emerald-950/40 border-white/10 hover:border-emerald-500/40 text-zinc-200'"
                >
                  <div class="text-xs font-mono font-black text-amber-400">2,000</div>
                  <div class="text-[8px] font-mono text-zinc-400 uppercase">MIN STAKE</div>
                </button>

                <button
                  @click="customStakeAmount = 5000; handleStakeClick(5000)"
                  :disabled="totalAvailableDef < 5000 || isStakingProcessing"
                  class="py-2 px-1.5 rounded-xl border text-center transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                  :class="isWhiteTheme 
                    ? 'bg-zinc-100 hover:bg-emerald-50 border-black/10 text-zinc-900' 
                    : 'bg-white/5 hover:bg-emerald-950/40 border-white/10 hover:border-emerald-500/40 text-zinc-200'"
                >
                  <div class="text-xs font-mono font-black text-amber-400">5,000</div>
                  <div class="text-[8px] font-mono text-zinc-400 uppercase">+125/mo</div>
                </button>

                <button
                  @click="customStakeAmount = 10000; handleStakeClick(10000)"
                  :disabled="totalAvailableDef < 10000 || isStakingProcessing"
                  class="py-2 px-1.5 rounded-xl border text-center transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                  :class="isWhiteTheme 
                    ? 'bg-zinc-100 hover:bg-emerald-50 border-black/10 text-zinc-900' 
                    : 'bg-white/5 hover:bg-emerald-950/40 border-white/10 hover:border-emerald-500/40 text-zinc-200'"
                >
                  <div class="text-xs font-mono font-black text-amber-400">10,000</div>
                  <div class="text-[8px] font-mono text-zinc-400 uppercase">MAX STAKE</div>
                </button>
              </div>

              <!-- Fallback if not enough tokens -->
              <div v-if="totalAvailableDef < 2000" class="pt-1">
                <a 
                  href="https://app.uniswap.org/swap?chain=worldchain&inputCurrency=0x2cFc85d8E48F8EAB294be644d9E25C3030863003&outputCurrency=0xb767B50e80084330Fe2bF5F2C3CA5d6E0b73B6f6"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="w-full py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 text-[10px] font-mono font-bold text-pink-400 bg-pink-500/10 border-pink-500/30 hover:bg-pink-500/20 transition-all active:scale-95"
                >
                  <span>Need $DEF? Swap on Uniswap</span>
                  <ArrowUpRight class="w-3 h-3 text-pink-400" />
                </a>
              </div>
            </div>
          </div>
        </div>

        <!-- 3. CYBER ARMORY EQUIPMENT SLOTS -->
        <div class="p-4 space-y-3.5">
          <div class="text-[10px] font-mono uppercase tracking-widest opacity-60 font-bold flex items-center justify-between">
            <span>Cyber Armory Weapons</span>
            <span>Permanent Upgrade</span>
          </div>
          
          <!-- ITEM 1: QUANTUM PLASMA BLADE -->
          <div 
            class="group relative rounded-2xl border p-3.5 transition-all duration-300 flex items-center gap-3.5 overflow-hidden"
            :class="hasSword 
              ? (isWhiteTheme 
                  ? 'bg-gradient-to-r from-cyan-50/80 via-white to-emerald-50/40 border-cyan-500/40 shadow-sm' 
                  : 'bg-gradient-to-r from-cyan-950/25 via-zinc-950 to-zinc-900 border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.15)]')
              : (isWhiteTheme 
                  ? 'bg-white border-black/10 hover:border-cyan-500/50 hover:shadow-md' 
                  : 'bg-zinc-950/90 border-white/10 hover:border-cyan-500/50 hover:shadow-[0_0_20px_rgba(6,182,212,0.1)]')"
          >
            <!-- Ambient Card Backglow -->
            <div 
              class="absolute -top-10 -left-10 w-28 h-28 rounded-full blur-[40px] pointer-events-none transition-opacity"
              :class="hasSword ? 'bg-cyan-500/20 opacity-100' : 'bg-cyan-500/10 opacity-50 group-hover:opacity-100'"
            />

            <!-- Weapon Render Box -->
            <div 
              class="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl bg-black/90 border overflow-hidden shrink-0 flex items-center justify-center relative shadow-inner p-1 group/img"
              :class="hasSword 
                ? 'border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.25)]' 
                : 'border-white/15 group-hover:border-cyan-400/50'"
            >
              <img 
                src="/items/sword.jpg" 
                alt="Quantum Plasma Blade" 
                class="w-full h-full object-cover rounded-xl transition-transform duration-500 group-hover/img:scale-110 pointer-events-none"
              />
              <!-- Energy Scanline Overlay -->
              <div class="absolute inset-0 bg-gradient-to-t from-cyan-500/20 via-transparent to-transparent pointer-events-none rounded-xl" />
            </div>

            <!-- Weapon Info -->
            <div class="flex-1 min-w-0 flex flex-col justify-between py-0.5">
              <div>
                <div class="flex items-center justify-between gap-1">
                  <h3 class="font-extrabold text-xs sm:text-sm tracking-wide truncate flex items-center gap-1.5">
                    <span :class="isWhiteTheme ? 'text-zinc-950' : 'text-white'">Plasma Blade</span>
                  </h3>
                  <span 
                    class="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md border shrink-0 tracking-wider shadow-sm"
                    :class="hasSword 
                      ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400' 
                      : (isWhiteTheme ? 'bg-cyan-100 border-cyan-300 text-cyan-950' : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400')"
                  >
                    2X DMG & DEF
                  </span>
                </div>
                <p class="text-[10px] font-mono mt-1 leading-tight" :class="isWhiteTheme ? 'text-zinc-600' : 'text-zinc-400'">
                  Deals <strong class="text-rose-400 font-bold">2x DMG</strong> & doubles all <strong class="text-amber-400 font-bold">$DEF</strong> rewards
                </p>
              </div>

              <!-- Price & Action -->
              <div class="flex items-center justify-between gap-2 mt-2">
                <span class="text-xs font-mono font-black tracking-tight" :class="isWhiteTheme ? 'text-zinc-950' : 'text-zinc-100'">
                  200 WLD
                </span>

                <button 
                  v-if="hasSword"
                  disabled
                  class="px-2.5 py-1 rounded-xl text-[10px] font-mono font-extrabold uppercase border flex items-center gap-1 cursor-default shrink-0 shadow-sm"
                  :class="isWhiteTheme 
                    ? 'bg-cyan-100 border-cyan-400 text-cyan-950' 
                    : 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.2)]'"
                >
                  <Check class="w-3 h-3 text-cyan-400" />
                  <span>EQUIPPED</span>
                </button>

                <button 
                  v-else
                  @click="handlePurchase('sword')"
                  :disabled="isProcessing === 'sword'"
                  class="px-3.5 py-1.5 rounded-xl text-[10px] font-mono font-black uppercase transition-all shadow-md active:scale-95 flex items-center gap-1 shrink-0 cursor-pointer disabled:opacity-50"
                  :class="isWhiteTheme 
                    ? 'bg-black text-white hover:bg-zinc-800 shadow-black/20' 
                    : 'bg-gradient-to-r from-cyan-400 to-blue-500 text-black hover:opacity-90 shadow-[0_0_15px_rgba(6,182,212,0.3)]'"
                >
                  <Sparkles class="w-3 h-3" />
                  <span>{{ isProcessing === 'sword' ? 'BUYING...' : 'BUY' }}</span>
                </button>
              </div>
            </div>
          </div>

          <!-- ITEM 2: TACHYON CHRONO-BOW -->
          <div 
            class="group relative rounded-2xl border p-3.5 transition-all duration-300 flex items-center gap-3.5 overflow-hidden"
            :class="hasBow 
              ? (isWhiteTheme 
                  ? 'bg-gradient-to-r from-violet-50/80 via-white to-purple-50/40 border-violet-500/40 shadow-sm' 
                  : 'bg-gradient-to-r from-violet-950/25 via-zinc-950 to-zinc-900 border-violet-500/40 shadow-[0_0_20px_rgba(168,85,247,0.15)]')
              : (isWhiteTheme 
                  ? 'bg-white border-black/10 hover:border-violet-500/50 hover:shadow-md' 
                  : 'bg-zinc-950/90 border-white/10 hover:border-violet-500/50 hover:shadow-[0_0_20px_rgba(168,85,247,0.1)]')"
          >
            <!-- Ambient Card Backglow -->
            <div 
              class="absolute -top-10 -left-10 w-28 h-28 rounded-full blur-[40px] pointer-events-none transition-opacity"
              :class="hasBow ? 'bg-violet-500/20 opacity-100' : 'bg-violet-500/10 opacity-50 group-hover:opacity-100'"
            />

            <!-- Weapon Render Box -->
            <div 
              class="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl bg-black/90 border overflow-hidden shrink-0 flex items-center justify-center relative shadow-inner p-1 group/img"
              :class="hasBow 
                ? 'border-violet-500/50 shadow-[0_0_15px_rgba(168,85,247,0.25)]' 
                : 'border-white/15 group-hover:border-violet-400/50'"
            >
              <img 
                src="/items/bow.jpg" 
                alt="Tachyon Chrono-Bow" 
                class="w-full h-full object-cover rounded-xl transition-transform duration-500 group-hover/img:scale-110 pointer-events-none"
              />
              <!-- Energy Scanline Overlay -->
              <div class="absolute inset-0 bg-gradient-to-t from-violet-500/20 via-transparent to-transparent pointer-events-none rounded-xl" />
            </div>

            <!-- Weapon Info -->
            <div class="flex-1 min-w-0 flex flex-col justify-between py-0.5">
              <div>
                <div class="flex items-center justify-between gap-1">
                  <h3 class="font-extrabold text-xs sm:text-sm tracking-wide truncate flex items-center gap-1.5">
                    <span :class="isWhiteTheme ? 'text-zinc-950' : 'text-white'">Chrono-Bow</span>
                  </h3>
                  <span 
                    class="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md border shrink-0 tracking-wider shadow-sm"
                    :class="hasBow 
                      ? 'bg-violet-500/20 border-violet-500/50 text-violet-400' 
                      : (isWhiteTheme ? 'bg-violet-100 border-violet-300 text-violet-950' : 'bg-violet-500/10 border-violet-500/30 text-violet-400')"
                  >
                    -50% COOLDOWN
                  </span>
                </div>
                <p class="text-[10px] font-mono mt-1 leading-tight" :class="isWhiteTheme ? 'text-zinc-600' : 'text-zinc-400'">
                  Strike cooldown reduced from 24h to <strong class="text-violet-400 font-bold">12h</strong>
                </p>
              </div>

              <!-- Price & Action -->
              <div class="flex items-center justify-between gap-2 mt-2">
                <span class="text-xs font-mono font-black tracking-tight" :class="isWhiteTheme ? 'text-zinc-950' : 'text-zinc-100'">
                  200 WLD
                </span>

                <button 
                  v-if="hasBow"
                  disabled
                  class="px-2.5 py-1 rounded-xl text-[10px] font-mono font-extrabold uppercase border flex items-center gap-1 cursor-default shrink-0 shadow-sm"
                  :class="isWhiteTheme 
                    ? 'bg-violet-100 border-violet-400 text-violet-950' 
                    : 'bg-violet-500/20 border-violet-500/50 text-violet-300 shadow-[0_0_10px_rgba(168,85,247,0.2)]'"
                >
                  <Check class="w-3 h-3 text-violet-400" />
                  <span>EQUIPPED</span>
                </button>

                <button 
                  v-else
                  @click="handlePurchase('bow')"
                  :disabled="isProcessing === 'bow'"
                  class="px-3.5 py-1.5 rounded-xl text-[10px] font-mono font-black uppercase transition-all shadow-md active:scale-95 flex items-center gap-1 shrink-0 cursor-pointer disabled:opacity-50"
                  :class="isWhiteTheme 
                    ? 'bg-black text-white hover:bg-zinc-800 shadow-black/20' 
                    : 'bg-gradient-to-r from-violet-400 to-fuchsia-500 text-black hover:opacity-90 shadow-[0_0_15px_rgba(168,85,247,0.3)]'"
                >
                  <Sparkles class="w-3 h-3" />
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
