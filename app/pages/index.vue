<!-- app/pages/index.vue -->
<script setup lang="ts">
definePageMeta({ layout: 'default' })

const steps = [
  { icon: 'lucide:gift', title: 'Customer earns a reward', desc: 'A voucher code and secret key are sent by email and WhatsApp — no app, no account, no login required.' },
  { icon: 'lucide:utensils-crossed', title: 'Orders delivery, or walks in', desc: 'They pick a combo from the partner menu and check out with their code, or redeem it in person at any partner restaurant.' },
  { icon: 'lucide:check-check', title: 'Redeems it at your restaurant', desc: 'Verified in seconds — for delivery, you fulfil and mark it delivered; for walk-ins, you confirm at the counter.' }
]

const benefits = [
  { icon: 'lucide:footprints', title: 'New footfall', desc: "Reach a fintech's loyal customer base and bring new faces to your tables." },
  { icon: 'lucide:coins', title: 'Zero setup cost', desc: 'No hardware, no contracts, no upfront fees — just accept your invite and go.' },
  { icon: 'lucide:timer', title: 'Redeem in seconds', desc: 'Scan or type a code from any phone or tablet at the counter.' },
  { icon: 'lucide:shield-check', title: 'Single-use & verified', desc: 'Every voucher is checked against a code and secret key, and can only be redeemed once.' }
]

const trust = [
  { icon: 'lucide:lock', label: 'Single-use codes' },
  { icon: 'lucide:user-check', label: 'Verified customers' },
  { icon: 'lucide:zap', label: 'Instant confirmation' }
]
</script>

<template>
  <div>
    <!-- Hero -->
    <section class="relative overflow-hidden">
      <div class="absolute inset-0 -z-10 bg-gradient-to-b from-primary-soft/70 via-bg to-bg" />
      <div class="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2 lg:py-28">
        <div class="animate-fade-up text-center lg:text-left">
          <span class="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary-hover">
            <Icon name="lucide:sparkles" class="size-3.5" />
            Now inviting restaurants to join
          </span>
          <h1 class="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight text-ink sm:text-5xl lg:text-6xl">
            Reward loyal customers.
            <span class="text-primary">Fill your tables.</span>
          </h1>
          <p class="mx-auto mt-5 max-w-md text-lg text-muted lg:mx-0">
            KokoSend turns rewards into real footfall for your restaurant.
          </p>
          <div class="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <BaseButton size="lg" @click="navigateTo('/contact')">
              Become a partner restaurant
              <Icon name="lucide:arrow-right" class="size-4" />
            </BaseButton>
            <BaseButton size="lg" variant="secondary" @click="navigateTo('/restaurant/login')">Restaurant login</BaseButton>
          </div>
        </div>

        <VoucherCard class="[animation-delay:150ms]" />
      </div>
    </section>

    <!-- How it works -->
    <section id="how-it-works" class="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div v-reveal class="mx-auto max-w-xl text-center">
        <h2 class="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">How it works</h2>
        <p class="mt-3 text-muted">One glance explains the whole flow — for your customers and your counter staff.</p>
      </div>
      <div class="mt-14 grid gap-8 sm:grid-cols-3">
        <div v-for="(step, i) in steps" :key="step.title" v-reveal class="relative text-center" :style="{ transitionDelay: `${i * 100}ms` }">
          <div class="mx-auto flex size-16 items-center justify-center rounded-full bg-primary-soft text-primary">
            <Icon :name="step.icon" class="size-7" />
          </div>
          <p class="mt-5 font-bold text-ink">{{ step.title }}</p>
          <p class="mt-2 text-sm text-muted">{{ step.desc }}</p>
        </div>
      </div>
    </section>

    <!-- For restaurants -->
    <section id="for-restaurants" class="bg-surface py-20">
      <div class="mx-auto max-w-6xl px-4 sm:px-6">
        <div v-reveal class="mx-auto max-w-xl text-center">
          <h2 class="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Built for restaurants</h2>
          <p class="mt-3 text-muted">Everything you need to say yes, nothing you need to set up.</p>
        </div>
        <div class="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <BaseCard v-for="(b, i) in benefits" :key="b.title" v-reveal hover :style="{ transitionDelay: `${i * 80}ms` }">
            <div class="flex size-11 items-center justify-center rounded-full bg-primary-soft text-primary">
              <Icon :name="b.icon" class="size-5" />
            </div>
            <p class="mt-4 font-bold text-ink">{{ b.title }}</p>
            <p class="mt-1.5 text-sm text-muted">{{ b.desc }}</p>
          </BaseCard>
        </div>
        <div v-reveal class="mt-12 text-center">
          <BaseButton size="lg" @click="navigateTo('/contact')">
            Apply to partner
            <Icon name="lucide:arrow-right" class="size-4" />
          </BaseButton>
        </div>
      </div>
    </section>

    <!-- Trust strip -->
    <section v-reveal class="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <div class="flex flex-col items-center justify-center gap-6 rounded-card border border-border bg-primary-soft/50 p-6 sm:flex-row sm:gap-12">
        <div v-for="t in trust" :key="t.label" class="flex items-center gap-2 text-sm font-semibold text-primary-hover">
          <Icon :name="t.icon" class="size-4.5" />
          {{ t.label }}
        </div>
      </div>
    </section>

    <!-- Final CTA -->
    <section v-reveal class="bg-primary py-16 text-white">
      <div class="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 text-center sm:flex-row sm:px-6 sm:text-left">
        <div>
          <h2 class="text-2xl font-extrabold tracking-tight sm:text-3xl">Ready to partner with us?</h2>
          <p class="mt-2 text-primary-soft/90">Join the KokoSend network in minutes.</p>
        </div>
        <BaseButton size="lg" variant="secondary" class="!bg-white !text-primary-hover" @click="navigateTo('/contact')">
          Apply to partner
        </BaseButton>
      </div>
    </section>
  </div>
</template>
