<script setup lang="ts">
import type { Grade, ScanReport } from '#shared/types/scan'
import {
  CATEGORY_LABELS,
  REPORT_TABS,
  type ReportTabId,
  type ScanCategoryKey,
} from '#shared/fixRules'
import { gradeFromScore } from '#shared/grade'
import { gradeTone } from '~/utils/gradeStyles'

const props = defineProps<{
  report: ScanReport
}>()

const activeTab = ref<ReportTabId>('security')
const promptOpen = ref(false)

const allCategories = Object.keys(CATEGORY_LABELS) as ScanCategoryKey[]

const currentTab = computed(
  () => REPORT_TABS.find((tab) => tab.id === activeTab.value) ?? REPORT_TABS[0]!,
)

const tabCategories = computed(() => currentTab.value.categories)

const defaultPromptCategories = computed(() => tabCategories.value)

function categoryFailCount(key: ScanCategoryKey): number {
  return props.report.categories[key].findings.filter((f) => !f.passed).length
}

function tabFailCount(tabId: ReportTabId): number {
  const tab = REPORT_TABS.find((t) => t.id === tabId)
  if (!tab) return 0
  return tab.categories.reduce((sum, key) => sum + categoryFailCount(key), 0)
}

function tabGrade(tabId: ReportTabId): Grade {
  const tab = REPORT_TABS.find((t) => t.id === tabId)
  if (!tab?.categories.length) return 'F'
  const avg = Math.round(
    tab.categories.reduce((sum, key) => sum + props.report.categories[key].score, 0)
    / tab.categories.length,
  )
  return gradeFromScore(avg)
}

function tabForCategory(key: ScanCategoryKey): ReportTabId {
  return REPORT_TABS.find((tab) => tab.categories.includes(key))?.id ?? 'security'
}

function selectCategory(key: ScanCategoryKey) {
  activeTab.value = tabForCategory(key)
}
</script>

<template>
  <section class="space-y-8">
    <div class="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="font-mono text-xs uppercase tracking-[0.2em] text-muted">
          Overall grade
        </p>
        <h2 class="mt-2 break-all font-mono text-lg text-white sm:text-xl">
          {{ report.host }}
        </h2>
        <p class="mt-1 text-sm text-muted">
          Scanned {{ new Date(report.scannedAt).toLocaleString() }} · score {{ report.score }}/100
        </p>
        <button
          type="button"
          class="mt-4 border border-accent/50 bg-accent/10 px-4 py-2 text-sm font-medium text-accent transition hover:bg-accent/20"
          @click="promptOpen = true"
        >
          Generate AI fix prompt
        </button>
      </div>
      <GradeBadge :grade="report.grade" size="lg" />
    </div>

    <FixPromptModal
      :open="promptOpen"
      :report="report"
      :default-categories="defaultPromptCategories"
      @close="promptOpen = false"
    />

    <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
      <button
        v-for="key in allCategories"
        :key="key"
        type="button"
        class="border px-2.5 py-2 text-left transition hover:brightness-110"
        :class="[
          gradeTone(report.categories[key].grade),
          tabForCategory(key) === activeTab
            ? 'border-accent/70 ring-1 ring-accent/30'
            : 'border-slate-line/80',
        ]"
        @click="selectCategory(key)"
      >
        <p class="truncate text-[10px] uppercase tracking-wide opacity-80">
          {{ CATEGORY_LABELS[key] }}
        </p>
        <div class="mt-1 flex items-baseline justify-between gap-2">
          <span class="font-mono text-lg font-medium leading-none">
            {{ report.categories[key].grade }}
          </span>
          <span class="font-mono text-[10px] opacity-70">
            {{ report.categories[key].score }}
          </span>
        </div>
      </button>
    </div>

    <div
      class="flex flex-wrap gap-2 border-b border-slate-line/70 pb-px"
      role="tablist"
      aria-label="Scan result areas"
    >
      <button
        v-for="tab in REPORT_TABS"
        :key="tab.id"
        type="button"
        role="tab"
        class="relative -mb-px border-b-2 px-3 py-2.5 font-mono text-sm transition sm:px-4"
        :class="
          activeTab === tab.id
            ? 'border-accent text-accent'
            : 'border-transparent text-muted hover:text-mist'
        "
        :aria-selected="activeTab === tab.id"
        @click="activeTab = tab.id"
      >
        <span>{{ tab.label }}</span>
        <span
          class="ml-2 inline-flex min-w-7 items-center justify-center border px-1.5 py-0.5 text-xs"
          :class="gradeTone(tabGrade(tab.id))"
        >
          {{ tabGrade(tab.id) }}
        </span>
        <span
          v-if="tabFailCount(tab.id) > 0"
          class="ml-1.5 font-mono text-xs text-warn"
        >
          {{ tabFailCount(tab.id) }}
        </span>
      </button>
    </div>

    <div
      :id="`tab-panel-${currentTab.id}`"
      role="tabpanel"
      class="space-y-8"
    >
      <div>
        <h3 class="font-mono text-xl text-white">
          {{ currentTab.label }}
        </h3>
        <p class="mt-1 text-sm text-muted">
          {{ currentTab.description }}
        </p>
      </div>

      <div
        v-if="currentTab.id === 'agentic' && report.agenticMeta"
        class="space-y-3 border bg-slate-panel/50 px-4 py-4"
        :class="
          report.agenticMeta.source === 'api'
            ? 'border-slate-line/70'
            : 'border-warn/50'
        "
      >
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div class="space-y-1">
            <p class="font-mono text-xs uppercase tracking-[0.15em] text-muted">
              Is Agentic summary
            </p>
            <p v-if="report.agenticMeta.score != null" class="font-mono text-2xl text-white">
              {{ report.agenticMeta.score }}/100
              <span
                v-if="report.agenticMeta.scoreLabel"
                class="ml-2 text-sm text-mist"
              >{{ report.agenticMeta.scoreLabel }}</span>
            </p>
            <p v-else class="text-sm text-mist">
              No official stored report yet. Local probes are shown below.
            </p>
            <p class="text-xs text-muted">
              <template v-if="report.agenticMeta.source === 'api'">
                Sourced from the Is Agentic report API
                <template v-if="report.agenticMeta.scannedAt">
                  · scanned {{ new Date(report.agenticMeta.scannedAt).toLocaleString() }}
                </template>
              </template>
              <template v-else-if="report.agenticMeta.source === 'local'">
                Local probes only. Start a scan on Is Agentic to import an official score.
              </template>
              <template v-else>
                Is Agentic API unavailable; showing local probes and a link to retry there.
              </template>
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <a
              :href="report.agenticMeta.reportUrl"
              target="_blank"
              rel="noreferrer"
              class="inline-flex items-center px-3 py-2 text-sm font-medium"
              :class="
                report.agenticMeta.source === 'api'
                  ? 'bg-accent text-ink hover:bg-accent/90'
                  : 'bg-warn text-ink hover:bg-warn/90'
              "
            >
              {{
                report.agenticMeta.source === 'api'
                  ? 'View full report on Is Agentic'
                  : 'Start Is Agentic scan'
              }}
            </a>
            <a
              :href="report.agenticMeta.docsUrl"
              target="_blank"
              rel="noreferrer"
              class="inline-flex items-center border border-slate-line px-3 py-2 text-sm text-mist hover:border-muted"
            >
              Docs
            </a>
          </div>
        </div>
        <dl
          v-if="report.agenticMeta.breakdown"
          class="grid gap-2 font-mono text-xs text-muted sm:grid-cols-3"
        >
          <div>
            <dt class="uppercase tracking-wide">Essential</dt>
            <dd class="mt-0.5 text-mist">
              {{ report.agenticMeta.breakdown.essential.passing }}/{{ report.agenticMeta.breakdown.essential.total }}
              passing · {{ report.agenticMeta.breakdown.essential.earned }}/{{ report.agenticMeta.breakdown.essential.available }} pts
            </dd>
          </div>
          <div>
            <dt class="uppercase tracking-wide">Recommended</dt>
            <dd class="mt-0.5 text-mist">
              {{ report.agenticMeta.breakdown.recommended.passing }}/{{ report.agenticMeta.breakdown.recommended.total }}
              passing · {{ report.agenticMeta.breakdown.recommended.earned }}/{{ report.agenticMeta.breakdown.recommended.available }} pts
            </dd>
          </div>
          <div>
            <dt class="uppercase tracking-wide">Bonus</dt>
            <dd class="mt-0.5 text-mist">
              {{ report.agenticMeta.breakdown.bonus.points }} pts
              · {{ report.agenticMeta.breakdown.bonus.positive_signals }} signals
            </dd>
          </div>
        </dl>
      </div>

      <div
        v-for="key in tabCategories"
        :key="`${key}-findings`"
        class="space-y-2"
      >
        <h4 class="font-mono text-sm uppercase tracking-[0.15em] text-muted">
          {{ CATEGORY_LABELS[key] }}
        </h4>
        <ul class="border border-slate-line/60 bg-slate-panel/40 px-4">
          <FindingRow
            v-for="finding in report.categories[key].findings"
            :key="finding.id"
            :finding="finding"
          />
        </ul>
      </div>
    </div>
  </section>
</template>
