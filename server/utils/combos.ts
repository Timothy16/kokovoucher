// server/utils/combos.ts
import { z } from 'zod'
import { COMBO_CATEGORIES, MAX_SODA_OPTIONS } from '#shared/types/models'

const text = (label: string, max: number) =>
  z.string({ error: `Enter ${label}.` }).trim().min(1, `Enter ${label}.`).max(max, `The ${label} is too long.`)

/** Object path inside the combo-images bucket, as uploaded by the admin UI (rule 23: required). */
const imagePath = z.string({ error: 'Upload a photo for this combo.' }).regex(/^[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$/i, 'Upload a photo for this combo.')

// Rule 24: admin-named sodas. "Water" has its own toggle, so it can't also be a soda; names are
// unique (case-insensitive) because the customer's pick is stored and matched by name.
const sodaOptions = z
  .array(z.string().trim().min(1, 'Soda names can’t be empty.').max(40, 'A soda name is too long.'))
  .max(MAX_SODA_OPTIONS, `Up to ${MAX_SODA_OPTIONS} soda options.`)
  .refine((list) => !list.some((s) => s.toLowerCase() === 'water'), 'Use the “Water available” toggle instead of a soda named Water.')
  .refine((list) => new Set(list.map((s) => s.toLowerCase())).size === list.length, 'Each soda can only be listed once.')

export const comboSchema = z.object({
  name: text('combo name', 80),
  shortDescription: text('short description', 140),
  description: text('description', 1000),
  category: z.enum(COMBO_CATEGORIES, { error: 'Pick a category.' }),
  imagePath,
  spiceOption: z.boolean(),
  sodaOptions,
  waterOption: z.boolean()
})

export const comboUpdateSchema = comboSchema.partial()

export function comboColumns(input: z.infer<typeof comboUpdateSchema>) {
  return {
    ...(input.name !== undefined && { name: input.name }),
    ...(input.shortDescription !== undefined && { short_description: input.shortDescription }),
    ...(input.description !== undefined && { description: input.description }),
    ...(input.category !== undefined && { category: input.category }),
    ...(input.imagePath !== undefined && { image_path: input.imagePath }),
    ...(input.spiceOption !== undefined && { spice_option: input.spiceOption }),
    ...(input.sodaOptions !== undefined && { soda_options: input.sodaOptions }),
    ...(input.waterOption !== undefined && { water_option: input.waterOption })
  }
}
