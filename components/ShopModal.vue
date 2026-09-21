<script setup lang="ts">
import { ref } from 'vue';
import { X, Swords, Zap, Check, ShieldCheck, Sparkles, Coins, ShoppingBag } from 'lucide-vue-next';

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
    alert('Insufficient WLD balance. Click "+200 WLD" to add test funds!');
    return;
  }

  isProcessing.value = item;
  setTimeout(() => {
    isProcessing.value = null;
    emit('buyItem', item);
  }, 400);
};
</script>

<template>
  <div 
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xl select-none overflow-y-auto"
    @click.self="emit('close')"
  >
    <div 
      class="relative w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden flex flex-col transition-colors my-auto max-h-[92dvh]"
      :class="isWhiteTheme 
        ? 'bg-zinc-50 border-black/15 text-zinc-950 shadow-black/10' 
        : 'bg-[#0B0C12] border-white/15 text-white shadow-cyan-500/10 ring-1 ring-white/10'"
    >
      
      <!-- Top Cyber Decors -->
      <div 
        class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-amber-500 to-violet-500"
      />

      <!-- Modal Header -->
      <div class="flex items-center justify-between p-4 sm:p-5 border-b shrink-0"
        :class="isWhiteTheme ? 'border-black/10' : 'border-white/10'"
      >
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-xl flex items-center justify-center border shadow-sm"
            :class="isWhiteTheme ? 'bg-black text-white border-black/20' : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'"
          >
            <ShoppingBag class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-sm sm:text-base font-black tracking-wider uppercase flex items-center gap-1.5 font-mono">
              <span>CYBER ARMORY</span>
              <span class="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30">
                STORE
              </span>
            </h2>
            <p class="text-[10px] font-mono tracking-wide opacity-60">
              UPGRADE YOUR RESISTANCE ARSENAL
            </p>
          </div>
        </div>

        <!-- Close Button -->
        <button 
          @click="emit('close')"
          class="w-8 h-8 rounded-full flex items-center justify-center border transition-all active:scale-90"
          :class="isWhiteTheme 
            ? 'bg-black/5 hover:bg-black/10 border-black/10 text-zinc-700' 
            : 'bg-white/5 hover:bg-white/15 border-white/10 text-zinc-300'"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Balances Bar -->
      <div 
        class="px-4 py-2.5 sm:px-5 flex items-center justify-between border-b text-xs font-mono shrink-0"
        :class="isWhiteTheme ? 'bg-black/[0.02] border-black/10' : 'bg-white/[0.02] border-white/5'"
      >
        <!-- WLD Balance with Quick Add for Testing -->
        <div class="flex items-center gap-2">
          <span class="text-[10px] font-bold uppercase opacity-60">Balance:</span>
          <div class="flex items-center gap-1.5 px-2 py-0.5 rounded-lg border font-bold"
            :class="isWhiteTheme ? 'bg-white border-black/10 text-zinc-900' : 'bg-black/50 border-white/10 text-white'"
          >
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{{ userWld.toLocaleString() }} WLD</span>
          </div>
          <button 
            @click="emit('addWld', 200)"
            class="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all active:scale-95"
            title="Add test WLD tokens"
          >
            +200 WLD
          </button>
        </div>

        <!-- $DEFEAT Tokens -->
        <div class="flex items-center gap-1.5 text-amber-500 font-bold">
          <Coins class="w-3.5 h-3.5 text-amber-500" />
          <span>{{ userTokens.toLocaleString() }} $DEFEAT</span>
        </div>
      </div>

      <!-- Items Grid / List -->
      <div class="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 min-h-0">
        
        <!-- ITEM 1: QUANTUM PLASMA BLADE (Miecz) -->
        <div 
          class="relative rounded-2xl border p-4 sm:p-5 transition-all flex flex-col justify-between"
          :class="hasSword 
            ? (isWhiteTheme ? 'bg-emerald-50/70 border-emerald-500/40 ring-1 ring-emerald-500/30' : 'bg-emerald-950/20 border-emerald-500/40 ring-1 ring-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.1)]')
            : (isWhiteTheme ? 'bg-white border-black/10 shadow-sm hover:border-cyan-500/50' : 'bg-black/40 border-white/10 hover:border-cyan-500/50 shadow-inner')"
        >
          <!-- Top Row: Icon, Title, Badge -->
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3">
              <!-- Holographic Weapon Icon -->
              <div 
                class="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center border shadow-md relative overflow-hidden"
                :class="hasSword 
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' 
                  : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'"
              >
                <div class="absolute inset-0 bg-gradient-to-tr from-cyan-500/20 to-transparent pointer-events-none" />
                <Swords class="w-6 h-6 sm:w-7 sm:h-7 animate-pulse" />
              </div>

              <div>
                <div class="flex items-center gap-2">
                  <h3 class="font-extrabold text-sm sm:text-base tracking-wide font-sans">
                    Quantum Plasma Blade
                  </h3>
                </div>
                <div class="text-[10px] font-mono tracking-widest uppercase opacity-60 mt-0.5">
                  CYBER TACTICAL KATANA // MELEE
                </div>
              </div>
            </div>

            <!-- Perks Pill -->
            <span 
              class="text-[9px] font-mono font-black tracking-wider uppercase px-2 py-1 rounded-md border shrink-0"
              :class="hasSword 
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' 
                : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'"
            >
              2X DAMAGE & REWARDS
            </span>
          </div>

          <!-- Description & Benefits -->
          <div class="my-3 space-y-1.5 text-xs font-mono"
            :class="isWhiteTheme ? 'text-zinc-700' : 'text-zinc-300'"
          >
            <div class="flex items-center gap-2">
              <span class="text-emerald-500 font-bold">⚡ 2x Daily Strike Damage:</span>
              <span>Deals <strong class="text-rose-500 font-black">-2 HP</strong> to Raid Bosses</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-amber-500 font-bold">🪙 2x Token Harvest:</span>
              <span>Earn <strong class="text-amber-500 font-black">+40 $DEFEAT</strong> per daily strike</span>
            </div>
          </div>

          <!-- Buy / Equipped Action Bar -->
          <div class="pt-2 border-t flex items-center justify-between gap-3 mt-1"
            :class="isWhiteTheme ? 'border-black/10' : 'border-white/10'"
          >
            <div class="flex items-baseline gap-1.5">
              <span class="text-xs font-mono opacity-60">PRICE:</span>
              <span class="text-base sm:text-lg font-mono font-black text-cyan-400">
                200 WLD
              </span>
            </div>

            <!-- Action Button -->
            <button 
              v-if="hasSword"
              disabled
              class="px-4 py-2 rounded-xl text-xs font-mono font-bold tracking-wider uppercase border flex items-center gap-1.5 cursor-default"
              :class="isWhiteTheme ? 'bg-emerald-100 border-emerald-400 text-emerald-800' : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'"
            >
              <Check class="w-3.5 h-3.5" />
              <span>EQUIPPED // ACTIVE</span>
            </button>

            <button 
              v-else
              @click="handlePurchase('sword')"
              :disabled="isProcessing === 'sword'"
              class="px-4 py-2 rounded-xl text-xs font-mono font-black tracking-wider uppercase transition-all shadow-md active:scale-95 flex items-center gap-1.5"
              :class="isWhiteTheme 
                ? 'bg-black text-white hover:bg-zinc-800' 
                : 'bg-cyan-400 text-black hover:bg-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.4)]'"
            >
              <Sparkles class="w-3.5 h-3.5" />
              <span>{{ isProcessing === 'sword' ? 'SYNTHESIZING...' : 'BUY FOR 200 WLD' }}</span>
            </button>
          </div>
        </div>

        <!-- ITEM 2: TACHYON CHRONO-BOW (Łuk) -->
        <div 
          class="relative rounded-2xl border p-4 sm:p-5 transition-all flex flex-col justify-between"
          :class="hasBow 
            ? (isWhiteTheme ? 'bg-emerald-50/70 border-emerald-500/40 ring-1 ring-emerald-500/30' : 'bg-emerald-950/20 border-emerald-500/40 ring-1 ring-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.1)]')
            : (isWhiteTheme ? 'bg-white border-black/10 shadow-sm hover:border-violet-500/50' : 'bg-black/40 border-white/10 hover:border-violet-500/50 shadow-inner')"
        >
          <!-- Top Row: Icon, Title, Badge -->
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3">
              <!-- Holographic Weapon Icon -->
              <div 
                class="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center border shadow-md relative overflow-hidden"
                :class="hasBow 
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' 
                  : 'bg-violet-500/10 border-violet-500/30 text-violet-400'"
              >
                <div class="absolute inset-0 bg-gradient-to-tr from-violet-500/20 to-transparent pointer-events-none" />
                <Zap class="w-6 h-6 sm:w-7 sm:h-7 animate-pulse" />
              </div>

              <div>
                <div class="flex items-center gap-2">
                  <h3 class="font-extrabold text-sm sm:text-base tracking-wide font-sans">
                    Tachyon Chrono-Bow
                  </h3>
                </div>
                <div class="text-[10px] font-mono tracking-widest uppercase opacity-60 mt-0.5">
                  KINETIC RAIL-BOW // ACCELERATOR
                </div>
              </div>
            </div>

            <!-- Perks Pill -->
            <span 
              class="text-[9px] font-mono font-black tracking-wider uppercase px-2 py-1 rounded-md border shrink-0"
              :class="hasBow 
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' 
                : 'bg-violet-500/10 border-violet-500/30 text-violet-400'"
            >
              -50% COOLDOWN (12H)
            </span>
          </div>

          <!-- Description & Benefits -->
          <div class="my-3 space-y-1.5 text-xs font-mono"
            :class="isWhiteTheme ? 'text-zinc-700' : 'text-zinc-300'"
          >
            <div class="flex items-center gap-2">
              <span class="text-violet-400 font-bold">⏱️ 50% Cooldown Reduction:</span>
              <span>Daily strike refreshes in <strong class="text-violet-400 font-black">12h</strong> (was 24h)</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-cyan-400 font-bold">🏹 Double Strike Rate:</span>
              <span>Hit raid bosses <strong class="text-cyan-400 font-black">twice daily</strong> to accelerate raid impact</span>
            </div>
          </div>

          <!-- Buy / Equipped Action Bar -->
          <div class="pt-2 border-t flex items-center justify-between gap-3 mt-1"
            :class="isWhiteTheme ? 'border-black/10' : 'border-white/10'"
          >
            <div class="flex items-baseline gap-1.5">
              <span class="text-xs font-mono opacity-60">PRICE:</span>
              <span class="text-base sm:text-lg font-mono font-black text-violet-400">
                200 WLD
              </span>
            </div>

            <!-- Action Button -->
            <button 
              v-if="hasBow"
              disabled
              class="px-4 py-2 rounded-xl text-xs font-mono font-bold tracking-wider uppercase border flex items-center gap-1.5 cursor-default"
              :class="isWhiteTheme ? 'bg-emerald-100 border-emerald-400 text-emerald-800' : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'"
            >
              <Check class="w-3.5 h-3.5" />
              <span>EQUIPPED // ACTIVE</span>
            </button>

            <button 
              v-else
              @click="handlePurchase('bow')"
              :disabled="isProcessing === 'bow'"
              class="px-4 py-2 rounded-xl text-xs font-mono font-black tracking-wider uppercase transition-all shadow-md active:scale-95 flex items-center gap-1.5"
              :class="isWhiteTheme 
                ? 'bg-black text-white hover:bg-zinc-800' 
                : 'bg-violet-500 text-white hover:bg-violet-400 shadow-[0_0_15px_rgba(139,92,246,0.4)]'"
            >
              <Sparkles class="w-3.5 h-3.5" />
              <span>{{ isProcessing === 'bow' ? 'SYNTHESIZING...' : 'BUY FOR 200 WLD' }}</span>
            </button>
          </div>
        </div>

      </div>

      <!-- Footer Info Note -->
      <div 
        class="p-3.5 sm:p-4 border-t text-[10px] font-mono text-center opacity-60 flex items-center justify-center gap-1.5 shrink-0"
        :class="isWhiteTheme ? 'border-black/10 bg-black/[0.02]' : 'border-white/10 bg-white/[0.02]'"
      >
        <ShieldCheck class="w-3.5 h-3.5 text-emerald-500 shrink-0" />
        <span>Permanent World Chain equipment · Instantly synced across all raid sectors</span>
      </div>

    </div>
  </div>
</template>
