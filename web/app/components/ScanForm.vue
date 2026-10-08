<script setup lang="ts">
const emit = defineEmits<{
  submit: [url: string]
}>()

const props = defineProps<{
  modelValue?: string
  loading?: boolean
}>()

const url = ref(props.modelValue ?? '')

watch(
  () => props.modelValue,
  (value) => {
    if (typeof value === 'string') url.value = value
  },
)

function onSubmit() {
  const trimmed = url.value.trim()
  if (!trimmed || props.loading) return
  emit('submit', trimmed)
}
</script>

<template>
  <form class="flex w-full flex-col gap-3 sm:flex-row" @submit.prevent="onSubmit">
    <label class="sr-only" for="scan-url">Website URL</label>
    <input
      id="scan-url"
      v-model="url"
      type="text"
      name="url"
      autocomplete="url"
      placeholder="example.com or https://example.com"
      class="w-full flex-1 border border-slate-line bg-slate-panel/80 px-4 py-3 font-mono text-sm text-white outline-none ring-accent/40 placeholder:text-muted focus:ring-2"
      :disabled="loading"
      required
    >
    <button
      type="submit"
      class="shrink-0 bg-accent px-6 py-3 font-medium text-ink transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
      :disabled="loading"
    >
      {{ loading ? 'Scanning…' : 'Scan' }}
    </button>
  </form>
</template>
