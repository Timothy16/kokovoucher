// POST /api/invites/accept — public. Sets the restaurant's password and activates it (rule 6).
// The invite row is claimed with a single conditional UPDATE first, so two simultaneous
// submissions can't both succeed; every later failure undoes the earlier steps.
import { z } from 'zod'
import { MIN_PASSWORD_LENGTH } from '#shared/types/models'

const schema = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{43}$/, 'This invite link is invalid.'),
  password: z
    .string({ error: 'Enter a password.' })
    .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters.`)
    .max(72, 'Use at most 72 characters.')
})

export default defineEventHandler(async (event) => {
  await rateLimit(event, 'invite-accept', 10, 600)
  const { token, password } = await parseBody(event, schema)
  const db = useServiceClient()
  const now = new Date().toISOString()

  const { data: claimed } = await db
    .from('restaurant_invites')
    .update({ used_at: now })
    .eq('token_hash', hashToken(token))
    .is('used_at', null)
    .is('revoked_at', null)
    .gt('expires_at', now)
    .select('id, restaurant_id')
    .maybeSingle()
  if (!claimed) fail(410, 'This invite link is no longer valid. Ask KokoSend admin to send a new one.')

  const unclaim = () => db.from('restaurant_invites').update({ used_at: null }).eq('id', claimed.id)

  const { data: restaurant } = await db.from('restaurants').select().eq('id', claimed.restaurant_id).maybeSingle()
  if (!restaurant || restaurant.status !== 'invited') {
    fail(409, 'This restaurant has already been activated. Log in instead.')
  }

  const { data: created, error: createError } = await db.auth.admin.createUser({
    email: restaurant.contact_email,
    password,
    email_confirm: true,
    app_metadata: { role: 'restaurant', restaurant_id: restaurant.id }
  })
  if (createError || !created.user) {
    await unclaim()
    if (createError?.code === 'email_exists' || createError?.status === 422) {
      fail(409, 'An account with this email already exists. Contact KokoSend admin.')
    }
    if (createError?.code === 'weak_password') fail(400, 'That password is too weak. Try a longer one.')
    fail(500, 'Could not create your account. Please try again.')
  }

  const { data: activated } = await db
    .from('restaurants')
    .update({ user_id: created.user.id, status: 'active', activated_at: now })
    .eq('id', restaurant.id)
    .eq('status', 'invited')
    .select('id')
    .maybeSingle()
  if (!activated) {
    await db.auth.admin.deleteUser(created.user.id)
    await unclaim()
    fail(500, 'Could not activate your account. Please try again.')
  }

  await audit({ actor: restaurant.name, actorId: created.user.id, action: 'restaurant.invite_accept', targetType: 'restaurant', targetId: restaurant.id })

  return { email: restaurant.contact_email }
})
