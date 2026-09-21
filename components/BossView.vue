<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';

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

// 3D Interactive Parallax on Touch/Move
const handlePointerMove = (e: MouseEvent | TouchEvent) => {
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
  const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
  const halfW = window.innerWidth / 2;
  const halfH = window.innerHeight / 2;
  tiltX.value = Math.max(-12, Math.min(12, ((clientY - halfH) / halfH) * -12));
  tiltY.value = Math.max(-12, Math.min(12, ((clientX - halfW) / halfW) * 12));
};

const resetTilt = () => {
  tiltX.value = 0;
  tiltY.value = 0;
};

// Hit Trigger
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
    value: type === 'power' ? '-1 CRIT' : '-1',
    x: clientX + (Math.random() * 40 - 20),
    y: clientY - 30
  });

  setTimeout(() => {
    floatingDamages.value = floatingDamages.value.filter(d => d.id !== id);
  }, 750);

  emit('hit', type);

  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(type === 'power' ? [20, 30, 20] : 20);
  }
};
</script>

<template>
  <div 
    class="flex-1 flex flex-col justify-between items-center px-6 pt-4 pb-24 max-w-sm mx-auto w-full select-none"
    @mousemove="handlePointerMove"
    @touchmove="handlePointerMove"
    @mouseleave="resetTilt"
    @touchend="resetTilt"
  >
    
    <!-- MINIMALIST LEVEL HEADER -->
    <div class="w-full flex items-center justify-between text-[11px] font-mono tracking-widest text-zinc-500 pt-2">
      <span class="text-zinc-400 font-bold">LVL {{ String(level).padStart(2, '0') }}</span>
      <span class="uppercase tracking-widest text-[10px] text-zinc-600 font-semibold">{{ bossName }}</span>
      <span>{{ currentHp }} / {{ maxHp }} HP</span>
    </div>

    <!-- 3D CENTERPIECE ARENA -->
    <div class="relative flex-1 flex flex-col items-center justify-center my-auto w-full">
      
      <!-- Ambient Backlight -->
      <div 
        class="absolute w-64 h-64 rounded-full blur-[90px] pointer-events-none transition-all duration-700 -z-10"
        :class="hpPercent > 30 ? 'bg-rose-600/15' : 'bg-cyan-500/15'"
      />

      <!-- Floating Damage Numbers -->
      <div 
        v-for="d in floatingDamages" 
        :key="d.id"
        class="fixed z-50 pointer-events-none font-mono font-black text-xl animate-float-damage"
        :class="d.value.includes('CRIT') ? 'text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.8)]' : 'text-rose-500 drop-shadow-[0_0_10px_rgba(244,63,94,0.8)]'"
        :style="{ left: `${d.x}px`, top: `${d.y}px` }"
      >
        {{ d.value }}
      </div>

      <!-- 3D Character Model with Interactive Parallax -->
      <div 
        @click="freeHitAvailable ? triggerHit('free', $event) : triggerHit('power', $event)"
        class="relative w-72 h-72 rounded-3xl cursor-pointer flex items-center justify-center transition-transform duration-100 ease-out active:scale-95"
        :class="{ 'animate-shake': isShaking }"
        :style="{
          transform: `perspective(800px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`,
        }"
      >
        <!-- 3D Rendered Boss Image -->
        <div class="relative w-64 h-64 rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.9)] border border-white/5 bg-black">
          <img 
            src="/bosses/boss_1.jpg" 
            alt="AI Boss 3D" 
            class="w-full h-full object-cover select-none pointer-events-none transition-all duration-300 animate-pulse-slow"
            :class="{ 'brightness-125 filter contrast-125': isShaking }"
          />

          <!-- Red Hit Flash Overlay -->
          <div 
            v-if="isShaking"
            class="absolute inset-0 bg-rose-600/30 backdrop-blur-[1px] pointer-events-none transition-opacity"
          />

          <!-- Subtle Holographic Vignette -->
          <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />
        </div>
      </div>

      <!-- MINIMALIST HP PROGRESS BAR -->
      <div class="w-full max-w-[260px] mt-6">
        <div class="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden relative">
          <div 
            class="h-full rounded-full transition-all duration-300"
            :class="hpPercent > 30 ? 'bg-rose-500' : 'bg-red-500 animate-pulse'"
            :style="{ width: `${hpPercent}%` }"
          />
        </div>
        <div class="flex justify-between items-center text-[9px] font-mono text-zinc-500 mt-2 px-0.5">
          <span>HP POOL</span>
          <span class="font-bold text-zinc-400">{{ hpPercent }}%</span>
        </div>
      </div>

    </div>

    <!-- MINIMALIST ACTION BUTTONS -->
    <div class="w-full max-w-[280px] space-y-2 mt-auto">
      
      <!-- FREE STRIKE BUTTON (OR COUNTDOWN) -->
      <button 
        v-if="freeHitAvailable"
        @click="triggerHit('free', $event)"
        class="w-full py-3.5 px-6 rounded-xl bg-white text-black font-extrabold text-xs tracking-widest uppercase hover:bg-zinc-200 active:scale-[0.98] transition-all shadow-[0_0_30px_rgba(255,255,255,0.15)]"
      >
        STRIKE
      </button>

      <div 
        v-else 
        class="w-full py-3 px-4 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between text-zinc-500 text-xs font-mono"
      >
        <span class="text-[10px] uppercase tracking-wider text-zinc-600">Daily Strike</span>
        <span class="font-bold text-zinc-300">⏳ {{ countdownText }}</span>
      </div>

      <!-- POWER STRIKE BUTTON -->
      <button 
        @click="triggerHit('power', $event)"
        class="w-full py-2.5 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 active:scale-[0.98] transition-all flex items-center justify-between text-zinc-400 hover:text-white"
      >
        <span class="text-[10px] font-mono tracking-wider font-semibold uppercase">Power Strike</span>
        <span class="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded border border-cyan-400/20">
          2 WLD
        </span>
      </button>

    </div>

  </div>
</template>
