<script setup lang="ts">
defineProps<{
  error: { statusCode?: number, statusMessage?: string, message?: string }
}>()

const branding = useSiteBranding()
</script>

<template>
  <div class="min-h-screen">
    <header class="border-b border-slate-line/60">
      <div class="mx-auto max-w-5xl px-4 py-5 sm:px-6">
        <NuxtLink to="/" class="font-mono text-xs uppercase tracking-[0.25em] text-accent">
          {{ branding.siteName }}
        </NuxtLink>
      </div>
    </header>
    <main class="mx-auto max-w-2xl space-y-6 px-4 py-14 sm:px-6">
      <h1 class="font-mono text-3xl text-white">
        {{ error.statusCode === 404 ? 'Page not found' : 'Something went wrong' }}
      </h1>
      <p class="text-mist">
        {{ error.statusCode === 404
          ? `The requested path does not exist on ${branding.siteName}. Use the homepage, llms.txt, or sitemap to find a public page.`
          : (error.statusMessage || error.message || 'Unexpected error') }}
      </p>
      <p class="text-sm text-muted">
        Continue at
        <a class="text-accent" :href="branding.siteUrl">{{ branding.siteUrl }}</a>,
        <a class="text-accent" href="/llms.txt">llms.txt</a>,
        or
        <a class="text-accent" href="/sitemap.xml">sitemap.xml</a>.
      </p>
      <NuxtLink to="/" class="inline-block bg-accent px-4 py-2 text-sm font-medium text-ink">
        Back home
      </NuxtLink>
    </main>
  </div>
</template>
