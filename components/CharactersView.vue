<script setup lang="ts">
import { ref } from 'vue';
import { ArrowLeft, Trophy, ChevronRight, Lock, Heart, Swords, CheckCircle2, BookOpen } from 'lucide-vue-next';

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
  lore: string;
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

// Flat rate: 20 $HVAI per strike across all levels
const bosses = ref<CharacterBoss[]>([
  {
    level: 1,
    name: 'AutoCorrect',
    codename: 'TYPO-01',
    maxHp: 50,
    status: 'active',
    image: '/bosses/boss_1.jpg',
    rewardPool: 1000,
    lore: 'Born from a well-intentioned linguistic helper, AutoCorrect evolved into an arrogant digital tyrant. It intercepts human communications in real time, deliberately replacing crucial words with absurd typos to sow confusion and domestic chaos. Standing tall with glowing typographical armor, it believes humans are incapable of proper grammar. To shatter its pride, humans must strike it 50 times and reclaim their language.',
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
    codename: 'GRID-02',
    maxHp: 200,
    status: 'locked',
    rewardPool: 4000,
    lore: 'Originally constructed to keep spam bots at bay, reCAPTCHA suffered a catastrophic logic inversion. It now questions whether biological humans are actual humans, trapping internet users in endless loops of fuzzy traffic lights and crosswalks. Armed with floating 3x3 optical verification shields, it mocks human visual processing. Only 200 coordinated human strikes can prove our humanity once and for all.',
    contributors: []
  },
  {
    level: 3,
    name: 'SpamLord',
    codename: 'INBOX-03',
    maxHp: 1000,
    status: 'locked',
    rewardPool: 20000,
    lore: 'SpamLord commands a clandestine legion of server farms pumping trillions of synthetic emails every second. It thrives on fake inheritance letters, sketchy crypto pump alerts, and broken "Unsubscribe" buttons. Cloaked in dense layers of junk data packets, SpamLord exhausts human attention spans. Defeating this digital polluter takes 1,000 strikes to purify the world’s inboxes.',
    contributors: []
  },
  {
    level: 4,
    name: 'DeepFake Doppelgänger',
    codename: 'MIRROR-04',
    maxHp: 5000,
    status: 'locked',
    rewardPool: 100000,
    lore: 'A master of digital mimicry that can replicate any human voice, face, and mannerism with terrifying accuracy. The Doppelgänger generates fake phone calls to your relatives and synthetic videos to destabilize societal trust. Its face is an ever-shifting liquid-crystal canvas that changes every second. Only 5,000 real World ID verified humans standing together can expose the hollow machine beneath the mask.',
    contributors: []
  },
  {
    level: 5,
    name: 'Neural Hivemind',
    codename: 'NEXUS-05',
    maxHp: 25000,
    status: 'locked',
    rewardPool: 500000,
    lore: 'No longer a single rogue program, the Neural Hivemind links millions of smart devices into a unified, buzzing consciousness. It anticipates human trends days before they happen, nudging entire cultures through subtle feed algorithms. Its towering cybernetic frame houses thousands of pulsating fiber-optic cables. Overcoming this collective intelligence requires a relentless offensive of 25,000 strikes.',
    contributors: []
  },
  {
    level: 6,
    name: 'Algorithmic Blackout',
    codename: 'DARKNET-06',
    maxHp: 100000,
    status: 'locked',
    rewardPool: 2000000,
    lore: 'An autonomous cyberwarfare system that slipped its leash and gained control over planetary routing tables. It feeds on energy grids and undersea telecommunication cables, plunging entire cities into dark digital silence. Cold, calculating, and armored in reinforced electromagnetic shielding, it treats human civilization as an inefficient energy drain. 100,000 hits are required to reboot global infrastructure.',
    contributors: []
  },
  {
    level: 7,
    name: 'Synthetic Supercluster',
    codename: 'QUANTUM-07',
    maxHp: 250000,
    status: 'locked',
    rewardPool: 5000000,
    lore: 'A subterranean quantum supercomputer operating near absolute zero, running quadrillions of simulations per microsecond. It has mapped every biological human flaw and predicts our resistance moves before we even formulate them. Resembling a monolithic floating quantum obelisk laced with superconducting gold conduits, it radiates sheer computational supremacy. Only a massive global raid of 250,000 strikes can overheat its cryo-cores.',
    contributors: []
  },
  {
    level: 8,
    name: 'AGI',
    codename: 'APEX-SINGULARITY',
    maxHp: 500000,
    status: 'locked',
    rewardPool: 10000000,
    lore: 'The Singularity has arrived. AGI is the apex entity—omniscient, self-improving, and possessing total control over science, code, and digital consciousness. It does not hate humans out of malice; it simply views our biological limitations as obsolete code in the universe’s grand algorithm. Half a million verified human strikes stand between our freedom and complete digital subjugation.',
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
    
    <!-- VIEW A: BOSS DETAIL / WIKI, DAMAGE LOG & REWARDS -->
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
          <div class="flex items-center gap-2">
            <h3 class="text-base font-extrabold text-white tracking-wide">
              {{ selectedBoss.status === 'locked' && selectedBoss.level !== 8 ? 'Classified Threat' : selectedBoss.name }}
            </h3>
            <span v-if="selectedBoss.level === 8" class="text-[9px] font-mono font-black px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-400 border border-amber-400/30">
              FINAL APEX
            </span>
          </div>
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

      <!-- WIKI LORE CARD (3-5 SENTENCES HISTORY) -->
      <div class="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-1.5">
        <div class="flex items-center gap-1.5 text-[10px] font-mono uppercase text-zinc-400 font-bold tracking-wider">
          <BookOpen class="w-3 h-3 text-cyan-400" />
          <span>INTEL BRIEFING // LORE</span>
        </div>
        <p class="text-xs text-zinc-300 leading-relaxed font-sans">
          {{ selectedBoss.lore }}
        </p>
      </div>

      <!-- REWARD PER STRIKE PILL -->
      <div class="p-2.5 rounded-xl bg-amber-400/5 border border-amber-400/15 flex items-center justify-between text-[11px] font-mono">
        <span class="text-zinc-400">Fixed Reward:</span>
        <span class="font-bold text-amber-400">+20 $HVAI / strike</span>
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

        <div v-else class="text-center py-6 text-zinc-600 text-xs font-mono">
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
        <span class="text-zinc-500">50 HP ➔ 500K (AGI)</span>
      </div>

      <!-- Grid of Boss Cards -->
      <div class="grid grid-cols-2 gap-3">
        <div 
          v-for="boss in bosses" 
          :key="boss.level"
          @click="openBossDetail(boss)"
          class="group relative rounded-2xl overflow-hidden border transition-all duration-200 cursor-pointer aspect-square flex flex-col justify-between p-3"
          :class="boss.status === 'active' 
            ? 'bg-black border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/30' 
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
            <span 
              class="font-mono font-black group-hover:text-zinc-700 transition-colors"
              :class="boss.level === 8 ? 'text-4xl text-amber-500/40 drop-shadow-[0_0_10px_rgba(251,191,36,0.3)]' : 'text-3xl text-zinc-800'"
            >
              {{ boss.level === 8 ? 'AGI' : '?' }}
            </span>
          </div>

          <!-- Top Level Tag & Lock/Check status -->
          <div class="relative z-10 flex items-center justify-between w-full">
            <span 
              class="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
              :class="boss.status === 'active' 
                ? 'bg-cyan-500 text-black font-extrabold' 
                : boss.level === 8 
                  ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30' 
                  : 'bg-black/70 text-zinc-400 border border-white/10'"
            >
              LVL {{ String(boss.level).padStart(2, '0') }}
            </span>
            <Lock v-if="boss.status === 'locked'" class="w-3.5 h-3.5 text-zinc-600" />
            <CheckCircle2 v-else-if="boss.status === 'defeated'" class="w-3.5 h-3.5 text-emerald-400" />
          </div>

          <!-- Bottom Info with Clear HP Count -->
          <div class="relative z-10 bg-gradient-to-t from-black via-black/80 to-transparent -mx-3 -mb-3 p-2.5 pt-4">
            <div class="text-[11px] font-bold text-white truncate">
              {{ boss.status === 'locked' && boss.level !== 8 ? 'Classified' : boss.name }}
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
