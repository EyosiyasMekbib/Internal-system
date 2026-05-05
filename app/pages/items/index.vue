<script setup lang="ts">
definePageMeta({ layout: 'default' })

const { data: items, refresh } = await useFetch('/api/items')

const columns = [
  { key: 'name',      label: 'Item Name' },
  { key: 'unit',      label: 'Unit',        width: '80px' },
  { key: 'costPrice', label: 'Cost Price',  numeric: true, width: '130px' },
  { key: 'salePrice', label: 'Sale Price',  numeric: true, width: '130px' },
  { key: 'margin',    label: 'Margin',      numeric: true, width: '100px' },
  { key: 'stockQty',  label: 'Stock',       numeric: true, width: '80px' },
]

const rows = computed(() => (items.value ?? []).map((item: any) => ({
  ...item,
  margin: item.salePrice && item.costPrice
    ? (((+item.salePrice - +item.costPrice) / +item.salePrice) * 100).toFixed(1) + '%'
    : '—',
})))

const showForm = ref(false)
const editing = ref<any>(null)
const form = reactive({ name: '', unit: '', costPrice: '', salePrice: '' })

function openNew() {
  editing.value = null
  Object.assign(form, { name: '', unit: '', costPrice: '', salePrice: '' })
  showForm.value = true
}

function openEdit(row: any) {
  editing.value = row
  Object.assign(form, {
    name: row.name,
    unit: row.unit,
    costPrice: row.costPrice,
    salePrice: row.salePrice,
  })
  showForm.value = true
}

async function save() {
  if (editing.value) {
    await $fetch(`/api/items/${editing.value.id}`, { method: 'PUT', body: form })
  } else {
    await $fetch('/api/items', { method: 'POST', body: form })
  }
  showForm.value = false
  refresh()
}

async function remove(row: any) {
  if (!confirm(`Delete "${row.name}"?`)) return
  await $fetch(`/api/items/${row.id}`, { method: 'DELETE' })
  refresh()
}
</script>

<template>
  <div>
    <KPageHeader title="Items" subtitle="Product catalog" action="New Item" @action="openNew" />

    <div class="px-8 py-6">
      <KTable :columns="columns" :rows="rows" @row-click="openEdit">
        <template #cell-stockQty="{ value }">
          <span :class="{ 'text-red font-medium': +value < 5 }">{{ value }}</span>
        </template>
      </KTable>
    </div>

    <!-- Inline form panel -->
    <div
      v-if="showForm"
      class="fixed inset-0 bg-text/20 flex items-start justify-end"
      @click.self="showForm = false"
    >
      <div class="w-96 h-full bg-bg border-l border-border flex flex-col">
        <div class="px-6 py-5 border-b border-border flex items-center justify-between">
          <h2 class="font-display text-lg font-bold">{{ editing ? 'Edit Item' : 'New Item' }}</h2>
          <button class="text-muted hover:text-red" @click="showForm = false">✕</button>
        </div>
        <form class="flex-1 px-6 py-5 space-y-4 overflow-y-auto" @submit.prevent="save">
          <div>
            <label class="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Name</label>
            <input v-model="form.name" required class="w-full bg-surface border border-border px-3 py-2 text-sm outline-none focus:border-text" />
          </div>
          <div>
            <label class="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Unit</label>
            <input v-model="form.unit" required placeholder="Pcs / Roll / Box" class="w-full bg-surface border border-border px-3 py-2 text-sm outline-none focus:border-text" />
          </div>
          <div>
            <label class="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Cost Price (ETB)</label>
            <input v-model="form.costPrice" type="number" step="0.01" min="0" class="w-full bg-surface border border-border px-3 py-2 text-sm font-mono outline-none focus:border-text" />
          </div>
          <div>
            <label class="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Sale Price before VAT (ETB)</label>
            <input v-model="form.salePrice" type="number" step="0.01" min="0" class="w-full bg-surface border border-border px-3 py-2 text-sm font-mono outline-none focus:border-text" />
          </div>
          <div class="pt-4 flex gap-2">
            <button type="submit" class="flex-1 bg-text text-bg py-2.5 text-sm font-medium hover:bg-red transition-colors">Save</button>
            <button v-if="editing" type="button" class="px-4 py-2.5 text-sm text-red border border-red hover:bg-red-light transition-colors" @click="remove(editing); showForm = false">Delete</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>