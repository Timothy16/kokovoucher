// app/plugins/auth-landing.client.ts
// Safety net for password-reset links. Supabase sends the user back to the Site URL (usually the
// home page) instead of /restaurant/reset-password whenever the requested return address isn't on
// its Redirect URLs list, and the user would be stuck. If a reset link — or an expired one — lands
// on any other page, forward it, hash included, to the reset page, which knows what to do with it.
// Runs before anything creates the Supabase client, so the hash is still intact.
export default defineNuxtPlugin(() => {
  const { hash, pathname } = window.location
  if (!hash || pathname === '/restaurant/reset-password') return

  const params = new URLSearchParams(hash.slice(1))
  if (params.get('type') === 'recovery' || params.has('error_code')) {
    window.location.replace(`/restaurant/reset-password${hash}`)
  }
})
