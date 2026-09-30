// server/utils/notify.ts
// Every outbound message is written to `notifications` first (the admin Notification Log),
// then sent, then its row is updated with the outcome. A send failure never fails the
// business action that triggered it — admin sees it as 'failed' in the log.
import type { Database } from '#shared/types/database.types'
import type { EmailTemplate } from './email-templates'

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

// TODO(whatsapp): send through the WhatsApp Business API once integrated. Until then the
// message is only logged with status 'skipped' so the flow stays visible and auditable.
export async function notifyWhatsapp(target: Target, message: { subject: string; summary: string }): Promise<void> {
  const { error } = await useServiceClient().from('notifications').insert({
    channel: 'whatsapp',
    recipient_type: target.recipientType,
    recipient: target.to,
    template: target.template,
    subject: message.subject,
    summary: message.summary,
    status: 'skipped',
    error: 'WhatsApp sending is not integrated yet.',
    related_type: target.related?.type ?? null,
    related_id: target.related?.id ?? null
  })
  if (error) console.error('[notify] could not log whatsapp', target.template, error.message)
}
