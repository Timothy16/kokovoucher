// app/composables/useApi.ts
// Calls our own server routes (/api/*), attaching the signed-in user's access token
// so the server can check who is asking. Anonymous (customer) calls simply go without it.

type ApiOptions = { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; body?: Record<string, unknown>; query?: Record<string, unknown> }

/**
 * Readable message from a failed call: our server routes put it in the error body's
 * `message`; local errors (e.g. an image upload) carry it in message; else the fallback.
 */
export function apiErrorMessage(e: unknown, fallback = 'Something went wrong. Please try again.') {
  const fromServer = (e as { data?: { message?: string } })?.data?.message
  if (fromServer) return fromServer
  if (e instanceof Error && !('response' in e) && e.message) return e.message
  return fallback
}

export function useApi() {
  const supabase = useSupabase()

  return async function api<T = unknown>(url: string, options: ApiOptions = {}): Promise<T> {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    return $fetch<T>(url, {
      ...options,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined
    }) as Promise<T>
  }
}
