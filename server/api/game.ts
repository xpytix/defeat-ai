import { defineEventHandler, readBody } from 'h3';

interface GameState {
  level: number;
  maxHp: number;
  currentHp: number;
  bossName: string;
  totalStrikes: number;
}

export default defineEventHandler(async (event) => {
  const method = event.node.req.method;

  // Use Nitro KV storage (Netlify Blobs in production, fs locally)
  const storage = useStorage('db');

  let state = await storage.getItem<GameState>('defeat_ai_state');

  if (!state) {
    state = {
      level: 1,
      maxHp: 50,
      currentHp: 50,
      bossName: 'Synthetic Clone v0.1',
      totalStrikes: 0
    };
    await storage.setItem('defeat_ai_state', state);
  }

  if (method === 'POST') {
    const body = await readBody(event);
    const { action } = body || {};

    if (action === 'hit' && state.currentHp > 0) {
      state.currentHp -= 1;
      state.totalStrikes += 1;

      // Check if boss defeated
      if (state.currentHp <= 0) {
        state.level += 1;
        state.maxHp = state.level === 2 ? 100 : 200;
        state.currentHp = state.maxHp;
        state.bossName = state.level === 2 ? 'Deepfake Weaver' : 'Prompt Manipulator';
      }

      await storage.setItem('defeat_ai_state', state);
    }

    return { success: true, state };
  }

  return { success: true, state };
});
