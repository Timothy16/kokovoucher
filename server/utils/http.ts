// server/utils/http.ts
import type { H3Event } from 'h3'
import type { z } from 'zod'

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
