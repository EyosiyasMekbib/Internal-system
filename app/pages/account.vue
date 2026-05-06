<script setup lang="ts">
const current  = ref('')
const next     = ref('')
const confirm  = ref('')
const success  = ref(false)
const error    = ref('')
const loading  = ref(false)

async function changePassword() {
  error.value   = ''
  success.value = false

  if (next.value !== confirm.value) {
    error.value = 'New passwords do not match'
    return
  }
  if (next.value.length < 8) {
    error.value = 'New password must be at least 8 characters'
    return
  }

  loading.value = true
  try {
    await $fetch('/api/auth/change-password', {
      method: 'POST',
      body: {
        currentPassword: current.value,
        newPassword: next.value,
        revokeOtherSessions: false,
      },
    })
    success.value = true
    current.value = ''
    next.value    = ''
    confirm.value = ''
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Incorrect current password.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="p-8 max-w-md">
    <KPageHeader title="Account" subtitle="Manage your login credentials" />

    <div class="bg-surface border border-border p-6 mt-6">
      <h2 class="font-display text-base font-semibold text-text mb-5">Change Password</h2>

      <form class="space-y-4" @submit.prevent="changePassword">
        <div>
          <label class="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">
            Current Password
          </label>
          <input
            v-model="current"
            type="password"
            required
            autocomplete="current-password"
            class="w-full bg-bg border border-border px-3 py-2 text-sm text-text outline-none focus:border-text transition-colors"
          />
        </div>

        <div>
          <label class="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">
            New Password
          </label>
          <input
            v-model="next"
            type="password"
            required
            autocomplete="new-password"
            class="w-full bg-bg border border-border px-3 py-2 text-sm text-text outline-none focus:border-text transition-colors"
          />
        </div>

        <div>
          <label class="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">
            Confirm New Password
          </label>
          <input
            v-model="confirm"
            type="password"
            required
            autocomplete="new-password"
            class="w-full bg-bg border border-border px-3 py-2 text-sm text-text outline-none focus:border-text transition-colors"
          />
        </div>

        <p v-if="error"   class="text-xs text-red">{{ error }}</p>
        <p v-if="success" class="text-xs text-green-600">Password changed successfully.</p>

        <button
          type="submit"
          :disabled="loading"
          class="bg-text text-bg px-5 py-2 text-sm font-medium hover:bg-red transition-colors disabled:opacity-50"
        >
          {{ loading ? 'Saving…' : 'Update password' }}
        </button>
      </form>
    </div>
  </div>
</template>
