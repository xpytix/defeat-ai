// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: true,
  compatibilityDate: '2026-06-07',

  app: {
    head: {
      title: "Human vs AI - The Resistance (World App)",
      meta: [
        { charset: "utf-8" },
        {
          name: "viewport",
          content: "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
        },
        {
          name: "description",
          content: "Collaborative raid boss battle for World App humans. Hit AI bosses once every 24h, earn crypto token rewards."
        },
        { name: "theme-color", content: "#0B0B0F" },
        { name: "apple-mobile-web-app-capable", content: "yes" },
        { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" }
      ],
      link: [
        { rel: "icon", type: "image/svg+xml", href: "/icon.svg" },
        { rel: "manifest", href: "/manifest.json" },
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600;800&display=swap"
        }
      ]
    }
  },

  css: [
    '~/assets/css/main.css'
  ],

  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },

  devtools: { enabled: false },

  nitro: {
    preset: 'netlify',
    storage: {
      db: {
        driver: process.env.NETLIFY ? 'netlify-blobs' : 'fs',
        base: './.data/db',
        name: 'defeat-ai-data'
      }
    }
  }
})
