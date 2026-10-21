import type { UserProfile } from '../services/profile'
import type { ClientLocation } from '../services/clientLocations'
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

// Fase 40 (TRD Adendo v1.66, N6): um local guardado do cliente vira a morada do pedido. É COPIADO
// para `location` aqui, em vez de se enviar `saved_location_id`: assim o pedido continua a poder ir
// para a fila offline (Fase 5) e sai igual mesmo sem rede.
export function localGuardadoParaPedido(local: ClientLocation): ServiceRequestLocationInput {
  const hierarchy = {
    province: local.province,
    district: local.district ?? undefined,
    neighborhood: local.neighborhood ?? undefined,
  }
  return local.latitude !== null && local.longitude !== null
    ? { latitude: local.latitude, longitude: local.longitude, ...hierarchy }
    : hierarchy
}

// Valor da escolha «a localização do perfil» em EscolhaDoLocal (os outros valores são ids de locais).
export const LOCAL_DO_PERFIL = 'perfil'

// A morada do pedido segundo a escolha: o perfil, ou o local guardado escolhido (null se ainda não
// carregou ou foi apagado entretanto — o botão de enviar fica desligado).
export function moradaEscolhida(
  profile: UserProfile | undefined,
  escolha: string,
  locais: ClientLocation[] | undefined,
): ServiceRequestLocationInput | null {
  if (escolha === LOCAL_DO_PERFIL) return profile ? localDoPedido(profile) : null
  const local = locais?.find((l) => l.id === escolha)
  return local ? localGuardadoParaPedido(local) : null
}
