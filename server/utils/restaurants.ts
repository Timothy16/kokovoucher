// server/utils/restaurants.ts
import { z } from 'zod'
import type { Restaurant } from '#shared/types/models'

const INVITE_VALID_DAYS = 7

const text = (label: string, max: number) =>
  z.string({ error: `Enter ${label}.` }).trim().min(1, `Enter ${label}.`).max(max, `${label[0]!.toUpperCase()}${label.slice(1)} is too long.`)

/** Object path inside the restaurant-logos bucket, as uploaded by the admin UI. */
const logoPath = z
  .string()
  .regex(/^[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$/i, 'Invalid logo upload.')
  .nullable()

export const restaurantProfileSchema = z.object({
  name: text('the restaurant name', 120),
  address: text('an address', 300),
  logoPath: logoPath.optional(),
  contactPerson: text('a contact person', 120),
  contactNumber: text('a contact number', 40),
  currency: z.enum(['NGN', 'KES', 'USD'], { error: 'Select a currency.' })
})

export const createRestaurantSchema = restaurantProfileSchema.extend({
  contactEmail: z
    .string({ error: 'Enter a valid email — the invite goes here.' })
    .trim()
    .toLowerCase()
    .max(254)
    .pipe(z.email('Enter a valid email — the invite goes here.'))
})

export const updateRestaurantSchema = restaurantProfileSchema.partial()

/**
 * Issues a fresh invite link and emails it. Any earlier unused link for this restaurant is
 * revoked first (rule 21), so a leaked link stops working. Returns the link so admin can
 * copy it if the email doesn't arrive.
 */
export async function issueInvite(restaurant: Pick<Restaurant, 'id' | 'name' | 'contact_email' | 'contact_person' | 'currency'>, isResend: boolean) {
  const db = useServiceClient()
  const now = new Date()

  const { error: revokeError } = await db
    .from('restaurant_invites')
    .update({ revoked_at: now.toISOString() })
    .eq('restaurant_id', restaurant.id)
    .is('used_at', null)
    .is('revoked_at', null)
  if (revokeError) fail(500, 'Could not reset the previous invite link.')

  const { token, hash } = newInviteToken()
  const expiresAt = new Date(now.getTime() + INVITE_VALID_DAYS * 24 * 60 * 60 * 1000)
  const { error: insertError } = await db
    .from('restaurant_invites')
    .insert({ restaurant_id: restaurant.id, token_hash: hash, expires_at: expiresAt.toISOString() })
  if (insertError) fail(409, 'Another invite was just issued for this restaurant. Refresh and try again.')

  const inviteUrl = `${useRuntimeConfig().public.siteUrl}/restaurant/invite/${token}`
  const emailed = await notifyEmail(
    { recipientType: 'restaurant', to: restaurant.contact_email, template: 'restaurant_invited', related: { type: 'restaurant', id: restaurant.id } },
    restaurantInviteEmail(restaurant, inviteUrl, INVITE_VALID_DAYS, isResend)
  )

  return { inviteUrl, emailed }
}

/** Maps errors raised by the currency guard trigger to a readable message. */
export function currencyGuardMessage(dbMessage: string, name: string, currency: string) {
  if (dbMessage.includes('CURRENCY_LOCKED_PENDING_BALANCE')) {
    return `${name} has a pending payout balance in ${currency}. Process that payout before changing currency.`
  }
  if (dbMessage.includes('CURRENCY_LOCKED_OPEN_ORDERS')) {
    return `${name} has delivery orders in progress in ${currency}. Wait until they're completed or cancelled before changing currency.`
  }
  return null
}
