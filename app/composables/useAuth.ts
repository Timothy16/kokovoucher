// app/composables/useAuth.ts
// Single source of truth for who is signed in (Supabase Auth). Role comes from
// app_metadata.role, which only the server can set. For restaurant users, their own
// restaurant row is loaded too (RLS lets them read only that row).
import type { User } from '@supabase/supabase-js'
import type { Restaurant } from '#shared/types/models'

export type Role = 'admin' | 'restaurant'
export type SignInResult = { ok: true } | { ok: false; reason: 'INVALID' | 'DISABLED' | 'ERROR' }

let readyPromise: Promise<void> | null = null

export function useAuth() {
  const supabase = useSupabase()
  const user = useState<User | null>('auth-user', () => null)
  const restaurant = useState<Restaurant | null>('auth-restaurant', () => null)

  const role = computed<Role | null>(() => {
    const r = user.value?.app_metadata?.role
    return r === 'admin' || r === 'restaurant' ? r : null
  })

  async function loadRestaurant() {
    if (role.value !== 'restaurant' || !user.value) {
      restaurant.value = null
      return
    }
    const { data } = await supabase.from('restaurants').select().eq('user_id', user.value.id).maybeSingle()
    restaurant.value = data
  }

  /** Resolves once the stored session (if any) has been restored. Safe to call repeatedly. */
  function ready() {
    if (!readyPromise) {
      readyPromise = (async () => {
        const { data } = await supabase.auth.getSession()
        user.value = data.session?.user ?? null
        await loadRestaurant()
        supabase.auth.onAuthStateChange((event, session) => {
          user.value = session?.user ?? null
          if (event === 'SIGNED_OUT') restaurant.value = null
        })
      })()
    }
    return readyPromise
  }

  async function signIn(email: string, password: string, expected: Role): Promise<SignInResult> {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) {
      if (error.code === 'user_banned') return { ok: false, reason: 'DISABLED' }
      if (error.code === 'invalid_credentials' || error.status === 400) return { ok: false, reason: 'INVALID' }
      return { ok: false, reason: 'ERROR' }
    }
    user.value = data.user
    // A valid login for the other portal is treated as a wrong password — don't reveal it exists.
    if (role.value !== expected) {
      await signOut()
      return { ok: false, reason: 'INVALID' }
    }
    await loadRestaurant()
    if (expected === 'restaurant' && restaurant.value?.status !== 'active') {
      await signOut()
      return { ok: false, reason: 'DISABLED' }
    }
    return { ok: true }
  }

  async function signOut() {
    await supabase.auth.signOut()
    user.value = null
    restaurant.value = null
  }

  return { user, role, restaurant, ready, signIn, signOut, loadRestaurant }
}
