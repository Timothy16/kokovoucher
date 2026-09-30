// server/utils/email.ts
// Email transport (Resend) + the KokoSend email design system.
//
// Every email is built from the same blocks and one layout, so they all look and behave the same:
// table-based and inline-styled (Gmail, Outlook, Apple Mail), full-width on phones, readable with
// images off (no image assets at all), with a hidden inbox preheader and a plain-text twin.
import { Resend } from 'resend'

// ---------- design tokens (mirror the app's) ----------
const C = {
  page: '#F4F2EE',
  card: '#FFFFFF',
  border: '#E7E4DD',
  primary: '#2F7D6B',
  primarySoft: '#EEF6F3',
  primaryLine: '#BFD9D0',
  ink: '#1A1A1A',
  muted: '#6B6B6B',
  faint: '#8A857C',
  warning: '#B7791F',
  warningSoft: '#FDF6E7',
  error: '#C53030',
  errorSoft: '#FCEDED',
  success: '#2E9E6B',
  successSoft: '#EAF7F0'
}
const FONT = "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
const MONO = "'SFMono-Regular', Menlo, Consolas, 'Liberation Mono', 'Courier New', monospace"

// ---------- content model ----------
export type EmailBlock =
  | { type: 'text'; text: string }
  | { type: 'voucher'; amount: string; code: string; expires: string; note?: string }
  | { type: 'details'; rows: { label: string; value: string }[] }
  | { type: 'steps'; title?: string; items: { title: string; body: string }[] }
  | { type: 'callout'; tone: 'info' | 'warning' | 'danger' | 'success'; title?: string; text: string }
  | { type: 'button'; label: string; url: string }

export interface EmailContent {
  /** Inbox preview line (hidden in the body). Never put codes or secrets here. */
  preheader: string
  eyebrow?: string
  heading: string
  blocks: EmailBlock[]
  /** Small print under the card: why they got this email. */
  footnote?: string
}

export interface SendResult {
  ok: boolean
  providerMessageId: string | null
  error: string | null
}

// ---------- transport ----------
let resend: Resend | null = null

function resendClient() {
  if (!resend) {
    const { resendApiKey } = useRuntimeConfig()
    if (!resendApiKey) throw new Error('NUXT_RESEND_API_KEY is not set')
    resend = new Resend(resendApiKey)
  }
  return resend
}

export async function sendEmail(to: string, subject: string, content: EmailContent, replyTo?: string | null): Promise<SendResult> {
  try {
    const { emailFrom } = useRuntimeConfig()
    const { data, error } = await resendClient().emails.send({
      from: emailFrom,
      to,
      subject,
      html: renderEmailHtml(subject, content, !!replyTo),
      text: renderEmailText(content, !!replyTo),
      ...(replyTo ? { replyTo } : {})
    })
    if (error) return { ok: false, providerMessageId: null, error: error.message }
    return { ok: true, providerMessageId: data?.id ?? null, error: null }
  } catch (e) {
    return { ok: false, providerMessageId: null, error: e instanceof Error ? e.message : 'Unknown email error' }
  }
}

// ---------- rendering ----------
function esc(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

const label = (text: string, color = C.primary) =>
  `<div style="font-size:12px;line-height:16px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:${color}">${esc(text)}</div>`

const row = (html: string, padding = '0 40px 20px', className = 'px') => `<tr><td class="${className}" style="padding:${padding}">${html}</td></tr>`

function renderBlock(b: EmailBlock): string {
  switch (b.type) {
    case 'text':
      return row(`<p style="margin:0;font-size:16px;line-height:26px;color:${C.ink}">${esc(b.text)}</p>`)

    case 'voucher':
      return row(`
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:2px dashed ${C.primary};border-radius:16px;background:${C.primarySoft}">
  <tr><td align="center" style="padding:26px 20px 20px">
    ${label('Voucher value')}
    <div class="amount" style="margin-top:6px;font-size:42px;line-height:48px;font-weight:800;letter-spacing:-0.5px;color:${C.ink}">${esc(b.amount)}</div>
    ${b.note ? `<div style="margin-top:6px;font-size:13px;line-height:19px;color:${C.muted}">${esc(b.note)}</div>` : ''}
  </td></tr>
  <tr><td style="padding:0 20px"><div style="height:0;border-top:2px dashed ${C.primaryLine};line-height:0;font-size:0">&nbsp;</div></td></tr>
  <tr><td align="center" style="padding:20px 20px 24px">
    ${label('Your voucher code')}
    <div class="code" style="display:inline-block;margin-top:10px;padding:12px 22px;background:${C.card};border:1px solid ${C.primaryLine};border-radius:12px;font-family:${MONO};font-size:28px;line-height:34px;font-weight:700;letter-spacing:5px;color:${C.ink}">${esc(b.code)}</div>
    <div style="margin-top:14px;font-size:14px;line-height:20px;color:${C.muted}">Valid until <strong style="color:${C.ink}">${esc(b.expires)}</strong></div>
  </td></tr>
</table>`)

    case 'details':
      return row(`
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${C.border};border-radius:12px">
${b.rows
  .map(
    (r, i) => `  <tr>
    <td style="padding:12px 16px;${i ? `border-top:1px solid ${C.border};` : ''}font-size:14px;line-height:20px;color:${C.muted}">${esc(r.label)}</td>
    <td align="right" style="padding:12px 16px;${i ? `border-top:1px solid ${C.border};` : ''}font-size:14px;line-height:20px;font-weight:700;color:${C.ink}">${esc(r.value)}</td>
  </tr>`
  )
  .join('\n')}
</table>`)

    case 'steps':
      return row(`
${b.title ? `<div style="margin:0 0 14px;font-size:16px;line-height:22px;font-weight:800;color:${C.ink}">${esc(b.title)}</div>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${b.items
  .map(
    (s, i) => `  <tr>
    <td width="36" valign="top" style="padding:${i ? '14px' : '0'} 0 0">
      <div style="width:28px;height:28px;border-radius:14px;background:${C.primary};color:#FFFFFF;font-size:14px;line-height:28px;font-weight:800;text-align:center">${i + 1}</div>
    </td>
    <td valign="top" style="padding:${i ? '14px' : '0'} 0 0 6px">
      <div style="font-size:15px;line-height:22px;font-weight:700;color:${C.ink}">${esc(s.title)}</div>
      <div style="margin-top:2px;font-size:14px;line-height:21px;color:${C.muted}">${esc(s.body)}</div>
    </td>
  </tr>`
  )
  .join('\n')}
</table>`)

    case 'callout': {
      const tone = {
        info: [C.primarySoft, C.primary],
        success: [C.successSoft, C.success],
        warning: [C.warningSoft, C.warning],
        danger: [C.errorSoft, C.error]
      }[b.tone]
      return row(`
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${tone[0]};border-left:4px solid ${tone[1]};border-radius:10px">
  <tr><td style="padding:14px 18px">
    ${b.title ? `<div style="font-size:14px;line-height:20px;font-weight:800;color:${C.ink}">${esc(b.title)}</div>` : ''}
    <div style="${b.title ? 'margin-top:3px;' : ''}font-size:14px;line-height:21px;color:${C.ink}">${esc(b.text)}</div>
  </td></tr>
</table>`)
    }

    case 'button':
      // "Bulletproof" button: the whole cell is the link's background, so it survives images-off
      // and Outlook. Full width reads as the one obvious action, especially on phones.
      return row(`
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
  <tr><td align="center" bgcolor="${C.primary}" style="border-radius:12px;background:${C.primary}">
    <a href="${esc(b.url)}" target="_blank" style="display:block;padding:15px 24px;font-family:${FONT};font-size:16px;line-height:22px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:12px">${esc(b.label)} &rarr;</a>
  </td></tr>
</table>
<p style="margin:12px 0 0;font-size:12px;line-height:18px;color:${C.faint};text-align:center">Button not working? Paste this link into your browser:<br><a href="${esc(b.url)}" style="color:${C.primary};word-break:break-all">${esc(b.url)}</a></p>`)
  }
}

export function renderEmailHtml(subject: string, c: EmailContent, canReply: boolean) {
  // Spacer characters stop clients pulling body text into the preview after the preheader.
  const preheaderPad = '&#847;&zwnj;&nbsp;'.repeat(60)
  return `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>${esc(subject)}</title>
<style>
  body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; }
  table { border-collapse: separate; }
  a { color: ${C.primary}; }
  @media (max-width: 600px) {
    .container { width: 100% !important; }
    .px { padding-left: 22px !important; padding-right: 22px !important; }
    .top { padding-top: 28px !important; }
    .h1 { font-size: 24px !important; line-height: 31px !important; }
    .amount { font-size: 36px !important; line-height: 42px !important; }
    .code { font-size: 22px !important; letter-spacing: 3px !important; padding: 10px 14px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${C.page};font-family:${FONT}">
<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;mso-hide:all">${esc(c.preheader)}${preheaderPad}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.page}" style="background:${C.page}">
<tr><td align="center" style="padding:32px 12px">
  <table role="presentation" class="container" width="560" cellpadding="0" cellspacing="0" style="width:560px;max-width:560px">

    <tr><td style="padding:0 6px 18px">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td width="36" height="36" align="center" bgcolor="${C.primary}" style="width:36px;height:36px;border-radius:10px;background:${C.primary};color:#FFFFFF;font-family:${FONT};font-size:19px;line-height:36px;font-weight:800">K</td>
        <td style="padding-left:10px;font-family:${FONT};font-size:19px;line-height:24px;font-weight:800;letter-spacing:-0.3px;color:${C.ink}">KokoSend</td>
      </tr></table>
    </td></tr>

    <tr><td bgcolor="${C.card}" style="background:${C.card};border:1px solid ${C.border};border-radius:20px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family:${FONT}">
        <tr><td style="height:6px;line-height:6px;font-size:0;background:${C.primary};border-radius:20px 20px 0 0">&nbsp;</td></tr>
        ${row(
          `${c.eyebrow ? `${label(c.eyebrow)}<div style="height:10px;line-height:10px;font-size:0">&nbsp;</div>` : ''}<h1 class="h1" style="margin:0;font-size:28px;line-height:36px;font-weight:800;letter-spacing:-0.4px;color:${C.ink}">${esc(c.heading)}</h1>`,
          '36px 40px 20px',
          'px top'
        )}
        ${c.blocks.map(renderBlock).join('\n')}
        <tr><td style="height:16px;line-height:16px;font-size:0">&nbsp;</td></tr>
      </table>
    </td></tr>

    <tr><td align="center" style="padding:24px 24px 8px;font-family:${FONT};font-size:12px;line-height:19px;color:${C.faint}">
      ${canReply ? `<div style="margin-bottom:8px;color:${C.muted}">Questions? Just reply to this email — a real person will get back to you.</div>` : ''}
      ${c.footnote ? `<div style="margin-bottom:8px">${esc(c.footnote)}</div>` : ''}
      <div>KokoSend · Food vouchers you can use at partner restaurants</div>
    </td></tr>

  </table>
</td></tr>
</table>
</body>
</html>`
}

export function renderEmailText(c: EmailContent, canReply: boolean) {
  const out: string[] = ['KOKOSEND', '']
  if (c.eyebrow) out.push(c.eyebrow.toUpperCase())
  out.push(c.heading, '')
  for (const b of c.blocks) {
    if (b.type === 'text') out.push(b.text, '')
    if (b.type === 'voucher') out.push(`VOUCHER VALUE: ${b.amount}`, ...(b.note ? [b.note] : []), `YOUR CODE: ${b.code}`, `Valid until ${b.expires}`, '')
    if (b.type === 'details') out.push(...b.rows.map((r) => `${r.label}: ${r.value}`), '')
    if (b.type === 'steps') out.push(...(b.title ? [b.title] : []), ...b.items.map((s, i) => `${i + 1}. ${s.title} — ${s.body}`), '')
    if (b.type === 'callout') out.push(b.title ? `${b.title}: ${b.text}` : b.text, '')
    if (b.type === 'button') out.push(`${b.label}: ${b.url}`, '')
  }
  if (canReply) out.push('Questions? Just reply to this email.')
  if (c.footnote) out.push(c.footnote)
  return out.join('\n').trim()
}
