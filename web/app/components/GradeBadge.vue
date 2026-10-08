<script setup lang="ts">
import type { Grade } from '#shared/types/scan'
import { gradeBadgeBg } from '~/utils/gradeStyles'

defineProps<{
  grade: Grade
  size?: 'sm' | 'lg'
}>()
</script>

<template>
  <span
    class="inline-flex items-center justify-center font-mono font-medium tracking-tight"
    :class="[
      gradeBadgeBg(grade),
      size === 'lg'
        ? 'min-w-20 h-20 text-3xl rounded-md'
        : 'min-w-10 h-10 text-lg rounded px-2',
    ]"
  >
    {{ grade }}
  </span>
</template>
