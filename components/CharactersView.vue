<script setup lang="ts">
import { ref } from 'vue';
import { ArrowLeft, Trophy, ChevronRight, Lock } from 'lucide-vue-next';

interface DamageContributor {
  address: string;
  hits: number;
  sharePercent: number;
  rewardEarned: number;
}

interface CharacterBoss {
  level: number;
  name: string;
  maxHp: number;
  status: 'active' | 'defeated' | 'locked';
  image?: string;
  rewardPool: number;
  contributors: DamageContributor[];
}

const props = defineProps<{
  currentLevel: number;
}>();

const emit = defineEmits<{
  (e: 'fight', level: number): void;
}>();

// Selected Boss for detailed view (null = roster list)
const selectedBoss = ref<CharacterBoss | null>(null);

const bosses = ref<CharacterBoss[]>([
  {
    level: 1,
    name: 'Synthetic Core',
    maxHp: 50,
    status: 'active',
    image: '/bosses/boss_1.jpg',
    rewardPool: 5000,
    contributors: [
      { address: '0x71a...92b', hits: 5, sharePercent: 10, rewardEarned: 500 },
      { address: '0x49e...c31', hits: 3, sharePercent: 6, rewardEarned: 300 },
      { address: 'You (Human)', hits: 2, sharePercent: 4, rewardEarned: 200 },
      { address: '0x88c...71f', hits: 2, sharePercent: 4, rewardEarned: 200 },
      { address: '0x12d...4aa', hits: 1, sharePercent: 2, rewardEarned: 100 }
    ]
  },
  {
    level: 2,
    name: 'Neural Weaver',
    maxHp: 100,
    status: 'locked',
    rewardPool: 12000,
    contributors: []
  },
  {
    level: 3,
    name: 'Prompt Overlord',
    maxHp: 200,
    status: 'locked',
    rewardPool: 25000,
    contributors: []
  },
  {
    level: 4,
    name: 'Algorithmic Singularity',
    maxHp: 500,
    status: 'locked',
    rewardPool: 60000,
    contributors: []
  },
  {
    level: 5,
    name: 'Quantum Core',
    maxHp: 1000,
    status: 'locked',
    rewardPool: 150000,
    contributors: []
  },
  {
    level: 6,
    name: 'Autonomous Prime',
    maxHp: 2000,
    status: 'locked',
    rewardPool: 350000,
    contributors: []
  },
  {
    level: 7,
    name: 'Sentient Nexus',
    maxHp: 5000,
    status: 'locked',
    rewardPool: 1000000,
    contributors: []
  },
  {
    level: 8,
    name: 'Skynet Omega',
    maxHp: 10000,
    status: 'locked',
    rewardPool: 3000000,
    contributors: []
  }
]);

const openBossDetail = (boss: CharacterBoss) => {
  selectedBoss.value = boss;
};

const backToRoster = () => {
  selectedBoss.value = null;
};

const goToFight = () => {
  emit('fight', 1);
};
</script>

<template>
  <div class="flex-1 flex flex-col px-6 pt-4 pb-24 max-w-sm mx-auto w-full select-none overflow-y-auto">
    
    <!-- VIEW A: BOSS DETAIL / DAMAGE LOG & REWARDS -->
    <div v-if="selectedBoss" class="flex-1 flex flex-col space-y-4">
      
      <!-- Back Button & Level Tag -->
      <div class="flex items-center justify-between">
        <button 
          @click="backToRoster"
          class="flex items-center gap-1 text-zinc-500 hover:text-white text-xs font-mono tracking-wider transition-colors"
        >
          <ArrowLeft class="w-4 h-4" />
          <span>ROSTER</span>
        </button>

        <span class="text-[10px] font-mono tracking-widest uppercase text-zinc-500">
          LVL {{ String(selectedBoss.level).padStart(2, '0') }}
        </span>
      </div>

      <!-- Boss 3D Preview Card -->
      <div class="relative w-full h-44 rounded-2xl overflow-hidden bg-black border border-white/5 flex items-center justify-center">
        <img 
          v-if="selectedBoss.image" 
          :src="selectedBoss.image" 
          :alt="selectedBoss.name" 
          class="w-full h-full object-cover opacity-80"
        />
        <div v-else class="text-4xl font-mono text-zinc-700 font-black">
          ?
        </div>

        <div class="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent flex flex-col justify-end p-4">
          <h3 class="text-lg font-black text-white tracking-wide">
            {{ selectedBoss.status === 'locked' ? 'Classified Entity' : selectedBoss.name }}
          </h3>
          <div class="flex items-center justify-between text-[11px] font-mono text-zinc-400 mt-1">
            <span>Pool: {{ selectedBoss.maxHp }} HP</span>
            <span class="text-amber-400 font-bold flex items-center gap-1">
              <Trophy class="w-3 h-3" />
              {{ selectedBoss.rewardPool.toLocaleString() }} $HVAI
            </span>
          </div>
        </div>
      </div>

      <!-- REWARD / STATUS BADGE -->
      <div class="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs font-mono">
        <span class="text-zinc-500">Status</span>
        <span 
          class="font-bold text-[10px] tracking-wider uppercase px-2 py-0.5 rounded"
          :class="selectedBoss.status === 'defeated' 
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
            : selectedBoss.status === 'active' 
              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
              : 'bg-zinc-800 text-zinc-500'"
        >
          {{ selectedBoss.status === 'defeated' ? 'Defeated' : selectedBoss.status === 'active' ? 'In Progress' : 'Locked' }}
        </span>
      </div>

      <!-- DAMAGE LEADERBOARD & REWARD DISTRIBUTION -->
      <div class="flex-1 flex flex-col space-y-2">
        <div class="flex items-center justify-between text-[10px] font-mono tracking-widest text-zinc-500 uppercase px-1">
          <span>Contributors</span>
          <span>{{ selectedBoss.status === 'defeated' ? 'Earned' : 'Projected' }}</span>
        </div>

        <div v-if="selectedBoss.contributors.length > 0" class="space-y-1.5">
          <div 
            v-for="c in selectedBoss.contributors" 
            :key="c.address"
            class="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between text-xs font-mono"
            :class="c.address.includes('You') ? 'border-cyan-500/30 bg-cyan-500/5' : ''"
          >
            <div>
              <div class="font-bold text-white text-[11px]">{{ c.address }}</div>
              <div class="text-[10px] text-zinc-500">{{ c.hits }} strikes ({{ c.sharePercent }}%)</div>
            </div>
            <div class="text-right">
              <div class="font-bold text-amber-400 text-xs">+{{ c.rewardEarned }}</div>
              <div class="text-[9px] text-zinc-600 uppercase">$HVAI</div>
            </div>
          </div>
        </div>

        <div v-else class="text-center py-8 text-zinc-600 text-xs font-mono">
          No strikes recorded for this level yet.
        </div>
      </div>

      <!-- Action Button (Fight if active) -->
      <button 
        v-if="selectedBoss.status === 'active'"
        @click="goToFight"
        class="w-full py-3 rounded-xl bg-white text-black font-extrabold text-xs tracking-widest uppercase hover:bg-zinc-200 transition-all mt-auto"
      >
        GO TO ARENA
      </button>

    </div>

    <!-- VIEW B: MINIMALIST CHARACTER ROSTER -->
    <div v-else class="flex-1 flex flex-col space-y-3">
      
      <!-- Minimal Header -->
      <div class="flex items-center justify-between text-[11px] font-mono tracking-widest text-zinc-500 pt-2 pb-1">
        <span>CHARACTERS</span>
        <span>8 LEVELS</span>
      </div>

      <!-- Grid of Boss Cards -->
      <div class="grid grid-cols-2 gap-3">
        <div 
          v-for="boss in bosses" 
          :key="boss.level"
          @click="openBossDetail(boss)"
          class="group relative rounded-2xl overflow-hidden border transition-all duration-200 cursor-pointer aspect-square flex flex-col justify-between p-3"
          :class="boss.status === 'active' 
            ? 'bg-black border-rose-500/30 shadow-[0_0_20px_rgba(244,63,94,0.1)] ring-1 ring-rose-500/20' 
            : boss.status === 'defeated' 
              ? 'bg-black border-emerald-500/30' 
              : 'bg-[#0A0A0F] border-white/5 opacity-60 hover:opacity-100'"
        >
          <!-- Background image for unlocked / 3D model -->
          <img 
            v-if="boss.image" 
            :src="boss.image" 
            class="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:scale-105 transition-transform duration-300"
          />

          <!-- Silhouette for Locked -->
          <div v-else class="absolute inset-0 bg-black flex items-center justify-center">
            <span class="text-3xl font-mono font-black text-zinc-800 group-hover:text-zinc-700 transition-colors">
              ?
            </span>
          </div>

          <!-- Top Level Tag -->
          <div class="relative z-10 flex items-center justify-between w-full">
            <span 
              class="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
              :class="boss.status === 'active' ? 'bg-rose-500 text-white' : 'bg-black/60 text-zinc-500 border border-white/10'"
            >
              LVL {{ String(boss.level).padStart(2, '0') }}
            </span>
            <Lock v-if="boss.status === 'locked'" class="w-3 h-3 text-zinc-600" />
          </div>

          <!-- Bottom Info -->
          <div class="relative z-10 bg-gradient-to-t from-black via-black/80 to-transparent -mx-3 -mb-3 p-3 pt-4">
            <div class="text-[11px] font-bold text-white truncate">
              {{ boss.status === 'locked' ? '???' : boss.name }}
            </div>
            <div class="text-[9px] font-mono text-zinc-400 mt-0.5">
              {{ boss.maxHp }} HP
            </div>
          </div>
        </div>
      </div>

    </div>

  </div>
</template>
