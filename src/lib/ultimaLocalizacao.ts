export interface UltimaLocalizacao {
  latitude: number
  longitude: number
  // Epoch em ms de quando o GPS respondeu — mostra-se ao utilizador («há 2 h»), porque
  // uma posição antiga usada em silêncio parece actual e dá resultados enganadores.
  guardadaEm: number
}

const CHAVE = 'piquete:ultima-localizacao'

// Mesmos limites de Moçambique que o backend aplica (profileController.coordinatesSchema).
export function dentroDeMocambique({ latitude, longitude }: { latitude: number; longitude: number }): boolean {
  return latitude >= -27 && latitude <= -10 && longitude >= 30 && longitude <= 41
}

// Depois disto a posição já não presta como substituta do GPS (a pessoa pode estar noutra
// cidade): é preferível a lista sem distâncias do que distâncias de um sítio onde já não está.
export const IDADE_MAXIMA_MS = 30 * 24 * 60 * 60 * 1000

// Mesmos limites de Moçambique que o backend aplica (profileController.coordinatesSchema):
// o valor vem de localStorage, que o utilizador ou uma extensão pode ter alterado, e um
// valor fora destes limites seria recusado pelo backend com um 400 sem explicação.
function valida(valor: unknown, agora: number): valor is UltimaLocalizacao {
  if (typeof valor !== 'object' || valor === null) return false
  const { latitude, longitude, guardadaEm } = valor as Record<string, unknown>
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    typeof guardadaEm === 'number' &&
    dentroDeMocambique({ latitude, longitude }) &&
    guardadaEm <= agora &&
    agora - guardadaEm <= IDADE_MAXIMA_MS
  )
}

export function lerUltimaLocalizacao(agora = Date.now()): UltimaLocalizacao | null {
  try {
    const bruto = localStorage.getItem(CHAVE)
    if (!bruto) return null
    const valor: unknown = JSON.parse(bruto)
    return valida(valor, agora) ? valor : null
  } catch {
    // localStorage indisponível (modo privado, quota) ou JSON corrompido: sem fallback,
    // não é erro — o GPS e a selecção manual continuam a funcionar.
    return null
  }
}

export function guardarUltimaLocalizacao(coordenadas: { latitude: number; longitude: number }, agora = Date.now()): void {
  try {
    const valor: UltimaLocalizacao = { latitude: coordenadas.latitude, longitude: coordenadas.longitude, guardadaEm: agora }
    localStorage.setItem(CHAVE, JSON.stringify(valor))
  } catch {
    // Mesmo motivo: guardar é melhor-esforço.
  }
}

// «há 5 min», «há 3 h», «há 2 dias» — só para o aviso.
export function descreverIdade(guardadaEm: number, agora = Date.now()): string {
  const minutos = Math.max(0, Math.round((agora - guardadaEm) / 60_000))
  if (minutos < 1) return 'agora mesmo'
  if (minutos < 60) return `há ${minutos} min`
  const horas = Math.round(minutos / 60)
  if (horas < 24) return `há ${horas} h`
  const dias = Math.round(horas / 24)
  return `há ${dias} ${dias === 1 ? 'dia' : 'dias'}`
}
