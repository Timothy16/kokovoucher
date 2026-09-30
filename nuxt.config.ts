// nuxt.config.ts
// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  ssr: false,
  modules: ['@nuxtjs/tailwindcss', '@nuxt/icon'],
  components: [{ path: '~/components', pathPrefix: false }],
  // Values come from .env (NUXT_* / NUXT_PUBLIC_* override these at runtime).
  // Anything outside `public` is server-only and never shipped to the browser.
  runtimeConfig: {
    supabaseServiceRoleKey: '',
    resendApiKey: '',
    emailFrom: 'KokoSend <no-reply@rechargify.org>',
    public: {
      supabaseUrl: '',
      supabaseAnonKey: '',
      siteUrl: 'http://localhost:3000'
    }
  },
  // Baseline security headers on every response (pages, assets and API).
  routeRules: {
    '/**': {
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()'
      }
    }
  },
  tailwindcss: {
    cssPath: '~/assets/css/main.css',
    configPath: 'tailwind.config.ts'
  },
  app: {
    head: {
      title: 'KokoSend — Reward loyal customers. Fill your tables.',
      htmlAttrs: { lang: 'en' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content: 'KokoSend turns rewards into real footfall for restaurants — single-use vouchers, claimed and redeemed in seconds.'
        }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap'
        }
      ]
    }
  },
  icon: {
    mode: 'svg'
  }
})
