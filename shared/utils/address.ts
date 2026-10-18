// shared/utils/address.ts — auto-imported in both the app and the server.
import type { Currency } from '../types/models'
import { CURRENCY_COUNTRY } from './phone'

export interface GeoPoint {
  lat: number
  lng: number
}

/** Country to search addresses in, from the money involved (NGN → ng, KES → ke, USD → us). */
export const addressCountry = (currency: Currency) => CURRENCY_COUNTRY[currency].toLowerCase()

/** A link that opens the location in Google Maps (app on phones, web elsewhere). */
export const mapsLink = (lat: number, lng: number) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
