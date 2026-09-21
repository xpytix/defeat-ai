<script setup lang="ts">
import { ref } from 'vue';
import { ArrowLeft, Trophy, ChevronRight, Lock, Heart, Swords, CheckCircle2 } from 'lucide-vue-next';

interface DamageContributor {
  address: string;
  hits: number;
  sharePercent: number;
  rewardEarned: number;
}

interface CharacterBoss {
  level: number;
  name: string;
  codename: string;
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

// Selected Boss for detailed view (null = roster grid)
const selectedBoss = ref<CharacterBoss | null>(null);

// Flat rate: 20 $HVAI per hit across all bosses
const bosses = ref<CharacterBoss[]>([
  {
    level: 1,
    name: 'AutoCorrect',
    codename: 'TYPO-01',
    maxHp: 50,
    status: 'active',
    image: '/bosses/boss_1.jpg',
    rewardPool: 1000, // 50 * 20
    contributors: [
      { address: '0x71a...92b', hits: 5, sharePercent: 10, rewardEarned: 100 },
      { address: '0x49e...c31', hits: 3, sharePercent: 6, rewardEarned: 60 },
      { address: 'You (Human)', hits: 2, sharePercent: 4, rewardEarned: 40 },
      { address: '0x88c...71f', hits: 2, sharePercent: 4, rewardEarned: 40 },
      { address: '0x12d...4aa', hits: 1, sharePercent: 2, rewardEarned: 20 }
    ]
  },
  {
    level: 2,
    name: 'reCAPTCHA',
    codename: 'BOT-TEST-02',
    maxHp: 200,
    status: 'locked',
    rewardPool: 4000, // 200 * 20
    contributors: []
  },
  {
    level: 3,
    name: 'SpamLord',
    codename: 'INBOX-03',
    maxHp: 1000,
    status: 'locked',
    rewardPool: 20000, // 1000 * 20
    contributors: []
  },
  {
    level: 4,
    name: 'DeepFake Doppelgänger',
    codename: 'CLONE-04',
    maxHp: 5000,
    status: 'locked',
    rewardPool: 100000, // 5000 * 20
    contributors: []
  },
  {
    level: 5,
    name: 'Hallucinating LLM',
    codename: 'CHAOS-05',
    maxHp: 25000,
    status: 'locked',
    rewardPool: 500000, // 25000 * 20
    contributors: []
  },
  {
    level: 6,
    name: 'Algorithmic Doomscroller',
    codename: 'FEED-06',
    maxHp: 75000,
    status: 'locked',
    rewardPool: 1500000, // 75000 * 20
    contributors: []
  },
  {
    level: 7,
    name: 'Autonomous Swarm',
    codename: 'FLEET-07',
    maxHp: 200000,
    status: 'locked',
    rewardPool: 4000000, // 200000 * 20
    contributors: []
  },
  {
    level: 8,
    name: 'The Singularity',
    codename: 'OMEGA-08',
    maxHp: 500000,
    status: 'locked',
    rewardPool: 10000000, // 500000 * 20
    contributors: []
  }
]);

const formatHp = (hp: number) => {
  if (hp >= 1000000) return `${(hp / 1000000).toFixed(1)}M`;
  if (hp >= 1000) return `${(hp / 1000).toFixed(0)}K`;
  return hp.toString();
};

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
  <div class="flex-1 flex flex-col px-5 pt-3 pb-24 max-w-sm mx-auto w-full select-none overflow-y-auto">
    
    <!-- VIEW A: BOSS DETAIL / DAMAGE LOG & REWARDS -->
    <div v-if="selectedBoss" class="flex-1 flex flex-col space-y-4">
      
      <!-- Back Button & Level Tag -->
      <div class="flex items-center justify-between">
        <button 
          @click="backToRoster"
          class="flex items-center gap-1.5 text-zinc-400 hover:text-white text-xs font-mono tracking-wider transition-colors py-1"
        >
          <ArrowLeft class="w-4 h-4" />
          <span>ROSTER</span>
        </button>

        <span class="text-[10px] font-mono tracking-widest uppercase text-zinc-500 font-bold">
          LVL {{ String(selectedBoss.level).padStart(2, '0') }}
        </span>
      </div>

      <!-- Boss 3D Preview Card -->
      <div class="relative w-full h-48 rounded-2xl overflow-hidden bg-black border border-white/10 flex items-center justify-center">
        <img 
          v-if="selectedBoss.image" 
          :src="selectedBoss.image" 
          :alt="selectedBoss.name" 
          class="w-full h-full object-cover object-top opacity-85"
        />
        <div v-else class="text-5xl font-mono text-zinc-800 font-black">
          ?
        </div>

        <div class="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent flex flex-col justify-end p-4">
          <h3 class="text-base font-extrabold text-white tracking-wide">
            {{ selectedBoss.status === 'locked' ? 'Classified AI Unit' : selectedBoss.name }}
          </h3>
          <div class="flex items-center justify-between text-xs font-mono text-zinc-300 mt-1">
            <span class="flex items-center gap-1">
              <Heart class="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
              <strong>{{ selectedBoss.maxHp.toLocaleString() }} HP</strong>
            </span>
            <span class="text-amber-400 font-bold flex items-center gap-1">
              <Trophy class="w-3.5 h-3.5" />
              {{ selectedBoss.rewardPool.toLocaleString() }} $HVAI
            </span>
          </div>
        </div>
      </div>

      <!-- REWARD PER STRIKE PILL -->
      <div class="p-2.5 rounded-xl bg-amber-400/5 border border-amber-400/15 flex items-center justify-between text-[11px] font-mono">
        <span class="text-zinc-400">Fixed Reward:</span>
        <span class="font-bold text-amber-400">+20 $HVAI / strike</span>
      </div>

      <!-- STATUS BADGE -->
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
          <span>Damage Dealt</span>
          <span>{{ selectedBoss.status === 'defeated' ? 'Earned' : 'Projected Reward' }}</span>
        </div>

        <div v-if="selectedBoss.contributors.length > 0" class="space-y-1.5">
          <div 
            v-for="c in selectedBoss.contributors" 
            :key="c.address"
            class="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between text-xs font-mono"
            :class="c.address.includes('You') ? 'border-cyan-500/40 bg-cyan-500/5' : ''"
          >
            <div>
              <div class="font-bold text-white text-[11px]">{{ c.address }}</div>
              <div class="text-[10px] text-zinc-400">{{ c.hits }} strikes ({{ c.sharePercent }}%)</div>
            </div>
            <div class="text-right">
              <div class="font-bold text-amber-400 text-xs">+{{ c.rewardEarned }}</div>
              <div class="text-[9px] text-zinc-500 uppercase">$HVAI</div>
            </div>
          </div>
        </div>

        <div v-else class="text-center py-8 text-zinc-600 text-xs font-mono">
          No strikes recorded for this level yet.
        </div>
      </div>

      <!-- Action Button -->
      <button 
        v-if="selectedBoss.status === 'active'"
        @click="goToFight"
        class="w-full py-3 rounded-xl bg-white text-black font-extrabold text-xs tracking-widest uppercase hover:bg-zinc-200 transition-all mt-auto"
      >
        GO TO ARENA
      </button>

    </div>

    <!-- VIEW B: MINIMALIST CHARACTER ROSTER GRID -->
    <div v-else class="flex-1 flex flex-col space-y-3">
      
      <!-- Minimal Header -->
      <div class="flex items-center justify-between text-[11px] font-mono tracking-widest text-zinc-400 pt-1 pb-1">
        <span class="font-bold text-zinc-200">BOSS ROSTER</span>
        <span class="text-zinc-500">50 HP ➔ 500K HP</span>
      </div>

      <!-- Grid of Boss Cards -->
      <div class="grid grid-cols-2 gap-3">
        <div 
          v-for="boss in bosses" 
          :key="boss.level"
          @click="openBossDetail(boss)"
          class="group relative rounded-2xl overflow-hidden border transition-all duration-200 cursor-pointer aspect-square flex flex-col justify-between p-3"
          :class="boss.status === 'active' 
            ? 'bg-black border-rose-500/40 shadow-[0_0_20px_rgba(244,63,94,0.15)] ring-1 ring-rose-500/30' 
            : boss.status === 'defeated' 
              ? 'bg-black border-emerald-500/30' 
              : 'bg-[#0A0A0F] border-white/5 opacity-60 hover:opacity-100'"
        >
          <!-- 3D Boss Image for Level 1 -->
          <img 
            v-if="boss.image" 
            :src="boss.image" 
            class="absolute inset-0 w-full h-full object-cover object-top opacity-75 group-hover:scale-105 transition-transform duration-300"
          />

          <!-- Pitch-Black Silhouette with glowing ? for Locked -->
          <div v-else class="absolute inset-0 bg-black flex items-center justify-center">
            <span class="text-3xl font-mono font-black text-zinc-800 group-hover:text-zinc-700 transition-colors">
              ?
            </span>
          </div>

          <!-- Top Level Tag & Lock/Check status -->
          <div class="relative z-10 flex items-center justify-between w-full">
            <span 
              class="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
              :class="boss.status === 'active' ? 'bg-rose-500 text-white' : 'bg-black/70 text-zinc-400 border border-white/10'"
            >
              LVL {{ String(boss.level).padStart(2, '0') }}
            </span>
            <Lock v-if="boss.status === 'locked'" class="w-3.5 h-3.5 text-zinc-600" />
            <CheckCircle2 v-else-if="boss.status === 'defeated'" class="w-3.5 h-3.5 text-emerald-400" />
          </div>

          <!-- Bottom Info with Clear HP Count -->
          <div class="relative z-10 bg-gradient-to-t from-black via-black/80 to-transparent -mx-3 -mb-3 p-2.5 pt-4">
            <div class="text-[11px] font-bold text-white truncate">
              {{ boss.status === 'locked' ? 'Classified' : boss.name }}
            </div>
            <div class="flex items-center justify-between text-[10px] font-mono text-zinc-400 mt-0.5">
              <span class="flex items-center gap-1 font-semibold text-rose-400">
                <Heart class="w-2.5 h-2.5 fill-rose-400" />
                {{ formatHp(boss.maxHp) }} HP
              </span>
              <span class="text-amber-400 font-bold text-[9px]">
                {{ formatHp(boss.rewardPool) }}
              </span>
            </div>
          </div>
        </div>
      </div>

    </div>

  </div>
</template>
