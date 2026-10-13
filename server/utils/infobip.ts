// server/utils/infobip.ts
// Thin Infobip client: email + WhatsApp. Each call returns Infobip's raw response (the admin test
// page at /admin/infobip-test shows it as-is); notify.ts turns it into sent/failed via
// infobipOutcome().

export interface InfobipResult {
  ok: boolean
  /** HTTP status from Infobip, or null if the request never got a response. */
  httpStatus: number | null
  /** Infobip's parsed JSON (or raw text), or our own error message. */
  response: unknown
}

function infobipConfig() {
  const { infobipApiKey, infobipBaseUrl, infobipWhatsappFrom, emailFrom } = useRuntimeConfig()
  const missing = [
    !infobipApiKey && 'NUXT_INFOBIP_API_KEY',
    !infobipBaseUrl && 'NUXT_INFOBIP_BASE_URL'
  ].filter(Boolean)
  if (missing.length) throw new Error(`${missing.join(' and ')} not set`)
  const baseUrl = (/^https?:\/\//.test(infobipBaseUrl) ? infobipBaseUrl : `https://${infobipBaseUrl}`).replace(/\/+$/, '')
  return { apiKey: infobipApiKey, baseUrl, whatsappFrom: infobipWhatsappFrom, emailFrom }
}

async function infobipRequest(path: string, init: { method?: 'GET' | 'POST'; body?: BodyInit; json?: boolean } = {}): Promise<InfobipResult> {
  try {
    const { apiKey, baseUrl } = infobipConfig()
    const res = await fetch(`${baseUrl}${path}`, {
      method: init.method ?? 'POST',
      headers: {
        Authorization: `App ${apiKey}`,
        Accept: 'application/json',
        ...(init.json ? { 'Content-Type': 'application/json' } : {})
      },
      body: init.body
    })
    const text = await res.text()
    let response: unknown = text
    try {
      response = JSON.parse(text)
    } catch {}
    return { ok: res.ok, httpStatus: res.status, response }
  } catch (e) {
    return { ok: false, httpStatus: null, response: e instanceof Error ? e.message : 'Unknown Infobip error' }
  }
}

/** Email API v3. Infobip expects multipart/form-data. */
export async function infobipSendEmail(to: string, subject: string, text: string, html?: string, replyTo?: string | null): Promise<InfobipResult> {
  let from: string
  try {
    from = infobipConfig().emailFrom
  } catch (e) {
    return { ok: false, httpStatus: null, response: (e as Error).message }
  }
  if (!from) return { ok: false, httpStatus: null, response: 'NUXT_EMAIL_FROM not set' }

  const form = new FormData()
  form.append('from', from)
  form.append('to', to)
  form.append('subject', subject)
  form.append('text', text)
  if (html) form.append('html', html)
  if (replyTo) form.append('replyTo', replyTo)
  return infobipRequest('/email/3/send', { body: form })
}

function whatsappSender(): string {
  const from = infobipConfig().whatsappFrom
  if (!from) throw new Error('NUXT_INFOBIP_WHATSAPP_FROM not set')
  return from
}

/** Submits one WhatsApp template to Meta (via Infobip) for approval. */
export async function infobipCreateWhatsappTemplate(payload: object): Promise<InfobipResult> {
  try {
    return await infobipRequest(`/whatsapp/2/senders/${whatsappSender()}/templates`, { json: true, body: JSON.stringify(payload) })
  } catch (e) {
    return { ok: false, httpStatus: null, response: (e as Error).message }
  }
}

/** All templates on our sender, with their approval status. */
export async function infobipListWhatsappTemplates(): Promise<InfobipResult> {
  try {
    return await infobipRequest(`/whatsapp/2/senders/${whatsappSender()}/templates`, { method: 'GET' })
  } catch (e) {
    return { ok: false, httpStatus: null, response: (e as Error).message }
  }
}

/**
 * Approved-template WhatsApp message — works without the recipient messaging us first.
 * `placeholders` fill {{1}}, {{2}}… in the body; `buttonParameter` fills the URL button's {{1}}.
 */
export async function infobipSendWhatsappTemplate(
  to: string,
  templateName: string,
  placeholders: string[],
  buttonParameter?: string
): Promise<InfobipResult> {
  try {
    const message = {
      from: whatsappSender(),
      to,
      content: {
        templateName,
        language: 'en',
        templateData: {
          body: { placeholders },
          ...(buttonParameter ? { buttons: [{ type: 'URL', parameter: buttonParameter }] } : {})
        }
      }
    }
    return await infobipRequest('/whatsapp/1/message/template', { json: true, body: JSON.stringify({ messages: [message] }) })
  } catch (e) {
    return { ok: false, httpStatus: null, response: (e as Error).message }
  }
}

/**
 * Free-form WhatsApp text. Only delivered inside the 24-hour window after the recipient last
 * messaged our sender; business-initiated messages need an approved template instead.
 * `to` is international format, digits only.
 */
export async function infobipSendWhatsappText(to: string, text: string): Promise<InfobipResult> {
  let from: string
  try {
    from = infobipConfig().whatsappFrom
  } catch (e) {
    return { ok: false, httpStatus: null, response: (e as Error).message }
  }
  if (!from) return { ok: false, httpStatus: null, response: 'NUXT_INFOBIP_WHATSAPP_FROM not set' }

  return infobipRequest('/whatsapp/1/message/text', {
    json: true,
    body: JSON.stringify({ from, to, content: { text } })
  })
}

interface InfobipMessageResponse {
  messages?: { messageId?: string; status?: { groupName?: string; name?: string; description?: string } }[]
  requestError?: { serviceException?: { text?: string }; policyException?: { text?: string } }
}

/**
 * Turns a raw Infobip result into what we log: accepted (with its message id) or failed (with a
 * readable reason). Infobip answers 200 even for some refusals, so the message's own status
 * group decides: REJECTED is a failure; PENDING / DELIVERED mean Infobip accepted it.
 */
export function infobipOutcome(result: InfobipResult): { ok: boolean; providerMessageId: string | null; error: string | null } {
  const body = (typeof result.response === 'object' && result.response ? result.response : {}) as InfobipMessageResponse
  const message = body.messages?.[0]
  const group = message?.status?.groupName
  if (result.ok && message && group !== 'REJECTED') {
    return { ok: true, providerMessageId: message.messageId ?? null, error: null }
  }
  const reason =
    body.requestError?.serviceException?.text ??
    body.requestError?.policyException?.text ??
    message?.status?.description ??
    (typeof result.response === 'string' ? result.response : null) ??
    `Infobip returned HTTP ${result.httpStatus ?? 'error'}`
  return { ok: false, providerMessageId: message?.messageId ?? null, error: reason }
}
