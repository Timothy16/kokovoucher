<!-- app/pages/how-it-works.vue -->
<script setup lang="ts">
definePageMeta({ layout: 'default' })

const customerSteps = [
  { icon: 'lucide:mail', title: 'Get your voucher', desc: 'A voucher code arrives by email and WhatsApp, with a link to browse partner menus. Your secret key is your KokoSend username.' },
  { icon: 'lucide:utensils-crossed', title: 'Pick a combo, or walk in', desc: 'Order delivery online with your code + secret key, or simply walk into any partner restaurant and redeem it in person.' },
  { icon: 'lucide:truck', title: 'Get your food', desc: 'Delivery orders are tracked from placed to delivered. Walk-ins are confirmed instantly at the counter.' }
]

const restaurantSteps = [
  { icon: 'lucide:store', title: 'Join the network', desc: 'Accept your admin invite, set a password, and your menu combos go live.' },
  { icon: 'lucide:bell', title: 'Receive orders', desc: 'Delivery orders land in your inbox; walk-ins are verified right at your counter.' },
  { icon: 'lucide:wallet', title: 'Get paid', desc: 'Completed orders credit your wallet. Admin processes payouts in batches.' }
]
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-14 sm:px-6">
    <div class="text-center">
      <h1 class="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">How KokoVoucher works</h1>
      <p class="mt-3 text-muted">One reward system, two simple journeys.</p>
    </div>

    <div class="mt-12">
      <h2 class="text-lg font-bold text-ink">For customers</h2>
      <div class="mt-6 grid gap-6 sm:grid-cols-3">
        <div v-for="s in customerSteps" :key="s.title" class="text-center">
          <div class="mx-auto flex size-14 items-center justify-center rounded-full bg-primary-soft text-primary">
            <Icon :name="s.icon" class="size-6" />
          </div>
          <p class="mt-4 font-bold text-ink">{{ s.title }}</p>
          <p class="mt-1.5 text-sm text-muted">{{ s.desc }}</p>
        </div>
      </div>
    </div>

    <div class="mt-16">
      <h2 class="text-lg font-bold text-ink">For restaurants</h2>
      <div class="mt-6 grid gap-6 sm:grid-cols-3">
        <div v-for="s in restaurantSteps" :key="s.title" class="text-center">
          <div class="mx-auto flex size-14 items-center justify-center rounded-full bg-primary-soft text-primary">
            <Icon :name="s.icon" class="size-6" />
          </div>
          <p class="mt-4 font-bold text-ink">{{ s.title }}</p>
          <p class="mt-1.5 text-sm text-muted">{{ s.desc }}</p>
        </div>
      </div>
      <div class="mt-10 text-center">
        <BaseButton size="lg" @click="navigateTo('/restaurant/login')">Restaurant login</BaseButton>
      </div>
    </div>
  </div>
</template>
