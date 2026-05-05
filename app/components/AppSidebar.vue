<script setup lang="ts">
const route = useRoute()

const links = [
  { href: '/',          label: 'Dashboard', icon: '▤' },
  { href: '/items',     label: 'Items',      icon: '◫' },
  { href: '/customers', label: 'Customers',  icon: '◎' },
  { href: '/suppliers', label: 'Suppliers',  icon: '◈' },
  { href: '/purchases', label: 'Purchases',  icon: '↓' },
  { href: '/sales',     label: 'Sales',      icon: '↑' },
  { href: '/reports',   label: 'VAT Report', icon: '≡' },
  { href: '/settings',  label: 'Settings',   icon: '⚙' },
]

function isActive(href: string) {
  if (href === '/') return route.path === '/'
  return route.path.startsWith(href)
}
</script>

<template>
  <aside class="w-60 flex-shrink-0 flex flex-col border-r border-border bg-surface">
    <!-- Logo -->
    <div class="px-5 py-6 border-b border-border">
      <img src="~/assets/images/katerina-logo.png" alt="Katerina" class="h-8 w-auto" />
    </div>

    <!-- Nav -->
    <nav class="flex-1 py-4 px-3 space-y-0.5">
      <NuxtLink
        v-for="link in links"
        :key="link.href"
        :to="link.href"
        class="flex items-center gap-3 px-3 py-2 text-sm font-ui text-muted rounded-[2px] hover:bg-surface2 hover:text-text transition-colors relative"
        :class="{ 'bg-surface2 text-text': isActive(link.href) }"
      >
        <!-- Red left accent on active item -->
        <span
          v-if="isActive(link.href)"
          class="absolute left-0 top-1 bottom-1 w-0.5 bg-red rounded-[1px]"
        />
        <span class="text-base leading-none w-4 text-center">{{ link.icon }}</span>
        <span>{{ link.label }}</span>
      </NuxtLink>
    </nav>

    <!-- User / Logout -->
    <div class="px-3 py-4 border-t border-border">
      <button
        class="w-full flex items-center gap-3 px-3 py-2 text-sm text-muted hover:text-red hover:bg-red-light rounded-[2px] transition-colors"
        @click="$fetch('/api/auth/sign-out', { method: 'POST' }).then(() => navigateTo('/login'))"
      >
        <span class="text-base leading-none w-4 text-center">⊗</span>
        <span>Sign out</span>
      </button>
    </div>
  </aside>
</template>