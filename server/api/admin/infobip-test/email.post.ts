// POST /api/admin/infobip-test/email — send one test email through Infobip and return its raw response.
import { z } from 'zod'

const schema = z.object({
  to: z.string({ error: 'Enter a valid email.' }).trim().toLowerCase().max(254).pipe(z.email('Enter a valid email.')),
  subject: z.string().trim().min(1, 'Enter a subject.').max(200),
  message: z.string().trim().min(1, 'Enter a message.').max(5000)
})

function esc(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export default defineEventHandler(async (event) => {
  await requireUser(event, 'admin')
  const input = await parseBody(event, schema)

  const html = `<p style="font-family:Arial,sans-serif;font-size:16px;line-height:24px">${esc(input.message).replace(/\n/g, '<br>')}</p>`
  return infobipSendEmail(input.to, input.subject, input.message, html)
})
