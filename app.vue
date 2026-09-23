<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { MiniKit, VerificationLevel, Tokens, tokenToDecimals, Permission } from '@worldcoin/minikit-js';
import BossView from '~/components/BossView.vue';
import CharactersView from '~/components/CharactersView.vue';
import BottomNav from '~/components/BottomNav.vue';
import ShopModal from '~/components/ShopModal.vue';
import HumanAuthGate from '~/components/HumanAuthGate.vue';
import { Sparkles, Check, ArrowUpRight, X } from 'lucide-vue-next';

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

// Human Authentication & Gate State
const isAuthenticated = ref(false);

const handleGateAuthenticated = (addr: string) => {
  if (!addr || !addr.startsWith('0x') || addr.length !== 42) return;
  handleSetWalletAddress(addr);
  isAuthenticated.value = true;
  showToast(`👁️ Verified Human authenticated!`);
};

// Direct Reward Claim Modal State (Variant B: EIP-712 Voucher Claim)
const showRewardClaimModal = ref(false);
const pendingVoucher = ref<any>(null);
const isClaimingOnChain = ref(false);
const claimStatusMessage = ref('');
const claimStatusSuccess = ref(false);

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
const isNotificationsEnabled = ref(false);
const dailyLimitReached = ref(false);
const dailyClaimResetAt = ref(0);
const dailyClaimedTokens = ref(0);

// Quantum Staking Vault (30% APY)
const stakedAmount = ref(0);
const stakedAt = ref(0);
const accumulatedStakeYield = ref(0);
const isStakingProcessing = ref(false);

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
    const queryParams: any = {
      playerId: walletAddress.value || playerId.value,
      nullifierHash: verifiedNullifier.value || undefined,
      isView: isView ? '1' : undefined
    };
    if (walletAddress.value) {
      queryParams.walletAddress = walletAddress.value;
    }

    const res: any = await $fetch('/api/game', {
      params: queryParams
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
      dailyClaimedTokens.value = res.player.dailyClaimedTokens || 0;
      dailyClaimResetAt.value = res.dailyClaimResetAt || res.player.dailyClaimResetAt || 0;
      dailyLimitReached.value = Boolean(
        res.dailyLimitReached ||
        res.player?.dailyLimitReached ||
        ((res.player?.dailyClaimedTokens >= 500) && Date.now() < (res.player?.dailyClaimResetAt || 0))
      );

      // Smart weapon status update:
      // If server confirms weapon ownership, enable and persist immediately.
      // If server returns false, ONLY overwrite if the profile belongs to the verified connected wallet address.
      if (res.player.hasSword) {
        hasSword.value = true;
        setPersisted('defeat_ai_has_sword', 'true');
      } else if (walletAddress.value && (
        (res.player.address && res.player.address.toLowerCase() === walletAddress.value.toLowerCase()) ||
        (res.player.id && res.player.id.toLowerCase() === walletAddress.value.toLowerCase())
      )) {
        hasSword.value = false;
        setPersisted('defeat_ai_has_sword', 'false');
      }

      if (res.player.hasBow) {
        hasBow.value = true;
        setPersisted('defeat_ai_has_bow', 'true');
      } else if (walletAddress.value && (
        (res.player.address && res.player.address.toLowerCase() === walletAddress.value.toLowerCase()) ||
        (res.player.id && res.player.id.toLowerCase() === walletAddress.value.toLowerCase())
      )) {
        hasBow.value = false;
        setPersisted('defeat_ai_has_bow', 'false');
      }

      if (res.player.nullifierHash && !verifiedNullifier.value) {
        verifiedNullifier.value = res.player.nullifierHash;
        setPersisted('defeat_ai_nullifier', res.player.nullifierHash);
      }

      if (res.player.stakedAmount !== undefined) {
        stakedAmount.value = res.player.stakedAmount;
        setPersisted('defeat_ai_staked_amount', String(res.player.stakedAmount));
      }
      if (res.player.stakedAt !== undefined) {
        stakedAt.value = res.player.stakedAt;
        setPersisted('defeat_ai_staked_at', String(res.player.stakedAt));
      }
      if (res.player.accumulatedStakeYield !== undefined) {
        accumulatedStakeYield.value = res.player.accumulatedStakeYield;
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

// Set / change wallet address & immediately verify inventory & raid state
const handleSetWalletAddress = async (addr: string) => {
  if (!addr || !addr.startsWith('0x') || addr.length !== 42) return;
  walletAddress.value = addr;
  playerId.value = addr;
  isAuthenticated.value = true;
  setPersisted('defeat_ai_wallet_address', addr);
  setPersisted('defeat_ai_player_id', addr);
  fetchOnChainBalance(addr);
  await fetchRaidState(false);
  if (isNotificationsEnabled.value) {
    $fetch('/api/notifications', {
      method: 'POST',
      body: { action: 'subscribe', walletAddress: addr }
    }).catch(() => {});
  }
};

const handleDisconnectWallet = () => {
  walletAddress.value = '';
  isAuthenticated.value = false;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('defeat_ai_wallet_address');
    localStorage.removeItem('defeat_ai_player_id');
  }
  isShopOpen.value = false;
  showToast('Logged out');
};

const handleOpenShop = () => {
  isShopOpen.value = true;
  if (walletAddress.value) {
    fetchOnChainBalance(walletAddress.value);
    fetchRaidState(false);
  }
};

const handleRefreshShop = (address?: string) => {
  fetchOnChainBalance(address || walletAddress.value);
  fetchRaidState(false);
};

// Push Notifications Toggle & Permissions Manager (MiniKit: Strict ON/OFF)
const handleToggleNotifications = async () => {
  if (isNotificationsEnabled.value) {
    // Turn OFF
    isNotificationsEnabled.value = false;
    setPersisted('defeat_ai_notifications_enabled', 'false');
    if (walletAddress.value) {
      $fetch('/api/notifications', {
        method: 'POST',
        body: { action: 'unsubscribe', walletAddress: walletAddress.value }
      }).catch(() => {});
    }
    showToast('🔕 Notifications turned OFF');
    return;
  }

  // Turn ON
  if (MiniKit.isInstalled()) {
    try {
      showToast('Requesting notification permission in World App...');
      const res = await MiniKit.commandsAsync.requestPermission({
        permission: Permission.Notifications
      });

      const payload = res?.finalPayload as any;
      const isGranted = payload?.status === 'success' || 
                        payload?.already_granted === true || 
                        payload?.error_code === 'already_granted';

      if (isGranted) {
        isNotificationsEnabled.value = true;
        setPersisted('defeat_ai_notifications_enabled', 'true');
        if (walletAddress.value) {
          await $fetch('/api/notifications', {
            method: 'POST',
            body: { action: 'subscribe', walletAddress: walletAddress.value }
          }).catch(() => {});
        }
        showToast('🔔 Notifications turned ON');
      } else if (payload?.error_code === 'user_rejected') {
        showToast('Notification permission was declined.');
      } else if (payload?.error_code === 'already_requested') {
        isNotificationsEnabled.value = true;
        setPersisted('defeat_ai_notifications_enabled', 'true');
        if (walletAddress.value) {
          $fetch('/api/notifications', {
            method: 'POST',
            body: { action: 'subscribe', walletAddress: walletAddress.value }
          }).catch(() => {});
        }
        showToast('🔔 Notifications turned ON (Check phone settings if needed)');
      } else {
        isNotificationsEnabled.value = true;
        setPersisted('defeat_ai_notifications_enabled', 'true');
        if (walletAddress.value) {
          $fetch('/api/notifications', {
            method: 'POST',
            body: { action: 'subscribe', walletAddress: walletAddress.value }
          }).catch(() => {});
        }
        showToast('🔔 Notifications turned ON');
      }
    } catch (err: any) {
      isNotificationsEnabled.value = true;
      setPersisted('defeat_ai_notifications_enabled', 'true');
      showToast('🔔 Notifications turned ON');
    }
  } else {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          isNotificationsEnabled.value = true;
          setPersisted('defeat_ai_notifications_enabled', 'true');
          if (walletAddress.value) {
            await $fetch('/api/notifications', {
              method: 'POST',
              body: { action: 'subscribe', walletAddress: walletAddress.value }
            }).catch(() => {});
          }
          showToast('🔔 Notifications turned ON');
        } else {
          showToast('Notification permission denied');
        }
      } catch (e) {
        isNotificationsEnabled.value = true;
        setPersisted('defeat_ai_notifications_enabled', 'true');
        showToast('🔔 Notifications turned ON');
      }
    } else {
      showToast('Open in World App to enable native push notifications');
    }
  }
};

// Quantum Staking Vault Action Handlers (30% APY)
const handleStakeTokens = async (amount: number) => {
  try {
    isStakingProcessing.value = true;
    showToast(`🛡️ Staking ${amount.toLocaleString()} $DEF into 30% APY Vault...`);
    const res: any = await $fetch('/api/game', {
      method: 'POST',
      body: {
        action: 'stake',
        amount,
        playerId: playerId.value,
        walletAddress: walletAddress.value,
        onChainTokens: onChainTokens.value
      }
    });

    if (res && res.success) {
      stakedAmount.value = res.stakedAmount || 0;
      stakedAt.value = res.stakedAt || Date.now();
      accumulatedStakeYield.value = res.accumulatedStakeYield || 0;
      if (res.remainingTokens !== undefined) {
        userTokens.value = res.remainingTokens;
        unclaimedTokens.value = res.remainingTokens;
        setPersisted('defeat_ai_user_tokens', String(res.remainingTokens));
      }
      setPersisted('defeat_ai_staked_amount', String(stakedAmount.value));
      setPersisted('defeat_ai_staked_at', String(stakedAt.value));
      showToast(res.message || `🛡️ Successfully staked ${amount.toLocaleString()} $DEF!`);
    }
  } catch (err: any) {
    const errData = err.data || {};
    showToast(`Staking failed: ${errData.error || err.message}`);
  } finally {
    isStakingProcessing.value = false;
  }
};

const handleUnstakeTokens = async (amount?: number) => {
  try {
    isStakingProcessing.value = true;
    showToast('🔓 Withdrawing staked $DEF from Vault...');
    const res: any = await $fetch('/api/game', {
      method: 'POST',
      body: {
        action: 'unstake',
        amount,
        playerId: playerId.value,
        walletAddress: walletAddress.value
      }
    });

    if (res && res.success) {
      stakedAmount.value = res.stakedAmount || 0;
      stakedAt.value = res.stakedAt || 0;
      accumulatedStakeYield.value = res.accumulatedStakeYield || 0;
      if (res.remainingTokens !== undefined) {
        userTokens.value = res.remainingTokens;
        unclaimedTokens.value = res.remainingTokens;
        setPersisted('defeat_ai_user_tokens', String(res.remainingTokens));
      }
      setPersisted('defeat_ai_staked_amount', String(stakedAmount.value));
      setPersisted('defeat_ai_staked_at', String(stakedAt.value));
      showToast(res.message || `🔓 Successfully unstaked!`);
    }
  } catch (err: any) {
    const errData = err.data || {};
    showToast(`Unstaking failed: ${errData.error || err.message}`);
  } finally {
    isStakingProcessing.value = false;
  }
};

const handleClaimStakeYield = async () => {
  try {
    isStakingProcessing.value = true;
    showToast('✨ Claiming $DEF staking yield...');
    const res: any = await $fetch('/api/game', {
      method: 'POST',
      body: {
        action: 'claim_stake_yield',
        playerId: playerId.value,
        walletAddress: walletAddress.value
      }
    });

    if (res && res.success) {
      stakedAmount.value = res.stakedAmount || 0;
      stakedAt.value = res.stakedAt || 0;
      accumulatedStakeYield.value = res.accumulatedStakeYield || 0;
      if (res.remainingTokens !== undefined) {
        userTokens.value = res.remainingTokens;
        unclaimedTokens.value = res.remainingTokens;
        setPersisted('defeat_ai_user_tokens', String(res.remainingTokens));
      }
      showToast(res.message || `🎉 Claimed +${res.claimedYield} $DEF staking rewards!`);
    }
  } catch (err: any) {
    const errData = err.data || {};
    showToast(`Claim failed: ${errData.error || err.message}`);
  } finally {
    isStakingProcessing.value = false;
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
        walletAddress.value = MiniKit.user.walletAddress;
        playerId.value = MiniKit.user.walletAddress;
        isAuthenticated.value = true;
        setPersisted('defeat_ai_wallet_address', MiniKit.user.walletAddress);
        setPersisted('defeat_ai_player_id', MiniKit.user.walletAddress);
      }
    } catch (e) {
      console.warn('[MiniKit] Installation check:', e);
    }

    // 2. Persistent Wallet Address & Player Identity
    const savedWallet = getPersisted('defeat_ai_wallet_address');
    if (savedWallet && savedWallet.startsWith('0x') && savedWallet.toLowerCase() !== TREASURY_WALLET.toLowerCase()) {
      walletAddress.value = savedWallet;
      playerId.value = savedWallet;
      isAuthenticated.value = true;
    } else if (!walletAddress.value) {
      walletAddress.value = '';
      isAuthenticated.value = false;
    }

    let storedId = getPersisted('defeat_ai_player_id');
    if (walletAddress.value) {
      storedId = walletAddress.value;
      setPersisted('defeat_ai_player_id', storedId);
    } else if (!storedId || storedId.toLowerCase() === TREASURY_WALLET.toLowerCase()) {
      storedId = 'human-' + Math.random().toString(36).substring(2, 9);
      setPersisted('defeat_ai_player_id', storedId);
    }
    playerId.value = storedId;

    // Auto connect inside World App if address is not set yet
    if (isInsideWorldApp.value && !walletAddress.value) {
      setTimeout(() => {
        handleConnectWallet();
      }, 500);
    }

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
    if (savedSword !== null) hasSword.value = savedSword === 'true';

    const savedBow = getPersisted('defeat_ai_has_bow');
    if (savedBow !== null) hasBow.value = savedBow === 'true';

    const savedNotifs = getPersisted('defeat_ai_notifications_enabled');
    if (savedNotifs === 'true') isNotificationsEnabled.value = true;

    const savedStaked = getPersisted('defeat_ai_staked_amount');
    if (savedStaked) stakedAmount.value = parseInt(savedStaked, 10);

    const savedStakedAt = getPersisted('defeat_ai_staked_at');
    if (savedStakedAt) stakedAt.value = parseInt(savedStakedAt, 10);

    if (isInsideWorldApp.value && MiniKit.isInstalled()) {
      try {
        MiniKit.commandsAsync.getPermissions().then((permRes: any) => {
          if (permRes?.finalPayload?.status === 'success') {
            const hasPerm = (permRes.finalPayload as any).permissions?.notifications === true;
            isNotificationsEnabled.value = hasPerm;
            setPersisted('defeat_ai_notifications_enabled', hasPerm ? 'true' : 'false');
            if (hasPerm && walletAddress.value) {
              $fetch('/api/notifications', {
                method: 'POST',
                body: { action: 'subscribe', walletAddress: walletAddress.value }
              }).catch(() => {});
            }
          }
        }).catch(() => {});
      } catch (e) {}
    }

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

// Handle Hit: Executes Free Daily Strike & Power Strike
const handleHit = async (type: 'free' | 'power') => {
  const cooldownHours = hasBow.value ? 12 : 24;
  const cooldownMs = cooldownHours * 60 * 60 * 1000;

  if (type === 'free') {
    if (!freeHitAvailable.value) {
      showToast(`Daily strike available once every ${cooldownHours}h`);
      return;
    }

    let proofPayload: any = null;

    // Check if World ID ZK proof is needed or available
    if (MiniKit.isInstalled() && !verifiedNullifier.value && !walletAddress.value) {
      try {
        isVerifying.value = true;
        showToast('👁️ Verifying World ID (Orb)...');

        const verifyResponse = await MiniKit.commandsAsync.verify({
          action: 'daily-strike',
          signal: playerId.value,
          verification_level: VerificationLevel.Orb
        });

        isVerifying.value = false;

        if (verifyResponse?.finalPayload?.status === 'success') {
          proofPayload = verifyResponse.finalPayload;
          if (proofPayload.nullifier_hash) {
            verifiedNullifier.value = proofPayload.nullifier_hash;
            setPersisted('defeat_ai_nullifier', proofPayload.nullifier_hash);
          }
        }
      } catch (err: any) {
        isVerifying.value = false;
        console.warn('MiniKit verify skipped, using wallet session:', err);
      }
    }

    // Call server API to execute daily strike and receive tokens
    try {
      isVerifying.value = true;
      const res: any = await $fetch('/api/game', {
        method: 'POST',
        body: {
          action: 'strike',
          type: 'free',
          playerId: playerId.value,
          walletAddress: walletAddress.value,
          nullifierHash: verifiedNullifier.value || undefined,
          proofPayload,
          hasSword: hasSword.value,
          hasBow: hasBow.value
        }
      });
      isVerifying.value = false;

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

        if (res.dailyLimitReached !== undefined) {
          dailyLimitReached.value = res.dailyLimitReached;
        }
        if (res.dailyClaimResetAt) {
          dailyClaimResetAt.value = res.dailyClaimResetAt;
        }
        if (res.dailyClaimedTokens !== undefined) {
          dailyClaimedTokens.value = res.dailyClaimedTokens;
        }

        const dmg = hasSword.value ? 2 : 1;
        const tokens = hasSword.value ? 40 : 20;
        bossViewRef.value?.playAttackAnimation('free', dmg, tokens);

        if (res.onChainPayout?.success) {
          showToast(`🎉 On-Chain: +${tokens} $DEF sent to your wallet!`);
          if (walletAddress.value) fetchOnChainBalance(walletAddress.value);
          pendingVoucher.value = { tokenAmount: tokens, isDirect: true };
          showRewardClaimModal.value = true;
          claimStatusSuccess.value = true;
          claimStatusMessage.value = '';
        } else if (res.voucher) {
          pendingVoucher.value = res.voucher;
          showRewardClaimModal.value = true;
          claimStatusMessage.value = '';
          claimStatusSuccess.value = false;
          if (isInsideWorldApp.value) {
            executeOnChainClaim(res.voucher);
          }
        } else if (res.bossDefeated) {
          showToast('🎉 Boss annihilated! Sector advanced!');
        } else {
          showToast(`💥 Strike confirmed! -${dmg} HP (+${tokens} $DEF)`);
        }
      }
    } catch (err: any) {
      isVerifying.value = false;
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
    if (dailyLimitReached.value) {
      const diff = Math.max(0, dailyClaimResetAt.value - Date.now());
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      showToast(`🔒 Daily claim limit reached (500/500 $DEF). Power Strike unlocks in ${timeStr}`);
      return;
    }

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

        if (payload?.from && payload.from.startsWith('0x')) {
          handleSetWalletAddress(payload.from);
        }
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

        if (res.dailyLimitReached !== undefined) {
          dailyLimitReached.value = res.dailyLimitReached;
        }
        if (res.dailyClaimResetAt) {
          dailyClaimResetAt.value = res.dailyClaimResetAt;
        }
        if (res.dailyClaimedTokens !== undefined) {
          dailyClaimedTokens.value = res.dailyClaimedTokens;
        }

        const dmg = res.damage || (hasSword.value ? 4 : 2);
        const tokens = res.tokensEarned || (hasSword.value ? 80 : 40);
        bossViewRef.value?.playAttackAnimation('power', dmg, tokens);

        if (res.onChainPayout?.success) {
          showToast(`🎉 Power Strike! +${tokens} $DEF sent to your wallet!`);
          if (walletAddress.value) fetchOnChainBalance(walletAddress.value);
          pendingVoucher.value = { tokenAmount: tokens, isDirect: true };
          showRewardClaimModal.value = true;
          claimStatusSuccess.value = true;
          claimStatusMessage.value = '';
        } else if (res.voucher) {
          pendingVoucher.value = res.voucher;
          showRewardClaimModal.value = true;
          claimStatusMessage.value = '';
          claimStatusSuccess.value = false;
          if (isInsideWorldApp.value) {
            executeOnChainClaim(res.voucher);
          }
        } else if (res.bossDefeated) {
          showToast('🎉 Boss annihilated! Sector advanced!');
        } else {
          showToast(`⚡ Power Strike confirmed! -${dmg} HP (+${tokens} $DEF)`);
        }
      }
    } catch (err: any) {
      const errData = err.data || {};
      if (errData.dailyLimitReached) {
        dailyLimitReached.value = true;
        if (errData.dailyClaimResetAt) dailyClaimResetAt.value = errData.dailyClaimResetAt;
        showToast(`🔒 ${errData.error || 'Daily claim limit reached'}`);
      } else {
        showToast(errData.error || 'Error recording power strike on server');
      }
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

      showToast('⏳ Verifying 200 WLD purchase on server...');
      let buyRes: any = null;
      try {
        buyRes = await $fetch('/api/game', {
          method: 'POST',
          body: {
            action: 'buy_item',
            item,
            playerId: playerId.value,
            walletAddress: walletAddress.value,
            nullifierHash: verifiedNullifier.value,
            paymentPayload: payload
          }
        });
      } catch (apiErr: any) {
        showToast(`Equip verification failed: ${apiErr?.data?.error || apiErr.message}`);
        return;
      }

      if (!buyRes || !buyRes.success) {
        showToast(`Equip failed: ${buyRes?.error || 'Verification error'}`);
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
};

const executeOnChainClaim = async (voucher: any) => {
  if (!voucher) return;

  if (!isInsideWorldApp.value || !MiniKit.isInstalled()) {
    showToast(`Open inside World App to claim +${voucher.tokenAmount} $DEF on-chain`);
    showWorldAppModal.value = true;
    return;
  }

  try {
    isClaimingOnChain.value = true;
    claimStatusMessage.value = 'Confirm transaction in World App...';
    claimStatusSuccess.value = false;
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
      claimStatusSuccess.value = true;
      claimStatusMessage.value = `🎉 Claim confirmed on World Chain! +${voucher.tokenAmount} $DEF in your wallet!`;
      showToast(`🎉 Claim confirmed on-chain! +${voucher.tokenAmount} $DEF in your wallet!`);
      await fetchOnChainBalance(voucher.recipient);
      setTimeout(() => {
        showRewardClaimModal.value = false;
      }, 3000);
    } else {
      const err = payload?.error_code || 'Cancelled';
      if (err === 'user_rejected') {
        claimStatusMessage.value = 'Transaction cancelled';
      } else {
        claimStatusMessage.value = `On-chain claim: ${err}`;
        showToast(`On-chain claim: ${err}`);
      }
    }
  } catch (err: any) {
    console.warn('[OnChain Claim Error]:', err);
    claimStatusMessage.value = `Claim failed: ${err.message || 'Unknown'}`;
    showToast(`Claim failed: ${err.message || 'Unknown'}`);
  } finally {
    isClaimingOnChain.value = false;
  }
};

const handleClaimTokens = async (claimData: { amount: number; address: string }) => {
  try {
    isShopOpen.value = false; // Close shop modal so reward modal is fully visible
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

    if (res && res.success) {
      userTokens.value = res.remainingTokens;
      unclaimedTokens.value = res.remainingTokens;
      if (res.dailyLimitReached !== undefined) dailyLimitReached.value = res.dailyLimitReached;
      if (res.dailyClaimResetAt) dailyClaimResetAt.value = res.dailyClaimResetAt;
      if (res.dailyClaimedTokens !== undefined) dailyClaimedTokens.value = res.dailyClaimedTokens;
      setPersisted('defeat_ai_user_tokens', userTokens.value.toString());
      if (res.directTransfer) {
        showToast(res.message || `🎉 Successfully transferred ${claimData.amount} $DEF on-chain!`);
        await fetchOnChainBalance(claimData.address);
        pendingVoucher.value = { tokenAmount: res.claimedAmount || claimData.amount, isDirect: true };
        showRewardClaimModal.value = true;
        claimStatusSuccess.value = true;
        claimStatusMessage.value = '';
      } else if (res.voucher) {
        pendingVoucher.value = res.voucher;
        showRewardClaimModal.value = true;
        claimStatusMessage.value = '';
        claimStatusSuccess.value = false;
        await executeOnChainClaim(res.voucher);
      }
    }
  } catch (err: any) {
    const errData = err.data || {};
    showToast(`Claim error: ${errData.error || err.message}`);
  }
};
</script>

<template>
  <!-- Human Identity Verification Gate (Humans Only Protocol) -->
  <HumanAuthGate 
    v-if="!isAuthenticated"
    :is-white-theme="isWhiteTheme"
    :app-id="APP_ID"
    @authenticated="handleGateAuthenticated"
  />

  <div 
    v-else
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
        :is-notifications-enabled="isNotificationsEnabled"
        :daily-limit-reached="dailyLimitReached"
        :daily-claim-reset-at="dailyClaimResetAt"
        :daily-claimed-tokens="dailyClaimedTokens"
        :staked-amount="stakedAmount"
        :staked-at="stakedAt"
        :accumulated-stake-yield="accumulatedStakeYield"
        @hit="handleHit"
        @open-shop="handleOpenShop"
        @toggle-notifications="handleToggleNotifications"
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
      :is-notifications-enabled="isNotificationsEnabled"
      :staked-amount="stakedAmount"
      :staked-at="stakedAt"
      :accumulated-stake-yield="accumulatedStakeYield"
      :is-staking-processing="isStakingProcessing"
      @close="isShopOpen = false"
      @buy-item="handleBuyItem"
      @connect-wallet="handleConnectWallet"
      @disconnect-wallet="handleDisconnectWallet"
      @refresh-balance="handleRefreshShop"
      @toggle-notifications="handleToggleNotifications"
      @stake="handleStakeTokens"
      @unstake="handleUnstakeTokens"
      @claim-stake-yield="handleClaimStakeYield"
    />

    <!-- Ultra-Simplified Reward Claim Modal: ONLY the Sum of Claimed Tokens -->
    <div 
      v-if="showRewardClaimModal && pendingVoucher"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none"
      @click.self="showRewardClaimModal = false"
    >
      <div 
        class="relative w-full max-w-[280px] sm:max-w-xs rounded-3xl border p-6 shadow-2xl flex flex-col items-center text-center transition-colors my-auto"
        :class="isWhiteTheme ? 'bg-white border-amber-500/40 text-zinc-950 shadow-black/10' : 'bg-zinc-950 border-amber-500/40 text-white shadow-amber-500/10'"
      >
        <!-- Close button -->
        <button 
          @click="showRewardClaimModal = false"
          class="absolute top-3.5 right-3.5 w-7 h-7 rounded-full flex items-center justify-center border transition-all active:scale-90"
          :class="isWhiteTheme ? 'bg-black/5 hover:bg-black/10 border-black/10 text-zinc-700' : 'bg-white/5 hover:bg-white/15 border-white/10 text-zinc-400 hover:text-white'"
        >
          <X class="w-3.5 h-3.5" />
        </button>

        <!-- DEF Token Glowing Icon -->
        <div class="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mb-1 shadow-lg shadow-amber-500/20">
          <img src="/def.png" alt="DEF" class="w-9 h-9 object-contain rounded-full shadow" />
        </div>

        <span class="text-[10px] font-mono font-black uppercase tracking-widest text-amber-500/90 mt-1">
          REWARD RECEIVED
        </span>

        <!-- ONLY Sum of Claimed Tokens -->
        <div class="my-3 flex items-baseline justify-center gap-1.5">
          <span class="text-4xl sm:text-5xl font-black font-mono tracking-tight text-amber-400">
            +{{ pendingVoucher.tokenAmount }}
          </span>
          <span class="text-base font-extrabold font-mono text-amber-500">$DEF</span>
        </div>

        <!-- Single Action Button -->
        <div class="w-full mt-2">
          <button
            v-if="!pendingVoucher.isDirect && !claimStatusSuccess"
            @click="executeOnChainClaim(pendingVoucher)"
            :disabled="isClaimingOnChain"
            class="w-full py-3 px-4 rounded-xl bg-amber-500 text-black font-mono font-black text-xs uppercase tracking-wider hover:bg-amber-400 active:scale-95 transition-all shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Sparkles class="w-4 h-4" />
            <span>{{ isClaimingOnChain ? 'CLAIMING...' : `CLAIM ${pendingVoucher.tokenAmount} $DEF` }}</span>
          </button>

          <button
            v-else
            @click="showRewardClaimModal = false"
            class="w-full py-3 px-4 rounded-xl bg-emerald-500 text-black font-mono font-black text-xs uppercase tracking-wider hover:bg-emerald-400 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
          >
            <Check class="w-4 h-4" />
            <span>OK</span>
          </button>
        </div>
      </div>
    </div>

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
