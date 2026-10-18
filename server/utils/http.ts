// server/utils/http.ts
import type { H3Event } from 'h3'
import { z } from 'zod'

/** Reads and validates a JSON body. Responds 400 with the first readable problem. */
export async function parseBody<T extends z.ZodType>(event: H3Event, schema: T): Promise<z.infer<T>> {
  const result = schema.safeParse(await readBody(event).catch(() => undefined))
  if (!result.success) {
    const issue = result.error.issues[0]
    throw createError({ statusCode: 400, message: issue?.message ?? 'Invalid request.' })
  }
  return result.data
}

/** Route param that must be a UUID (all our primary keys are). */
export function uuidParam(event: H3Event, name: string): string {
  const value = getRouterParam(event, name) ?? ''
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    throw createError({ statusCode: 404, message: 'Not found.' })
  }
  return value
}

export function fail(statusCode: number, message: string): never {
  throw createError({ statusCode, message })
}

/**
 * A phone number in full international form, stored as E.164 ("+2348030000001") so WhatsApp can
 * reach it. The app's PhoneInput always sends this form; anything without a valid country code is
 * refused with a message saying so.
 */
export const internationalPhone = (label: string) =>
  z.string({ error: `Enter the ${label}.` }).trim().transform((value, ctx) => {
    const e164 = toE164(value)
    if (!e164) {
      ctx.addIssue({ code: 'custom', message: `Enter a valid ${label} with its country code, e.g. +234 803 000 0001.` })
      return z.NEVER
    }
    return e164
  })

/** A map location picked from the address suggestions; null/absent when the address was typed. */
export const geoPoint = z
  .object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180)
  })
  .nullable()
  .optional()
