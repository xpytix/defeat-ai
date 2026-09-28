import type { Config } from '@netlify/functions';

export default async (req: Request) => {
  const secret = process.env.ADMIN_RESET_SECRET || 'defeat_ai_pristine_2026';
  const siteUrl = process.env.URL || 'https://defeat-ai-wld.netlify.app';

  try {
    const res = await fetch(`${siteUrl}/api/cron/notifications?secret=${secret}`);
    const data = await res.json();
    console.log('[Daily Notifications Cron]', JSON.stringify(data));
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    console.error('[Daily Notifications Cron Error]', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

export const config: Config = {
  schedule: '@hourly'
};
