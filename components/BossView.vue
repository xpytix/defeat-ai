<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { Eye, Swords, Heart, Coins, Zap, ShieldAlert } from 'lucide-vue-next';

interface FloatingDamage {
  id: number;
  value: string;
  x: number;
  y: number;
}

interface Particle {
  id: number;
  left: string;
  bottom: string;
  size: string;
  duration: string;
  delay: string;
  driftX: string;
  color: string;
  blur: string;
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

// Layered Volumetric Particles: Foreground (in front of boss) & Background (behind boss)
const foregroundParticles = ref<Particle[]>([]);
const backgroundParticles = ref<Particle[]>([]);

onMounted(() => {
  const colors = [
    'bg-cyan-400 text-cyan-300',
    'bg-amber-300 text-amber-300',
    'bg-rose-400 text-rose-300',
    'bg-white text-cyan-200'
  ];

  // Foreground particles (overlap directly across boss chassis and visor)
  foregroundParticles.value = Array.from({ length: 26 }, (_, i) => ({
    id: i,
    left: `${18 + Math.random() * 64}%`,
    bottom: `${5 + Math.random() * 45}%`,
    size: `${1.5 + Math.random() * 3.5}px`,
    duration: `${1.8 + Math.random() * 2.2}s`,
    delay: `${Math.random() * 2.5}s`,
    driftX: `${(Math.random() - 0.5) * 50}px`,
    color: colors[i % colors.length],
    blur: i % 4 === 0 ? '1px' : '0px'
  }));

  // Background ambient particles
  backgroundParticles.value = Array.from({ length: 16 }, (_, i) => ({
    id: i + 100,
    left: `${10 + Math.random() * 80}%`,
    bottom: `${10 + Math.random() * 50}%`,
    size: `${2 + Math.random() * 3}px`,
    duration: `${2.8 + Math.random() * 2.5}s`,
    delay: `${Math.random() * 3}s`,
    driftX: `${(Math.random() - 0.5) * 40}px`,
    color: colors[(i + 1) % colors.length],
    blur: '1.5px'
  }));
});

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
  tiltX.value = Math.max(-8, Math.min(8, ((clientY - halfH) / halfH) * -8));
  tiltY.value = Math.max(-8, Math.min(8, ((clientX - halfW) / halfW) * 8));
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
  }, 220);

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
    value: type === 'power' ? '-1 CRIT (+20)' : '-1 HP (+20)',
    x: clientX + (Math.random() * 40 - 20),
    y: clientY - 30
  });

  setTimeout(() => {
    floatingDamages.value = floatingDamages.value.filter(d => d.id !== id);
  }, 750);

  emit('hit', type);

  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(type === 'power' ? [25, 40, 25] : 20);
  }
};
</script>

<template>
  <div 
    class="flex-1 flex flex-col justify-between items-center px-4 pt-2 pb-24 max-w-sm sm:max-w-md mx-auto w-full select-none"
    @mousemove="handlePointerMove"
    @touchmove="handlePointerMove"
    @mouseleave="resetTilt"
    @touchend="resetTilt"
  >
    
    <!-- TOP BALANCED HEADER & TELEMETRY -->
    <div class="w-full flex flex-col space-y-1 pt-1 px-1">
      
      <!-- Upper Status Row -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-xs font-mono font-black text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
            LVL {{ String(level).padStart(2, '0') }}
          </span>
          <span class="text-xs font-mono tracking-widest text-zinc-400 font-bold uppercase">
            {{ bossName }}
          </span>
        </div>

        <!-- Token Balance -->
        <div class="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.05] border border-white/10 text-amber-400 font-bold shadow-sm">
          <Coins class="w-3.5 h-3.5 text-amber-400" />
          <span class="text-xs font-mono">{{ userTokens.toLocaleString() }}</span>
          <span class="text-[9px] text-zinc-400 font-mono font-normal">$HVAI</span>
        </div>
      </div>

      <!-- Lower Sub-Bar with Spectator Icons -->
      <div class="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-1 border-b border-white/[0.06] pb-2">
        <span class="text-[10px] text-zinc-500 uppercase tracking-wider flex items-center gap-1">
          <ShieldAlert class="w-3 h-3 text-cyan-400" />
          <span>CLASS-1 ROGUE ENTITY</span>
        </span>

        <div class="flex items-center gap-4 text-xs">
          <div class="flex items-center gap-1.5 text-zinc-400">
            <Eye class="w-3.5 h-3.5 text-zinc-500" />
            <span>{{ spectatorCount }}</span>
          </div>
          <div class="w-1 h-1 rounded-full bg-zinc-700"></div>
          <div class="flex items-center gap-1.5 text-zinc-300">
            <Swords class="w-3.5 h-3.5 text-rose-500" />
            <span class="font-semibold">{{ activeAttackerCount }}</span>
          </div>
        </div>
      </div>

    </div>

    <!-- 3D CENTERPIECE ARENA: MASSIVE BOSS WITH REALISTIC MULTI-LAYER PARTICLES OVERLAPPING CHASSIS -->
    <div class="relative flex-1 flex flex-col items-center justify-center my-auto w-full overflow-visible py-2">
      
      <!-- LAYER 1: Ambient Reactor Glow & Background Mist -->
      <div 
        class="absolute w-84 h-84 rounded-full blur-[120px] pointer-events-none -z-10"
        :class="hpPercent > 30 ? 'bg-cyan-500/15' : 'bg-red-500/20'"
      />

      <!-- LAYER 2: BACKGROUND CYBER EMBERS (Behind Boss) -->
      <div class="absolute inset-0 pointer-events-none overflow-hidden -z-5">
        <div 
          v-for="p in backgroundParticles" 
          :key="p.id"
          class="absolute rounded-full animate-rise-drift opacity-60"
          :class="p.color"
          :style="{
            left: p.left,
            bottom: p.bottom,
            width: p.size,
            height: p.size,
            animationDuration: p.duration,
            animationDelay: p.delay,
            filter: `blur(${p.blur})`,
            boxShadow: '0 0 6px currentColor',
            '--drift-x': p.driftX
          }"
        />
      </div>

      <!-- LAYER 3: THE 3D BOSS CHARACTER -->
      <div 
        @click="freeHitAvailable ? triggerHit('free', $event) : triggerHit('power', $event)"
        class="relative w-full max-w-[340px] sm:max-w-[380px] h-[350px] sm:h-[400px] cursor-pointer flex items-center justify-center transition-transform duration-100 ease-out active:scale-95"
        :class="{ 'animate-shake': isShaking }"
        :style="{
          transform: `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`,
        }"
      >
        <!-- The Boss Image -->
        <div class="relative w-full h-full flex items-center justify-center overflow-visible [mask-image:radial-gradient(circle_at_center,black_80%,transparent_100%)]">
          <img 
            src="/bosses/boss_1.jpg" 
            alt="AI Boss 3D" 
            class="w-full h-full object-contain select-none pointer-events-none transition-transform duration-200"
            :class="{ 'brightness-125 filter contrast-125 scale-105': isShaking }"
          />

          <!-- Red Hit Flash Overlay -->
          <div 
            v-if="isShaking"
            class="absolute inset-0 bg-rose-600/25 pointer-events-none transition-opacity rounded-full blur-xl"
          />
        </div>

        <!-- LAYER 4: FOREGROUND EMBERS & CYBER SPARKS (DIRECTLY OVERLAPPING BOSS CHASSIS & CHEST) -->
        <div class="absolute inset-0 pointer-events-none overflow-hidden z-20">
          
          <!-- Soft Drifting Cyber Smoke Core Wisp -->
          <div class="absolute bottom-16 left-1/2 -translate-x-1/2 w-48 h-48 bg-gradient-to-t from-cyan-500/10 via-amber-400/5 to-transparent rounded-full blur-2xl animate-smoke-pulse pointer-events-none" />

          <!-- Overlapping Glowing Sparks and Digital Glints -->
          <div 
            v-for="p in foregroundParticles" 
            :key="p.id"
            class="absolute rounded-full animate-rise-drift pointer-events-none"
            :class="p.color"
            :style="{
              left: p.left,
              bottom: p.bottom,
              width: p.size,
              height: p.size,
              animationDuration: p.duration,
              animationDelay: p.delay,
              filter: `blur(${p.blur})`,
              boxShadow: '0 0 10px currentColor',
              '--drift-x': p.driftX
            }"
          />
        </div>

      </div>

      <!-- Floating Damage Numbers -->
      <div 
        v-for="d in floatingDamages" 
        :key="d.id"
        class="fixed z-50 pointer-events-none font-mono font-black text-2xl animate-float-damage"
        :class="d.value.includes('CRIT') ? 'text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.9)]' : 'text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.9)]'"
        :style="{ left: `${d.x}px`, top: `${d.y}px` }"
      >
        {{ d.value }}
      </div>

      <!-- PROMINENT HP DISPLAY DIRECTLY UNDER BOSS -->
      <div class="w-full max-w-sm mt-1 z-30 px-2">
        <!-- Direct HP Numbers & Percentage -->
        <div class="flex items-center justify-between font-mono mb-2 px-1">
          <div class="flex items-center gap-1.5 text-white font-extrabold text-sm tracking-wider">
            <Heart class="w-4 h-4 text-rose-500 fill-rose-500" />
            <span>{{ currentHp.toLocaleString() }}</span>
            <span class="text-zinc-600 font-normal">/</span>
            <span class="text-zinc-400 font-normal">{{ maxHp.toLocaleString() }} HP</span>
          </div>
          <span class="text-xs font-mono font-bold text-zinc-400">{{ hpPercent }}%</span>
        </div>

        <!-- Sleek HP Progress Bar with Cyan/Rose Gradient -->
        <div class="w-full h-2.5 bg-zinc-900/90 rounded-full overflow-hidden p-0.5 border border-white/10 relative shadow-inner">
          <div 
            class="h-full rounded-full transition-all duration-300"
            :class="hpPercent > 30 ? 'bg-gradient-to-r from-cyan-500 via-amber-400 to-rose-500' : 'bg-red-500 animate-pulse'"
            :style="{ width: `${hpPercent}%` }"
          />
        </div>
      </div>

    </div>

    <!-- WIDER ACTION BUTTONS (RICH UX / UI) -->
    <div class="w-full max-w-sm space-y-2.5 mt-auto px-1 z-30">
      
      <!-- FREE DAILY STRIKE (ATTACK + CLAIM 20 TOKENS) -->
      <button 
        v-if="freeHitAvailable"
        @click="triggerHit('free', $event)"
        class="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-white via-zinc-100 to-zinc-200 text-black font-black text-sm tracking-wider uppercase active:scale-[0.98] transition-all shadow-[0_0_25px_rgba(255,255,255,0.2)] flex items-center justify-center gap-2 border border-white"
      >
        <span>💥 STRIKE & CLAIM (+20 $HVAI)</span>
      </button>

      <!-- COUNTDOWN TIMER IF ALREADY CLAIMED TODAY -->
      <div 
        v-else 
        class="w-full py-3.5 px-5 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between text-zinc-400 text-xs font-mono shadow-sm"
      >
        <span class="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">Daily Strike Claimed</span>
        <span class="font-bold text-zinc-200 text-sm">⏳ {{ countdownText }}</span>
      </div>

      <!-- POWER STRIKE BUTTON (2 WLD = ATTACK + 20 TOKENS) -->
      <button 
        @click="triggerHit('power', $event)"
        class="w-full py-3 px-5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-cyan-500/30 hover:border-cyan-500/60 active:scale-[0.98] transition-all flex items-center justify-between text-zinc-300 hover:text-white shadow-[0_0_15px_rgba(6,182,212,0.08)]"
      >
        <div class="flex items-center gap-2">
          <Zap class="w-4 h-4 text-cyan-400 fill-cyan-400" />
          <span class="text-xs font-mono tracking-wider font-bold uppercase">Power Strike (+20 $HVAI)</span>
        </div>
        <span class="text-xs font-mono font-black text-cyan-400 bg-cyan-400/10 px-2.5 py-1 rounded-lg border border-cyan-400/30">
          2 WLD
        </span>
      </button>

    </div>

  </div>
</template>

<style scoped>
@keyframes riseDrift {
  0% {
    transform: translate3d(0, 30px, 0) scale(0.6);
    opacity: 0;
  }
  15% {
    opacity: 0.95;
  }
  75% {
    opacity: 0.7;
  }
  100% {
    transform: translate3d(var(--drift-x, 20px), -280px, 0) scale(1.3);
    opacity: 0;
  }
}

.animate-rise-drift {
  animation: riseDrift linear infinite;
}

@keyframes smokePulse {
  0%, 100% {
    transform: translate(-50%, 0) scale(0.9);
    opacity: 0.2;
  }
  50% {
    transform: translate(-50%, -20px) scale(1.15);
    opacity: 0.35;
  }
}

.animate-smoke-pulse {
  animation: smokePulse 4s ease-in-out infinite;
}
</style>
