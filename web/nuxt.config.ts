import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['nuxt-security'],
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  vite: {
    plugins: [tailwindcss()],
  },
  runtimeConfig: {
    // Override with NUXT_PUBLIC_* env vars (see web/.env.example).
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      siteName: process.env.NUXT_PUBLIC_SITE_NAME || 'Web Advisor',
      siteDescription:
        process.env.NUXT_PUBLIC_SITE_DESCRIPTION
        || 'Web Advisor scans public websites for security headers, TLS, DNSSEC, DNS hygiene, Open Graph SEO previews, and Is Agentic readiness, then returns a letter grade and an AI fix prompt.',
      orgName: process.env.NUXT_PUBLIC_ORG_NAME || 'Your Organization',
      orgEmail: process.env.NUXT_PUBLIC_ORG_EMAIL || 'contact@example.com',
      orgUrl: process.env.NUXT_PUBLIC_ORG_URL || 'https://example.com',
      orgAddress: process.env.NUXT_PUBLIC_ORG_ADDRESS || 'Your street, City, Country',
      orgStreetAddress: process.env.NUXT_PUBLIC_ORG_STREET_ADDRESS || 'Your street',
      orgLocality: process.env.NUXT_PUBLIC_ORG_LOCALITY || 'City',
      orgCountry: process.env.NUXT_PUBLIC_ORG_COUNTRY || 'US',
      orgPostalCode: process.env.NUXT_PUBLIC_ORG_POSTAL_CODE || '00000',
      githubUrl:
        process.env.NUXT_PUBLIC_GITHUB_URL || 'https://github.com/algotechllc/web-advisor',
    },
  },
  nitro: {
    // Nuxt picks the Vercel preset automatically when deploying there.
  },
  security: {
    // Per-request nonces for SSR CSP (no unsafe-inline / unsafe-eval).
    nonce: true,
    sri: true,
    // Avoid stacking a second in-module rate limiter on top of Vercel Firewall.
    rateLimiter: false,
    // Extension + same-origin fetch do not need the default CORS middleware.
    corsHandler: false,
    headers: {
      contentSecurityPolicy: {
        'default-src': ["'self'"],
        'base-uri': ["'self'"],
        'font-src': ["'self'"],
        'form-action': ["'self'"],
        'frame-ancestors': ["'none'"],
        'img-src': ["'self'", 'data:'],
        'object-src': ["'none'"],
        'script-src-attr': ["'none'"],
        // Nonce + strict-dynamic; omit unsafe-inline / unsafe-eval entirely.
        'script-src': ["'self'", "'nonce-{{nonce}}'", "'strict-dynamic'"],
        // Nonces on style tags from nuxt-security; fonts/CSS are self-hosted.
        'style-src': ["'self'", "'nonce-{{nonce}}'"],
        'connect-src':
          process.env.NODE_ENV === 'production'
            ? ["'self'"]
            : ["'self'", 'ws:', 'wss:', 'http://localhost:*', 'http://127.0.0.1:*'],
        'upgrade-insecure-requests': true,
      },
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: 'same-origin',
      crossOriginResourcePolicy: 'same-origin',
      referrerPolicy: 'strict-origin-when-cross-origin',
      strictTransportSecurity: {
        maxAge: 15_552_000,
        includeSubdomains: true,
      },
      xContentTypeOptions: 'nosniff',
      xDNSPrefetchControl: 'off',
      xFrameOptions: 'DENY',
      permissionsPolicy: {
        camera: [],
        microphone: [],
        geolocation: [],
        payment: [],
        usb: [],
      },
    },
  },
  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      link: [
        { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
        { rel: 'icon', href: '/favicon.ico', sizes: 'any' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png', sizes: '180x180' },
      ],
    },
  },
})

