// server/utils/orders.ts
import { z } from 'zod'

const phone = (label: string) =>
  z.string({ error: `Enter a valid ${label}.` }).trim().regex(/^\+?[0-9][0-9 ()-]{6,19}$/, `Enter a valid ${label}, e.g. +2348012345678.`)
const text = (label: string, max: number) => z.string({ error: `Enter ${label}.` }).trim().min(1, `Enter ${label}.`).max(max, `${label[0]!.toUpperCase()}${label.slice(1)} is too long.`)
const optionalText = (max: number) => z.string().trim().max(max).optional().nullable()

/** Voucher code + secret key as typed by a customer or restaurant (normalised in the database). */
export const voucherCredentials = {
  code: z.string({ error: 'Enter your voucher code.' }).trim().min(4, 'Enter your voucher code.').max(20, 'That voucher code is too long.'),
  secretKey: z.string({ error: 'Enter your secret key.' }).trim().min(1, 'Enter your secret key.').max(64, 'That secret key is too long.')
}

export const placeOrderSchema = z.object({
  ...voucherCredentials,
  comboId: z.uuid('This combo is no longer available.'),
  spiceLevel: z.enum(['spicy', 'non_spicy']).nullable(),
  drinkChoice: z.string().trim().max(40).nullable(),
  deliveryName: text('the name to deliver to', 120),
  deliveryPhone: phone('phone number'),
  deliveryWhatsapp: phone('WhatsApp number'),
  houseName: text('the house or apartment name', 120),
  houseNumber: text('the house number', 20),
  floor: text('the floor', 20),
  landmark: optionalText(120),
  dropOption: z.enum(['door_drop', 'leave_at_gate'], { error: 'Choose a drop option.' }),
  additionalInfo: optionalText(500)
})

export const trackSchema = z.object({
  reference: z.string({ error: 'Enter your order reference.' }).trim().min(4, 'Enter your order reference.').max(20),
  secretKey: voucherCredentials.secretKey
})

export const reportSchema = trackSchema.extend({
  note: z.string().trim().max(1000, 'Keep it under 1000 characters.').optional()
})

/**
 * Why a voucher/order action was refused → what the person sees. Wrong code and wrong secret
 * key share one message on purpose (rule 18): never reveal which half was wrong.
 */
const REFUSAL: Record<string, { status: number; message: string }> = {
  INVALID: { status: 422, message: "That voucher code or secret key doesn't look right. Check both and try again. After 5 wrong tries the voucher locks." },
  LOCKED: { status: 423, message: 'This voucher is locked after too many incorrect attempts. Contact KokoSend support to get a new one.' },
  NOT_AVAILABLE: { status: 422, message: 'This voucher has been cancelled and can no longer be used.' },
  ALREADY_USED: { status: 422, message: 'This voucher has already been used.' },
  IN_USE: { status: 409, message: 'This voucher is already being used for an order in progress. Track that order, or wait until it completes.' },
  EXPIRED: { status: 422, message: 'This voucher has expired.' },
  COMBO_UNAVAILABLE: { status: 409, message: 'This combo just sold out. Please pick another one from the menu.' },
  RESTAURANT_UNAVAILABLE: { status: 409, message: "This restaurant isn't taking orders right now. Please choose another." },
  CURRENCY_MISMATCH: { status: 422, message: "Your voucher's currency doesn't match this restaurant's. It can only be used at restaurants that accept the same currency." },
  SPICE_REQUIRED: { status: 400, message: 'Choose spicy or non-spicy for this combo.' },
  DRINK_REQUIRED: { status: 400, message: 'Choose one of the drinks offered with this combo.' },
  BAD_BILL: { status: 400, message: 'Enter the bill amount. NGN and KES bills are whole numbers; USD can have cents.' }
}

/** Throws the right HTTP error for a refusal returned by a voucher/order database function. */
export function refuse(result: { reason?: string; voucher_currency?: string }): never {
  const r = REFUSAL[result.reason ?? ''] ?? { status: 500, message: 'Something went wrong. Please try again.' }
  throw createError({ statusCode: r.status, message: r.message, data: { reason: result.reason, voucherCurrency: result.voucher_currency } })
}

export const siteUrl = () => useRuntimeConfig().public.siteUrl

export async function adminEmail() {
  const { data } = await useServiceClient().from('settings').select('admin_email').maybeSingle()
  return data?.admin_email ?? null
}
