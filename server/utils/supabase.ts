// server/utils/supabase.ts
// Server-only Supabase access. The service-role client bypasses RLS, so every route that
// uses it must first establish who the caller is with requireUser().
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import type { H3Event } from 'h3'
import type { Database } from '#shared/types/database.types'

export type AppRole = 'admin' | 'restaurant'

let serviceClient: SupabaseClient<Database> | null = null

export function useServiceClient() {
  if (!serviceClient) {
    const config = useRuntimeConfig()
    if (!config.public.supabaseUrl || !config.supabaseServiceRoleKey) {
      throw createError({ statusCode: 500, message: 'Supabase is not configured on the server.' })
    }
    serviceClient = createClient<Database>(config.public.supabaseUrl, config.supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    })
  }
  return serviceClient
}

/** For restaurant routes: the signed-in restaurant, which must be ACTIVE. */
export async function requireRestaurant(event: H3Event) {
  return activeRestaurantOf(await requireUser(event, 'restaurant'))
}

/**
 * A restaurant user's own restaurant, which must be ACTIVE. Checked against the database on
 * every call, so a restaurant disabled mid-session is refused immediately even though its
 * access token is still valid.
 */
export async function activeRestaurantOf(user: User) {
  const { data: restaurant } = await useServiceClient().from('restaurants').select().eq('user_id', user.id).maybeSingle()
  if (!restaurant || restaurant.status !== 'active') {
    throw createError({ statusCode: 403, message: 'This restaurant account is not active.' })
  }
  return restaurant
}

/** Verifies the bearer token sent by useApi() and, if given, that the user holds `role`. */
export async function requireUser(event: H3Event, role?: AppRole): Promise<User> {
  const header = getHeader(event, 'authorization')
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) throw createError({ statusCode: 401, message: 'Please sign in.' })

  const { data, error } = await useServiceClient().auth.getUser(token)
  if (error || !data.user) throw createError({ statusCode: 401, message: 'Your session has expired. Please sign in again.' })

  if (role && data.user.app_metadata?.role !== role) {
    throw createError({ statusCode: 403, message: 'You do not have access to this.' })
  }
  return data.user
}
