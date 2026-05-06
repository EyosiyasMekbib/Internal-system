<script setup lang="ts">
definePageMeta({ layout: false })

const name     = ref('')
const email    = ref('')
const password = ref('')
const confirm  = ref('')
const error    = ref('')
const loading  = ref(false)

// If users already exist, setup is done — go to login
onMounted(async () => {
  const { hasUsers } = await $fetch<{ hasUsers: boolean }>('/api/setup/status')
  if (hasUsers) await navigateTo('/login')
})

async function setup() {
  error.value = ''
  if (password.value !== confirm.value) {
    error.value = 'Passwords do not match'
    return
  }
  if (password.value.length < 8) {
    error.value = 'Password must be at least 8 characters'
    return
  }

  loading.value = true
  try {
    await $fetch('/api/auth/sign-up/email', {
      method: 'POST',
      body: { name: name.value, email: email.value, password: password.value },
    })
    // Sign in immediately after signup
    await $fetch('/api/auth/sign-in/email', {
      method: 'POST',
      body: { email: email.value, password: password.value },
    })
    await navigateTo('/')
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Could not create account. Try again.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-bg flex items-center justify-center px-4">
    <div class="w-full max-w-sm">
      <!-- Logo -->
      <div class="mb-8 text-center">
        <img
          src="~/assets/images/logo.png"
          alt="Katerina Barcode Solutions"
          class="h-10 w-auto mx-auto"
        />
      </div>

      <!-- Form card -->
      <div class="bg-surface border border-border p-8">
        <h1 class="font-display text-xl font-bold text-text mb-1">Create your account</h1>
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
            {{ loading ? 'Creating account…' : 'Create account' }}
          </button>
        </form>
      </div>

      <p class="mt-4 text-center text-xs text-muted">
        Katerina Internal System
      </p>
    </div>
  </div>
</template>
