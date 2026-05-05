<script setup lang="ts">
defineProps<{ label: string; variant?: 'default' | 'red' | 'muted' }>()
</script>

<template>
  <span
    class="inline-block px-2 py-0.5 text-xs font-medium tracking-wide uppercase"
    :class="{
      'bg-surface2 text-text': !variant || variant === 'default',
      'bg-red-light text-red': variant === 'red',
      'bg-surface text-muted border border-border': variant === 'muted',
    }"
  >
    {{ label }}
  </span>
</template>