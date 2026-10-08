<script setup lang="ts">
import type { Finding, Severity } from '#shared/types/scan'

defineProps<{
  finding: Finding
}>()

function statusDot(finding: Finding): string {
  if (finding.passed) return 'bg-ok'
  const map: Record<Severity, string> = {
    critical: 'bg-danger',
    high: 'bg-danger',
    medium: 'bg-warn',
    low: 'bg-warn/70',
    info: 'bg-muted',
  }
  return map[finding.severity]
}

function statusLabel(finding: Finding): string {
  if (finding.passed) return 'pass'
  if (finding.required) return 'required'
  return finding.severity
}

function statusClass(finding: Finding): string {
  if (finding.passed) return 'text-muted'
  if (finding.required || finding.severity === 'medium' || finding.severity === 'low') return 'text-warn'
  if (finding.severity === 'critical' || finding.severity === 'high') return 'text-danger'
  return 'text-muted'
}
</script>

<template>
  <li class="grid gap-1 border-t border-slate-line/80 py-4 first:border-t-0 sm:grid-cols-[auto_1fr] sm:gap-x-4">
    <div class="flex items-start gap-2 sm:col-span-2">
      <span
        class="mt-0.5 inline-block size-2.5 shrink-0 rounded-full"
        :class="statusDot(finding)"
        aria-hidden="true"
      />
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h4 class="font-medium text-white">{{ finding.title }}</h4>
          <span
            class="font-mono text-xs uppercase tracking-wide"
            :class="statusClass(finding)"
          >
            {{ statusLabel(finding) }}
          </span>
        </div>
        <p class="mt-1 text-sm text-mist/90">
          {{ finding.detail }}
        </p>
        <p
          v-if="finding.value"
          class="mt-2 overflow-x-auto font-mono text-xs text-muted"
        >
          {{ finding.value }}
        </p>
        <a
          v-if="finding.actionUrl && finding.actionLabel"
          :href="finding.actionUrl"
          target="_blank"
          rel="noreferrer"
          class="mt-3 inline-flex items-center bg-warn px-3 py-1.5 text-sm font-medium text-ink hover:bg-warn/90"
        >
          {{ finding.actionLabel }}
        </a>
      </div>
    </div>
  </li>
</template>
