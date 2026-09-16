import { api } from '../lib/api'

export async function reverseGeocode(latitude: number, longitude: number): Promise<string> {
  const response = await api.get<{ placeName: string }>('/geocode/reverse', {
    params: { latitude, longitude },
  })
  return response.data.placeName
}
