// app/composables/useMenu.ts
// Public menu reads (anonymous-safe): available combos of active restaurants, via the
// public_menu view. Used by the menu, combo detail and (Stage 4) checkout pages.
import type { MenuItem } from '#shared/types/models'

export async function fetchPublicMenu(): Promise<MenuItem[]> {
  const { data, error } = await useSupabase().from('public_menu').select().order('created_at', { ascending: false })
  if (error) throw error
  return data as MenuItem[]
}

/** One combo from the public menu, or null if it's unavailable / its restaurant isn't active. */
export async function fetchMenuItem(id: string): Promise<MenuItem | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null
  const { data, error } = await useSupabase().from('public_menu').select().eq('id', id).maybeSingle()
  if (error) throw error
  return data as MenuItem | null
}
