<script setup lang="ts">
// Deterministic pattern for the mock QR so it renders identically every time.
const QR_PATTERN = [
  1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 0, 0, 1, 0, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 0, 0,
  1, 0, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0,
  0, 1, 0, 1, 1, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 1,
  1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 0, 1, 0, 1, 1, 1, 0, 1, 0, 0, 1, 1
]
</script>

<template>
  <div class="relative mx-auto w-full max-w-[400px] animate-fade-up">
    <div class="overflow-hidden rounded-card border border-border bg-surface shadow-lift">
      <!-- Voucher header -->
      <div class="flex items-start justify-between gap-4 bg-primary px-6 py-5">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">Reward voucher</p>
          <p class="mt-1 text-[26px] font-extrabold leading-tight text-white">£10 off your meal</p>
        </div>
        <span class="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/15 text-white">
          <Icon name="lucide:utensils-crossed" class="size-5" />
        </span>
      </div>

      <!-- Perforation -->
      <div class="relative h-6 bg-primary">
        <div class="absolute inset-x-0 bottom-0 h-6 rounded-t-card bg-surface" />
        <div class="absolute -left-3 bottom-3 h-6 w-6 rounded-full bg-bg" />
        <div class="absolute -right-3 bottom-3 h-6 w-6 rounded-full bg-bg" />
      </div>

      <div class="px-6 pb-6 pt-1">
        <div class="flex items-center gap-5">
          <div
            class="grid h-[104px] w-[104px] shrink-0 grid-cols-10 gap-[2px] rounded-control border border-border bg-white p-2"
            role="img"
            aria-label="Example voucher QR code"
          >
            <span
              v-for="(filled, i) in QR_PATTERN"
              :key="i"
              class="aspect-square rounded-[1px]"
              :class="filled ? 'bg-ink' : 'bg-transparent'"
            />
          </div>
          <div class="min-w-0">
            <p class="text-xs font-medium text-muted">Single-use code</p>
            <p class="mt-1 font-mono text-lg font-bold tracking-[0.18em] text-ink">KV-4P8Q</p>
            <p class="mt-3 text-xs leading-relaxed text-muted">
              Valid at Rosa's Kitchen
              <br />
              until Sun, 8:00 pm
            </p>
          </div>
        </div>

        <div class="mt-5 flex items-center gap-2.5 rounded-control bg-primary-soft px-4 py-3">
          <Icon name="lucide:check-circle-2" class="size-4.5 shrink-0 text-success" />
          <p class="text-[13px] font-semibold text-primary-hover">Redeemed — confirmed instantly</p>
        </div>
      </div>
    </div>

    <!-- Floating chip -->
    <div class="absolute -bottom-5 -left-3 hidden items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 shadow-soft sm:flex">
      <span class="h-2 w-2 rounded-full bg-success" />
      <span class="text-xs font-semibold text-ink">1,240 vouchers redeemed this week</span>
    </div>
  </div>
</template>
