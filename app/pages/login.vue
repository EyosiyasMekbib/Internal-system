<script setup lang="ts">
definePageMeta({ layout: false })

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function login() {
  loading.value = true
  error.value = ''
  try {
    await $fetch('/api/auth/sign-in/email', {
      method: 'POST',
      body: { email: email.value, password: password.value },
    })
    await navigateTo('/')
  } catch {
    error.value = 'Invalid email or password'
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
          src="~/assets/images/katerina-logo.png"
          alt="Katerina Barcode Solutions"
          class="h-10 w-auto mx-auto"
        />
      </div>

      <!-- Form card -->
      <div class="bg-surface border border-border p-8">
        <h1 class="font-display text-xl font-bold text-text mb-6">Sign in</h1>

        <form class="space-y-4" @submit.prevent="login">
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
              autocomplete="current-password"
              class="w-full bg-bg border border-border px-3 py-2 text-sm text-text outline-none focus:border-text transition-colors"
            />
          </div>

          <p v-if="error" class="text-xs text-red">{{ error }}</p>

          <button
            type="submit"
            :disabled="loading"
            class="w-full bg-text text-bg py-2.5 text-sm font-medium hover:bg-red transition-colors disabled:opacity-50 mt-2"
          >
            {{ loading ? 'Signing in…' : 'Sign in' }}
          </button>
        </form>
      </div>

      <p class="mt-4 text-center text-xs text-muted">
        Katerina Internal System
      </p>
    </div>
  </div>
</template>