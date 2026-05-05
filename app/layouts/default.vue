<template>
  <div class="flex h-screen overflow-hidden bg-bg print:h-auto print:overflow-visible print:bg-white">
    <AppSidebar />
    <main class="flex-1 overflow-y-auto print:overflow-visible">
      <slot />
    </main>
  </div>
</template>
