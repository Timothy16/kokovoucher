<template>
  <div class="flex min-h-screen flex-col bg-bg">
    <header class="flex h-16 items-center justify-center border-b border-border/80">
      <NuxtLink to="/" class="flex items-center gap-2 font-extrabold tracking-tight text-ink">
        <span class="flex size-8 items-center justify-center rounded-full bg-primary text-white">
          <Icon name="lucide:ticket" class="size-4" />
        </span>
        KokoVoucher
      </NuxtLink>
    </header>
    <main class="flex flex-1 items-center justify-center px-4 py-10">
      <div class="w-full max-w-md">
        <slot />
      </div>
    </main>
  </div>
</template>
