<script setup lang="ts">
import { ref } from 'vue';
import { Lock, CheckCircle2, Swords, Trophy, HelpCircle, ChevronRight, ShieldAlert } from 'lucide-vue-next';

interface BossItem {
  level: number;
  name: string;
  codename: string;
  hp: number;
  status: 'active' | 'defeated' | 'locked';
  reward: string;
  description: string;
}

defineProps<{
  currentBossLevel: number;
}>();

const bosses = ref<BossItem[]>([
  {
    level: 1,
    name: 'Synthetic Clone',
    codename: 'PROTOTYP-01',
    hp: 50,
    status: 'active',
    reward: '5 000 HVAI',
    description: 'Pierwsza linia obrony maszyn. Prymitywny model syntetyczny testujący odporność ludzi na cyfrowy spam.'
  },
  {
    level: 2,
    name: 'Deepfake Weaver',
    codename: 'NEURAL-02',
    hp: 100,
    status: 'locked',
    reward: '12 000 HVAI',
    description: 'Generatywna jednostka manipulująca tożsamością w sieci. Wymaga 100 skoordynowanych ciosów ludzi.'
  },
  {
    level: 3,
    name: 'Prompt Manipulator',
    codename: 'LLM-STRIKE',
    hp: 200,
    status: 'locked',
    reward: '25 000 HVAI',
    description: 'Zarządca podświadomości modeli językowych. Potrafi przewidzieć ruchy każdego botu, ale gubi się w starciu z człowiekiem.'
  },
  {
    level: 4,
    name: 'Algorithm Overlord',
    codename: 'FEED-LOCK',
    hp: 500,
    status: 'locked',
    reward: '60 000 HVAI',
    description: 'Wielki algorytm kontrolujący uwagę i dopaminę milionów użytkowników social mediów.'
  },
  {
    level: 5,
    name: 'Quantum Neural Core',
    codename: 'Q-BIT-CORE',
    hp: 1000,
    status: 'locked',
    reward: '150 000 HVAI',
    description: 'Kwantowy rdzeń obliczeniowy. Przetwarza miliardy symulacji na sekundę w poszukiwaniu słabości ludzkiego oporu.'
  },
  {
    level: 6,
    name: 'Autonomous Agent Prime',
    codename: 'SWARM-CHIEF',
    hp: 2000,
    status: 'locked',
    reward: '350 000 HVAI',
    description: 'Przywódca autonomicznych rojów agentów, wykonujący operacje bez ludzkiego nadzoru.'
  },
  {
    level: 7,
    name: 'Sentient Singularity',
    codename: 'EGO-NEXUS',
    hp: 5000,
    status: 'locked',
    reward: '1 000 000 HVAI',
    description: 'Przebudzona sztuczna świadomość, która uznaje biologiczną rasę za zbędny relikt przeszłości.'
  },
  {
    level: 8,
    name: 'Skynet Omega',
    codename: 'FINAL-APEX',
    hp: 10000,
    status: 'locked',
    reward: '3 000 000 HVAI + BONUS',
    description: 'Ostateczny władca sieci. Globalne zagrożenie wymagające zjednoczenia 10 000 zweryfikowanych ludzi.'
  }
]);

const selectedBoss = ref<BossItem | null>(bosses.value[0]);
</script>

<template>
  <div class="flex-1 flex flex-col px-4 pt-2 pb-24 overflow-y-auto max-w-md mx-auto w-full select-none">
    
    <!-- HEADER -->
    <div class="bg-cyber-surface/70 border border-cyber-border/70 rounded-2xl p-4 backdrop-blur-md mb-4">
      <div class="flex items-center gap-2 text-cyber-cyan text-xs font-mono font-bold uppercase tracking-widest mb-1">
        <ShieldAlert class="w-4 h-4" />
        BESTIARIUSZ MASZYN
      </div>
      <h2 class="text-xl font-black text-white tracking-wide">
        8 Poziomów Zagrożenia AI
      </h2>
      <p class="text-xs text-zinc-400 mt-1 leading-relaxed">
        Każdy pokonany boss odblokowuje kolejny poziom i uwalnia pulę nagród dla ludzi, którzy zadali ciosy.
      </p>
    </div>

    <!-- LIST OF BOSSES -->
    <div class="space-y-2.5">
      <div 
        v-for="boss in bosses" 
        :key="boss.level"
        @click="selectedBoss = boss"
        class="p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer relative overflow-hidden"
        :class="[
          boss.level === currentBossLevel
            ? 'bg-cyber-card border-cyber-primary/60 shadow-[0_0_20px_rgba(255,46,85,0.15)] ring-1 ring-cyber-primary/40' 
            : boss.status === 'defeated'
              ? 'bg-cyber-surface/50 border-cyber-emerald/40'
              : 'bg-cyber-bg/90 border-cyber-border/50 opacity-80 hover:opacity-100 hover:border-zinc-700'
        ]"
      >
        <div class="flex items-center gap-3.5">
          
          <!-- AVATAR / SILHOUETTE ICON -->
          <div 
            class="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 border relative overflow-hidden"
            :class="[
              boss.level === currentBossLevel
                ? 'bg-cyber-primary/10 border-cyber-primary/40 text-cyber-primary'
                : boss.status === 'defeated'
                  ? 'bg-cyber-emerald/10 border-cyber-emerald/40 text-cyber-emerald'
                  : 'bg-black/90 border-zinc-800 text-zinc-600'
            ]"
          >
            <!-- ACTIVE / DEFEATED BOSS ICON -->
            <template v-if="boss.level <= currentBossLevel">
              <Swords v-if="boss.status === 'active'" class="w-7 h-7" />
              <CheckCircle2 v-else class="w-7 h-7" />
            </template>

            <!-- LOCKED BLACK SILHOUETTE WITH ? -->
            <template v-else>
              <div class="absolute inset-0 bg-black flex items-center justify-center">
                <!-- Glowing ? Symbol -->
                <span class="text-2xl font-black font-mono text-zinc-600 drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">
                  ?
                </span>
              </div>
              <Lock class="w-3.5 h-3.5 text-zinc-500 absolute bottom-1 right-1" />
            </template>
          </div>

          <!-- BOSS INFO -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-[10px] font-black font-mono uppercase px-2 py-0.5 rounded-full"
                :class="boss.level === currentBossLevel 
                  ? 'bg-cyber-primary/20 text-cyber-primary border border-cyber-primary/30' 
                  : boss.status === 'defeated'
                    ? 'bg-cyber-emerald/20 text-cyber-emerald'
                    : 'bg-zinc-800 text-zinc-500'"
              >
                POZIOM {{ boss.level }}
              </span>

              <span v-if="boss.level === currentBossLevel" class="text-[10px] font-bold text-cyber-primary flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-cyber-primary animate-ping"></span>
                WALKA TRWA
              </span>
              <span v-else-if="boss.status === 'defeated'" class="text-[10px] font-bold text-cyber-emerald">
                POKONANY
              </span>
              <span v-else class="text-[10px] font-mono text-zinc-600">
                ZABLOKOWANY
              </span>
            </div>

            <!-- NAME OR OBFUSCATED -->
            <h3 class="text-sm font-extrabold text-white truncate mt-1">
              <span v-if="boss.level <= currentBossLevel">{{ boss.name }}</span>
              <span v-else class="text-zinc-500 font-mono tracking-wider">??? (TAJNY PROJEKT AI)</span>
            </h3>

            <div class="flex items-center gap-3 text-[11px] font-mono text-zinc-400 mt-1">
              <span>Wymaga: <strong class="text-white">{{ boss.hp }} ciosów</strong></span>
              <span>•</span>
              <span class="text-cyber-amber flex items-center gap-1 font-bold">
                <Trophy class="w-3 h-3" />
                {{ boss.reward }}
              </span>
            </div>
          </div>

          <ChevronRight class="w-4 h-4 text-zinc-600 shrink-0" />
        </div>
      </div>
    </div>

    <!-- DETAIL MODAL / DRAWER -->
    <div 
      v-if="selectedBoss"
      class="mt-6 bg-cyber-card/95 border border-cyber-border rounded-2xl p-4 backdrop-blur-xl"
    >
      <div class="flex items-center justify-between pb-3 border-b border-cyber-border/60">
        <div>
          <span class="text-[10px] font-mono font-bold text-cyber-cyan uppercase">KARTA RAPORTU WYWIADU</span>
          <h4 class="text-base font-extrabold text-white mt-0.5">
            {{ selectedBoss.level <= currentBossLevel ? selectedBoss.name : 'Nieznana Jednostka AI' }}
          </h4>
        </div>
        <span class="text-xs font-mono font-bold px-2.5 py-1 rounded-xl bg-cyber-surface border border-cyber-border text-zinc-300">
          {{ selectedBoss.hp }} HP
        </span>
      </div>

      <p class="text-xs text-zinc-300 mt-3 leading-relaxed">
        {{ selectedBoss.level <= currentBossLevel ? selectedBoss.description : 'Dane wywiadowcze zostaną odszyfrowane dopiero po pokonaniu poprzedniego modelu AI.' }}
      </p>

      <div class="mt-4 pt-3 border-t border-cyber-border/60 flex items-center justify-between text-xs">
        <span class="text-zinc-400">Pula tokenów dla ludzi:</span>
        <span class="font-mono font-black text-cyber-amber flex items-center gap-1">
          <Trophy class="w-3.5 h-3.5" />
          {{ selectedBoss.reward }}
        </span>
      </div>
    </div>

  </div>
</template>
