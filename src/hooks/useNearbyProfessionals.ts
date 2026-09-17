import { useQuery } from '@tanstack/react-query'
import { fetchNearbyProfessionals, type NearbyProfessionalsParams } from '../services/nearbyProfessionals'

// coordinates null enquanto o GPS ainda não respondeu (ver useGeolocation) — sem
// coordenadas não há pedido a fazer, evita um round-trip que terminaria em 400.
export function useNearbyProfessionals(
  coordinates: { latitude: number; longitude: number } | null,
  options?: Pick<NearbyProfessionalsParams, 'radiusKm' | 'limit' | 'offset'>,
) {
  return useQuery({
    queryKey: ['professionals', 'nearby', coordinates, options?.radiusKm, options?.offset],
    queryFn: () =>
      fetchNearbyProfessionals({
        latitude: coordinates!.latitude,
        longitude: coordinates!.longitude,
        ...options,
      }),
    enabled: coordinates !== null,
  })
}
