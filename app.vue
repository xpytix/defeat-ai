<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { MiniKit, VerificationLevel, Tokens, tokenToDecimals } from '@worldcoin/minikit-js';
import BossView from '~/components/BossView.vue';
import CharactersView from '~/components/CharactersView.vue';
import BottomNav from '~/components/BottomNav.vue';
import ShopModal from '~/components/ShopModal.vue';

// App & Treasury Configuration
const APP_ID = 'app_00e63093c3a6d36ace61c9b587ffcdf8';
const TREASURY_WALLET = '0x435cf6a63fbc5bc8f4d2b8d0dd02ab16ac45e9aa';

// Navigation State
const activeTab = ref<'boss' | 'characters'>('boss');
const toastMessage = ref<string | null>(null);

// User Player ID & World ID Identity
const playerId = ref('human-stryker');
const verifiedNullifier = ref<string | null>(null);
const isInsideWorldApp = ref(false);
const showWorldAppModal = ref(false);
const isVerifying = ref(false);

// User Token Balance ($DEF) & WLD Balance (Pristine clean start)
const userTokens = ref(0);
const userWld = ref(250); // Pre-funded balance for testing

// Armory & Weapon Inventory
const hasSword = ref(false); // Quantum Plasma Blade: 2x daily strike damage (-2 HP) & 2x tokens (+40 $DEF)
const hasBow = ref(false);   // Tachyon Chrono-Bow: -50% cooldown (12h instead of 24h)
const isShopOpen = ref(false);

// Game State (Starts pristine at Level 1 AutoCorrect 50/50 HP)
const currentBossLevel = ref(1);
const maxHp = ref(50);
const currentHp = ref(50);
const bossName = ref('AutoCorrect');
const freeHitAvailable = ref(true);
const nextFreeHitTime = ref<number | null>(null);
const isSyncing = ref(false);
let pollTimer: ReturnType<typeof setInterval> | null = null;

// Toast notification helper
const showToast = (msg: string) => {
  toastMessage.value = msg;
  setTimeout(() => {
    if (toastMessage.value === msg) toastMessage.value = null;
  }, 2800);
};

// Boss List metadata
const BOSS_LIST = [
  { level: 1, name: 'AutoCorrect', maxHp: 50 },
  { level: 2, name: 'reCAPTCHA', maxHp: 200 },
  { level: 3, name: 'SpamLord', maxHp: 1000 },
  { level: 4, name: 'DeepFake Doppelgänger', maxHp: 5000 },
  { level: 5, name: 'Neural Hivemind', maxHp: 25000 },
  { level: 6, name: 'Algorithmic Blackout', maxHp: 100000 },
  { level: 7, name: 'Synthetic Supercluster', maxHp: 250000 },
  { level: 8, name: 'AGI', maxHp: 500000 },
];

const isWhiteTheme = computed(() => [3, 5, 8].includes(currentBossLevel.value));

// Fetch global live raid state from Netlify Blobs API
const fetchRaidState = async () => {
  try {
    isSyncing.value = true;
    const res: any = await $fetch('/api/game', {
      params: { 
        playerId: playerId.value,
        nullifierHash: verifiedNullifier.value || undefined
      }
    });

    if (res && res.success && res.raid) {
      currentBossLevel.value = res.raid.currentLevel;
      bossName.value = res.raid.bossName;
      maxHp.value = res.raid.maxHp;
      currentHp.value = res.raid.currentHp;
    }

    if (res && res.player) {
      userTokens.value = res.player.tokens;
      hasSword.value = res.player.hasSword;
      hasBow.value = res.player.hasBow;

      // Handle server-enforced cooldown based on nullifier hash
      if (res.humanCooldownRemainingMs && res.humanCooldownRemainingMs > 0) {
        freeHitAvailable.value = false;
        nextFreeHitTime.value = Date.now() + res.humanCooldownRemainingMs;
      } else if (res.player.lastFreeHitTime) {
        const cooldownHours = res.player.hasBow ? 12 : 24;
        const cooldown = cooldownHours * 60 * 60 * 1000;
        const expiry = res.player.lastFreeHitTime + cooldown;
        if (Date.now() < expiry) {
          freeHitAvailable.value = false;
          nextFreeHitTime.value = expiry;
        } else {
          freeHitAvailable.value = true;
          nextFreeHitTime.value = null;
        }
      }
    }
  } catch (err) {
    console.warn('[Raid Sync] Fallback to local cache:', err);
  } finally {
    isSyncing.value = false;
  }
};

// Load saved local state & initialize MiniKit + Global Raid Sync
onMounted(() => {
  if (typeof window !== 'undefined') {
    // 1. Initialize MiniKit for World App
    try {
      MiniKit.install(APP_ID);
      isInsideWorldApp.value = MiniKit.isInstalled();
      if (isInsideWorldApp.value && MiniKit.user?.walletAddress) {
        playerId.value = MiniKit.user.walletAddress;
      }
    } catch (e) {
      console.warn('[MiniKit] Installation check:', e);
    }

    // 2. Persistent Player Identity & Saved State
    let storedId = localStorage.getItem('defeat_ai_player_id');
    if (!storedId) {
      storedId = 'human-' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('defeat_ai_player_id', storedId);
    }
    if (!isInsideWorldApp.value) {
      playerId.value = storedId;
    }

    const savedNullifier = localStorage.getItem('defeat_ai_nullifier');
    if (savedNullifier) verifiedNullifier.value = savedNullifier;

    const savedTokens = localStorage.getItem('defeat_ai_user_tokens');
    if (savedTokens) userTokens.value = parseInt(savedTokens, 10);

    const savedWld = localStorage.getItem('defeat_ai_user_wld');
    if (savedWld) userWld.value = parseInt(savedWld, 10);

    const savedSword = localStorage.getItem('defeat_ai_has_sword');
    if (savedSword) hasSword.value = savedSword === 'true';

    const savedBow = localStorage.getItem('defeat_ai_has_bow');
    if (savedBow) hasBow.value = savedBow === 'true';

    const savedLastHit = localStorage.getItem('defeat_ai_last_free_hit');
    if (savedLastHit) {
      const lastHitTime = parseInt(savedLastHit, 10);
      const cooldownHours = hasBow.value ? 12 : 24;
      const cooldown = cooldownHours * 60 * 60 * 1000;
      const expiry = lastHitTime + cooldown;
      if (Date.now() < expiry) {
        freeHitAvailable.value = false;
        nextFreeHitTime.value = expiry;
      }
    }

    // 3. Connect to Netlify Blobs Backend
    fetchRaidState();
    pollTimer = setInterval(fetchRaidState, 12000);
  }
});

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer);
});

const selectBoss = (lvl: number) => {
  const target = BOSS_LIST.find(b => b.level === lvl) || BOSS_LIST[0];
  currentBossLevel.value = target.level;
  bossName.value = target.name;
  maxHp.value = target.maxHp;
  currentHp.value = target.maxHp;
  showToast(`[SECTOR] LVL 0${target.level}: ${target.name}`);
};

const handleFight = (level: number) => {
  selectBoss(level);
  activeTab.value = 'boss';
};

// Handle Hit: Executes World ID ZK-SNARK verification for Free Daily Strike
const handleHit = async (type: 'free' | 'power') => {
  const cooldownHours = hasBow.value ? 12 : 24;
  const cooldownMs = cooldownHours * 60 * 60 * 1000;

  if (type === 'free') {
    if (!freeHitAvailable.value) {
      showToast(`Daily strike available once every ${cooldownHours}h`);
      return;
    }

    let proofPayload: any = null;

    // Check if inside World App
    if (MiniKit.isInstalled()) {
      try {
        isVerifying.value = true;
        showToast('👁️ Verifying World ID (Orb)...');

        const verifyResponse = await MiniKit.commandsAsync.verify({
          action: 'daily-strike',
          signal: playerId.value,
          verification_level: VerificationLevel.Orb
        });

        isVerifying.value = false;

        if (verifyResponse.finalPayload.status === 'error') {
          showToast(`World ID verification failed: ${verifyResponse.finalPayload.error_code || 'Cancelled'}`);
          return;
        }

        proofPayload = verifyResponse.finalPayload;
        if (proofPayload.nullifier_hash) {
          verifiedNullifier.value = proofPayload.nullifier_hash;
          if (typeof window !== 'undefined') {
            localStorage.setItem('defeat_ai_nullifier', proofPayload.nullifier_hash);
          }
        }
      } catch (err: any) {
        isVerifying.value = false;
        showToast(`Verification error: ${err.message || 'Unknown'}`);
        return;
      }
    } else {
      // Outside World App: Require World App or dev mode test
      if (process.env.NODE_ENV === 'production') {
        showWorldAppModal.value = true;
        return;
      } else {
        // Dev fallback for desktop browser testing
        proofPayload = {
          proof: 'dev_mock_proof',
          merkle_root: 'dev_mock_root',
          nullifier_hash: verifiedNullifier.value || `dev_human_${playerId.value}`,
          verification_level: 'orb',
          is_test_mock: true
        };
        showToast('⚠️ DEV MODE: World ID mock proof used.');
      }
    }

    // Call server API with verified cryptographic proof
    try {
      const res: any = await $fetch('/api/game', {
        method: 'POST',
        body: {
          action: 'strike',
          type: 'free',
          playerId: playerId.value,
          proofPayload,
          hasSword: hasSword.value,
          hasBow: hasBow.value
        }
      });

      if (res && res.success) {
        freeHitAvailable.value = false;
        nextFreeHitTime.value = res.nextFreeHitTime || (Date.now() + cooldownMs);
        if (res.player) userTokens.value = res.player.tokens;
        if (res.raid) {
          currentHp.value = res.raid.currentHp;
          maxHp.value = res.raid.maxHp;
          currentBossLevel.value = res.raid.currentLevel;
          bossName.value = res.raid.bossName;
        }

        if (typeof window !== 'undefined') {
          localStorage.setItem('defeat_ai_last_free_hit', Date.now().toString());
          localStorage.setItem('defeat_ai_user_tokens', userTokens.value.toString());
        }

        showToast(hasSword.value 
          ? '⚔️ Plasma Strike (-2 HP) · Claimed +40 $DEF' 
          : '💥 Verified Strike (-1 HP) · Claimed +20 $DEF');

        if (res.bossDefeated) {
          showToast('🎉 Boss annihilated! Sector advanced!');
        }
      }
    } catch (err: any) {
      const errData = err.data || {};
      if (err.status === 429) {
        freeHitAvailable.value = false;
        if (errData.nextFreeHitTime) nextFreeHitTime.value = errData.nextFreeHitTime;
        showToast(`⏳ Cooldown active on your World ID.`);
      } else if (err.status === 401) {
        showToast(`🔒 ${errData.error || 'World ID verification required.'}`);
      } else {
        showToast(`Server error: ${errData.error || err.message}`);
      }
    }
  } else {
    // Power Strike (2 WLD)
    if (MiniKit.isInstalled()) {
      try {
        const payRes = await MiniKit.commandsAsync.pay({
          reference: `power-strike-${Date.now()}`,
          to: TREASURY_WALLET,
          tokens: [{
            symbol: Tokens.WLD,
            token_amount: tokenToDecimals(2, Tokens.WLD).toString()
          }],
          description: 'Defeat AI: Power Strike (-1 HP)'
        });

        if (payRes.finalPayload.status !== 'success') {
          showToast('Payment cancelled');
          return;
        }
      } catch (err: any) {
        showToast(`Payment error: ${err.message}`);
        return;
      }
    } else {
      if (userWld.value < 2) {
        showToast('Insufficient WLD balance');
        return;
      }
      userWld.value -= 2;
    }

    // Call server for power strike
    try {
      const res: any = await $fetch('/api/game', {
        method: 'POST',
        body: {
          action: 'strike',
          type: 'power',
          playerId: playerId.value,
          hasSword: hasSword.value,
          hasBow: hasBow.value
        }
      });

      if (res && res.success) {
        if (res.player) userTokens.value = res.player.tokens;
        if (res.raid) {
          currentHp.value = res.raid.currentHp;
          maxHp.value = res.raid.maxHp;
        }
        showToast('⚡ Power Strike confirmed (-1 HP) · +20 $DEF');
      }
    } catch (err: any) {
      showToast('Error processing power strike');
    }
  }
};

// Purchase Gear from Cyber Armory Shop
const handleBuyItem = async (item: 'sword' | 'bow') => {
  if (MiniKit.isInstalled()) {
    try {
      const payRes = await MiniKit.commandsAsync.pay({
        reference: `buy-${item}-${Date.now()}`,
        to: TREASURY_WALLET,
        tokens: [{
          symbol: Tokens.WLD,
          token_amount: tokenToDecimals(200, Tokens.WLD).toString()
        }],
        description: item === 'sword' ? 'Armory: Quantum Plasma Blade (2x)' : 'Armory: Tachyon Chrono-Bow (-50% Cooldown)'
      });

      if (payRes.finalPayload.status !== 'success') {
        showToast('Payment cancelled');
        return;
      }
    } catch (err: any) {
      showToast(`Payment failed: ${err.message}`);
      return;
    }
  } else {
    if (userWld.value < 200) {
      showToast('Insufficient WLD balance');
      return;
    }
    userWld.value -= 200;
  }

  if (item === 'sword') {
    hasSword.value = true;
    showToast('⚔️ Quantum Plasma Blade equipped! 2x Damage & 2x Tokens active.');
  } else if (item === 'bow') {
    hasBow.value = true;
    showToast('🏹 Tachyon Chrono-Bow equipped! Daily cooldown reduced to 12h.');
    if (nextFreeHitTime.value) {
      const remaining = Math.max(0, nextFreeHitTime.value - Date.now());
      nextFreeHitTime.value = Date.now() + Math.round(remaining / 2);
    }
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem('defeat_ai_user_wld', userWld.value.toString());
    localStorage.setItem('defeat_ai_has_sword', hasSword.value.toString());
    localStorage.setItem('defeat_ai_has_bow', hasBow.value.toString());
  }

  // Sync with Netlify Blobs
  $fetch('/api/game', {
    method: 'POST',
    body: {
      action: 'sync',
      playerId: playerId.value,
      hasSword: hasSword.value,
      hasBow: hasBow.value
    }
  }).catch(() => {});
};

const handleAddWld = (amount: number) => {
  userWld.value += amount;
  if (typeof window !== 'undefined') {
    localStorage.setItem('defeat_ai_user_wld', userWld.value.toString());
  }
  showToast(`🪙 Added +${amount} WLD test balance`);
};

// Dev simulator strike for desktop browser
const executeDevTestStrike = () => {
  showWorldAppModal.value = false;
  handleHit('free');
};
</script>

<template>
  <div 
    class="h-[100dvh] max-h-[100dvh] w-screen overflow-hidden flex flex-col font-sans select-none relative transition-colors duration-500"
    :class="isWhiteTheme ? 'bg-white text-zinc-950' : 'bg-black text-white'"
  >
    
    <!-- Top Ambient Glow -->
    <div 
      class="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-36 rounded-full blur-[110px] pointer-events-none -z-10 transition-colors duration-700"
      :class="isWhiteTheme 
        ? (currentBossLevel === 8 ? 'bg-amber-400/25' : currentBossLevel === 5 ? 'bg-violet-400/20' : 'bg-fuchsia-400/20') 
        : 'bg-cyan-500/10'" 
    />

    <!-- Sleek Minimal Floating Toast -->
    <div v-if="toastMessage" class="fixed top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div 
        class="px-4 py-2 rounded-full shadow-2xl backdrop-blur-xl text-center text-xs font-mono font-bold tracking-wider transition-colors"
        :class="isWhiteTheme 
          ? 'bg-black/90 border border-black/10 text-white' 
          : 'bg-zinc-900/95 border border-white/10 text-zinc-200'"
      >
        {{ toastMessage }}
      </div>
    </div>

    <!-- Clean Safe-Area Header Spacer -->
    <div class="pt-safe shrink-0" />

    <!-- Main View Switcher (Instant crisp switching, zero fade lag) -->
    <main class="flex-1 min-h-0 flex flex-col overflow-hidden relative">
      <BossView 
        v-if="activeTab === 'boss'" 
        :current-hp="currentHp"
        :max-hp="maxHp"
        :level="currentBossLevel"
        :boss-name="bossName"
        :free-hit-available="freeHitAvailable"
        :next-free-hit-time="nextFreeHitTime"
        :user-tokens="userTokens"
        :has-sword="hasSword"
        :has-bow="hasBow"
        :is-white-theme="isWhiteTheme"
        @hit="handleHit"
        @select-level="selectBoss"
        @open-shop="isShopOpen = true"
      />
      <CharactersView 
        v-else-if="activeTab === 'characters'" 
        :current-level="currentBossLevel"
        :is-white-theme="isWhiteTheme"
        @fight="handleFight"
      />
    </main>

    <!-- Minimalist Bottom Navigation -->
    <BottomNav 
      :active-tab="activeTab" 
      :is-white-theme="isWhiteTheme"
      @update:active-tab="activeTab = $event" 
    />

    <!-- Cyber Armory Shop Modal (Triggered by clicking token balance) -->
    <ShopModal 
      :is-open="isShopOpen"
      :user-tokens="userTokens"
      :user-wld="userWld"
      :has-sword="hasSword"
      :has-bow="hasBow"
      :is-white-theme="isWhiteTheme"
      @close="isShopOpen = false"
      @buy-item="handleBuyItem"
      @add-wld="handleAddWld"
    />

    <!-- World App Required Modal (When outside World App on desktop) -->
    <div 
      v-if="showWorldAppModal" 
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
    >
      <div class="w-full max-w-sm rounded-3xl bg-zinc-900 border border-white/10 p-6 text-center space-y-4 shadow-2xl">
        <div class="w-14 h-14 rounded-2xl bg-white text-black flex items-center justify-center mx-auto text-2xl font-black shadow-lg">
          👁️
        </div>
        <div>
          <h3 class="text-base font-bold text-white tracking-wide">World App Required</h3>
          <p class="text-xs text-zinc-400 mt-1 leading-relaxed">
            Only verified humans (Orb) can execute daily strikes & claim $DEF. Open Defeat AI inside World App to verify your identity.
          </p>
        </div>
        <div class="pt-2 flex flex-col gap-2">
          <a 
            :href="`https://worldcoin.org/mini-app?app_id=${APP_ID}`"
            target="_blank"
            class="w-full py-3 rounded-xl bg-white text-black font-mono font-bold text-xs tracking-wider uppercase hover:bg-zinc-200 transition-colors"
          >
            Open in World App
          </a>
          <button 
            type="button"
            @click="executeDevTestStrike"
            class="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-[11px] transition-colors"
          >
            Test Strike (Dev Simulator)
          </button>
          <button 
            type="button"
            @click="showWorldAppModal = false"
            class="w-full py-2 text-zinc-500 text-xs font-mono hover:text-zinc-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>

  </div>
</template>
