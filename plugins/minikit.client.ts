import { defineNuxtPlugin } from '#app';
import { MiniKit } from '@worldcoin/minikit-js';

export default defineNuxtPlugin((nuxtApp) => {
  if (process.client) {
    try {
      console.log('🤖 Initializing World App MiniKit SDK for Defeat AI...');
      MiniKit.install();
      console.log('✅ MiniKit installed. Inside World App:', MiniKit.isInstalled());
    } catch (err) {
      console.warn('⚠️ MiniKit not available (browser dev mode):', err);
    }
  }

  return {
    provide: {
      minikit: MiniKit
    }
  };
});
