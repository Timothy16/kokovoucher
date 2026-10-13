// GET /api/admin/infobip-test/templates — the templates on our WhatsApp sender and their approval status.
export default defineEventHandler(async (event) => {
  await requireUser(event, 'admin')
  return infobipListWhatsappTemplates()
})
