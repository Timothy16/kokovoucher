<!-- app/pages/admin/infobip-test.vue -->
<!-- Temporary page: proves Infobip email + WhatsApp work before we switch the app over. -->
<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

interface InfobipResult {
  ok: boolean
  httpStatus: number | null
  response: unknown
}

const api = useApi()
const toast = useToast()

const email = reactive({ to: '', subject: 'KokoSend × Infobip test', message: 'Hello! This is a test email from KokoSend sent through Infobip.' })
const whatsapp = reactive({ to: '', message: 'Hello! This is a test WhatsApp message from KokoSend sent through Infobip.' })

const sending = reactive({ email: false, whatsapp: false })
const results = reactive<{ email: InfobipResult | null; whatsapp: InfobipResult | null }>({ email: null, whatsapp: null })

async function send(channel: 'email' | 'whatsapp') {
  if (sending[channel]) return
  sending[channel] = true
  results[channel] = null
  try {
    const body = channel === 'email' ? { ...email } : { ...whatsapp }
    const result = await api<InfobipResult>(`/api/admin/infobip-test/${channel}`, { method: 'POST', body })
    results[channel] = result
    if (result.ok) toast.success('Infobip accepted the message')
    else toast.error('Infobip rejected the message', 'See the response below.')
  } catch (e) {
    toast.error('Could not send', apiErrorMessage(e))
  } finally {
    sending[channel] = false
  }
}

type TemplateResult = InfobipResult & { name: string }
const templates = reactive({ creating: false, checking: false, created: null as TemplateResult[] | null, list: null as InfobipResult | null })

async function createTemplates() {
  if (templates.creating) return
  templates.creating = true
  templates.created = null
  try {
    templates.created = await api<TemplateResult[]>('/api/admin/infobip-test/templates', { method: 'POST' })
    const failed = templates.created.filter((r) => !r.ok).length
    if (failed) toast.error(`${failed} of ${templates.created.length} templates were not submitted`, 'See the responses below.')
    else toast.success('All templates submitted for approval')
  } catch (e) {
    toast.error('Could not submit templates', apiErrorMessage(e))
  } finally {
    templates.creating = false
  }
}

async function checkTemplates() {
  if (templates.checking) return
  templates.checking = true
  try {
    templates.list = await api<InfobipResult>('/api/admin/infobip-test/templates')
  } catch (e) {
    toast.error('Could not load templates', apiErrorMessage(e))
  } finally {
    templates.checking = false
  }
}

// Approved templates, taken from the last status check.
const approvedTemplates = computed(() => {
  const list = (templates.list?.response as { templates?: { name: string; status: string; category: string }[] } | undefined)?.templates ?? []
  return list.filter((t) => t.status === 'APPROVED').map((t) => ({ value: t.name, label: `${t.name} (${t.category.toLowerCase()})` }))
})

const templateSend = reactive({ to: '', name: '', sending: false, result: null as InfobipResult | null })

async function sendTemplate() {
  if (templateSend.sending || !templateSend.name) return
  templateSend.sending = true
  templateSend.result = null
  try {
    templateSend.result = await api<InfobipResult>('/api/admin/infobip-test/send-template', {
      method: 'POST',
      body: { to: templateSend.to, name: templateSend.name }
    })
    if (templateSend.result.ok) toast.success('Infobip accepted the template message')
    else toast.error('Infobip rejected the template message', 'See the response below.')
  } catch (e) {
    toast.error('Could not send', apiErrorMessage(e))
  } finally {
    templateSend.sending = false
  }
}

onMounted(checkTemplates)

const pretty = (value: unknown) => (typeof value === 'string' ? value : JSON.stringify(value, null, 2))
const textareaClass =
  'w-full rounded-control border border-border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15'
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-6">
    <div>
      <h1 class="text-2xl font-extrabold tracking-tight text-ink">Infobip test</h1>
      <p class="text-sm text-muted">Send a test email or WhatsApp through Infobip and see its exact response. Nothing here touches vouchers, orders or the notification log.</p>
    </div>

    <BaseCard class="animate-fade-up space-y-4">
      <div class="flex items-center gap-2">
        <Icon name="lucide:mail" class="size-5 text-primary" />
        <h2 class="font-bold text-ink">Email</h2>
      </div>
      <p class="text-xs text-muted">Sends from <code>NUXT_EMAIL_FROM</code>, the same sender the app uses for every email.</p>
      <form class="space-y-4" @submit.prevent="send('email')">
        <BaseInput v-model="email.to" label="To" type="email" icon="lucide:at-sign" placeholder="you@example.com" required />
        <BaseInput v-model="email.subject" label="Subject" required />
        <label class="block">
          <span class="mb-1.5 block text-sm font-medium text-ink">Message</span>
          <textarea v-model="email.message" rows="4" maxlength="5000" :class="textareaClass" required />
        </label>
        <BaseButton type="submit" :loading="sending.email">Send test email</BaseButton>
      </form>
      <div v-if="results.email" class="space-y-2">
        <BaseBadge :tone="results.email.ok ? 'success' : 'error'">{{ results.email.ok ? 'Accepted' : 'Failed' }} · HTTP {{ results.email.httpStatus ?? '—' }}</BaseBadge>
        <pre class="max-h-80 overflow-auto rounded-control bg-ink/5 p-3 text-xs text-ink">{{ pretty(results.email.response) }}</pre>
      </div>
    </BaseCard>

    <BaseCard class="animate-fade-up space-y-4">
      <div class="flex items-center gap-2">
        <Icon name="lucide:message-circle" class="size-5 text-primary" />
        <h2 class="font-bold text-ink">WhatsApp</h2>
      </div>
      <p class="text-xs text-muted">Free-text only arrives if this number messaged your Infobip WhatsApp sender in the last 24 hours. Send any message to the sender from your phone first.</p>
      <form class="space-y-4" @submit.prevent="send('whatsapp')">
        <BaseInput v-model="whatsapp.to" label="To (international format)" type="tel" icon="lucide:phone" placeholder="2348012345678" required />
        <label class="block">
          <span class="mb-1.5 block text-sm font-medium text-ink">Message</span>
          <textarea v-model="whatsapp.message" rows="4" maxlength="4096" :class="textareaClass" required />
        </label>
        <BaseButton type="submit" :loading="sending.whatsapp">Send test WhatsApp</BaseButton>
      </form>
      <div v-if="results.whatsapp" class="space-y-2">
        <BaseBadge :tone="results.whatsapp.ok ? 'success' : 'error'">{{ results.whatsapp.ok ? 'Accepted' : 'Failed' }} · HTTP {{ results.whatsapp.httpStatus ?? '—' }}</BaseBadge>
        <pre class="max-h-80 overflow-auto rounded-control bg-ink/5 p-3 text-xs text-ink">{{ pretty(results.whatsapp.response) }}</pre>
      </div>
    </BaseCard>

    <BaseCard class="animate-fade-up space-y-4">
      <div class="flex items-center gap-2">
        <Icon name="lucide:file-text" class="size-5 text-primary" />
        <h2 class="font-bold text-ink">WhatsApp templates</h2>
      </div>
      <p class="text-xs text-muted">
        Submits the 7 KokoSend templates (Utility, English) to Meta for approval. Pressing it again is harmless: templates that already exist just come back as an error.
        Approval takes minutes to 24 hours. Use "Check status" to see where they are.
      </p>
      <div class="flex flex-wrap gap-3">
        <BaseButton :loading="templates.creating" @click="createTemplates">Create WhatsApp templates</BaseButton>
        <BaseButton variant="secondary" :loading="templates.checking" @click="checkTemplates">Check status</BaseButton>
      </div>
      <ul v-if="templates.created" class="space-y-3">
        <li v-for="r in templates.created" :key="r.name" class="space-y-1">
          <div class="flex flex-wrap items-center gap-2">
            <code class="text-sm font-semibold text-ink">{{ r.name }}</code>
            <BaseBadge :tone="r.ok ? 'success' : 'error'">{{ r.ok ? 'Submitted' : 'Failed' }} · HTTP {{ r.httpStatus ?? '—' }}</BaseBadge>
          </div>
          <pre class="max-h-40 overflow-auto rounded-control bg-ink/5 p-3 text-xs text-ink">{{ pretty(r.response) }}</pre>
        </li>
      </ul>
      <div v-if="templates.list" class="space-y-2">
        <BaseBadge :tone="templates.list.ok ? 'success' : 'error'">Status check · HTTP {{ templates.list.httpStatus ?? '—' }}</BaseBadge>
        <pre class="max-h-96 overflow-auto rounded-control bg-ink/5 p-3 text-xs text-ink">{{ pretty(templates.list.response) }}</pre>
      </div>
    </BaseCard>

    <BaseCard class="animate-fade-up space-y-4">
      <div class="flex items-center gap-2">
        <Icon name="lucide:send" class="size-5 text-primary" />
        <h2 class="font-bold text-ink">Send a template</h2>
      </div>
      <p class="text-xs text-muted">
        Sends an approved template filled with sample values (Ada, KS-7F3K-92QD, Mama's Kitchen…). Unlike free text, this arrives even if the number never messaged us, exactly like a real customer.
        The list shows approved templates from the last status check.
      </p>
      <form class="space-y-4" @submit.prevent="sendTemplate">
        <BaseSelect v-model="templateSend.name" placeholder="Choose an approved template" :options="approvedTemplates" />
        <BaseInput v-model="templateSend.to" label="To (international format)" type="tel" icon="lucide:phone" placeholder="2348012345678" required />
        <BaseButton type="submit" :loading="templateSend.sending" :disabled="!templateSend.name">Send template</BaseButton>
      </form>
      <div v-if="templateSend.result" class="space-y-2">
        <BaseBadge :tone="templateSend.result.ok ? 'success' : 'error'">{{ templateSend.result.ok ? 'Accepted' : 'Failed' }} · HTTP {{ templateSend.result.httpStatus ?? '—' }}</BaseBadge>
        <pre class="max-h-80 overflow-auto rounded-control bg-ink/5 p-3 text-xs text-ink">{{ pretty(templateSend.result.response) }}</pre>
      </div>
    </BaseCard>
  </div>
</template>
