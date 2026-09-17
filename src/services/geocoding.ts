import { api } from '../lib/api'

export interface ReverseGeocodeResult {
  placeName: string
  province: string | null
  district: string | null
  neighborhood: string | null
}

export async function reverseGeocode(latitude: number, longitude: number): Promise<ReverseGeocodeResult> {
  const response = await api.get<ReverseGeocodeResult>('/geocode/reverse', {
    params: { latitude, longitude },
  })
  return response.data
}
