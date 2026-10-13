// POST /api/admin/infobip-test/whatsapp — send one free-form WhatsApp text through Infobip and return its raw response.
import { z } from 'zod'

const schema = z.object({
  // Accepts "+234 801 234 5678" or "2348012345678"; Infobip wants digits only.
  to: z
    .string({ error: 'Enter a phone number.' })
    .transform((v) => v.replace(/[\s+()-]/g, ''))
    .pipe(z.string().regex(/^[1-9]\d{7,14}$/, 'Use international format, e.g. 2348012345678 (no leading 0).')),
  message: z.string().trim().min(1, 'Enter a message.').max(4096)
})

export default defineEventHandler(async (event) => {
  await requireUser(event, 'admin')
  const input = await parseBody(event, schema)
  return infobipSendWhatsappText(input.to, input.message)
})
