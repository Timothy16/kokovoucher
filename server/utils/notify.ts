// server/utils/notify.ts
// Every outbound message (email and WhatsApp, both via Infobip) is written to `notifications`
// first (the admin Notification Log), then sent, then its row is updated with the outcome. A send
// failure never fails the business action that triggered it — admin sees it as 'failed' in the log.
import type { Database } from '#shared/types/database.types'
import type { Currency } from '#shared/types/models'
import type { EmailTemplate } from './email-templates'
import type { WhatsAppMessage } from './whatsapp-templates'

type RecipientType = Database['public']['Enums']['notification_recipient_type']

interface Target {
  recipientType: RecipientType
  to: string
  /** Template key for the log, e.g. 'voucher_issued'. */
  template: string
  related?: { type: string; id: string }
}

/** Customers and restaurants can reply to any email and reach the KokoSend admin inbox. */
async function replyToAddress(recipientType: RecipientType) {
  if (recipientType === 'admin') return null
  const { data } = await useServiceClient().from('settings').select('admin_email').maybeSingle()
  return data?.admin_email ?? null
}

export async function notifyEmail(target: Target, email: EmailTemplate): Promise<boolean> {
  const db = useServiceClient()
  const { data: row, error } = await db
    .from('notifications')
    .insert({
      channel: 'email',
      recipient_type: target.recipientType,
      recipient: target.to,
      template: target.template,
      subject: email.subject,
      summary: email.summary,
      related_type: target.related?.type ?? null,
      related_id: target.related?.id ?? null
    })
    .select('id')
    .single()
  if (error) console.error('[notify] could not log email', target.template, error.message)

  const result = await sendEmail(target.to, email.subject, email.content, await replyToAddress(target.recipientType))
  if (!result.ok) console.error('[notify] email failed', target.template, result.error)

  if (row) {
    await db
      .from('notifications')
      .update(
        result.ok
          ? { status: 'sent', provider_message_id: result.providerMessageId, sent_at: new Date().toISOString() }
          : { status: 'failed', error: result.error }
      )
      .eq('id', row.id)
  }
  return result.ok
}

/**
 * WhatsApp through an approved Meta template (via Infobip). Logged first like email, then sent.
 *  - `message` null → no approved template covers this event: logged as 'skipped'.
 *  - a number we can't turn into international form → logged as 'failed', never guessed.
 * `currency` decides the country code for a local number (NGN → 234, KES → 254).
 */
export async function notifyWhatsapp(
  target: Target & { currency: Currency },
  log: { subject: string; summary: string },
  message: WhatsAppMessage | null
): Promise<boolean> {
  const db = useServiceClient()
  const base = {
    channel: 'whatsapp' as const,
    recipient_type: target.recipientType,
    recipient: target.to,
    template: target.template,
    subject: log.subject,
    summary: log.summary,
    related_type: target.related?.type ?? null,
    related_id: target.related?.id ?? null
  }

  if (!message) {
    const { error } = await db.from('notifications').insert({ ...base, status: 'skipped', error: 'No approved WhatsApp template for this message; sent by email only.' })
    if (error) console.error('[notify] could not log whatsapp', target.template, error.message)
    return false
  }

  const to = toWhatsappNumber(target.to, target.currency)
  if (!to) {
    const { error } = await db.from('notifications').insert({ ...base, status: 'failed', error: `"${target.to}" is not a full international number (e.g. +2348012345678).` })
    if (error) console.error('[notify] could not log whatsapp', target.template, error.message)
    return false
  }

  const { data: row, error } = await db.from('notifications').insert({ ...base, recipient: `+${to}` }).select('id').single()
  if (error) console.error('[notify] could not log whatsapp', target.template, error.message)

  const result = infobipOutcome(await infobipSendWhatsappTemplate(to, message.template, message.placeholders, message.buttonPath))
  if (!result.ok) console.error('[notify] whatsapp failed', target.template, result.error)

  if (row) {
    await db
      .from('notifications')
      .update(
        result.ok
          ? { status: 'sent', provider_message_id: result.providerMessageId, sent_at: new Date().toISOString() }
          : { status: 'failed', provider_message_id: result.providerMessageId, error: result.error }
      )
      .eq('id', row.id)
  }
  return result.ok
}
