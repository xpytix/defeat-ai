<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { Eye, Swords, Heart, Coins, Zap } from 'lucide-vue-next';

interface FloatingDamage {
  id: number;
  value: string;
  x: number;
  y: number;
}

const props = defineProps<{
  currentHp: number;
  maxHp: number;
  level: number;
  bossName: string;
  freeHitAvailable: boolean;
  nextFreeHitTime: number | null;
  userTokens: number;
}>();

const emit = defineEmits<{
  (e: 'hit', type: 'free' | 'power'): void
}>();

// 3D Parallax Tilt State
const tiltX = ref(0);
const tiltY = ref(0);
const isShaking = ref(false);
const floatingDamages = ref<FloatingDamage[]>([]);
const countdownText = ref('24:00:00');
let countdownInterval: any = null;

// Simulated spectator counts
const spectatorCount = ref('4.2K');
const activeAttackerCount = ref(186);

// HP Percentage
const hpPercent = computed(() => {
  if (props.maxHp <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((props.currentHp / props.maxHp) * 100)));
});

// Countdown logic
const updateCountdown = () => {
  if (!props.nextFreeHitTime || props.freeHitAvailable) {
    countdownText.value = 'Ready';
    return;
  }
  const diff = Math.max(0, props.nextFreeHitTime - Date.now());
  if (diff <= 0) {
    countdownText.value = 'Ready';
    return;
  }

  const h = Math.floor(diff / (1000 * 60 * 60));
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const s = Math.floor((diff % (1000 * 60)) / 1000);
  countdownText.value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

onMounted(() => {
  updateCountdown();
  countdownInterval = setInterval(updateCountdown, 1000);
});

onUnmounted(() => {
  if (countdownInterval) clearInterval(countdownInterval);
});

// Interactive 3D Parallax Tilt
const handlePointerMove = (e: MouseEvent | TouchEvent) => {
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
  const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
  const halfW = window.innerWidth / 2;
  const halfH = window.innerHeight / 2;
  tiltX.value = Math.max(-10, Math.min(10, ((clientY - halfH) / halfH) * -10));
  tiltY.value = Math.max(-10, Math.min(10, ((clientX - halfW) / halfW) * 10));
};

const resetTilt = () => {
  tiltX.value = 0;
  tiltY.value = 0;
};

// Trigger Hit
const triggerHit = (type: 'free' | 'power', event?: MouseEvent | TouchEvent) => {
  isShaking.value = true;
  setTimeout(() => {
    isShaking.value = false;
  }, 250);

  const id = Date.now() + Math.random();
  let clientX = window.innerWidth / 2;
  let clientY = window.innerHeight / 2 - 40;

  if (event) {
    if ('touches' in event && event.touches.length > 0) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else if ('clientX' in event) {
      clientX = event.clientX;
      clientY = event.clientY;
    }
  }

  floatingDamages.value.push({
    id,
    value: type === 'power' ? '-1 CRIT (+20 $HVAI)' : '-1 HP (+20 $HVAI)',
    x: clientX + (Math.random() * 40 - 20),
    y: clientY - 30
  });

  setTimeout(() => {
    floatingDamages.value = floatingDamages.value.filter(d => d.id !== id);
  }, 750);

  emit('hit', type);

  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(type === 'power' ? [25, 40, 25] : 25);
  }
};
</script>

<template>
  <div 
    class="flex-1 flex flex-col justify-between items-center px-4 pt-1 pb-24 max-w-sm mx-auto w-full select-none"
    @mousemove="handlePointerMove"
    @touchmove="handlePointerMove"
    @mouseleave="resetTilt"
    @touchend="resetTilt"
  >
    
    <!-- TOP MINIMAL STATS & WALLET -->
    <div class="w-full flex items-center justify-between text-[11px] font-mono tracking-wider text-zinc-500 pt-1">
      <div class="flex items-center gap-2">
        <span class="text-zinc-300 font-black">LVL {{ String(level).padStart(2, '0') }}</span>
        <span class="text-zinc-600">/</span>
        <span class="uppercase tracking-widest text-[10px] text-zinc-400 font-semibold">{{ bossName }}</span>
      </div>

      <!-- User Token Balance -->
      <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/5 text-amber-400 font-bold">
        <Coins class="w-3 h-3 text-amber-400" />
        <span class="text-[11px]">{{ userTokens.toLocaleString() }}</span>
        <span class="text-[9px] text-zinc-500">$HVAI</span>
      </div>
    </div>

    <!-- SPECTATOR & ATTACKER ICONS BAR -->
    <div class="w-full flex items-center justify-center gap-6 mt-2 text-[11px] font-mono text-zinc-500">
      <div class="flex items-center gap-1.5 hover:text-zinc-400 transition-colors">
        <Eye class="w-3.5 h-3.5 text-zinc-400" />
        <span>{{ spectatorCount }}</span>
      </div>
      <div class="w-1 h-1 rounded-full bg-zinc-700"></div>
      <div class="flex items-center gap-1.5 hover:text-rose-400 transition-colors">
        <Swords class="w-3.5 h-3.5 text-rose-500" />
        <span class="text-zinc-300">{{ activeAttackerCount }} attacking</span>
      </div>
    </div>

    <!-- 3D CENTERPIECE ARENA -->
    <div class="relative flex-1 flex flex-col items-center justify-center my-auto w-full">
      
      <!-- Ambient Backlight -->
      <div 
        class="absolute w-72 h-72 rounded-full blur-[100px] pointer-events-none transition-all duration-700 -z-10"
        :class="hpPercent > 30 ? 'bg-rose-600/20' : 'bg-red-600/30'"
      />

      <!-- Floating Damage Numbers -->
      <div 
        v-for="d in floatingDamages" 
        :key="d.id"
        class="fixed z-50 pointer-events-none font-mono font-black text-lg animate-float-damage"
        :class="d.value.includes('CRIT') ? 'text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.9)]' : 'text-rose-500 drop-shadow-[0_0_12px_rgba(244,63,94,0.9)]'"
        :style="{ left: `${d.x}px`, top: `${d.y}px` }"
      >
        {{ d.value }}
      </div>

      <!-- Large 3D Character Model (Front-Facing Bust with Shoulders & Parallax) -->
      <div 
        @click="freeHitAvailable ? triggerHit('free', $event) : triggerHit('power', $event)"
        class="relative w-72 sm:w-80 h-76 sm:h-84 cursor-pointer flex items-center justify-center transition-transform duration-100 ease-out active:scale-95"
        :class="{ 'animate-shake': isShaking }"
        :style="{
          transform: `perspective(900px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`,
        }"
      >
        <div class="relative w-full h-full rounded-3xl overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.95)] border border-white/10 bg-black flex items-center justify-center">
          <img 
            src="/bosses/boss_1.jpg" 
            alt="AI Boss 3D Bust" 
            class="w-full h-full object-cover object-top select-none pointer-events-none transition-all duration-300 animate-pulse-slow"
            :class="{ 'brightness-125 filter contrast-125 scale-105': isShaking }"
          />

          <!-- Red Hit Flash Overlay -->
          <div 
            v-if="isShaking"
            class="absolute inset-0 bg-rose-600/30 backdrop-blur-[1px] pointer-events-none transition-opacity"
          />

          <!-- Subtle Holographic Vignette at bottom for seamless blend -->
          <div class="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent pointer-events-none" />
        </div>
      </div>

      <!-- PROMINENT HP DISPLAY DIRECTLY UNDER BOSS -->
      <div class="w-full max-w-[280px] mt-4">
        <!-- Direct HP Numbers & Percentage -->
        <div class="flex items-center justify-between font-mono mb-1.5 px-1">
          <div class="flex items-center gap-1.5 text-white font-extrabold text-sm tracking-wider">
            <Heart class="w-4 h-4 text-rose-500 fill-rose-500" />
            <span>{{ currentHp.toLocaleString() }}</span>
            <span class="text-zinc-600 font-normal">/</span>
            <span class="text-zinc-400 font-normal">{{ maxHp.toLocaleString() }} HP</span>
          </div>
          <span class="text-xs font-mono font-bold text-zinc-400">{{ hpPercent }}%</span>
        </div>

        <!-- Sleek HP Progress Bar -->
        <div class="w-full h-2 bg-zinc-900 rounded-full overflow-hidden p-0.5 border border-white/5 relative">
          <div 
            class="h-full rounded-full transition-all duration-300"
            :class="hpPercent > 30 ? 'bg-gradient-to-r from-rose-500 to-amber-500' : 'bg-red-500 animate-pulse'"
            :style="{ width: `${hpPercent}%` }"
          />
        </div>
      </div>

    </div>

    <!-- ACTION BUTTONS (EACH HIT GIVES FIXED 20 $HVAI) -->
    <div class="w-full max-w-[280px] space-y-2 mt-auto">
      
      <!-- FREE DAILY STRIKE (ATTACK + CLAIM 20 TOKENS) -->
      <button 
        v-if="freeHitAvailable"
        @click="triggerHit('free', $event)"
        class="w-full py-3.5 px-5 rounded-xl bg-white text-black font-extrabold text-xs tracking-wider uppercase hover:bg-zinc-200 active:scale-[0.98] transition-all shadow-[0_0_30px_rgba(255,255,255,0.15)] flex items-center justify-center gap-2"
      >
        <span>💥 STRIKE & CLAIM (+20 $HVAI)</span>
      </button>

      <!-- COUNTDOWN TIMER IF ALREADY CLAIMED TODAY -->
      <div 
        v-else 
        class="w-full py-3 px-4 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between text-zinc-500 text-xs font-mono"
      >
        <span class="text-[10px] uppercase tracking-wider text-zinc-500">Daily Strike Claimed</span>
        <span class="font-bold text-zinc-300">⏳ {{ countdownText }}</span>
      </div>

      <!-- POWER STRIKE BUTTON (2 WLD = ATTACK + 20 TOKENS) -->
      <button 
        @click="triggerHit('power', $event)"
        class="w-full py-2.5 px-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 active:scale-[0.98] transition-all flex items-center justify-between text-zinc-400 hover:text-white"
      >
        <div class="flex items-center gap-1.5">
          <Zap class="w-3.5 h-3.5 text-cyan-400 fill-cyan-400" />
          <span class="text-[10px] font-mono tracking-wider font-semibold uppercase">Power Strike (+20 $HVAI)</span>
        </div>
        <span class="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded border border-cyan-400/20">
          2 WLD
        </span>
      </button>

    </div>

  </div>
</template>
