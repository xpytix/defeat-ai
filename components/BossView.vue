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

// 3D Parallax Tilt State
const tiltX = ref(0);
const tiltY = ref(0);
const isShaking = ref(false);
const floatingDamages = ref<FloatingDamage[]>([]);
const countdownText = ref('24:00:00');
let countdownInterval: any = null;

// Dynamic Image Path (loads seamless PNG assets with alpha transparency)
const bossImage = computed(() => {
  if (props.isWhiteTheme && [3, 5, 8].includes(props.level)) {
    return `/bosses/boss_${props.level}_white.png`;
  }
  return `/bosses/boss_${props.level || 1}.png`;
});

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
    class="h-full w-full flex-1 flex flex-col justify-between items-center px-3 sm:px-6 pt-1 pb-2 sm:pb-3 max-w-lg sm:max-w-xl md:max-w-2xl lg:max-w-3xl mx-auto select-none overflow-hidden transition-colors duration-500"
    @mousemove="handlePointerMove"
    @touchmove="handlePointerMove"
    @mouseleave="resetTilt"
    @touchend="resetTilt"
  >

    <!-- TOP STATUS ROW WITH NAVIGATION ARROWS (CLEAN & MINIMAL) -->
    <div class="w-full shrink-0 flex flex-col space-y-1 pt-1 px-1">
      
      <!-- Upper Status Row -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-1.5 sm:gap-2">
          <button 
            @click="emit('selectLevel', Math.max(1, level - 1))"
            :disabled="level <= 1"
            class="w-7 h-7 rounded-lg flex items-center justify-center disabled:opacity-20 text-sm font-bold transition-all active:scale-95"
            :class="isWhiteTheme 
              ? 'text-zinc-700 hover:text-black bg-black/5 hover:bg-black/10 border border-black/10 disabled:hover:text-zinc-700' 
              : 'text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 disabled:hover:text-zinc-400'"
            title="Previous Boss"
          >
            ‹
          </button>
          <span 
            class="text-xs font-mono font-black px-2.5 py-1 rounded-md border tracking-wider"
            :class="level === 8 
              ? (isWhiteTheme ? 'text-amber-900 bg-amber-200 border-amber-400 shadow-sm' : 'text-amber-300 bg-amber-400/20 border-amber-400/40') 
              : (isWhiteTheme ? 'text-zinc-950 bg-black/5 border-black/15' : 'text-rose-500 bg-rose-500/10 border-rose-500/20')"
          >
            LVL {{ String(level).padStart(2, '0') }}
          </span>
          <button 
            @click="emit('selectLevel', Math.min(8, level + 1))"
            :disabled="level >= 8"
            class="w-7 h-7 rounded-lg flex items-center justify-center disabled:opacity-20 text-sm font-bold transition-all active:scale-95"
            :class="isWhiteTheme 
              ? 'text-zinc-700 hover:text-black bg-black/5 hover:bg-black/10 border border-black/10 disabled:hover:text-zinc-700' 
              : 'text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 disabled:hover:text-zinc-400'"
            title="Next Boss"
          >
            ›
          </button>
          <span 
            class="text-xs sm:text-sm font-mono tracking-widest font-black uppercase truncate max-w-[130px] sm:max-w-xs ml-0.5"
            :class="isWhiteTheme ? 'text-zinc-950' : 'text-zinc-200'"
          >
            {{ bossName }}
          </span>
        </div>

        <!-- Token Balance -->
        <div 
          class="flex items-center gap-1.5 px-3 py-1 rounded-full text-amber-500 font-bold shadow-sm transition-colors"
          :class="isWhiteTheme ? 'bg-black/[0.04] border border-black/10' : 'bg-white/[0.05] border border-white/10'"
        >
          <Coins class="w-3.5 h-3.5 text-amber-500" />
          <span class="text-xs font-mono font-black">{{ userTokens.toLocaleString() }}</span>
          <span class="text-[9px] font-mono font-normal" :class="isWhiteTheme ? 'text-zinc-600' : 'text-zinc-400'">$HVAI</span>
        </div>
      </div>

      <!-- Lower Sub-Bar with Spectator Icons -->
      <div 
        class="flex items-center justify-between text-[11px] font-mono pt-0.5 pb-1.5 border-b transition-colors"
        :class="isWhiteTheme ? 'border-black/[0.08] text-zinc-600' : 'border-white/[0.06] text-zinc-500'"
      >
        <span class="text-[10px] uppercase tracking-wider flex items-center gap-1 font-semibold"
          :class="level === 8 
            ? (isWhiteTheme ? 'text-amber-700 font-bold' : 'text-amber-400 font-bold') 
            : (isWhiteTheme ? 'text-zinc-600' : 'text-zinc-500')"
        >
          <ShieldAlert class="w-3.5 h-3.5" :class="level === 8 ? (isWhiteTheme ? 'text-amber-700' : 'text-amber-400') : (isWhiteTheme ? 'text-cyan-700' : 'text-cyan-400')" />
          <span>{{ level === 8 ? 'APEX SINGULARITY THREAT' : 'CLASS-1 ROGUE ENTITY' }}</span>
        </span>

        <div class="flex items-center gap-3.5 text-xs">
          <div class="flex items-center gap-1.5" :class="isWhiteTheme ? 'text-zinc-700' : 'text-zinc-400'">
            <Eye class="w-3.5 h-3.5 text-zinc-500" />
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

    <!-- 3D CENTERPIECE ARENA: FLUID RESPONSIVE (SCALES FREELY ON IPHONE MINI TO 17 PRO MAX & TABLETS) -->
    <div class="relative flex-1 min-h-0 flex flex-col items-center justify-center my-auto w-full overflow-hidden py-1">
      
      <!-- LAYER 1: Ambient Reactor Glow -->
      <div 
        class="absolute w-80 sm:w-[460px] h-80 sm:h-[460px] rounded-full blur-[120px] pointer-events-none -z-10 transition-colors duration-700"
        :class="isWhiteTheme 
          ? (level === 8 ? 'bg-amber-400/35' : level === 5 ? 'bg-violet-400/30' : 'bg-fuchsia-400/25') 
          : (level === 8 ? 'bg-amber-400/20' : hpPercent > 30 ? 'bg-cyan-500/15' : 'bg-red-500/20')"
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

      <!-- LAYER 3: THE 3D BOSS CHARACTER CONTAINER (EXPANDS FOR IPHONE 16 PRO MAX & TABLETS) -->
      <div 
        @click="freeHitAvailable ? triggerHit('free', $event) : triggerHit('power', $event)"
        class="relative w-full h-full max-h-full max-w-[min(94vw,430px)] sm:max-w-[500px] md:max-w-[580px] aspect-square cursor-pointer flex items-center justify-center transition-transform duration-100 ease-out active:scale-95 my-auto"
        :class="{ 'animate-shake': isShaking }"
        :style="{
          transform: `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`,
        }"
      >

        <!-- The Boss Image: Clean, Crisp & Immediate (No Fade Lag or Gradient Clipping) -->
        <div class="relative w-full h-full flex items-center justify-center overflow-visible">
          <img 
            :src="bossImage" 
            :alt="bossName" 
            class="w-full h-full object-contain select-none pointer-events-none transition-transform duration-100 scale-105 sm:scale-105"
            :class="[
              isShaking ? 'brightness-125 filter contrast-125 !scale-110' : '',
              isWhiteTheme ? 'mix-blend-multiply' : ''
            ]"
          />

          <!-- Red Hit Flash Overlay -->
          <div 
            v-if="isShaking"
            class="absolute inset-0 bg-rose-600/30 pointer-events-none transition-opacity rounded-full blur-2xl"
          />
        </div>

        <!-- FOREGROUND EMBERS & CYBER SPARKS (DIRECTLY OVERLAPPING BOSS CHASSIS) -->
        <div class="absolute inset-0 pointer-events-none overflow-hidden z-20">
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

    </div>

    <!-- PROMINENT HP DISPLAY DIRECTLY UNDER BOSS -->
    <div class="w-full shrink-0 max-w-[420px] sm:max-w-[480px] md:max-w-[540px] px-2 z-30">
      <!-- Direct HP Numbers & Percentage -->
      <div class="flex items-center justify-between font-mono mb-1 px-0.5">
        <div 
          class="flex items-center gap-1.5 font-black text-xs sm:text-sm tracking-wider"
          :class="isWhiteTheme ? 'text-zinc-950' : 'text-white'"
        >
          <Heart class="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
          <span>{{ currentHp.toLocaleString() }}</span>
          <span :class="isWhiteTheme ? 'text-zinc-400' : 'text-zinc-600'">/</span>
          <span class="font-normal" :class="isWhiteTheme ? 'text-zinc-600' : 'text-zinc-400'">{{ maxHp.toLocaleString() }} HP</span>
        </div>
        <span 
          class="text-xs font-mono font-black"
          :class="isWhiteTheme ? 'text-zinc-700' : 'text-zinc-400'"
        >
          {{ hpPercent }}%
        </span>
      </div>

      <!-- Sleek HP Progress Bar with Gradient -->
      <div 
        class="w-full h-2 sm:h-2.5 rounded-full overflow-hidden p-0.5 relative shadow-inner transition-colors"
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

    <!-- WIDER ACTION BUTTONS (ALWAYS VISIBLE ABOVE BOTTOM NAV ON ANY SCREEN) -->
    <div class="w-full shrink-0 max-w-[420px] sm:max-w-[480px] md:max-w-[540px] space-y-2 mt-2 px-1 z-30">
      
      <!-- FREE DAILY STRIKE (ATTACK + CLAIM 20 TOKENS) -->
      <button 
        v-if="freeHitAvailable"
        @click="triggerHit('free', $event)"
        class="w-full py-3 sm:py-3.5 px-5 rounded-2xl font-black text-xs sm:text-sm tracking-wider uppercase active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        :class="isWhiteTheme 
          ? 'bg-black text-white hover:bg-zinc-800 shadow-[0_4px_20px_rgba(0,0,0,0.2)] border border-black' 
          : 'bg-gradient-to-r from-white via-zinc-100 to-zinc-200 text-black hover:bg-white shadow-[0_0_20px_rgba(255,255,255,0.2)] border border-white'"
      >
        <span>💥 STRIKE & CLAIM (+20 $HVAI)</span>
      </button>

      <!-- COUNTDOWN TIMER IF ALREADY CLAIMED TODAY -->
      <div 
        v-else 
        class="w-full py-2.5 sm:py-3 px-4 rounded-2xl flex items-center justify-between text-xs font-mono shadow-sm transition-colors"
        :class="isWhiteTheme 
          ? 'bg-black/5 border border-black/10 text-zinc-700' 
          : 'bg-white/[0.04] border border-white/10 text-zinc-400'"
      >
        <span 
          class="text-[10px] uppercase tracking-wider font-semibold"
          :class="isWhiteTheme ? 'text-zinc-600' : 'text-zinc-500'"
        >
          Daily Strike Claimed
        </span>
        <span 
          class="font-black text-xs sm:text-sm"
          :class="isWhiteTheme ? 'text-zinc-950' : 'text-zinc-200'"
        >
          ⏳ {{ countdownText }}
        </span>
      </div>

      <!-- POWER STRIKE BUTTON (2 WLD = ATTACK + 20 TOKENS) -->
      <button 
        @click="triggerHit('power', $event)"
        class="w-full py-2.5 sm:py-3 px-4 rounded-2xl active:scale-[0.98] transition-all flex items-center justify-between shadow-sm"
        :class="isWhiteTheme 
          ? 'bg-black/[0.03] hover:bg-black/[0.06] border border-cyan-600 text-zinc-950' 
          : 'bg-white/[0.03] hover:bg-white/[0.08] border border-cyan-500/30 hover:border-cyan-500/60 text-zinc-300 hover:text-white'"
      >
        <div class="flex items-center gap-2">
          <Zap class="w-3.5 h-3.5 text-cyan-500 fill-cyan-500" />
          <span class="text-[11px] sm:text-xs font-mono tracking-wider font-extrabold uppercase">Power Strike (+20 $HVAI)</span>
        </div>
        <span 
          class="text-[11px] sm:text-xs font-mono font-black px-2 py-0.5 rounded-md border"
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
</style>
