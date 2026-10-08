<script setup lang="ts">
import type { ScanReport } from '#shared/types/scan'

const route = useRoute()
const hostParam = computed(() => decodeURIComponent(String(route.params.host || '')))

const { data, error, pending, refresh } = await useAsyncData(
  () => `scan-${hostParam.value}`,
  () =>
    $fetch<ScanReport>('/api/scan', {
      query: { url: `https://${hostParam.value}` },
    }),
  { watch: [hostParam] },
)

const input = computed(() => hostParam.value)

async function rescan(url: string) {
  const trimmed = url.trim()
  if (!trimmed) return
  let host = trimmed
  try {
    const parsed = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`)
    host = parsed.hostname
  } catch {
    host = trimmed.replace(/^https?:\/\//i, '').split('/')[0] || trimmed
  }
  await navigateTo(`/scan/${encodeURIComponent(host)}`)
  await refresh()
}
</script>

<template>
  <div class="space-y-12">
    <section class="max-w-2xl space-y-6">
      <h1 class="font-mono text-3xl font-medium tracking-tight text-white sm:text-4xl">
        Scan results
      </h1>
      <ScanForm :model-value="input" :loading="pending" @submit="rescan" />
      <p v-if="error" class="text-sm text-danger" role="alert">
        {{ error.statusMessage || error.message || 'Scan failed' }}
      </p>
      <p v-else-if="pending" class="font-mono text-sm text-muted">
        Scanning {{ hostParam }}…
      </p>
    </section>

    <ScanReportView v-if="data && !pending" :report="data" />
  </div>
</template>
