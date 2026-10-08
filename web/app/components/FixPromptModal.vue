<script setup lang="ts">
import type { ScanReport } from '#shared/types/scan'
import {
  CATEGORY_LABELS,
  REPORT_TABS,
  type ScanCategoryKey,
} from '#shared/fixRules'
import { buildFixPrompt } from '~/utils/buildFixPrompt'

const props = defineProps<{
  open: boolean
  report: ScanReport
  defaultCategories?: ScanCategoryKey[]
}>()

const emit = defineEmits<{
  close: []
}>()

const categoryKeys = Object.keys(CATEGORY_LABELS) as ScanCategoryKey[]

const selected = reactive<Record<ScanCategoryKey, boolean>>({
  headers: true,
  tls: false,
  dnssec: false,
  dns: false,
  seo: false,
  agentic: false,
})

const copied = ref(false)
let copyTimer: ReturnType<typeof setTimeout> | undefined

const selectedKeys = computed(() =>
  categoryKeys.filter((key) => selected[key]),
)

const prompt = computed(() => buildFixPrompt(props.report, selectedKeys.value))

const failedCounts = computed(() => {
  const counts = {} as Record<ScanCategoryKey, number>
  for (const key of categoryKeys) {
    counts[key] = props.report.categories[key].findings.filter((f) => !f.passed).length
  }
  return counts
})

function resetSelection() {
  const defaults = new Set(props.defaultCategories?.length ? props.defaultCategories : ['headers'])
  for (const key of categoryKeys) {
    selected[key] = defaults.has(key)
  }
  copied.value = false
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) resetSelection()
  },
)

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close')
}

watch(
  () => props.open,
  (isOpen) => {
    if (import.meta.client) {
      if (isOpen) window.addEventListener('keydown', onKeydown)
      else window.removeEventListener('keydown', onKeydown)
    }
  },
)

onBeforeUnmount(() => {
  if (import.meta.client) window.removeEventListener('keydown', onKeydown)
  if (copyTimer) clearTimeout(copyTimer)
})

async function copyPrompt() {
  try {
    await navigator.clipboard.writeText(prompt.value)
    copied.value = true
    if (copyTimer) clearTimeout(copyTimer)
    copyTimer = setTimeout(() => {
      copied.value = false
    }, 1600)
  } catch {
    copied.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-end justify-center bg-ink/80 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fix-prompt-title"
      @click.self="emit('close')"
    >
      <div class="flex max-h-[90vh] w-full max-w-2xl flex-col border border-slate-line bg-slate-panel shadow-2xl">
        <div class="flex items-start justify-between gap-4 border-b border-slate-line px-5 py-4">
          <div>
            <h2 id="fix-prompt-title" class="font-mono text-lg text-white">
              AI fix prompt
            </h2>
            <p class="mt-1 text-sm text-muted">
              Generate a prompt an AI can use to remediate failed checks.
            </p>
          </div>
          <button
            type="button"
            class="font-mono text-sm text-muted hover:text-white"
            aria-label="Close"
            @click="emit('close')"
          >
            Close
          </button>
        </div>

        <div class="space-y-5 border-b border-slate-line px-5 py-4">
          <div
            v-for="tab in REPORT_TABS"
            :key="tab.id"
            class="space-y-2"
          >
            <p class="font-mono text-xs uppercase tracking-[0.15em] text-muted">
              {{ tab.label }}
            </p>
            <div class="grid gap-2 sm:grid-cols-2">
              <label
                v-for="key in tab.categories"
                :key="key"
                class="flex cursor-pointer items-center gap-3 border border-slate-line/70 px-3 py-2 text-sm hover:border-accent/40"
              >
                <input
                  v-model="selected[key]"
                  type="checkbox"
                  class="size-4 accent-accent"
                >
                <span class="text-mist">{{ CATEGORY_LABELS[key] }}</span>
                <span class="ml-auto font-mono text-xs text-muted">
                  {{ failedCounts[key] }} fail
                </span>
              </label>
            </div>
          </div>
        </div>

        <div class="min-h-0 flex-1 overflow-auto px-5 py-4">
          <pre class="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-mist/95">{{ prompt }}</pre>
        </div>

        <div class="flex flex-wrap items-center justify-end gap-3 border-t border-slate-line px-5 py-4">
          <button
            type="button"
            class="border border-slate-line px-4 py-2 text-sm text-mist hover:border-muted"
            @click="emit('close')"
          >
            Cancel
          </button>
          <button
            type="button"
            class="bg-accent px-4 py-2 text-sm font-medium text-ink hover:bg-accent/90 disabled:opacity-50"
            :disabled="!selectedKeys.length"
            @click="copyPrompt"
          >
            {{ copied ? 'Copied' : 'Copy prompt' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
