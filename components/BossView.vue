<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
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
  isWhiteTheme?: boolean;
}>();

const emit = defineEmits<{
  (e: 'hit', type: 'free' | 'power'): void;
  (e: 'selectLevel', level: number): void;
}>();

// Volumetric Fog Mechanics for Boss 2, 4, 6, 7
const hasFog = computed(() => [2, 4, 6, 7].includes(props.level));

const fogStyles = computed(() => {
  switch (props.level) {
    case 2: // reCAPTCHA - optical verification haze
      return {
        bgBack: 'from-amber-400/20 via-emerald-400/15 to-transparent',
        bgFront: 'from-yellow-400/35 via-emerald-400/25 to-transparent'
      };
    case 4: // DeepFake Doppelgänger - shifting violet-cyan illusion mist
      return {
        bgBack: 'from-indigo-600/25 via-purple-500/20 to-transparent',
        bgFront: 'from-purple-500/40 via-cyan-400/25 to-transparent'
      };
    case 6: // Algorithmic Blackout - volcanic red ash and blackout smog
      return {
        bgBack: 'from-red-700/35 via-rose-950/30 to-transparent',
        bgFront: 'from-red-600/45 via-rose-900/35 to-transparent'
      };
    case 7: // Synthetic Supercluster - subzero cryo-nitrogen freezing vapor
      return {
        bgBack: 'from-sky-400/25 via-cyan-400/20 to-transparent',
        bgFront: 'from-cyan-300/40 via-sky-300/30 to-transparent'
      };
    default:
      return {
        bgBack: 'from-cyan-500/20 to-transparent',
        bgFront: 'from-cyan-500/30 to-transparent'
      };
  }
});

// 3D Parallax Tilt State
const tiltX = ref(0);
const tiltY = ref(0);
const isShaking = ref(false);
const floatingDamages = ref<FloatingDamage[]>([]);
const countdownText = ref('24:00:00');
let countdownInterval: any = null;

// Dynamic Image Path
const bossImage = computed(() => `/bosses/boss_${props.level || 1}.jpg`);

// Simulated spectator counts
const spectatorCount = ref('4.2K');
const activeAttackerCount = ref(186);

// Layered Volumetric Particles: Foreground & Background
const foregroundParticles = ref<Particle[]>([]);
const backgroundParticles = ref<Particle[]>([]);

// Boss-specific color palettes
const getBossColors = (lvl: number) => {
  if (props.isWhiteTheme) {
    switch (lvl) {
      case 3: // SpamLord on white background
        return ['bg-fuchsia-600 text-fuchsia-600', 'bg-purple-700 text-purple-700', 'bg-pink-600 text-pink-600'];
      case 5: // Hivemind on white background
        return ['bg-violet-700 text-violet-700', 'bg-blue-700 text-blue-700', 'bg-indigo-700 text-indigo-700'];
      case 8: // AGI on white background
        return ['bg-amber-600 text-amber-600', 'bg-yellow-600 text-yellow-600', 'bg-amber-500 text-amber-500'];
    }
  }
  switch (lvl) {
    case 1: // AutoCorrect
      return ['bg-cyan-400 text-cyan-300', 'bg-amber-300 text-amber-300', 'bg-cyan-200 text-cyan-200'];
    case 2: // reCAPTCHA
      return ['bg-yellow-400 text-yellow-300', 'bg-emerald-400 text-emerald-300', 'bg-amber-400 text-amber-300'];
    case 3: // SpamLord
      return ['bg-fuchsia-500 text-fuchsia-400', 'bg-purple-400 text-purple-300', 'bg-pink-400 text-pink-300'];
    case 4: // DeepFake
      return ['bg-cyan-300 text-cyan-200', 'bg-purple-300 text-purple-200', 'bg-indigo-300 text-indigo-200'];
    case 5: // Hivemind
      return ['bg-violet-400 text-violet-300', 'bg-blue-400 text-blue-300', 'bg-indigo-400 text-indigo-300'];
    case 6: // Blackout
      return ['bg-red-500 text-red-400', 'bg-rose-500 text-rose-400', 'bg-amber-600 text-amber-500'];
    case 7: // Supercluster
      return ['bg-cyan-300 text-cyan-200', 'bg-amber-300 text-amber-200', 'bg-sky-400 text-sky-300'];
    case 8: // AGI
      return ['bg-amber-300 text-amber-200', 'bg-white text-yellow-100', 'bg-yellow-400 text-amber-300'];
    default:
      return ['bg-cyan-400 text-cyan-300', 'bg-amber-300 text-amber-300'];
  }
};

const setupParticles = () => {
  const colors = getBossColors(props.level);

  // Foreground particles (overlap directly across boss chassis)
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
};

watch([() => props.level, () => props.isWhiteTheme], setupParticles);

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
  setupParticles();
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
    class="flex-1 flex flex-col justify-between items-center px-4 sm:px-8 pt-1 pb-24 max-w-lg sm:max-w-xl md:max-w-2xl lg:max-w-3xl mx-auto w-full select-none transition-colors duration-500"
    @mousemove="handlePointerMove"
    @touchmove="handlePointerMove"
    @mouseleave="resetTilt"
    @touchend="resetTilt"
  >
    
    <!-- TEST CONTROLS (Easily switch between all 8 bosses for testing) -->
    <div 
      class="w-full flex items-center justify-between px-3 py-1.5 mb-1 rounded-xl text-xs font-mono transition-colors duration-300"
      :class="isWhiteTheme 
        ? 'bg-black/[0.04] border border-black/10 text-zinc-900 shadow-sm' 
        : 'bg-amber-400/10 border border-amber-400/25 text-amber-300'"
    >
      <div 
        class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider"
        :class="isWhiteTheme ? 'text-zinc-800' : 'text-amber-300'"
      >
        <span 
          class="w-1.5 h-1.5 rounded-full animate-ping"
          :class="isWhiteTheme ? 'bg-zinc-800' : 'bg-amber-400'"
        ></span>
        <span>TEST BOSS:</span>
      </div>
      
      <div class="flex items-center gap-1">
        <button
          v-for="i in 8"
          :key="i"
          @click="emit('selectLevel', i)"
          class="w-6 h-5.5 sm:w-7 sm:h-6 rounded-md flex items-center justify-center text-[11px] font-bold transition-all"
          :class="level === i 
            ? (i === 8 
                ? (isWhiteTheme ? 'bg-amber-500 text-black font-black shadow-md ring-1 ring-amber-600' : 'bg-amber-400 text-black font-black shadow-[0_0_8px_rgba(251,191,36,0.6)]') 
                : (isWhiteTheme ? 'bg-black text-white font-black shadow-md' : 'bg-white text-black font-black shadow-[0_0_8px_rgba(255,255,255,0.4)]'))
            : (isWhiteTheme 
                ? 'text-zinc-600 hover:text-black bg-black/5 hover:bg-black/10' 
                : 'text-zinc-400 hover:text-white bg-black/40 hover:bg-white/10')"
          :title="`Switch to Boss ${i}`"
        >
          {{ i }}
        </button>
      </div>
    </div>

    <!-- TOP BALANCED HEADER & TELEMETRY -->
    <div class="w-full flex flex-col space-y-1.5 pt-1 px-1">
      
      <!-- Upper Status Row -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <button 
            @click="emit('selectLevel', Math.max(1, level - 1))"
            :disabled="level <= 1"
            class="w-6 h-6 rounded flex items-center justify-center disabled:opacity-20 text-xs transition-colors"
            :class="isWhiteTheme 
              ? 'text-zinc-700 hover:text-black bg-black/5 border border-black/10 disabled:hover:text-zinc-700' 
              : 'text-zinc-400 hover:text-white bg-white/5 border border-white/10 disabled:hover:text-zinc-400'"
            title="Previous Boss"
          >
            ‹
          </button>
          <span 
            class="text-xs font-mono font-black px-2.5 py-0.5 rounded border tracking-wider"
            :class="level === 8 
              ? (isWhiteTheme ? 'text-amber-900 bg-amber-200 border-amber-400 shadow-sm' : 'text-amber-300 bg-amber-400/20 border-amber-400/40') 
              : (isWhiteTheme ? 'text-zinc-950 bg-black/5 border-black/15' : 'text-rose-500 bg-rose-500/10 border-rose-500/20')"
          >
            LVL {{ String(level).padStart(2, '0') }}
          </span>
          <button 
            @click="emit('selectLevel', Math.min(8, level + 1))"
            :disabled="level >= 8"
            class="w-6 h-6 rounded flex items-center justify-center disabled:opacity-20 text-xs transition-colors"
            :class="isWhiteTheme 
              ? 'text-zinc-700 hover:text-black bg-black/5 border border-black/10 disabled:hover:text-zinc-700' 
              : 'text-zinc-400 hover:text-white bg-white/5 border border-white/10 disabled:hover:text-zinc-400'"
            title="Next Boss"
          >
            ›
          </button>
          <span 
            class="text-xs sm:text-sm font-mono tracking-widest font-black uppercase truncate max-w-[150px] sm:max-w-xs"
            :class="isWhiteTheme ? 'text-zinc-950' : 'text-zinc-200'"
          >
            {{ bossName }}
          </span>
        </div>

        <!-- Token Balance -->
        <div 
          class="flex items-center gap-1.5 px-3.5 py-1 rounded-full text-amber-500 font-bold shadow-sm transition-colors"
          :class="isWhiteTheme ? 'bg-black/[0.04] border border-black/10' : 'bg-white/[0.05] border border-white/10'"
        >
          <Coins class="w-3.5 h-3.5 text-amber-500" />
          <span class="text-xs font-mono font-black">{{ userTokens.toLocaleString() }}</span>
          <span class="text-[9px] font-mono font-normal" :class="isWhiteTheme ? 'text-zinc-600' : 'text-zinc-400'">$HVAI</span>
        </div>
      </div>

      <!-- Lower Sub-Bar with Spectator Icons -->
      <div 
        class="flex items-center justify-between text-[11px] font-mono pt-1 pb-2 border-b transition-colors"
        :class="isWhiteTheme ? 'border-black/[0.08] text-zinc-600' : 'border-white/[0.06] text-zinc-500'"
      >
        <span class="text-[10px] uppercase tracking-wider flex items-center gap-1.5 font-semibold"
          :class="level === 8 
            ? (isWhiteTheme ? 'text-amber-700 font-bold' : 'text-amber-400 font-bold') 
            : (isWhiteTheme ? 'text-zinc-600' : 'text-zinc-500')"
        >
          <ShieldAlert class="w-3.5 h-3.5" :class="level === 8 ? (isWhiteTheme ? 'text-amber-700' : 'text-amber-400') : (isWhiteTheme ? 'text-cyan-700' : 'text-cyan-400')" />
          <span>{{ level === 8 ? 'APEX SINGULARITY THREAT' : 'CLASS-1 ROGUE ENTITY' }}</span>
        </span>

        <div class="flex items-center gap-4 text-xs">
          <div class="flex items-center gap-1.5" :class="isWhiteTheme ? 'text-zinc-700' : 'text-zinc-400'">
            <Eye class="w-3.5 h-3.5" :class="isWhiteTheme ? 'text-zinc-500' : 'text-zinc-500'" />
            <span class="font-medium">{{ spectatorCount }}</span>
          </div>
          <div class="w-1 h-1 rounded-full" :class="isWhiteTheme ? 'bg-zinc-300' : 'bg-zinc-700'"></div>
          <div class="flex items-center gap-1.5" :class="isWhiteTheme ? 'text-zinc-900 font-bold' : 'text-zinc-300 font-semibold'">
            <Swords class="w-3.5 h-3.5 text-rose-500" />
            <span>{{ activeAttackerCount }}</span>
          </div>
        </div>
      </div>

    </div>

    <!-- 3D CENTERPIECE ARENA: MASSIVE BOSS (OPTIMIZED FOR IPHONE 17 PRO MAX & TABLETS) -->
    <div class="relative flex-1 flex flex-col items-center justify-center my-auto w-full overflow-visible py-1 sm:py-3">
      
      <!-- LAYER 1: Ambient Reactor Glow -->
      <div 
        class="absolute w-96 sm:w-[500px] h-96 sm:h-[500px] rounded-full blur-[130px] pointer-events-none -z-10 transition-colors duration-700"
        :class="isWhiteTheme 
          ? (level === 8 ? 'bg-amber-400/35' : level === 5 ? 'bg-violet-400/30' : 'bg-fuchsia-400/25') 
          : (level === 8 ? 'bg-amber-400/20' : hpPercent > 30 ? 'bg-cyan-500/15' : 'bg-red-500/20')"
      />

      <!-- LAYER 2A: VOLUMETRIC FOG (BEHIND BOSS FOR BOSS 2, 4, 6, 7) -->
      <div v-if="hasFog" class="absolute inset-0 pointer-events-none overflow-hidden -z-4 flex items-end justify-center">
        <div 
          class="absolute bottom-6 -left-1/4 w-[150%] h-44 sm:h-64 rounded-[100%] blur-3xl opacity-75 animate-fog-1 bg-gradient-to-t"
          :class="fogStyles.bgBack"
        />
        <div 
          class="absolute bottom-2 -right-1/4 w-[140%] h-40 sm:h-56 rounded-[100%] blur-3xl opacity-60 animate-fog-2 bg-gradient-to-t"
          :class="fogStyles.bgBack"
        />
      </div>

      <!-- LAYER 2B: BACKGROUND CYBER EMBERS (Behind Boss) -->
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

      <!-- LAYER 3: THE 3D BOSS CHARACTER (EXPANDED RESPONISVE CONTAINER) -->
      <div 
        @click="freeHitAvailable ? triggerHit('free', $event) : triggerHit('power', $event)"
        class="relative w-full max-w-[440px] sm:max-w-[540px] md:max-w-[640px] lg:max-w-[720px] h-[50dvh] min-h-[380px] max-h-[580px] sm:max-h-[660px] md:max-h-[740px] cursor-pointer flex items-center justify-center transition-transform duration-100 ease-out active:scale-95"
        :class="{ 'animate-shake': isShaking }"
        :style="{
          transform: `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`,
        }"
      >
        <!-- The Boss Image with Frameless Radial Fade -->
        <div 
          class="relative w-full h-full flex items-center justify-center overflow-visible"
          :class="isWhiteTheme 
            ? '[mask-image:radial-gradient(circle_at_center,black_75%,transparent_98%)]' 
            : '[mask-image:radial-gradient(circle_at_center,black_80%,transparent_100%)]'"
        >
          <img 
            :src="bossImage" 
            :alt="bossName" 
            class="w-full h-full object-contain select-none pointer-events-none transition-transform duration-200 scale-110 sm:scale-120 md:scale-125"
            :class="{ 'brightness-125 filter contrast-125 scale-115': isShaking }"
          />

          <!-- Red Hit Flash Overlay -->
          <div 
            v-if="isShaking"
            class="absolute inset-0 bg-rose-600/30 pointer-events-none transition-opacity rounded-full blur-2xl"
          />
        </div>

        <!-- LAYER 4A: FOREGROUND VOLUMETRIC FOG (OVERLAPPING BOSS CHASSIS FOR BOSS 2, 4, 6, 7) -->
        <div v-if="hasFog" class="absolute inset-x-0 bottom-0 h-36 sm:h-52 pointer-events-none overflow-hidden z-25 flex items-end justify-center">
          <div 
            class="w-full h-28 sm:h-40 rounded-t-[100%] blur-2xl opacity-70 animate-fog-1 bg-gradient-to-t"
            :class="fogStyles.bgFront"
          />
          <div 
            class="absolute bottom-0 w-4/5 h-24 sm:h-36 rounded-t-[100%] blur-xl opacity-80 animate-fog-2 bg-gradient-to-t"
            :class="fogStyles.bgFront"
          />
        </div>

        <!-- LAYER 4B: FOREGROUND EMBERS & CYBER SPARKS (DIRECTLY OVERLAPPING BOSS CHASSIS) -->
        <div class="absolute inset-0 pointer-events-none overflow-hidden z-20">
          
          <!-- Soft Drifting Cyber Smoke Core Wisp (when no heavy fog) -->
          <div 
            v-if="!hasFog"
            class="absolute bottom-16 left-1/2 -translate-x-1/2 w-56 h-56 rounded-full blur-2xl animate-smoke-pulse pointer-events-none"
            :class="isWhiteTheme 
              ? 'bg-gradient-to-t from-amber-500/15 via-black/5 to-transparent' 
              : (level === 8 
                  ? 'bg-gradient-to-t from-amber-400/20 via-white/10 to-transparent' 
                  : 'bg-gradient-to-t from-cyan-500/10 via-amber-400/5 to-transparent')"
          />

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
              boxShadow: isWhiteTheme ? '0 0 6px currentColor' : '0 0 10px currentColor',
              '--drift-x': p.driftX
            }"
          />
        </div>

      </div>

      <!-- Floating Damage Numbers -->
      <div 
        v-for="d in floatingDamages" 
        :key="d.id"
        class="fixed z-50 pointer-events-none font-mono font-black text-2xl sm:text-3xl animate-float-damage"
        :class="d.value.includes('CRIT') ? 'text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.9)]' : (isWhiteTheme ? 'text-cyan-600 drop-shadow-[0_0_10px_rgba(8,145,178,0.6)]' : 'text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.9)]')"
        :style="{ left: `${d.x}px`, top: `${d.y}px` }"
      >
        {{ d.value }}
      </div>

      <!-- PROMINENT HP DISPLAY DIRECTLY UNDER BOSS -->
      <div class="w-full max-w-[420px] sm:max-w-[500px] md:max-w-[580px] mt-1 z-30 px-2">
        <!-- Direct HP Numbers & Percentage -->
        <div class="flex items-center justify-between font-mono mb-2 px-1">
          <div 
            class="flex items-center gap-1.5 font-black text-sm sm:text-base tracking-wider"
            :class="isWhiteTheme ? 'text-zinc-950' : 'text-white'"
          >
            <Heart class="w-4 h-4 text-rose-500 fill-rose-500" />
            <span>{{ currentHp.toLocaleString() }}</span>
            <span :class="isWhiteTheme ? 'text-zinc-400' : 'text-zinc-600'">/</span>
            <span class="font-normal" :class="isWhiteTheme ? 'text-zinc-600' : 'text-zinc-400'">{{ maxHp.toLocaleString() }} HP</span>
          </div>
          <span 
            class="text-xs sm:text-sm font-mono font-black"
            :class="isWhiteTheme ? 'text-zinc-700' : 'text-zinc-400'"
          >
            {{ hpPercent }}%
          </span>
        </div>

        <!-- Sleek HP Progress Bar with Gradient -->
        <div 
          class="w-full h-3 rounded-full overflow-hidden p-0.5 relative shadow-inner transition-colors"
          :class="isWhiteTheme ? 'bg-zinc-200 border border-black/10' : 'bg-zinc-900/90 border border-white/10'"
        >
          <div 
            class="h-full rounded-full transition-all duration-300"
            :class="level === 8 
              ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 shadow-sm' 
              : hpPercent > 30 
                ? 'bg-gradient-to-r from-cyan-500 via-amber-400 to-rose-500' 
                : 'bg-red-500 animate-pulse'"
            :style="{ width: `${hpPercent}%` }"
          />
        </div>
      </div>

    </div>

    <!-- WIDER ACTION BUTTONS (RICH RESPONSIVE UX / UI) -->
    <div class="w-full max-w-[420px] sm:max-w-[500px] md:max-w-[580px] space-y-2.5 mt-auto px-1 z-30">
      
      <!-- FREE DAILY STRIKE (ATTACK + CLAIM 20 TOKENS) -->
      <button 
        v-if="freeHitAvailable"
        @click="triggerHit('free', $event)"
        class="w-full py-4 px-6 rounded-2xl font-black text-sm tracking-wider uppercase active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        :class="isWhiteTheme 
          ? 'bg-black text-white hover:bg-zinc-800 shadow-[0_4px_25px_rgba(0,0,0,0.25)] border border-black' 
          : 'bg-gradient-to-r from-white via-zinc-100 to-zinc-200 text-black hover:bg-white shadow-[0_0_25px_rgba(255,255,255,0.2)] border border-white'"
      >
        <span>💥 STRIKE & CLAIM (+20 $HVAI)</span>
      </button>

      <!-- COUNTDOWN TIMER IF ALREADY CLAIMED TODAY -->
      <div 
        v-else 
        class="w-full py-3.5 px-5 rounded-2xl flex items-center justify-between text-xs font-mono shadow-sm transition-colors"
        :class="isWhiteTheme 
          ? 'bg-black/5 border border-black/10 text-zinc-700' 
          : 'bg-white/[0.04] border border-white/10 text-zinc-400'"
      >
        <span 
          class="text-[11px] uppercase tracking-wider font-semibold"
          :class="isWhiteTheme ? 'text-zinc-600' : 'text-zinc-500'"
        >
          Daily Strike Claimed
        </span>
        <span 
          class="font-black text-sm"
          :class="isWhiteTheme ? 'text-zinc-950' : 'text-zinc-200'"
        >
          ⏳ {{ countdownText }}
        </span>
      </div>

      <!-- POWER STRIKE BUTTON (2 WLD = ATTACK + 20 TOKENS) -->
      <button 
        @click="triggerHit('power', $event)"
        class="w-full py-3.5 px-5 rounded-2xl active:scale-[0.98] transition-all flex items-center justify-between shadow-sm"
        :class="isWhiteTheme 
          ? 'bg-black/[0.03] hover:bg-black/[0.06] border-2 border-cyan-600 text-zinc-950 hover:border-cyan-700' 
          : 'bg-white/[0.03] hover:bg-white/[0.08] border border-cyan-500/30 hover:border-cyan-500/60 text-zinc-300 hover:text-white shadow-[0_0_15px_rgba(6,182,212,0.08)]'"
      >
        <div class="flex items-center gap-2.5">
          <Zap class="w-4 h-4 text-cyan-500 fill-cyan-500" />
          <span class="text-xs font-mono tracking-wider font-extrabold uppercase">Power Strike (+20 $HVAI)</span>
        </div>
        <span 
          class="text-xs font-mono font-black px-2.5 py-1 rounded-lg border"
          :class="isWhiteTheme 
            ? 'text-cyan-900 bg-cyan-100 border-cyan-300' 
            : 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30'"
        >
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

/* Volumetric Fog Keyframes for Boss 2, 4, 6, 7 */
@keyframes fogDrift1 {
  0% {
    transform: translate3d(-15%, 0, 0) scale(1, 0.9);
    opacity: 0.45;
  }
  50% {
    transform: translate3d(15%, -12px, 0) scale(1.15, 1.05);
    opacity: 0.75;
  }
  100% {
    transform: translate3d(-15%, 0, 0) scale(1, 0.9);
    opacity: 0.45;
  }
}

@keyframes fogDrift2 {
  0% {
    transform: translate3d(18%, -6px, 0) scale(1.1, 1.05);
    opacity: 0.65;
  }
  50% {
    transform: translate3d(-18%, 8px, 0) scale(0.95, 0.9);
    opacity: 0.4;
  }
  100% {
    transform: translate3d(18%, -6px, 0) scale(1.1, 1.05);
    opacity: 0.65;
  }
}

.animate-fog-1 {
  animation: fogDrift1 10s ease-in-out infinite;
}

.animate-fog-2 {
  animation: fogDrift2 14s ease-in-out infinite;
}
</style>
