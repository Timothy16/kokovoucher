// server/utils/whatsapp-templates.ts
// The WhatsApp templates KokoSend uses, in the shape Infobip's "create template" API expects.
// Wording here must match what Meta approved; changing it means re-submitting the template.
// Each button URL is https://voucher.kokosend.com/{{1}} — the app fills in the path,
// e.g. "menu?currency=NGN" or "track?ref=KS-7F3K-92QD".

import type { Currency } from '#shared/types/models'
import { formatCurrency } from '#shared/utils/format'

const SITE = 'https://voucher.kokosend.com'

interface TemplateDefinition {
  name: string
  /** Body text with {{1}}, {{2}}… placeholders. */
  body: string
  /** One sample per placeholder, in order. */
  examples: string[]
  button: { text: string; examplePath: string }
}

const menuButton = (text: string) => ({ text, examplePath: 'menu?currency=NGN' })
const trackButton = (text: string) => ({ text, examplePath: 'track?ref=KS-7F3K-92QD' })

export const WHATSAPP_TEMPLATES: TemplateDefinition[] = [
  {
    // Rejected by Meta (instantly, no reason given): kokosend_voucher_issued, _details, _notice. All three had a
    // "Voucher code: {{3}}" line, which looks like a verification code; the approved voucher_expiring keeps
    // the code inside a sentence, so this mirrors it. Rejected names can't be reused.
    name: 'kokosend_voucher_ready',
    body: 'Hi {{1}}, a {{2}} KokoSend food voucher *{{3}}* has been issued to you and is valid until {{4}}.\n\nUse it to order delivery or at any partner restaurant. Your secret key is your KokoSend username.',
    examples: ['Ada', '₦5,000', 'KS-7F3K-92QD', '12 Oct 2026'],
    button: menuButton('View menu')
  },
  {
    name: 'kokosend_voucher_expiring',
    body: "Hi {{1}}, your {{2}} KokoSend voucher *{{3}}* hasn't been used yet and expires on {{4}}.\n\nOrder delivery or walk into any partner restaurant before then. Your secret key is your KokoSend username.",
    examples: ['Ada', '₦5,000', 'KS-7F3K-92QD', '12 Oct 2026'],
    button: menuButton('Order now')
  },
  {
    name: 'kokosend_order_placed',
    body: "Hi {{1}}, your order *{{2}}* for {{3}} at {{4}} is confirmed. Your voucher is now reserved for it.\n\nWe'll message you as it moves. To track it you'll need the reference and your secret key.",
    examples: ['Ada', 'KS-7F3K-92QD', 'Jollof Rice Combo', "Mama's Kitchen"],
    button: trackButton('Track my order')
  },
  {
    name: 'kokosend_order_preparing',
    body: 'Good news: {{1}} has accepted order *{{2}}* and is preparing it now.',
    examples: ["Mama's Kitchen", 'KS-7F3K-92QD'],
    button: trackButton('Track my order')
  },
  {
    name: 'kokosend_order_on_the_way',
    body: 'Order *{{1}}* has left {{2}} and is on its way. Keep your phone close in case the rider calls.',
    examples: ['KS-7F3K-92QD', "Mama's Kitchen"],
    button: trackButton('Track my order')
  },
  {
    name: 'kokosend_order_delivered',
    body: "Order *{{1}}* from {{2}} has been marked as delivered. Enjoy your meal!\n\nDidn't receive it? Use the button below to report a problem.",
    examples: ['KS-7F3K-92QD', "Mama's Kitchen"],
    button: trackButton('View order')
  },
  {
    name: 'kokosend_order_rejected',
    body: "Sorry, {{1}} couldn't accept order *{{2}}*. Reason: {{3}}.\n\nCheck your email for what happens to your voucher.",
    examples: ["Mama's Kitchen", 'KS-7F3K-92QD', 'we ran out of jollof rice'],
    button: trackButton('View order')
  }
]

/** Request body for POST /whatsapp/2/senders/{sender}/templates. */
export function infobipTemplatePayload(t: TemplateDefinition) {
  return {
    name: t.name,
    language: 'en',
    category: 'UTILITY',
    structure: {
      body: { text: t.body, examples: t.examples },
      buttons: [{ type: 'URL', text: t.button.text, url: `${SITE}/{{1}}`, example: `${SITE}/${t.button.examplePath}` }]
    }
  }
}

// ---------- sending: fill the approved templates with real values ----------

/** A ready-to-send WhatsApp message: approved template + its {{n}} values + the button path. */
export interface WhatsAppMessage {
  template: string
  placeholders: string[]
  buttonPath: string
}

/** Meta rejects placeholders that are empty or contain newlines/tabs, so flatten and cap them. */
const param = (value: string) => value.replace(/\s+/g, ' ').trim().slice(0, 200) || '-'
const firstName = (fullName: string) => fullName.trim().split(/\s+/)[0] || 'there'
/** "12 Oct 2026", the date format the templates were approved with. Expiry is defined in UTC. */
const shortDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' })
const trackPath = (reference: string) => `track?ref=${encodeURIComponent(reference)}`

function message(template: string, placeholders: string[], buttonPath: string): WhatsAppMessage {
  if (!WHATSAPP_TEMPLATES.some((t) => t.name === template)) throw new Error(`Unknown WhatsApp template ${template}`)
  return { template, placeholders: placeholders.map(param), buttonPath }
}

type VoucherFields = { customer_full_name: string; code: string; amount: number; currency: Currency; expires_at: string }
const voucherPlaceholders = (v: VoucherFields) => [firstName(v.customer_full_name), formatCurrency(v.amount, v.currency), v.code, shortDate(v.expires_at)]

export const whatsapp = {
  voucherReady: (v: VoucherFields) => message('kokosend_voucher_ready', voucherPlaceholders(v), `menu?currency=${v.currency}`),
  voucherExpiring: (v: VoucherFields) => message('kokosend_voucher_expiring', voucherPlaceholders(v), `menu?currency=${v.currency}`),
  orderPlaced: (o: { customerName: string; reference: string; comboName: string; restaurantName: string }) =>
    message('kokosend_order_placed', [firstName(o.customerName), o.reference, o.comboName, o.restaurantName], trackPath(o.reference)),
  orderPreparing: (o: { reference: string; restaurantName: string }) => message('kokosend_order_preparing', [o.restaurantName, o.reference], trackPath(o.reference)),
  orderOnTheWay: (o: { reference: string; restaurantName: string }) => message('kokosend_order_on_the_way', [o.reference, o.restaurantName], trackPath(o.reference)),
  orderDelivered: (o: { reference: string; restaurantName: string }) => message('kokosend_order_delivered', [o.reference, o.restaurantName], trackPath(o.reference)),
  /** Also used when an order is cancelled because its restaurant was disabled. */
  orderRejected: (o: { reference: string; restaurantName: string; reason: string }) =>
    message('kokosend_order_rejected', [o.restaurantName, o.reference, o.reason.replace(/[.\s]+$/, '')], trackPath(o.reference))
}

const COUNTRY_CODE: Partial<Record<Currency, string>> = { NGN: '234', KES: '254' }

/**
 * A stored phone number → WhatsApp's international digits-only form, or null if we can't be sure.
 * "+234 803…" / "00234803…" / "234803…" are kept; a local "0803…" gets the country code of the
 * voucher's currency (NGN → 234, KES → 254). A local number on a USD voucher is ambiguous → null.
 */
export function toWhatsappNumber(raw: string, currency: Currency): string | null {
  const trimmed = raw.trim()
  let digits = trimmed.replace(/\D/g, '')
  if (trimmed.startsWith('00')) digits = digits.slice(2)
  else if (!trimmed.startsWith('+') && digits.startsWith('0')) {
    const cc = COUNTRY_CODE[currency]
    if (!cc) return null
    digits = cc + digits.slice(1)
  }
  return /^[1-9]\d{9,14}$/.test(digits) ? digits : null
}
