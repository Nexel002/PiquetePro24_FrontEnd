import type { UserProfile } from '../services/profile'
import type { ServiceRequestLocationInput } from '../services/serviceRequests'

// O local do serviço é o que o cliente já registou no perfil (o onboarding obriga a ter
// localização) — não se pede outra vez. Sem província não há local válido para o backend
// (province é obrigatória em ambas as variantes). Partilhado entre o pedido a 3 profissionais e o
// pedido direto («Solicitar serviço»).
export function localDoPedido(profile: UserProfile): ServiceRequestLocationInput | null {
  if (!profile.province) return null

  const hierarchy = {
    province: profile.province,
    district: profile.district ?? undefined,
    neighborhood: profile.neighborhood ?? undefined,
  }

  return profile.latitude !== null && profile.longitude !== null
    ? { latitude: profile.latitude, longitude: profile.longitude, ...hierarchy }
    : hierarchy
}

export function textoDoLocal(local: ServiceRequestLocationInput | null): string | null {
  return local ? [local.neighborhood, local.district, local.province].filter(Boolean).join(', ') : null
}
