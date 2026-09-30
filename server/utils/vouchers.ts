// server/utils/vouchers.ts
import { z } from 'zod'
import { MAX_VOUCHER_AMOUNT, type Voucher } from '#shared/types/models'
import { isValidAmount } from '#shared/utils/format'

export const issueVoucherSchema = z
  .object({
    customerFullName: z.string({ error: "Enter the customer's full name." }).trim().min(2, "Enter the customer's full name.").max(120, 'That name is too long.'),
    customerPhone: z
      .string({ error: 'Enter a valid phone number.' })
      .trim()
      .regex(/^\+?[0-9][0-9 ()-]{6,19}$/, 'Enter a valid phone number, e.g. +2348012345678.'),
    customerEmail: z.string({ error: 'Enter a valid email.' }).trim().toLowerCase().max(254).pipe(z.email('Enter a valid email.')),
    secretKey: z
      .string({ error: "Enter the customer's KokoSend username." })
      .trim()
      .min(2, "Enter the customer's KokoSend username.")
      .max(64, 'That username is too long.')
      .regex(/^\S+$/, 'A KokoSend username has no spaces.'),
    currency: z.enum(['NGN', 'KES', 'USD'], { error: 'Select a currency.' }),
    amount: z.number({ error: 'Enter a valid amount.' }).positive('Enter a valid amount.').max(MAX_VOUCHER_AMOUNT, 'That amount is too large.')
  })
  .refine((v) => isValidAmount(v.amount, v.currency), {
    path: ['amount'],
    message: 'NGN and KES amounts must be whole numbers; USD can have up to 2 decimals.'
  })

export const voidVoucherSchema = z.object({
  reason: z.string().trim().max(300, 'Keep the reason under 300 characters.').optional()
})

export const menuUrlFor = (currency: string) => `${useRuntimeConfig().public.siteUrl}/menu?currency=${currency}`

/** Voucher email + WhatsApp (logged as skipped) to the customer. Returns whether the email went. */
export async function sendVoucherToCustomer(v: Voucher, resent: boolean) {
  const email = voucherIssuedEmail({ ...v, amount: Number(v.amount) }, menuUrlFor(v.currency), resent)
  const target = { recipientType: 'customer' as const, template: resent ? 'voucher_resent' : 'voucher_issued', related: { type: 'voucher', id: v.id } }
  const emailed = await notifyEmail({ ...target, to: v.customer_email }, email)
  await notifyWhatsapp({ ...target, to: v.customer_phone }, email)
  return emailed
}
