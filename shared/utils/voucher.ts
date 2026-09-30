// shared/utils/voucher.ts — auto-imported in both the app and the server.
import { VERIFY_MAX_ATTEMPTS, type VoucherStatus } from '../types/models'

/**
 * Status as the customer experiences it right now. The expiry job runs every 5 minutes, so an
 * ISSUED voucher past its window is shown as expired immediately. RESERVED ones back a live
 * order and are never expired mid-delivery.
 */
export function effectiveVoucherStatus(v: { status: VoucherStatus; expires_at: string }): VoucherStatus {
  return v.status === 'issued' && new Date(v.expires_at).getTime() < Date.now() ? 'expired' : v.status
}

export function isVoucherLocked(v: { verify_attempts: number; locked_at: string | null }) {
  return !!v.locked_at || v.verify_attempts >= VERIFY_MAX_ATTEMPTS
}
