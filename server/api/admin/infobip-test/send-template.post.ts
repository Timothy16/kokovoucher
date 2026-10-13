// POST /api/admin/infobip-test/send-template — send one KokoSend WhatsApp template, filled with its
// sample values, and return Infobip's raw response.
import { z } from 'zod'

const schema = z.object({
  to: z
    .string({ error: 'Enter a phone number.' })
    .transform((v) => v.replace(/[\s+()-]/g, ''))
    .pipe(z.string().regex(/^[1-9]\d{7,14}$/, 'Use international format, e.g. 2348012345678 (no leading 0).')),
  name: z.string({ error: 'Choose a template.' })
})

export default defineEventHandler(async (event) => {
  await requireUser(event, 'admin')
  const input = await parseBody(event, schema)

  const template = WHATSAPP_TEMPLATES.find((t) => t.name === input.name)
  if (!template) fail(400, 'Unknown template.')

  return infobipSendWhatsappTemplate(input.to, template.name, template.examples, template.button.examplePath)
})
