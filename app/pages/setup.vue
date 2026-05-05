<script setup lang="ts">
definePageMeta({ layout: false })

// Redirect away if users already exist
const { data: status } = await useFetch('/api/setup/status')
if ((status.value as any)?.hasUsers) {
  await navigateTo('/login')
}

const name = ref('')
const email = ref('')
const password = ref('')
const confirm = ref('')
const error = ref('')
const loading = ref(false)

async function setup() {
  if (password.value !== confirm.value) {
    error.value = 'Passwords do not match'
    return
  }
  if (password.value.length < 8) {
    error.value = 'Password must be at least 8 characters'
    return
  }
  loading.value = true
  error.value = ''
  try {
    await $fetch('/api/auth/sign-up/email', {
      method: 'POST',
      body: { name: name.value, email: email.value, password: password.value },
    })
    await $fetch('/api/auth/sign-in/email', {
      method: 'POST',
      body: { email: email.value, password: password.value },
    })
    await navigateTo('/')
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Setup failed. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-bg flex items-center justify-center px-4">
    <div class="w-full max-w-sm">
      <div class="mb-8 text-center">
        <img
          src="~/assets/images/logo.png"
          alt="Katerina Barcode Solutions"
          class="h-10 w-auto mx-auto"
        />
      </div>

      <div class="bg-surface border border-border p-8">
        <h1 class="font-display text-xl font-bold text-text mb-1">Create admin account</h1>
        <p class="text-xs text-muted mb-6">First-time setup — this account will be the administrator.</p>

        <form class="space-y-4" @submit.prevent="setup">
          <div>
            <label class="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">
              Full Name
            </label>
            <input
              v-model="name"
              type="text"
              required
              autocomplete="name"
              class="w-full bg-bg border border-border px-3 py-2 text-sm text-text outline-none focus:border-text transition-colors"
            />
          </div>

          <div>
            <label class="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">
              Email
            </label>
            <input
              v-model="email"
              type="email"
              required
              autocomplete="email"
              class="w-full bg-bg border border-border px-3 py-2 text-sm text-text outline-none focus:border-text transition-colors"
            />
          </div>

          <div>
            <label class="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">
              Password
            </label>
            <input
              v-model="password"
              type="password"
              required
              autocomplete="new-password"
              class="w-full bg-bg border border-border px-3 py-2 text-sm text-text outline-none focus:border-text transition-colors"
            />
          </div>

          <div>
            <label class="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">
              Confirm Password
            </label>
            <input
              v-model="confirm"
              type="password"
              required
              autocomplete="new-password"
              class="w-full bg-bg border border-border px-3 py-2 text-sm text-text outline-none focus:border-text transition-colors"
            />
          </div>

          <p v-if="error" class="text-xs text-red">{{ error }}</p>

          <button
            type="submit"
            :disabled="loading"
            class="w-full bg-text text-bg py-2.5 text-sm font-medium hover:bg-red transition-colors disabled:opacity-50 mt-2"
          >
            {{ loading ? 'Creating account…' : 'Create account & sign in' }}
          </button>
        </form>
      </div>

      <p class="mt-4 text-center text-xs text-muted">
        Katerina Internal System
      </p>
    </div>
  </div>
</template>
