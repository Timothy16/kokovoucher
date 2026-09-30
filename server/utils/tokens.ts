// server/utils/tokens.ts
import { createHash, randomBytes } from 'node:crypto'

/** 256-bit URL-safe token. Only its hash is stored; the raw value lives only in the emailed link. */
export function newInviteToken() {
  const token = randomBytes(32).toString('base64url')
  return { token, hash: hashToken(token) }
}

export function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}
