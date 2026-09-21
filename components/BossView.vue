<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { Zap, Heart, Flame, Shield, Users, Trophy } from 'lucide-vue-next';

interface FloatingDamage {
  id: number;
  value: string;
  x: number;
  y: number;
}

interface CombatLogItem {
  id: number;
  user: string;
  flag: string;
  type: 'free' | 'power';
  time: string;
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

// State
const isShaking = ref(false);
const floatingDamages = ref<FloatingDamage[]>([]);
const countdownText = ref('24:00:00');
let countdownInterval: any = null;

// Combat feed simulation
const combatLogs = ref<CombatLogItem[]>([
  { id: 1, user: '0x49a...f81', flag: '🇵🇱', type: 'free', time: '1 min temu' },
  { id: 2, user: '0x81b...29c', flag: '🇯🇵', type: 'power', time: '3 min temu' },
  { id: 3, user: '0x32c...7ea', flag: '🇩🇪', type: 'free', time: '5 min temu' }
]);

// HP Calculations
const hpPercent = computed(() => {
  if (props.maxHp <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((props.currentHp / props.maxHp) * 100)));
});

// Update countdown timer
const updateCountdown = () => {
  if (!props.nextFreeHitTime || props.freeHitAvailable) {
    countdownText.value = 'Dostępny!';
    return;
  }
  const now = Date.now();
  const diff = Math.max(0, props.nextFreeHitTime - now);
  if (diff <= 0) {
    countdownText.value = 'Dostępny!';
    return;
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  countdownText.value = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

onMounted(() => {
  updateCountdown();
  countdownInterval = setInterval(updateCountdown, 1000);
});

onUnmounted(() => {
  if (countdownInterval) clearInterval(countdownInterval);
});

// Trigger Hit
const handleHit = (type: 'free' | 'power', event?: MouseEvent) => {
  // Shake animation
  isShaking.value = true;
  setTimeout(() => {
    isShaking.value = false;
  }, 350);

  // Trigger floating damage number
  const id = Date.now() + Math.random();
  const x = event ? (event.clientX - 40 + (Math.random() * 40 - 20)) : 160;
  const y = event ? (event.clientY - 60) : 250;
  
  floatingDamages.value.push({
    id,
    value: type === 'power' ? '-1 HP (CRIT)' : '-1 HP',
    x,
    y
  });

  setTimeout(() => {
    floatingDamages.value = floatingDamages.value.filter(d => d.id !== id);
  }, 800);

  // Add to local combat log
  combatLogs.value.unshift({
    id: Date.now(),
    user: 'Ty (Człowiek)',
    flag: '🌍',
    type,
    time: 'teraz'
  });
  if (combatLogs.value.length > 5) combatLogs.value.pop();

  // Emit event to parent
  emit('hit', type);

  // Mobile haptic vibration
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(type === 'power' ? [30, 50, 30] : 25);
  }
};
</script>

<template>
  <div class="flex-1 flex flex-col justify-between px-4 pt-2 pb-24 overflow-y-auto max-w-md mx-auto w-full select-none">
    
    <!-- TOP BOSS BANNER -->
    <div class="flex items-center justify-between bg-cyber-surface/70 border border-cyber-border/70 rounded-2xl p-3 backdrop-blur-md">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-cyber-primary/10 border border-cyber-primary/30 flex items-center justify-center text-cyber-primary">
          <Flame class="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <div class="flex items-center gap-2">
            <span class="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-cyber-primary/20 text-cyber-primary border border-cyber-primary/30">
              POZIOM {{ level }}
            </span>
            <span class="text-[11px] font-mono text-zinc-400">RAJD #001</span>
          </div>
          <h2 class="text-base font-extrabold text-white tracking-wide mt-0.5">
            {{ bossName }}
          </h2>
        </div>
      </div>
      
      <div class="text-right">
        <div class="text-[10px] font-mono uppercase text-zinc-400">PULA NAGRÓD</div>
        <div class="text-xs font-black text-cyber-amber flex items-center gap-1 justify-end">
          <Trophy class="w-3.5 h-3.5" />
          <span>5 000 HVAI</span>
        </div>
      </div>
    </div>

    <!-- BOSS ARENA / GRAPHIC -->
    <div class="relative flex flex-col items-center justify-center my-4 py-6">
      
      <!-- Ambient Glow Behind Boss -->
      <div 
        class="absolute w-56 h-56 rounded-full blur-[70px] pointer-events-none transition-all duration-300"
        :class="hpPercent > 50 ? 'bg-cyber-primary/20' : 'bg-cyber-cyan/20'"
      />

      <!-- Floating Damage Numbers -->
      <div 
        v-for="d in floatingDamages" 
        :key="d.id"
        class="fixed z-50 pointer-events-none font-black font-mono text-lg animate-float-damage"
        :class="d.value.includes('CRIT') ? 'text-cyber-amber text-xl drop-shadow-[0_0_12px_rgba(255,184,0,0.8)]' : 'text-cyber-primary drop-shadow-[0_0_10px_rgba(255,46,85,0.8)]'"
        :style="{ left: `${d.x}px`, top: `${d.y}px` }"
      >
        {{ d.value }}
      </div>

      <!-- Boss Interactive Avatar (Cyber Robot Core) -->
      <div 
        @click="freeHitAvailable ? handleHit('free', $event) : handleHit('power', $event)"
        class="relative w-52 h-52 flex items-center justify-center cursor-pointer transition-transform duration-100 active:scale-95"
        :class="{ 'animate-shake': isShaking }"
      >
        <!-- Futuristic AI Entity SVG -->
        <svg class="w-full h-full drop-shadow-[0_10px_25px_rgba(0,0,0,0.5)]" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- Outer Shield Ring -->
          <circle cx="100" cy="100" r="90" stroke="#242436" stroke-width="3" stroke-dasharray="8 6" opacity="0.6"/>
          <circle cx="100" cy="100" r="78" fill="#12121A" stroke="#FF2E55" stroke-width="2" stroke-opacity="0.4"/>
          
          <!-- Cyber Skull / Robot Head -->
          <path d="M60 70C60 48 78 30 100 30C122 30 140 48 140 70V110C140 125 125 140 100 140C75 140 60 125 60 110V70Z" fill="#181824" stroke="#FF2E55" stroke-width="3"/>
          
          <!-- Visor / Eye Sensor -->
          <rect x="75" y="70" width="50" height="14" rx="4" fill="#0A0A0F" stroke="#00F0FF" stroke-width="2"/>
          <circle cx="95" cy="77" r="4" fill="#00F0FF" class="animate-ping"/>
          <circle cx="95" cy="77" r="4" fill="#00F0FF"/>
          <line x1="77" y1="77" x2="123" y2="77" stroke="#00F0FF" stroke-width="1" stroke-dasharray="2 2"/>
          
          <!-- Cyber Wires and Circuit Details -->
          <path d="M70 125L50 145M130 125L150 145M100 140V165" stroke="#242436" stroke-width="3" stroke-linecap="round"/>
          <circle cx="50" cy="145" r="4" fill="#FF2E55"/>
          <circle cx="150" cy="145" r="4" fill="#FF2E55"/>
          <circle cx="100" cy="165" r="4" fill="#00F0FF"/>
          
          <!-- Mouth Ventilation Grill -->
          <rect x="85" y="105" width="30" height="4" rx="1" fill="#FF2E55" opacity="0.8"/>
          <rect x="87" y="113" width="26" height="3" rx="1" fill="#FF2E55" opacity="0.6"/>
          <rect x="90" y="120" width="20" height="2" rx="1" fill="#FF2E55" opacity="0.4"/>
        </svg>

        <!-- Tap Prompt Badge Overlay -->
        <div class="absolute -bottom-2 bg-cyber-surface/90 border border-cyber-border px-3 py-1 rounded-full text-[10px] font-mono tracking-wider text-zinc-400 shadow-md">
          DOTKNIJ, ABY ZADAĆ CIOS
        </div>
      </div>

      <!-- BOSS HEALTH BAR -->
      <div class="w-full mt-6 bg-cyber-surface/80 border border-cyber-border rounded-2xl p-3.5 backdrop-blur-sm">
        <div class="flex items-center justify-between text-xs font-mono font-bold mb-2">
          <span class="flex items-center gap-1.5 text-zinc-300">
            <Heart class="w-3.5 h-3.5 text-cyber-primary fill-cyber-primary" />
            PUNKTY ŻYCIA (HP)
          </span>
          <span class="text-white font-black tracking-wider">
            {{ currentHp }} <span class="text-zinc-500">/</span> {{ maxHp }} HP 
            <span class="text-cyber-cyan ml-1">({{ hpPercent }}%)</span>
          </span>
        </div>
        
        <!-- Progress Bar -->
        <div class="w-full h-4 bg-black/60 rounded-full overflow-hidden p-0.5 border border-white/5 relative">
          <div 
            class="h-full rounded-full transition-all duration-300 relative shadow-lg"
            :class="hpPercent > 30 ? 'bg-gradient-to-r from-cyber-primary to-cyber-amber' : 'bg-gradient-to-r from-red-600 to-cyber-primary animate-pulse'"
            :style="{ width: `${hpPercent}%` }"
          >
            <!-- Striped Overlay Effect -->
            <div class="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:16px_16px] opacity-40"></div>
          </div>
        </div>
      </div>

    </div>

    <!-- ACTION BUTTONS -->
    <div class="space-y-2.5 my-2">
      
      <!-- BUTTON 1: DARMOWY CIOS (1/1 NA 24H) -->
      <button 
        v-if="freeHitAvailable"
        @click="handleHit('free', $event)"
        class="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-cyber-primary to-rose-600 hover:from-rose-500 hover:to-cyber-primary text-white font-black text-sm tracking-wider uppercase flex items-center justify-center gap-3 shadow-[0_0_25px_rgba(255,46,85,0.4)] active:scale-[0.98] transition-all border border-cyber-primary/40"
      >
        <Flame class="w-5 h-5 fill-white" />
        <span>💥 ZADAJ DARMOWY CIOS (1/1)</span>
      </button>

      <!-- BUTTON 1 (DISABLED / COUNTDOWN) -->
      <div 
        v-else 
        class="w-full py-3.5 px-5 rounded-2xl bg-cyber-surface/60 border border-cyber-border flex items-center justify-between text-zinc-400"
      >
        <div class="flex items-center gap-2">
          <Shield class="w-4 h-4 text-zinc-500" />
          <span class="text-xs font-semibold">Darmowy cios wykorzystany</span>
        </div>
        <div class="text-xs font-mono font-bold text-cyber-cyan bg-cyber-cyan/10 border border-cyber-cyan/20 px-2.5 py-1 rounded-lg">
          ⏳ {{ countdownText }}
        </div>
      </div>

      <!-- BUTTON 2: POWER STRIKE (2 WLD) -->
      <button 
        @click="handleHit('power', $event)"
        class="w-full py-3 px-5 rounded-2xl bg-cyber-card border border-cyber-cyan/40 hover:border-cyber-cyan/80 text-white font-bold text-xs tracking-wider flex items-center justify-between group active:scale-[0.98] transition-all hover:bg-cyber-cyan/5 shadow-[0_0_15px_rgba(0,240,255,0.1)]"
      >
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-xl bg-cyber-cyan/10 border border-cyber-cyan/30 flex items-center justify-center text-cyber-cyan group-hover:scale-105 transition-transform">
            <Zap class="w-4 h-4 fill-cyber-cyan" />
          </div>
          <div class="text-left">
            <div class="text-white font-extrabold text-xs">POWER STRIKE (+1 CIOS)</div>
            <div class="text-[10px] text-zinc-400">Natychmiastowe uderzenie bez limitu</div>
          </div>
        </div>

        <div class="bg-cyber-cyan/20 text-cyber-cyan border border-cyber-cyan/40 px-3 py-1.5 rounded-xl font-mono font-black text-xs">
          2 WLD
        </div>
      </button>

    </div>

    <!-- COMBAT LIVE FEED (TICKER) -->
    <div class="bg-cyber-surface/50 border border-cyber-border/60 rounded-xl p-2.5 mt-1">
      <div class="flex items-center justify-between text-[10px] font-mono text-zinc-500 uppercase mb-1.5 px-1">
        <span class="flex items-center gap-1">
          <Users class="w-3 h-3" />
          OSTATNIE CIOSY LUDZI (NA ŻYWO)
        </span>
        <span class="w-2 h-2 rounded-full bg-cyber-emerald animate-pulse"></span>
      </div>
      
      <div class="space-y-1">
        <div 
          v-for="log in combatLogs" 
          :key="log.id"
          class="flex items-center justify-between text-[11px] font-mono py-1 px-2 rounded-lg bg-black/30 border border-white/5"
        >
          <span class="flex items-center gap-1.5 text-zinc-300">
            <span>{{ log.flag }}</span>
            <span class="font-bold text-white">{{ log.user }}</span>
          </span>
          <span class="flex items-center gap-2">
            <span 
              class="px-1.5 py-0.5 rounded text-[9px] font-black"
              :class="log.type === 'power' ? 'bg-cyber-cyan/20 text-cyber-cyan' : 'bg-cyber-primary/20 text-cyber-primary'"
            >
              -1 HP
            </span>
            <span class="text-[10px] text-zinc-500">{{ log.time }}</span>
          </span>
        </div>
      </div>
    </div>

  </div>
</template>
