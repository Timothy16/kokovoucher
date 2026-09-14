<script setup lang="ts">
definePageMeta({ layout: 'default' })

const steps = [
  { icon: 'lucide:gift', title: 'Customer earns a reward', desc: 'Our system spots loyal customers and issues them a fixed-value voucher automatically.' },
  { icon: 'lucide:smartphone', title: 'Activates it on their phone', desc: 'One tap and a quick code — no app, no account, no login required.' },
  { icon: 'lucide:check-check', title: 'Redeems it at your restaurant', desc: 'Shown at the counter, verified in seconds, done.' }
]

const benefits = [
  { icon: 'lucide:footprints', title: 'New footfall', desc: "Reach a fintech's loyal customer base and bring new faces to your tables." },
  { icon: 'lucide:coins', title: 'Zero setup cost', desc: 'No hardware, no contracts, no upfront fees — just register and go.' },
  { icon: 'lucide:timer', title: 'Redeem in seconds', desc: 'Scan or type a code from any phone or tablet at the counter.' },
  { icon: 'lucide:shield-check', title: 'Single-use & verified', desc: 'Every voucher is tied to your restaurant and can only be redeemed once.' }
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
            KokoVoucher turns rewards into real footfall for your restaurant.
          </p>
          <div class="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <BaseButton size="lg" @click="navigateTo('/restaurant/register')">
              Become a partner restaurant
              <Icon name="lucide:arrow-right" class="size-4" />
            </BaseButton>
            <BaseButton size="lg" variant="secondary" @click="navigateTo('/restaurant/login')">Restaurant login</BaseButton>
          </div>
        </div>

        <div class="animate-pop-in [animation-delay:150ms]">
          <div class="mx-auto max-w-xs rounded-card border border-border bg-surface p-6 shadow-lift">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold uppercase tracking-wide text-muted">Voucher</span>
              <BaseBadge tone="primary" pulse>Active</BaseBadge>
            </div>
            <p class="mt-3 text-3xl font-extrabold text-ink">₦5,000</p>
            <p class="text-sm text-muted">Mama Put Kitchen</p>
            <div class="mt-5 flex items-center justify-center rounded-control border border-border bg-white p-4">
              <div class="grid grid-cols-5 gap-1">
                <span v-for="i in 25" :key="i" class="size-3 rounded-[2px]" :class="Math.random() > 0.42 ? 'bg-ink' : 'bg-transparent'" />
              </div>
            </div>
            <p class="mt-4 text-center font-mono text-lg font-bold tracking-[0.3em] text-ink">AF7K 9QX2</p>
            <p class="mt-1 text-center text-xs text-muted">Expires today at 23:59</p>
          </div>
        </div>
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
          <BaseButton size="lg" @click="navigateTo('/restaurant/register')">
            Register your restaurant
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
          <p class="mt-2 text-primary-soft/90">Join the KokoVoucher network in minutes.</p>
        </div>
        <BaseButton size="lg" variant="secondary" class="!bg-white !text-primary-hover" @click="navigateTo('/restaurant/register')">
          Register your restaurant
        </BaseButton>
      </div>
    </section>
  </div>
</template>
