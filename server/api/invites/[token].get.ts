// GET /api/invites/:token — public. Tells the invite page what to show. Reveals only the
// restaurant name and login email, and only for a currently valid link.
export default defineEventHandler(async (event) => {
  await rateLimit(event, 'invite-view', 60, 600)
  const token = getRouterParam(event, 'token') ?? ''
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return { state: 'invalid' as const }

  const { data: invite } = await useServiceClient()
    .from('restaurant_invites')
    .select('used_at, revoked_at, expires_at, restaurants(name, contact_email, status)')
    .eq('token_hash', hashToken(token))
    .maybeSingle()

  if (!invite || !invite.restaurants) return { state: 'invalid' as const }
  if (invite.used_at || invite.restaurants.status !== 'invited') return { state: 'used' as const }
  if (invite.revoked_at) return { state: 'replaced' as const }
  if (new Date(invite.expires_at) < new Date()) return { state: 'expired' as const }

  return { state: 'valid' as const, restaurantName: invite.restaurants.name, email: invite.restaurants.contact_email }
})
