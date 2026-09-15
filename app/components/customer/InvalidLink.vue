<script setup lang="ts">
withDefaults(defineProps<{ reason?: string }>(), { reason: "This link is invalid or has expired." })
</script>

<template>
  <!-- Mobile: full-bleed app screen -->
  <div class="flex flex-1 flex-col px-6 pb-8 pt-12 sm:hidden">
    <div class="flex-1">
      <span class="grid size-14 place-items-center rounded-2xl bg-error-soft text-error">
        <Icon name="lucide:link-2-off" class="size-6" />
      </span>
      <h1 class="mt-6 text-[28px] font-extrabold leading-[1.14] tracking-[-0.03em] text-ink">This link isn't working</h1>
      <p class="mt-4 text-[15px] leading-relaxed text-muted">{{ reason }}</p>

      <ul class="mt-7 space-y-3">
        <li class="flex items-start gap-3 rounded-2xl border border-border bg-surface p-4 shadow-soft">
          <Icon name="lucide:smartphone" class="mt-0.5 size-[18px] shrink-0 text-primary" />
          <p class="text-sm leading-relaxed text-ink">Open the reward again from your bank app to get a fresh link.</p>
        </li>
        <li class="flex items-start gap-3 rounded-2xl border border-border bg-surface p-4 shadow-soft">
          <Icon name="lucide:circle-question-mark" class="mt-0.5 size-[18px] shrink-0 text-primary" />
          <p class="text-sm leading-relaxed text-ink">Already at the restaurant? Show the staff this screen and they can check with us.</p>
        </li>
      </ul>
    </div>

    <div class="pt-8">
      <BaseButton size="lg" block @click="navigateTo('/')">Back to my rewards</BaseButton>
      <p class="mt-3 text-center text-xs text-muted">Still stuck? Email hello@kokovoucher.com</p>
    </div>
  </div>

  <!-- Desktop: current card layout -->
  <div class="hidden animate-fade-up text-center sm:block">
    <div class="mx-auto flex size-16 items-center justify-center rounded-full bg-error-soft">
      <Icon name="lucide:link-2-off" class="size-7 text-error" />
    </div>
    <h1 class="mt-5 text-xl font-bold text-ink">This link doesn't work anymore</h1>
    <p class="mt-2 text-sm text-muted">{{ reason }}</p>
    <p class="mt-6 text-sm text-muted">If you think this is a mistake, reach out to the restaurant that sent you this reward.</p>
    <BaseButton class="mt-6" variant="secondary" @click="navigateTo('/')">Go to KokoVoucher</BaseButton>
  </div>
</template>
