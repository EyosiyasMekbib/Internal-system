<script setup lang="ts">
defineProps<{
  columns: { key: string; label: string; numeric?: boolean; width?: string }[]
  rows: Record<string, unknown>[]
  loading?: boolean
  emptyMessage?: string
}>()
defineEmits(['row-click'])
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full text-sm border-collapse">
      <thead>
        <tr class="border-b border-border bg-surface">
          <th
            v-for="col in columns"
            :key="col.key"
            class="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wide font-ui"
            :class="{ 'text-right': col.numeric }"
            :style="col.width ? `width: ${col.width}` : ''"
          >
            {{ col.label }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="loading">
          <td :colspan="columns.length" class="px-4 py-8 text-center text-muted text-sm">
            Loading…
          </td>
        </tr>
        <tr v-else-if="!rows.length">
          <td :colspan="columns.length" class="px-4 py-8 text-center text-muted text-sm">
            {{ emptyMessage ?? 'No records found.' }}
          </td>
        </tr>
        <tr
          v-for="(row, i) in rows"
          v-else
          :key="i"
          class="border-b border-border hover:bg-surface cursor-pointer transition-colors"
          @click="$emit('row-click', row)"
        >
          <td
            v-for="col in columns"
            :key="col.key"
            class="px-4 py-3 text-text"
            :class="col.numeric ? 'font-mono text-right' : 'font-ui'"
          >
            <slot :name="`cell-${col.key}`" :value="row[col.key]" :row="row">
              {{ row[col.key] }}
            </slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>