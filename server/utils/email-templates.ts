// server/utils/email-templates.ts
// Every KokoSend email's wording, in one place. Each returns the subject, the log summary
// (shown in the admin Notification Log — never secrets) and the designed content.
import type { EmailContent } from './email'
import { formatCurrency } from '../../shared/utils/format'
import type { Currency } from '../../shared/types/models'

export interface EmailTemplate {
  subject: string
  summary: string
  content: EmailContent
}

const firstName = (fullName: string) => fullName.trim().split(/\s+/)[0] || 'there'

/** "Tue 6 Oct 2026, 23:59 UTC" — expiry is defined in UTC (server time), so say so. */
export function formatExpiry(iso: string) {
  const d = new Date(iso)
  const date = d.toLocaleDateString('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  const time = d.toLocaleTimeString('en-GB', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' })
  return `${date}, ${time} UTC`
}

// ---------- customer: voucher issued / resent ----------
export function voucherIssuedEmail(
  v: { customer_full_name: string; customer_email: string; code: string; amount: number; currency: Currency; expires_at: string },
  menuUrl: string,
  resent = false
): EmailTemplate {
  const amount = formatCurrency(v.amount, v.currency)
  const expires = formatExpiry(v.expires_at)
  return {
    subject: resent ? `Reminder: your ${amount} KokoSend food voucher` : `You've got a ${amount} food voucher`,
    summary: resent ? `Voucher ${v.code} resent with menu link and secret-key note.` : `Voucher ${v.code} sent with menu link. Secret key = KokoSend username.`,
    content: {
      // No code in the preheader: it shows on lock screens and in inbox lists.
      preheader: `${amount} to spend at any KokoSend partner restaurant — delivery or walk-in. Use it by ${expires.split(',')[0]}.`,
      eyebrow: resent ? 'Voucher reminder' : 'A treat for you',
      heading: `Hi ${firstName(v.customer_full_name)}, you've got a ${amount} food voucher`,
      blocks: [
        { type: 'text', text: 'Enjoy a meal from any KokoSend partner restaurant — get a combo delivered to your door, or walk in and eat.' },
        { type: 'voucher', amount, code: v.code, expires, note: `Accepted at partner restaurants that use ${v.currency}` },
        {
          type: 'callout',
          tone: 'info',
          title: 'Your secret key is your KokoSend username',
          text: "You'll enter it together with the code to use this voucher. Keep both private — together they unlock your voucher."
        },
        {
          type: 'steps',
          title: 'Two ways to use it',
          items: [
            { title: 'Order delivery', body: 'Browse the menu, pick a combo, add your delivery details, then enter your code and secret key at checkout.' },
            { title: 'Walk in and eat', body: 'Visit any partner restaurant and show this code. Staff will ask for your secret key and enter your bill.' }
          ]
        },
        { type: 'button', label: 'Browse the menu', url: menuUrl },
        {
          type: 'callout',
          tone: 'warning',
          title: 'Good to know',
          text: "This voucher works once. The full value is used in one go — if a walk-in bill comes to less, the difference isn't kept."
        }
      ],
      footnote: `This voucher was issued to ${v.customer_email}. If you weren't expecting it, you can safely ignore this email.`
    }
  }
}

// ---------- customer: voucher expiring soon ----------
export function voucherExpiringEmail(
  v: { customer_full_name: string; customer_email: string; code: string; amount: number; currency: Currency; expires_at: string },
  menuUrl: string
): EmailTemplate {
  const amount = formatCurrency(v.amount, v.currency)
  const expires = formatExpiry(v.expires_at)
  return {
    subject: `Your ${amount} voucher expires soon`,
    summary: `Reminder: voucher ${v.code} expires ${expires}.`,
    content: {
      preheader: `Use your ${amount} food voucher before ${expires}. Delivery or walk-in, any partner restaurant.`,
      eyebrow: 'Expiring soon',
      heading: `Don't miss your ${amount} meal`,
      blocks: [
        { type: 'text', text: `Hi ${firstName(v.customer_full_name)}, your KokoSend voucher hasn't been used yet and it expires soon. After that it can't be used.` },
        { type: 'voucher', amount, code: v.code, expires, note: `Accepted at partner restaurants that use ${v.currency}` },
        { type: 'button', label: 'Order now', url: menuUrl },
        { type: 'callout', tone: 'info', text: 'You can also walk into any partner restaurant and use it in person. Your secret key is your KokoSend username.' }
      ],
      footnote: `Sent to ${v.customer_email} because this voucher is about to expire. This is the only reminder we'll send.`
    }
  }
}

// ---------- customer: voucher voided ----------
export function voucherVoidedEmail(v: { customer_full_name: string; customer_email: string; code: string; amount: number; currency: Currency; void_reason: string | null }): EmailTemplate {
  const amount = formatCurrency(v.amount, v.currency)
  return {
    subject: 'Your KokoSend voucher has been cancelled',
    summary: `Voucher ${v.code} cancelled${v.void_reason ? ` — ${v.void_reason}` : ''}.`,
    content: {
      preheader: `Your ${amount} voucher can no longer be used.`,
      eyebrow: 'Voucher update',
      heading: 'Your voucher has been cancelled',
      blocks: [
        { type: 'text', text: `Hi ${firstName(v.customer_full_name)}, the voucher below has been cancelled by KokoSend and can no longer be used.` },
        {
          type: 'details',
          rows: [
            { label: 'Voucher code', value: v.code },
            { label: 'Value', value: amount }
          ]
        },
        ...(v.void_reason ? [{ type: 'callout' as const, tone: 'danger' as const, title: 'Reason', text: v.void_reason }] : []),
        { type: 'text', text: "If you think this is a mistake, reply to this email and we'll look into it." }
      ],
      footnote: `Sent to ${v.customer_email} about a KokoSend voucher issued to you.`
    }
  }
}

// ---------- orders ----------
export interface OrderEmailData {
  reference: string
  comboName: string
  restaurantName: string
  amount: number
  currency: Currency
  customerName: string
  choices?: string[]
  deliverTo?: string
}

const trackUrl = (site: string, reference: string) => `${site}/track?ref=${encodeURIComponent(reference)}`

export function orderPlacedCustomerEmail(o: OrderEmailData, site: string): EmailTemplate {
  return {
    subject: `Order ${o.reference} confirmed`,
    summary: `Order ${o.reference} placed at ${o.restaurantName} for ${o.comboName}.`,
    content: {
      preheader: `${o.restaurantName} has your order for ${o.comboName}. We'll update you as it moves.`,
      eyebrow: 'Order confirmed',
      heading: `Your ${o.comboName} is ordered`,
      blocks: [
        { type: 'text', text: `Hi ${firstName(o.customerName)}, ${o.restaurantName} has your order and your voucher is now reserved for it. We'll email you when it's on its way.` },
        {
          type: 'details',
          rows: [
            { label: 'Order reference', value: o.reference },
            { label: 'Restaurant', value: o.restaurantName },
            { label: 'Combo', value: o.comboName },
            ...(o.choices?.length ? [{ label: 'Your choices', value: o.choices.join(' · ') }] : []),
            ...(o.deliverTo ? [{ label: 'Delivering to', value: o.deliverTo }] : []),
            { label: 'Paid with voucher', value: formatCurrency(o.amount, o.currency) }
          ]
        },
        { type: 'button', label: 'Track my order', url: trackUrl(site, o.reference) },
        { type: 'callout', tone: 'info', text: "To track this order you'll need the reference above and your secret key (your KokoSend username)." }
      ]
    }
  }
}

export function orderNewRestaurantEmail(o: OrderEmailData & { orderId: string; deliveryName: string; deliveryPhone: string }, site: string): EmailTemplate {
  return {
    subject: `New order ${o.reference}: ${o.comboName}`,
    summary: `New order ${o.reference} — ${o.comboName}.`,
    content: {
      preheader: `${o.comboName} for ${o.deliveryName}. Open it to accept and start preparing.`,
      eyebrow: 'New delivery order',
      heading: `New order: ${o.comboName}`,
      blocks: [
        { type: 'text', text: 'A customer has ordered from your menu and paid with a KokoSend voucher. Mark it as received once you start preparing it.' },
        {
          type: 'details',
          rows: [
            { label: 'Order reference', value: o.reference },
            { label: 'Combo', value: o.comboName },
            ...(o.choices?.length ? [{ label: 'Choices', value: o.choices.join(' · ') }] : []),
            { label: 'Deliver to', value: o.deliveryName },
            { label: 'Phone', value: o.deliveryPhone },
            ...(o.deliverTo ? [{ label: 'Address', value: o.deliverTo }] : []),
            { label: 'You will be credited', value: formatCurrency(o.amount, o.currency) }
          ]
        },
        { type: 'button', label: 'Open the order', url: `${site}/restaurant/orders/${o.orderId}` }
      ],
      footnote: `Sent to ${o.restaurantName} because a new KokoSend order was placed.`
    }
  }
}

export function orderNewAdminEmail(o: OrderEmailData & { orderId: string }, site: string): EmailTemplate {
  return {
    subject: `New order ${o.reference} at ${o.restaurantName}`,
    summary: `${o.reference} — ${o.restaurantName} — ${formatCurrency(o.amount, o.currency)}.`,
    content: {
      preheader: `${o.comboName} · ${formatCurrency(o.amount, o.currency)}`,
      eyebrow: 'Admin · New order',
      heading: `${o.reference} at ${o.restaurantName}`,
      blocks: [
        { type: 'details', rows: [{ label: 'Combo', value: o.comboName }, { label: 'Value', value: formatCurrency(o.amount, o.currency) }] },
        { type: 'button', label: 'View in admin', url: `${site}/admin/orders/${o.orderId}` }
      ]
    }
  }
}

export function orderProgressEmail(o: { reference: string; restaurantName: string; customerName: string }, status: 'received' | 'dispatched' | 'delivered', site: string): EmailTemplate {
  const copy = {
    received: { subject: `${o.restaurantName} is preparing your order`, heading: 'Your order is being prepared', text: `${o.restaurantName} has accepted order ${o.reference} and is getting it ready.` },
    dispatched: { subject: `Order ${o.reference} is on its way`, heading: 'Your order is on its way', text: `Order ${o.reference} has left ${o.restaurantName}. Keep your phone close in case the rider calls.` },
    delivered: { subject: `Order ${o.reference} delivered`, heading: 'Delivered. Enjoy your meal!', text: `${o.restaurantName} has marked order ${o.reference} as delivered. We hope you enjoy it.` }
  }[status]
  const blocks: EmailContent['blocks'] = [{ type: 'text', text: `Hi ${firstName(o.customerName)}, ${copy.text}` }]
  if (status === 'delivered') {
    blocks.push(
      { type: 'callout', tone: 'warning', title: "Didn't receive it?", text: 'Report it and our team will look into it with the restaurant.' },
      { type: 'button', label: 'Report a problem', url: trackUrl(site, o.reference) }
    )
  } else {
    blocks.push({ type: 'button', label: 'Track my order', url: trackUrl(site, o.reference) })
  }
  return {
    subject: copy.subject,
    summary: status === 'delivered' ? `Order ${o.reference} delivered. Didn't receive it? Report a problem.` : `Order ${o.reference} is now ${status}.`,
    content: { preheader: copy.text, eyebrow: 'Order update', heading: copy.heading, blocks }
  }
}

/** Order ended without delivery: rejected by the restaurant, or cancelled because it was disabled. */
export function orderNotCompletedEmail(
  o: { reference: string; restaurantName: string; voucherReleased: boolean; reason: 'rejected' | 'restaurant_disabled'; note?: string | null },
  site: string
): EmailTemplate {
  const why =
    o.reason === 'rejected'
      ? `${o.restaurantName} couldn't fulfil order ${o.reference}${o.note ? ` (${o.note})` : ''}.`
      : `order ${o.reference} was cancelled because ${o.restaurantName} is no longer available on KokoSend.`
  const outcome = o.voucherReleased
    ? 'Your voucher is active again, so you can use it at another partner restaurant.'
    : 'Your voucher had reached its expiry date, so it could not be reactivated.'
  return {
    subject: 'Your order could not be completed',
    summary: `Order ${o.reference} ${o.reason === 'rejected' ? 'rejected' : 'cancelled'}. ${outcome}`,
    content: {
      preheader: o.voucherReleased ? 'Good news: your voucher is active again.' : `Order ${o.reference} could not be completed.`,
      eyebrow: 'Order update',
      heading: 'Your order could not be completed',
      blocks: [
        { type: 'text', text: `We're sorry: ${why}` },
        { type: 'callout', tone: o.voucherReleased ? 'success' : 'warning', text: outcome },
        ...(o.voucherReleased ? [{ type: 'button' as const, label: 'Choose another restaurant', url: `${site}/menu` }] : [])
      ]
    }
  }
}

export function disputeReportedAdminEmail(o: { orderId: string; reference: string; restaurantName: string; note: string | null }, site: string): EmailTemplate {
  return {
    subject: `Delivery problem reported: ${o.reference}`,
    summary: `${o.reference} (${o.restaurantName}): ${o.note || 'Customer reported a problem with this order.'}`,
    content: {
      preheader: `A customer reported a problem with ${o.reference}. Review it before paying ${o.restaurantName}.`,
      eyebrow: 'Admin · Dispute',
      heading: `Problem reported on ${o.reference}`,
      blocks: [
        { type: 'details', rows: [{ label: 'Restaurant', value: o.restaurantName }, { label: 'Order', value: o.reference }] },
        { type: 'callout', tone: 'danger', title: 'Customer says', text: o.note || 'No details given.' },
        { type: 'text', text: "This order's credit is still in the restaurant's pending balance. Revoke it on the Payouts page if the complaint holds up." },
        { type: 'button', label: 'Review the order', url: `${site}/admin/orders/${o.orderId}` }
      ]
    }
  }
}

// ---------- customer: walk-in safety alert (rule 11) ----------
export function walkInRedeemedEmail(w: {
  customerName: string
  restaurantName: string
  currency: Currency
  billAmount: number
  creditedAmount: number
  forfeitedAmount: number
}): EmailTemplate {
  const used = formatCurrency(w.creditedAmount, w.currency)
  return {
    subject: `Your voucher was used at ${w.restaurantName}`,
    summary: `${used} redeemed at ${w.restaurantName}. Not you? Report it.`,
    content: {
      preheader: `${used} redeemed at ${w.restaurantName}. Not you? Reply to this email straight away.`,
      eyebrow: 'Voucher used',
      heading: `You used your voucher at ${w.restaurantName}`,
      blocks: [
        { type: 'text', text: `Hi ${firstName(w.customerName)}, your KokoSend voucher was just redeemed in person. Here's the receipt.` },
        {
          type: 'details',
          rows: [
            { label: 'Restaurant', value: w.restaurantName },
            { label: 'Bill', value: formatCurrency(w.billAmount, w.currency) },
            { label: 'Paid by your voucher', value: used },
            ...(w.forfeitedAmount > 0 ? [{ label: 'Unused balance (not kept)', value: formatCurrency(w.forfeitedAmount, w.currency) }] : []),
            ...(w.billAmount > w.creditedAmount ? [{ label: 'You paid the restaurant', value: formatCurrency(w.billAmount - w.creditedAmount, w.currency) }] : [])
          ]
        },
        { type: 'callout', tone: 'danger', title: "Wasn't you?", text: "If you didn't just use this voucher, reply to this email right away and we'll look into it." }
      ],
      footnote: 'Sent for your security every time a KokoSend voucher is used in person.'
    }
  }
}

// ---------- restaurant: money ----------
export function payoutProcessedEmail(p: { restaurantName: string; total: number; currency: Currency; count: number; reference: string | null }, site: string): EmailTemplate {
  const total = formatCurrency(p.total, p.currency)
  return {
    subject: `Payout of ${total} sent to ${p.restaurantName}`,
    summary: `${total} paid out across ${p.count} item${p.count === 1 ? '' : 's'}${p.reference ? ` (ref: ${p.reference})` : ''}.`,
    content: {
      preheader: `${total} for ${p.count} redemption${p.count === 1 ? '' : 's'} has been paid out.`,
      eyebrow: 'Payout',
      heading: `${total} is on its way`,
      blocks: [
        { type: 'text', text: `KokoSend has paid out your pending wallet balance for ${p.restaurantName}.` },
        {
          type: 'details',
          rows: [
            { label: 'Amount', value: total },
            { label: 'Redemptions covered', value: String(p.count) },
            ...(p.reference ? [{ label: 'Payment reference', value: p.reference }] : [])
          ]
        },
        { type: 'button', label: 'View my wallet', url: `${site}/restaurant/wallet` }
      ],
      footnote: `Sent to ${p.restaurantName} because a KokoSend payout was processed.`
    }
  }
}

export function payoutItemRevokedEmail(p: { restaurantName: string; amount: number; currency: Currency; source: string; reason: string }, site: string): EmailTemplate {
  const amount = formatCurrency(p.amount, p.currency)
  return {
    subject: `A ${amount} credit was removed from your wallet`,
    summary: `${amount} credit revoked (${p.source}): ${p.reason}`,
    content: {
      preheader: `${amount} for ${p.source} won't be paid out. Reason inside.`,
      eyebrow: 'Wallet update',
      heading: 'A credit was removed from your wallet',
      blocks: [
        { type: 'text', text: `KokoSend has removed a pending credit from ${p.restaurantName}'s wallet, so it won't be included in your next payout.` },
        { type: 'details', rows: [{ label: 'Credit', value: p.source }, { label: 'Amount', value: amount }] },
        { type: 'callout', tone: 'danger', title: 'Reason', text: p.reason },
        { type: 'text', text: "If you think this is wrong, reply to this email with any proof of delivery and we'll review it." },
        { type: 'button', label: 'View my wallet', url: `${site}/restaurant/wallet` }
      ]
    }
  }
}

// ---------- restaurant: invite ----------
export function restaurantInviteEmail(
  r: { name: string; contact_person: string; contact_email: string; currency: Currency },
  inviteUrl: string,
  validDays: number,
  isResend: boolean
): EmailTemplate {
  return {
    subject: isResend ? 'Your new KokoSend invite link' : "You're invited to join KokoSend",
    summary: isResend
      ? `Invite link resent to ${r.contact_person}. The previous link no longer works.`
      : `Invite link sent to ${r.contact_person} to set a password and go live.`,
    content: {
      preheader: `Set a password to activate ${r.name} on KokoSend — the link expires in ${validDays} days.`,
      eyebrow: 'Partner invitation',
      heading: `Welcome to KokoSend, ${r.name}`,
      blocks: [
        { type: 'text', text: `Hi ${firstName(r.contact_person)}, ${r.name} has been added as a KokoSend partner restaurant. Set a password to activate your account and start serving voucher customers.` },
        {
          type: 'details',
          rows: [
            { label: 'Restaurant', value: r.name },
            { label: 'Your login email', value: r.contact_email },
            { label: 'Currency', value: r.currency }
          ]
        },
        { type: 'button', label: 'Set up my account', url: inviteUrl },
        {
          type: 'steps',
          title: "Once you're in, you can",
          items: [
            { title: 'Receive delivery orders', body: 'Customers order combos from your menu and pay with their voucher.' },
            { title: 'Redeem walk-in vouchers', body: "Check a customer's code and secret key, enter the bill, done." },
            { title: 'Track your payouts', body: 'Every redemption is credited to your wallet and paid out by KokoSend.' }
          ]
        },
        {
          type: 'callout',
          tone: 'info',
          text: `This link works once and expires in ${validDays} days.${isResend ? ' Any earlier invite link we sent no longer works.' : ''}`
        }
      ],
      footnote: `Sent to ${r.contact_email} because ${r.name} was invited to KokoSend. Not expecting this? You can ignore it.`
    }
  }
}

// ---------- restaurant: password reset (Supabase Auth template) ----------
// Rendered once and uploaded to Supabase (Auth → Email Templates); Supabase fills in the link.
export function passwordResetEmail(): { subject: string; content: EmailContent } {
  return {
    subject: 'Reset your KokoSend password',
    content: {
      preheader: 'Use this link to choose a new password. It expires soon and works once.',
      eyebrow: 'Account security',
      heading: 'Reset your password',
      blocks: [
        { type: 'text', text: 'We received a request to reset the password for your KokoSend restaurant account. Tap the button below to choose a new one.' },
        { type: 'button', label: 'Choose a new password', url: '{{ .ConfirmationURL }}' },
        { type: 'callout', tone: 'info', text: "Didn't ask for this? You can ignore this email — your password stays the same." }
      ],
      footnote: 'This link works once and expires shortly for your security.'
    }
  }
}
