<script setup lang="ts">
definePageMeta({ layout: 'default' })

const { data: suppliers, refresh } = await useFetch('/api/suppliers')

const columns = [
  { key: 'name',     label: 'Supplier Name' },
  { key: 'tin',      label: 'TIN',         width: '130px' },
  { key: 'vatRegNo', label: 'VAT Reg No',  width: '150px' },
  { key: 'phone',    label: 'Phone',        width: '130px' },
  { key: 'address',  label: 'Address' },
]

const showForm = ref(false)
const editing = ref<any>(null)
const form = reactive({ name: '', tin: '', vatRegNo: '', phone: '', address: '' })

function openNew() {
  editing.value = null
  Object.assign(form, { name: '', tin: '', vatRegNo: '', phone: '', address: '' })
  showForm.value = true
}

function openEdit(row: any) {
  editing.value = row
  Object.assign(form, { name: row.name, tin: row.tin ?? '', vatRegNo: row.vatRegNo ?? '', phone: row.phone ?? '', address: row.address ?? '' })
  showForm.value = true
}

async function save() {
  if (editing.value) {
    await $fetch(`/api/suppliers/${editing.value.id}`, { method: 'PUT', body: form })
  } else {
    await $fetch('/api/suppliers', { method: 'POST', body: form })
  }
  showForm.value = false
  refresh()
}

async function remove(row: any) {
  if (!confirm(`Delete "${row.name}"?`)) return
  await $fetch(`/api/suppliers/${row.id}`, { method: 'DELETE' })
  refresh()
}
</script>

<template>
  <div>
    <KPageHeader title="Suppliers" action="New Supplier" @action="openNew" />
    <div class="px-8 py-6">
      <KTable :columns="columns" :rows="suppliers ?? []" @row-click="openEdit">
        <template #cell-tin="{ value }">
          <span class="font-mono text-sm">{{ value ?? '—' }}</span>
        </template>
      </KTable>
    </div>

    <div v-if="showForm" class="fixed inset-0 bg-text/20 flex items-start justify-end" @click.self="showForm = false">
      <div class="w-96 h-full bg-bg border-l border-border flex flex-col">
        <div class="px-6 py-5 border-b border-border flex items-center justify-between">
          <h2 class="font-display text-lg font-bold">{{ editing ? 'Edit Supplier' : 'New Supplier' }}</h2>
          <button class="text-muted hover:text-red" @click="showForm = false">✕</button>
        </div>
        <form class="flex-1 px-6 py-5 space-y-4 overflow-y-auto" @submit.prevent="save">
          <div v-for="field in [
            { key: 'name', label: 'Name', required: true },
            { key: 'tin', label: 'TIN' },
            { key: 'vatRegNo', label: 'VAT Reg No' },
            { key: 'phone', label: 'Phone' },
            { key: 'address', label: 'Address' },
          ]" :key="field.key">
            <label class="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">{{ field.label }}</label>
            <input v-model="(form as any)[field.key]" :required="field.required" class="w-full bg-surface border border-border px-3 py-2 text-sm outline-none focus:border-text" />
          </div>
          <div class="pt-4 flex gap-2">
            <button type="submit" class="flex-1 bg-text text-bg py-2.5 text-sm font-medium hover:bg-red transition-colors">Save</button>
            <button v-if="editing" type="button" class="px-4 py-2.5 text-sm text-red border border-red hover:bg-red-light" @click="remove(editing); showForm = false">Delete</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>