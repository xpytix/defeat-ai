<script setup lang="ts">
import { ref } from 'vue';
import { MiniKit } from '@worldcoin/minikit-js';
import { ShieldCheck, Sparkles, Lock, ArrowUpRight } from 'lucide-vue-next';

const props = defineProps<{
  isWhiteTheme?: boolean;
  appId: string;
}>();

const emit = defineEmits<{
  (e: 'authenticated', address: string): void;
}>();

const isAuthenticating = ref(false);
const errorMessage = ref<string | null>(null);

const handleSignIn = async () => {
  errorMessage.value = null;

  if (MiniKit.isInstalled()) {
    try {
      isAuthenticating.value = true;
      const nonce = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      const res = await MiniKit.commandsAsync.walletAuth({
        nonce,
        statement: 'Sign in to Defeat AI to verify human identity, access raid battles, and claim $DEF tokens on World Chain.'
      });

      isAuthenticating.value = false;

      const payload = res.finalPayload;
      if (payload.status === 'success' && payload.address) {
        emit('authenticated', payload.address);
      } else {
        const err = (payload as any).error_code || 'Authentication cancelled';
        if (err !== 'user_rejected') {
          errorMessage.value = `Sign-in failed: ${err}`;
        }
      }
    } catch (err: any) {
      isAuthenticating.value = false;
      errorMessage.value = `Error: ${err.message || 'Unknown error'}`;
    }
  } else {
    // Outside World App: Dev fallback or QR prompt
    if (process.env.NODE_ENV !== 'production') {
      const manualAddr = prompt('DEV MODE: Enter test World Chain wallet address (0x...):');
      if (manualAddr && manualAddr.startsWith('0x') && manualAddr.length === 42) {
        emit('authenticated', manualAddr.trim());
      }
    } else {
      errorMessage.value = 'Please open Defeat AI inside the World App.';
    }
  }
};
</script>

<template>
  <div 
    class="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 select-none overflow-hidden"
    :class="isWhiteTheme ? 'bg-[#f4f4f5] text-zinc-950' : 'bg-[#08080c] text-white'"
  >
    <!-- Background Ambient Glow & Cyber Grid -->
    <div class="absolute inset-0 pointer-events-none opacity-30 overflow-hidden flex items-center justify-center">
      <div 
        class="w-[500px] h-[500px] rounded-full blur-[120px] transition-all"
        :class="isWhiteTheme ? 'bg-cyan-200/50' : 'bg-cyan-500/15'"
      />
      <div 
        class="absolute w-[400px] h-[400px] rounded-full blur-[100px] -bottom-20 transition-all"
        :class="isWhiteTheme ? 'bg-emerald-200/40' : 'bg-emerald-500/10'"
      />
    </div>

    <!-- Security Gate Card -->
    <div 
      class="relative w-full max-w-sm rounded-3xl border p-6 sm:p-8 flex flex-col items-center text-center shadow-2xl backdrop-blur-xl transition-all"
      :class="isWhiteTheme 
        ? 'bg-white/90 border-black/10 shadow-xl' 
        : 'bg-zinc-950/80 border-white/15 shadow-black/80'"
    >
      <!-- Orb / Human Security Emblem -->
      <div class="relative mb-5">
        <div 
          class="w-20 h-20 rounded-3xl flex items-center justify-center border shadow-xl relative overflow-hidden"
          :class="isWhiteTheme 
            ? 'bg-black text-white border-black/20 shadow-cyan-500/10' 
            : 'bg-zinc-900 border-white/20 text-white shadow-cyan-500/20'"
        >
          <!-- Animated Ring Pulse -->
          <div class="absolute inset-0 border-2 border-cyan-400/40 rounded-3xl animate-ping opacity-25 pointer-events-none" />
          
          <span class="text-3xl filter drop-shadow">👁️</span>
        </div>

        <div 
          class="absolute -bottom-2 -right-2 p-1.5 rounded-full border shadow-md"
          :class="isWhiteTheme ? 'bg-emerald-500 text-white border-white' : 'bg-emerald-500 text-black border-zinc-900'"
        >
          <ShieldCheck class="w-4 h-4" />
        </div>
      </div>

      <!-- Protocol Badge -->
      <div class="flex items-center gap-1.5 mb-2">
        <span 
          class="text-[10px] font-mono font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border flex items-center gap-1"
          :class="isWhiteTheme 
            ? 'bg-black/5 border-black/15 text-zinc-700' 
            : 'bg-white/5 border-white/15 text-zinc-300'"
        >
          <Lock class="w-3 h-3 text-cyan-400" />
          <span>HUMANS ONLY PROTOCOL</span>
        </span>
      </div>

      <h1 class="text-2xl font-extrabold tracking-tight mt-1">
        Defeat AI
      </h1>
      <p class="text-xs font-mono font-medium opacity-60 mt-1">
        World ID & World Chain Verification
      </p>

      <!-- Description Body -->
      <div 
        class="my-5 p-3.5 rounded-2xl border text-left space-y-2 w-full"
        :class="isWhiteTheme ? 'bg-black/[0.02] border-black/10' : 'bg-white/[0.02] border-white/10'"
      >
        <div class="flex items-start gap-2.5">
          <div class="w-5 h-5 rounded-full bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shrink-0 mt-0.5">
            <span class="text-[11px] font-bold text-cyan-400">1</span>
          </div>
          <p class="text-[11px] font-mono leading-snug opacity-80">
            Sign in with your <strong>World App Wallet</strong> to verify unique humanity.
          </p>
        </div>

        <div class="flex items-start gap-2.5">
          <div class="w-5 h-5 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5">
            <span class="text-[11px] font-bold text-amber-400">2</span>
          </div>
          <p class="text-[11px] font-mono leading-snug opacity-80">
            Earn real <strong>$DEF tokens</strong> on World Chain sent directly to your wallet.
          </p>
        </div>
      </div>

      <!-- Error message -->
      <div 
        v-if="errorMessage" 
        class="mb-4 text-xs font-mono font-bold text-rose-500 bg-rose-500/10 border border-rose-500/20 p-2 rounded-xl w-full"
      >
        {{ errorMessage }}
      </div>

      <!-- Main Action Button -->
      <button
        @click="handleSignIn"
        :disabled="isAuthenticating"
        class="w-full py-3.5 px-4 rounded-2xl font-mono font-black text-xs uppercase tracking-wider transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        :class="isWhiteTheme 
          ? 'bg-black text-white hover:bg-zinc-800 shadow-black/20' 
          : 'bg-white text-black hover:bg-zinc-200 shadow-white/20'"
      >
        <Sparkles class="w-4 h-4 text-cyan-500" />
        <span>{{ isAuthenticating ? 'VERIFYING WITH WORLD APP...' : 'VERIFY & SIGN IN WITH WORLD APP' }}</span>
      </button>

      <!-- Desktop QR Fallback Link -->
      <div class="mt-4 text-[10px] font-mono opacity-50 flex items-center justify-center gap-1">
        <span>Powered by World ID Biometrics</span>
        <span>·</span>
        <a 
          :href="`https://worldcoin.org/mini-app?app_id=${appId}`"
          target="_blank"
          class="underline hover:opacity-100 flex items-center"
        >
          <span>Mini App</span>
          <ArrowUpRight class="w-2.5 h-2.5" />
        </a>
      </div>

    </div>
  </div>
</template>
