// shared/utils/phone.ts — auto-imported in both the app and the server.
// Every phone number is stored in international E.164 form ("+2348030000001") so WhatsApp and SMS
// can reach it. Validation uses libphonenumber-js (Google's numbering rules, compact "min" data).
import { getCountries, getCountryCallingCode, parsePhoneNumberFromString, validatePhoneNumberLength, type CountryCode } from 'libphonenumber-js/min'
import type { Currency } from '../types/models'

export type PhoneCountry = CountryCode

/** Where a number most likely belongs when we only know the money: used as the input's default. */
export const CURRENCY_COUNTRY: Record<Currency, PhoneCountry> = { NGN: 'NG', KES: 'KE', USD: 'US' }

/** Shown first in the picker: our markets and the likeliest diaspora countries. */
const PINNED: PhoneCountry[] = ['NG', 'KE', 'GH', 'ZA', 'US', 'GB']

const regionNames = typeof Intl !== 'undefined' && 'DisplayNames' in Intl ? new Intl.DisplayNames(['en'], { type: 'region' }) : null
export const countryName = (code: PhoneCountry) => regionNames?.of(code) ?? code
export const dialCode = (code: PhoneCountry) => `+${getCountryCallingCode(code)}`
/** 🇳🇬 from "NG" (regional indicator letters; shows as "NG" where flag emoji aren't supported). */
export const countryFlag = (code: PhoneCountry) => String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))

export interface PhoneCountryOption {
  code: PhoneCountry
  name: string
  dial: string
}

let countryOptions: PhoneCountryOption[] | null = null
/** Every country libphonenumber knows: pinned ones first, then alphabetical. */
export function phoneCountries(): PhoneCountryOption[] {
  if (!countryOptions) {
    const toOption = (code: PhoneCountry) => ({ code, name: countryName(code), dial: dialCode(code) })
    const rest = getCountries().filter((c) => !PINNED.includes(c)).map(toOption).sort((a, b) => a.name.localeCompare(b.name))
    countryOptions = [...PINNED.map(toOption), ...rest]
  }
  return countryOptions
}

/**
 * A typed number → "+2348030000001", or null if it isn't a valid number. Without
 * `defaultCountry` the number must already start with + and its country code.
 */
export function toE164(raw: string, defaultCountry?: PhoneCountry): string | null {
  const parsed = parsePhoneNumberFromString(raw.trim(), defaultCountry)
  return parsed?.isValid() ? parsed.number : null
}

/** "+234 803 000 0001" for display. */
export function formatPhone(value: string) {
  return parsePhoneNumberFromString(value)?.formatInternational() ?? value
}

/** Why a number entered for `country` isn't valid yet, in plain words (null when it's fine). */
export function phoneProblem(national: string, country: PhoneCountry): string | null {
  if (!national.trim()) return null
  if (toE164(national, country)) return null
  const name = countryName(country)
  const length = validatePhoneNumberLength(national, country)
  if (length === 'TOO_SHORT') return `That's too short for a ${name} number.`
  if (length === 'TOO_LONG') return `That's too long for a ${name} number.`
  return `That doesn't look like a valid ${name} number. Check the number and the country.`
}
