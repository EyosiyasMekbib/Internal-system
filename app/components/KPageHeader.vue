<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
  action?: string
}>()
defineEmits(['action'])
</script>

<template>
  <div class="flex items-start justify-between px-8 pt-8 pb-6 border-b border-border">
    <div>
      <h1 class="font-display text-2xl font-bold text-text">{{ title }}</h1>
      <p v-if="subtitle" class="mt-1 text-sm text-muted">{{ subtitle }}</p>
    </div>
    <button
      v-if="action"
      class="flex items-center gap-2 bg-text text-bg px-4 py-2 text-sm font-medium hover:bg-red transition-colors"
      @click="$emit('action')"
    >
      <span>+</span>
      {{ action }}
    </button>
  </div>
</template>