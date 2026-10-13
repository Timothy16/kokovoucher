// POST /api/admin/infobip-test/templates — submit KokoSend WhatsApp templates for approval.
// Templates that already exist on the sender (any status) are skipped, so pressing it again only
// submits new or renamed ones.
export default defineEventHandler(async (event) => {
  await requireUser(event, 'admin')

  const existing = await infobipListWhatsappTemplates()
  const taken = new Set(
    existing.ok ? ((existing.response as { templates?: { name: string }[] }).templates ?? []).map((t) => t.name) : []
  )

  const results = []
  for (const t of WHATSAPP_TEMPLATES) {
    if (taken.has(t.name)) {
      results.push({ name: t.name, ok: true, httpStatus: null, response: 'Already exists — skipped.' })
      continue
    }
    results.push({ name: t.name, ...(await infobipCreateWhatsappTemplate(infobipTemplatePayload(t))) })
  }
  return results
})
