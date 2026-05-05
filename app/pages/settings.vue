<script setup lang="ts">
definePageMeta({ layout: 'default' })

const { data: s, refresh } = await useFetch('/api/settings')

const form = reactive({
  vat_rate: '',
  mrc_code: '',
})

watchEffect(() => {
  if (s.value) {
    form.vat_rate = String(Number((s.value as any).vat_rate) * 100)
    form.mrc_code = (s.value as any).mrc_code ?? ''
  }
})

const saving = ref(false)

async function save() {
  saving.value = true
  await $fetch('/api/settings', {
    method: 'PATCH',
    body: {
      vat_rate: String(Number(form.vat_rate) / 100),
      mrc_code: form.mrc_code,
    },
  })
  await refresh()
  saving.value = false
}
</script>

<template>
  <div>
    <KPageHeader title="Settings" subtitle="Global system configuration" />
    <div class="px-8 py-8 max-w-md">
      <form class="space-y-6" @submit.prevent="save">
        <div>
          <label class="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">
            VAT Rate (%)
          </label>
          <input
            v-model="form.vat_rate"
            type="number"
            step="0.01"
            min="0"
            max="100"
            required
            class="w-full bg-surface border border-border px-3 py-2 text-sm font-mono outline-none focus:border-text"
          />
          <p class="text-xs text-muted mt-1">Enter as percentage, e.g. 15 for 15%</p>
        </div>
        <div>
          <label class="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">
            MRC Code
          </label>
          <input
            v-model="form.mrc_code"
            class="w-full bg-surface border border-border px-3 py-2 text-sm font-mono outline-none focus:border-text"
            placeholder="Machine Registration Code"
          />
          <p class="text-xs text-muted mt-1">Printed on sales invoices and VAT summary</p>
        </div>
        <button
          type="submit"
          :disabled="saving"
          class="bg-text text-bg px-6 py-2.5 text-sm font-medium hover:bg-red transition-colors disabled:opacity-50"
        >
          {{ saving ? 'Saving…' : 'Save Settings' }}
        </button>
      </form>
    </div>
  </div>
</template>
