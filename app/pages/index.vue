<script setup lang="ts">
definePageMeta({ layout: 'default' })

const { data: stats } = await useFetch('/api/dashboard')

function fmt(n: number) {
  return n.toLocaleString('en-ET', { minimumFractionDigits: 2 })
}
</script>

<template>
  <div>
    <div class="px-8 pt-8 pb-6 border-b border-border">
      <h1 class="font-display text-2xl font-bold text-text">Dashboard</h1>
      <p class="mt-1 text-sm text-muted">{{ (stats as any)?.month }}</p>
    </div>

    <div class="px-8 py-8">
      <!-- Stats row -->
      <div class="grid grid-cols-4 gap-px bg-border mb-8">
        <div class="bg-bg px-6 py-5">
          <p class="text-xs font-medium text-muted uppercase tracking-wide mb-3">Sales This Month</p>
          <p class="font-mono text-2xl font-bold text-text">{{ fmt((stats as any)?.sales?.total ?? 0) }}</p>
          <p class="text-xs text-muted mt-1">{{ (stats as any)?.sales?.count ?? 0 }} invoices · VAT {{ fmt((stats as any)?.sales?.vat ?? 0) }}</p>
        </div>
        <div class="bg-bg px-6 py-5">
          <p class="text-xs font-medium text-muted uppercase tracking-wide mb-3">Purchases This Month</p>
          <p class="font-mono text-2xl font-bold text-text">{{ fmt((stats as any)?.purchases?.total ?? 0) }}</p>
          <p class="text-xs text-muted mt-1">{{ (stats as any)?.purchases?.count ?? 0 }} orders</p>
        </div>
        <div class="bg-bg px-6 py-5">
          <p class="text-xs font-medium text-muted uppercase tracking-wide mb-3">Gross Profit</p>
          <p
            class="font-mono text-2xl font-bold"
            :class="((stats as any)?.grossProfit ?? 0) >= 0 ? 'text-text' : 'text-red'"
          >
            {{ fmt((stats as any)?.grossProfit ?? 0) }}
          </p>
          <p class="text-xs text-muted mt-1">Sales ex-VAT minus purchases</p>
        </div>
        <div class="bg-bg px-6 py-5">
          <p class="text-xs font-medium text-muted uppercase tracking-wide mb-3">Low Stock Items</p>
          <p class="font-mono text-2xl font-bold" :class="((stats as any)?.lowStockItems?.length ?? 0) > 0 ? 'text-red' : 'text-text'">
            {{ (stats as any)?.lowStockItems?.length ?? 0 }}
          </p>
          <p class="text-xs text-muted mt-1">Items with qty &lt; 5</p>
        </div>
      </div>

      <!-- Low stock alert -->
      <div v-if="(stats as any)?.lowStockItems?.length > 0">
        <h2 class="font-display text-base font-bold text-text mb-3">Low Stock</h2>
        <div class="border border-border">
          <div
            v-for="item in (stats as any).lowStockItems"
            :key="item.id"
            class="flex items-center justify-between px-4 py-3 border-b border-border last:border-0 hover:bg-surface"
          >
            <span class="text-sm text-text">{{ item.name }}</span>
            <span class="font-mono text-sm text-red font-medium">{{ item.stockQty }} {{ item.unit }}</span>
          </div>
        </div>
      </div>

      <!-- Quick actions -->
      <div class="mt-8">
        <h2 class="font-display text-base font-bold text-text mb-3">Quick Actions</h2>
        <div class="flex gap-3">
          <NuxtLink to="/purchases" class="border border-border px-4 py-2.5 text-sm text-text hover:bg-surface transition-colors">
            + New Purchase
          </NuxtLink>
          <NuxtLink to="/sales" class="bg-text text-bg px-4 py-2.5 text-sm font-medium hover:bg-red transition-colors">
            + New Sale
          </NuxtLink>
          <NuxtLink to="/reports" class="border border-border px-4 py-2.5 text-sm text-text hover:bg-surface transition-colors">
            VAT Report
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>