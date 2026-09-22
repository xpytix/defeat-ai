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
const DEF_TOKEN_CONTRACT = '0xb767B50e80084330Fe2bF5F2C3CA5d6E0b73B6f6';
const DISTRIBUTOR_CONTRACT = '0x91E058c066072cFC722C057b25eF514fe4dA17E5';
const UNISWAP_POOL_URL = 'https://app.uniswap.org/swap?chain=worldchain&inputCurrency=0x2cFc85d8E48F8EAB294be644d9E25C3030863003&outputCurrency=0xb767B50e80084330Fe2bF5F2C3CA5d6E0b73B6f6';
const WORLDSCAN_TOKEN_URL = 'https://worldscan.org/token/0xb767B50e80084330Fe2bF5F2C3CA5d6E0b73B6f6';

// Navigation State
const activeTab = ref<'boss' | 'characters'>('boss');
const toastMessage = ref<string | null>(null);
const bossViewRef = ref<any>(null);

// Dual Persistent Storage Helper (localStorage + Cookie Fallback for Webview Reliability)
const getPersisted = (key: string): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    const val = localStorage.getItem(key);
    if (val) return val;
  } catch (e) {}
  try {
    const match = document.cookie.match(new RegExp('(^|;\\s*)' + key + '=([^;]*)'));
    if (match) return decodeURIComponent(match[2]);
  } catch (e) {}
  return null;
};

const setPersisted = (key: string, val: string) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, val);
  } catch (e) {}
  try {
    document.cookie = `${key}=${encodeURIComponent(val)};path=/;max-age=31536000;SameSite=Lax`;
  } catch (e) {}
};

const removePersisted = (key: string) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch (e) {}
  try {
    document.cookie = `${key}=;path=/;max-age=0;SameSite=Lax`;
  } catch (e) {}
};

// User Player ID & World ID Identity
const playerId = ref('human-stryker');
const verifiedNullifier = ref<string | null>(null);
const isInsideWorldApp = ref(false);
const showWorldAppModal = ref(false);
const isVerifying = ref(false);

// User Token Balance ($DEF) & World Chain Wallet Connection
const walletAddress = ref<string>('');
const onChainTokens = ref<number>(0);
const unclaimedTokens = ref<number>(0);
const userTokens = ref<number>(0); // In-game unclaimed rewards
const isFetchingBalance = ref<boolean>(false);
const isPowerStriking = ref<boolean>(false);
const recentStrikes = ref<any[]>([]);

// Armory & Weapon Inventory
const hasSword = ref(false); // Quantum Plasma Blade: 2x daily strike damage (-2 HP) & 2x tokens (+40 $DEF)
const hasBow = ref(false);   // Tachyon Chrono-Bow: -50% cooldown (12h instead of 24h)
const isShopOpen = ref(false);

// Game State (Starts pre-warmed at Level 1 AutoCorrect, seamlessly matching live state)
const currentBossLevel = ref(1);
const maxHp = ref(50);
const currentHp = ref(49);
const bossName = ref('AutoCorrect');
const totalStrikes = ref(1);
const totalViews = ref(3);
const uniqueHumans = ref(1);
const freeHitAvailable = ref(false); // Default to checking cooldown first to prevent button flash
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
const fetchRaidState = async (isView = false) => {
  try {
    isSyncing.value = true;
    const res: any = await $fetch('/api/game', {
      params: { 
        playerId: playerId.value,
        nullifierHash: verifiedNullifier.value || undefined,
        isView: isView ? '1' : undefined
      }
    });

    if (res && res.success && res.raid) {
      currentBossLevel.value = res.raid.currentLevel;
      bossName.value = res.raid.bossName;
      maxHp.value = res.raid.maxHp;
      currentHp.value = res.raid.currentHp;
      totalStrikes.value = res.raid.totalStrikes || 0;
      totalViews.value = res.raid.totalViews || 0;
      uniqueHumans.value = Object.keys(res.raid.contributors || {}).length;
      recentStrikes.value = res.raid.recentStrikes || [];

      setPersisted('defeat_ai_cached_hp', String(res.raid.currentHp));
      setPersisted('defeat_ai_cached_strikes', String(res.raid.totalStrikes || 0));
      setPersisted('defeat_ai_cached_views', String(res.raid.totalViews || 0));
      setPersisted('defeat_ai_cached_boss_name', res.raid.bossName);
    }

    if (res && res.player) {
      userTokens.value = res.player.tokens;
      unclaimedTokens.value = res.player.tokens;
      hasSword.value = res.player.hasSword;
      hasBow.value = res.player.hasBow;

      if (res.player.nullifierHash && !verifiedNullifier.value) {
        verifiedNullifier.value = res.player.nullifierHash;
        setPersisted('defeat_ai_nullifier', res.player.nullifierHash);
      }

      // Handle server-enforced cooldown based on nullifier hash & player state
      if (res.humanCooldownRemainingMs && res.humanCooldownRemainingMs > 0) {
        freeHitAvailable.value = false;
        const targetExpiry = Date.now() + res.humanCooldownRemainingMs;
        nextFreeHitTime.value = targetExpiry;
        setPersisted('defeat_ai_next_free_hit', String(targetExpiry));
      } else if (res.player.lastFreeHitTime && (Date.now() - res.player.lastFreeHitTime < (res.player.hasBow ? 12 : 24) * 3600000)) {
        const cooldownHours = res.player.hasBow ? 12 : 24;
        const cooldown = cooldownHours * 60 * 60 * 1000;
        const expiry = res.player.lastFreeHitTime + cooldown;
        freeHitAvailable.value = false;
        nextFreeHitTime.value = expiry;
        setPersisted('defeat_ai_next_free_hit', String(expiry));
      } else {
        freeHitAvailable.value = true;
        nextFreeHitTime.value = null;
        removePersisted('defeat_ai_last_free_hit');
        removePersisted('defeat_ai_next_free_hit');
      }
    }
  } catch (err) {
    console.warn('[Raid Sync] Fallback to local cache:', err);
  } finally {
    isSyncing.value = false;
  }
};

// Fetch real on-chain $DEF balance from World Chain RPC
const fetchOnChainBalance = async (addressOverride?: string) => {
  const target = addressOverride || walletAddress.value;
  if (!target || !target.startsWith('0x') || target.length !== 42) return;

  try {
    isFetchingBalance.value = true;
    const res: any = await $fetch('/api/balance', {
      params: { address: target }
    });

    if (res && res.success) {
      onChainTokens.value = res.balance;
      setPersisted('defeat_ai_onchain_tokens', res.balance.toString());
    }
  } catch (err) {
    console.warn('[DEF Balance] Failed to fetch on-chain DEF balance:', err);
  } finally {
    isFetchingBalance.value = false;
  }
};

// Connect wallet via MiniKit walletAuth in World App or manual prompt
const handleConnectWallet = async () => {
  if (MiniKit.isInstalled()) {
    try {
      showToast('Connecting World App Wallet...');
      const nonce = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const res = await MiniKit.commandsAsync.walletAuth({
        nonce,
        statement: 'Connect wallet to Defeat AI to view your on-chain $DEF balance and claim rewards.'
      });

      if (res.finalPayload.status === 'success' && res.finalPayload.address) {
        handleSetWalletAddress(res.finalPayload.address);
        showToast(`Connected: ${res.finalPayload.address.slice(0, 6)}...${res.finalPayload.address.slice(-4)}`);
      } else {
        showToast('Wallet connection cancelled');
      }
    } catch (err: any) {
      showToast(`Connection error: ${err.message || 'Unknown'}`);
    }
  } else {
    const input = prompt('Enter your World Chain wallet address (0x...):', walletAddress.value || TREASURY_WALLET);
    if (input && input.startsWith('0x') && input.length === 42) {
      handleSetWalletAddress(input.trim());
    }
  }
};

// Set / change wallet address
const handleSetWalletAddress = (addr: string) => {
  if (!addr || !addr.startsWith('0x') || addr.length !== 42) return;
  walletAddress.value = addr;
  playerId.value = addr;
  setPersisted('defeat_ai_wallet_address', addr);
  setPersisted('defeat_ai_player_id', addr);
  showToast(`Address set: ${addr.slice(0, 6)}...${addr.slice(-4)}`);
  fetchOnChainBalance(addr);
};

// Load saved local state & initialize MiniKit + Global Raid Sync
onMounted(() => {
  if (typeof window !== 'undefined') {
    // 1. Initialize MiniKit for World App
    try {
      MiniKit.install(APP_ID);
      isInsideWorldApp.value = MiniKit.isInstalled();
      if (isInsideWorldApp.value && MiniKit.user?.walletAddress) {
        walletAddress.value = MiniKit.user.walletAddress;
      }
    } catch (e) {
      console.warn('[MiniKit] Installation check:', e);
    }

    // 2. Persistent Wallet Address & Player Identity
    const savedWallet = getPersisted('defeat_ai_wallet_address');
    if (savedWallet && savedWallet.startsWith('0x')) {
      walletAddress.value = savedWallet;
    } else if (!walletAddress.value) {
      // Default to founder / user's personal wallet so Szymon immediately sees his 30M DEF on first test
      walletAddress.value = TREASURY_WALLET;
    }

    let storedId = getPersisted('defeat_ai_player_id');
    if (!storedId) {
      storedId = walletAddress.value || ('human-' + Math.random().toString(36).substring(2, 9));
      setPersisted('defeat_ai_player_id', storedId);
    }
    playerId.value = storedId;

    const savedNullifier = getPersisted('defeat_ai_nullifier');
    if (savedNullifier) verifiedNullifier.value = savedNullifier;

    const savedOnChain = getPersisted('defeat_ai_onchain_tokens');
    if (savedOnChain) onChainTokens.value = parseFloat(savedOnChain);

    const savedTokens = getPersisted('defeat_ai_user_tokens');
    if (savedTokens) {
      userTokens.value = parseInt(savedTokens, 10);
      unclaimedTokens.value = parseInt(savedTokens, 10);
    }

    const savedSword = getPersisted('defeat_ai_has_sword');
    if (savedSword) hasSword.value = savedSword === 'true';

    const savedBow = getPersisted('defeat_ai_has_bow');
    if (savedBow) hasBow.value = savedBow === 'true';

    // Pre-warm cached HP and strikes immediately
    const cachedHp = getPersisted('defeat_ai_cached_hp');
    if (cachedHp) currentHp.value = parseInt(cachedHp, 10);

    const cachedStrikes = getPersisted('defeat_ai_cached_strikes');
    if (cachedStrikes) totalStrikes.value = parseInt(cachedStrikes, 10);

    const cachedViews = getPersisted('defeat_ai_cached_views');
    if (cachedViews) totalViews.value = parseInt(cachedViews, 10);

    const savedNextHit = getPersisted('defeat_ai_next_free_hit');
    const savedLastHit = getPersisted('defeat_ai_last_free_hit');
    if (savedNextHit) {
      const nextTime = parseInt(savedNextHit, 10);
      if (Date.now() < nextTime) {
        freeHitAvailable.value = false;
        nextFreeHitTime.value = nextTime;
      } else {
        freeHitAvailable.value = true;
      }
    } else if (savedLastHit) {
      const lastHitTime = parseInt(savedLastHit, 10);
      const cooldownHours = hasBow.value ? 12 : 24;
      const cooldown = cooldownHours * 60 * 60 * 1000;
      const expiry = lastHitTime + cooldown;
      if (Date.now() < expiry) {
        freeHitAvailable.value = false;
        nextFreeHitTime.value = expiry;
      } else {
        freeHitAvailable.value = true;
      }
    } else {
      // If no cooldown stored, permit strike
      freeHitAvailable.value = true;
    }

    // 3. Connect to Netlify Blobs Backend & World Chain RPC
    fetchRaidState(true); // Registers 1 app view
    fetchOnChainBalance();
    pollTimer = setInterval(() => {
      fetchRaidState(false); // Refreshes raid state without inflating views
      fetchOnChainBalance();
    }, 12000);
  }
});

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer);
});

const handleFight = (level: number) => {
  activeTab.value = 'boss';
  showToast(`[SECTOR] LVL 0${currentBossLevel.value}: ${bossName.value}`);
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
          setPersisted('defeat_ai_nullifier', proofPayload.nullifier_hash);
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
          walletAddress: walletAddress.value,
          proofPayload,
          hasSword: hasSword.value,
          hasBow: hasBow.value
        }
      });

      if (res && res.success) {
        freeHitAvailable.value = false;
        const targetExpiry = res.nextFreeHitTime || (Date.now() + cooldownMs);
        nextFreeHitTime.value = targetExpiry;
        if (res.player) {
          userTokens.value = res.player.tokens;
          unclaimedTokens.value = res.player.tokens;
        }
        if (res.raid) {
          currentHp.value = res.raid.currentHp;
          maxHp.value = res.raid.maxHp;
          currentBossLevel.value = res.raid.currentLevel;
          bossName.value = res.raid.bossName;
          totalStrikes.value = res.raid.totalStrikes || 0;
          uniqueHumans.value = Object.keys(res.raid.contributors || {}).length;
          recentStrikes.value = res.raid.recentStrikes || [];
        }

        setPersisted('defeat_ai_last_free_hit', Date.now().toString());
        setPersisted('defeat_ai_next_free_hit', String(targetExpiry));
        setPersisted('defeat_ai_user_tokens', userTokens.value.toString());
        setPersisted('defeat_ai_cached_hp', String(currentHp.value));
        setPersisted('defeat_ai_cached_strikes', String(totalStrikes.value));
        if (res.nullifierHash) {
          setPersisted('defeat_ai_nullifier', res.nullifierHash);
        }

        const dmg = hasSword.value ? 2 : 1;
        const tokens = hasSword.value ? 40 : 20;
        bossViewRef.value?.playAttackAnimation('free', dmg, tokens);

        if (res.voucher && isInsideWorldApp.value) {
          executeOnChainClaim(res.voucher);
        } else if (res.bossDefeated) {
          showToast('🎉 Boss annihilated! Sector advanced!');
        } else {
          showToast(`💥 Strike confirmed! -${dmg} HP (+${tokens} $DEF)`);
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
    let paymentPayload: any = null;
    if (MiniKit.isInstalled()) {
      try {
        isPowerStriking.value = true;
        showToast('⚡ Opening World App Payment (2 WLD)...');
        const payRes = await MiniKit.commandsAsync.pay({
          reference: `power-strike-${Date.now()}`,
          to: TREASURY_WALLET,
          tokens: [{
            symbol: Tokens.WLD,
            token_amount: tokenToDecimals(2, Tokens.WLD).toString()
          }],
          description: 'Defeat AI: Power Strike (-2 HP)'
        });

        isPowerStriking.value = false;

        const payload = payRes?.finalPayload;
        const isSuccess = payload && (
          payload.status === 'success' ||
          payload.transaction_status === 'submitted' ||
          Boolean((payload as any).transaction_id)
        );

        if (!isSuccess) {
          const errMsg = payload?.error_code || 'Payment cancelled';
          showToast(`Payment cancelled: ${errMsg}`);
          return;
        }
        paymentPayload = payload;
      } catch (err: any) {
        isPowerStriking.value = false;
        showToast(`Payment error: ${err.message || 'Unknown'}`);
        return;
      }
    } else {
      if (process.env.NODE_ENV === 'production') {
        showToast('Open inside World App to execute Power Strike with WLD');
        showWorldAppModal.value = true;
        return;
      } else {
        paymentPayload = { status: 'success', transaction_id: 'dev_tx_power' };
        showToast('⚠️ DEV MODE: Mock Power Strike executed.');
      }
    }

    // Call server for power strike
    try {
      showToast('⚡ Strike landing on boss...');
      const res: any = await $fetch('/api/game', {
        method: 'POST',
        body: {
          action: 'strike',
          type: 'power',
          playerId: playerId.value,
          walletAddress: walletAddress.value,
          paymentPayload,
          hasSword: hasSword.value,
          hasBow: hasBow.value
        }
      });

      if (res && res.success) {
        if (res.player) {
          userTokens.value = res.player.tokens;
          unclaimedTokens.value = res.player.tokens;
        }
        if (res.raid) {
          currentHp.value = res.raid.currentHp;
          maxHp.value = res.raid.maxHp;
          currentBossLevel.value = res.raid.currentLevel;
          bossName.value = res.raid.bossName;
          totalStrikes.value = res.raid.totalStrikes || 0;
          uniqueHumans.value = Object.keys(res.raid.contributors || {}).length;
          recentStrikes.value = res.raid.recentStrikes || [];
        }

        setPersisted('defeat_ai_user_tokens', userTokens.value.toString());

        const dmg = res.damage || (hasSword.value ? 4 : 2);
        const tokens = res.tokensEarned || (hasSword.value ? 40 : 20);
        bossViewRef.value?.playAttackAnimation('power', dmg, tokens);

        if (res.voucher && isInsideWorldApp.value) {
          executeOnChainClaim(res.voucher);
        } else if (res.bossDefeated) {
          showToast('🎉 Boss annihilated! Sector advanced!');
        } else {
          showToast(`⚡ Power Strike confirmed! -${dmg} HP (+${tokens} $DEF)`);
        }
      }
    } catch (err: any) {
      showToast('Error recording power strike on server');
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

      const payload = payRes?.finalPayload;
      const isSuccess = payload && (
        payload.status === 'success' ||
        payload.transaction_status === 'submitted' ||
        Boolean((payload as any).transaction_id)
      );

      if (!isSuccess) {
        showToast('Payment cancelled');
        return;
      }
    } catch (err: any) {
      showToast(`Payment failed: ${err.message}`);
      return;
    }
  } else {
    showToast('Open inside World App to equip weapon with WLD');
    showWorldAppModal.value = true;
    return;
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

  setPersisted('defeat_ai_has_sword', hasSword.value.toString());
  setPersisted('defeat_ai_has_bow', hasBow.value.toString());

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

const executeOnChainClaim = async (voucher: any) => {
  if (!voucher) return;

  if (!isInsideWorldApp.value || !MiniKit.isInstalled()) {
    showToast(`Open inside World App to claim +${voucher.tokenAmount} $DEF on-chain`);
    return;
  }

  try {
    showToast(`🪙 Confirm claim of +${voucher.tokenAmount} $DEF in World App...`);

    const txPayload = {
      transaction: [
        {
          address: DISTRIBUTOR_CONTRACT,
          abi: [
            {
              inputs: [
                { internalType: 'address', name: 'recipient', type: 'address' },
                { internalType: 'uint256', name: 'amount', type: 'uint256' },
                { internalType: 'uint256', name: 'nonce', type: 'uint256' },
                { internalType: 'uint256', name: 'expiry', type: 'uint256' },
                { internalType: 'bytes', name: 'signature', type: 'bytes' }
              ],
              name: 'claim',
              outputs: [],
              stateMutability: 'nonpayable',
              type: 'function'
            }
          ],
          functionName: 'claim',
          args: [
            voucher.recipient,
            voucher.amount,
            voucher.nonce.toString(),
            voucher.expiry.toString(),
            voucher.signature
          ]
        }
      ]
    };

    const res = await MiniKit.commandsAsync.sendTransaction(txPayload as any);
    const payload = res?.finalPayload;

    if (payload && (payload.status === 'success' || (payload as any).transaction_id)) {
      showToast(`🎉 Claim confirmed on-chain! +${voucher.tokenAmount} $DEF in your wallet!`);
      await fetchOnChainBalance(voucher.recipient);
    } else {
      const err = payload?.error_code || 'Cancelled';
      if (err !== 'user_rejected') {
        showToast(`On-chain claim: ${err}`);
      }
    }
  } catch (err: any) {
    console.warn('[OnChain Claim Error]:', err);
    showToast(`Claim failed: ${err.message || 'Unknown'}`);
  }
};

const handleClaimTokens = async (claimData: { amount: number; address: string }) => {
  try {
    showToast('⏳ Generating $DEF on-chain claim voucher...');
    const res: any = await $fetch('/api/game', {
      method: 'POST',
      body: {
        action: 'claim',
        playerId: playerId.value,
        recipientAddress: claimData.address,
        amount: claimData.amount
      }
    });

    if (res && res.success && res.voucher) {
      userTokens.value = res.remainingTokens;
      unclaimedTokens.value = res.remainingTokens;
      setPersisted('defeat_ai_user_tokens', userTokens.value.toString());
      await executeOnChainClaim(res.voucher);
    }
  } catch (err: any) {
    const errData = err.data || {};
    showToast(`Claim error: ${errData.error || err.message}`);
  }
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

    <!-- Main Arena View (Raid Boss / Characters View) -->
    <main class="flex-1 min-h-0 flex flex-col overflow-hidden relative">
      <BossView 
        v-if="activeTab === 'boss'"
        ref="bossViewRef"
        :current-hp="currentHp"
        :max-hp="maxHp"
        :level="currentBossLevel"
        :boss-name="bossName"
        :free-hit-available="freeHitAvailable"
        :next-free-hit-time="nextFreeHitTime"
        :user-tokens="userTokens"
        :on-chain-tokens="onChainTokens"
        :unclaimed-tokens="unclaimedTokens"
        :wallet-address="walletAddress"
        :has-sword="hasSword"
        :has-bow="hasBow"
        :is-white-theme="isWhiteTheme"
        :total-strikes="totalStrikes"
        :total-views="totalViews"
        :unique-humans="uniqueHumans"
        :recent-strikes="recentStrikes"
        :is-power-striking="isPowerStriking"
        :is-verifying="isVerifying"
        @hit="handleHit"
        @open-shop="isShopOpen = true"
      />
      <CharactersView
        v-else-if="activeTab === 'characters'"
        :current-level="currentBossLevel"
        :is-white-theme="isWhiteTheme"
        @fight="handleFight"
      />
    </main>

    <!-- Minimalist Bottom Navigation (BOSS / CHARACTERS) -->
    <BottomNav 
      :active-tab="activeTab" 
      :is-white-theme="isWhiteTheme"
      @update:active-tab="activeTab = $event" 
    />

    <!-- Cyber Armory & Treasury Modal -->
    <ShopModal 
      :is-open="isShopOpen"
      :user-tokens="userTokens"
      :on-chain-tokens="onChainTokens"
      :wallet-address="walletAddress"
      :is-fetching-balance="isFetchingBalance"
      :has-sword="hasSword"
      :has-bow="hasBow"
      :is-white-theme="isWhiteTheme"
      @close="isShopOpen = false"
      @buy-item="handleBuyItem"
      @connect-wallet="handleConnectWallet"
      @refresh-balance="fetchOnChainBalance"
      @claim-tokens="handleClaimTokens"
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
