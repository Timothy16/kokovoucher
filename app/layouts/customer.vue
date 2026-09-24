<!-- app/layouts/customer.vue -->
<template>
  <div class="flex min-h-screen flex-col bg-bg">
    <header class="hidden h-16 items-center justify-center border-b border-border/80 sm:flex">
      <NuxtLink to="/" class="flex items-center gap-2 font-extrabold tracking-tight text-ink">
        <span class="flex size-8 items-center justify-center rounded-full bg-primary text-white">
          <Icon name="lucide:ticket" class="size-4" />
        </span>
        KokoVoucher
      </NuxtLink>
    </header>
    <main class="flex flex-1 flex-col sm:items-center sm:justify-center sm:px-4 sm:py-10">
      <div class="flex w-full flex-1 flex-col sm:max-w-md sm:flex-none">
        <slot />
      </div>
    </main>
  </div>
</template>
