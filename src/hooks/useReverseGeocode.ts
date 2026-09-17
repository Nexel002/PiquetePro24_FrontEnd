import { useQuery } from '@tanstack/react-query'
import { reverseGeocode } from '../services/geocoding'

// Converte coordenadas GPS num nome de lugar legível (ex. "Avenida Julius Nyerere,
// Maputo, Moçambique") e na hierarquia administrativa (província/distrito/bairro) em
// vez de mostrar latitude/longitude ao utilizador. `null` desativa a query — usado
// quando ainda não há coordenadas para traduzir.
export function useReverseGeocode(coordinates: { latitude: number; longitude: number } | null) {
  return useQuery({
    queryKey: ['reverse-geocode', coordinates?.latitude, coordinates?.longitude],
    queryFn: () => reverseGeocode(coordinates!.latitude, coordinates!.longitude),
    enabled: coordinates !== null,
    // O nome de um lugar não muda — evita reconsultar a API paga do Google para as
    // mesmas coordenadas ao longo da sessão.
    staleTime: Infinity,
  })
}
