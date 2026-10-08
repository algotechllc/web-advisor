<script setup lang="ts">
const branding = useSiteBranding()
</script>

<template>
  <div class="min-h-screen">
    <header class="border-b border-slate-line/60">
      <div class="mx-auto flex max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
        <NuxtLink to="/" class="group">
          <span class="block font-mono text-xs uppercase tracking-[0.25em] text-accent">
            {{ branding.siteName }}
          </span>
          <span class="mt-1 block text-sm text-muted transition group-hover:text-mist">
            Security · SEO · Is Agentic
          </span>
        </NuxtLink>
        <nav class="flex flex-wrap items-center gap-4 font-mono text-xs text-muted">
          <NuxtLink to="/about" class="hover:text-accent">About</NuxtLink>
          <NuxtLink to="/contact" class="hover:text-accent">Contact</NuxtLink>
          <NuxtLink to="/privacy" class="hover:text-accent">Privacy</NuxtLink>
        </nav>
      </div>
    </header>
    <main class="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <slot />
    </main>
  </div>
</template>
