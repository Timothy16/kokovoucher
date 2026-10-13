<!-- app/pages/faq.vue -->
<script setup lang="ts">
definePageMeta({ layout: 'default' })

const faqs = [
  { q: 'What is a secret key?', a: 'Your secret key is your KokoSend username. We use it alongside your voucher code as a second check, so only you can use your voucher.' },
  { q: 'How long is my voucher valid?', a: 'Every voucher is valid for 7 days from the day it was issued, expiring at the end of day 7.' },
  { q: 'Can I use my voucher at any restaurant?', a: "Yes — any partner restaurant that shares your voucher's currency. You'll see a clear message if a restaurant doesn't match." },
  { q: "What if my order isn't delivered?", a: "Track your order with your reference and secret key. If it's marked delivered but never arrived, use the report link to flag it." },
  { q: 'What happens to leftover voucher value on a walk-in?', a: "If your bill is less than your voucher, the restaurant is credited what you actually spent — any unused balance is forfeited, so spend up to your voucher's value." },
  { q: 'Can I get more than one voucher at a time?', a: 'You can hold one active voucher at a time. Once it is redeemed or expires, you can receive another.' }
]
const openIndex = ref<number | null>(0)
</script>

<template>
  <div class="mx-auto max-w-2xl px-4 py-14 sm:px-6">
    <h1 class="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Frequently asked questions</h1>
    <div class="mt-8 divide-y divide-border rounded-card border border-border bg-surface shadow-soft">
      <div v-for="(f, i) in faqs" :key="f.q">
        <button class="flex w-full items-center justify-between gap-4 px-5 py-4 text-left" @click="openIndex = openIndex === i ? null : i">
          <span class="font-semibold text-ink">{{ f.q }}</span>
          <Icon :name="openIndex === i ? 'lucide:minus' : 'lucide:plus'" class="size-4 shrink-0 text-muted" />
        </button>
        <p v-if="openIndex === i" class="px-5 pb-4 text-sm leading-relaxed text-muted">{{ f.a }}</p>
      </div>
    </div>
  </div>
</template>
