import type { ServiceArea } from '../../services/catalog'

// O texto que o cliente lê no catálogo («Atende: até 25 km · Cidade de Maputo, Maputo»). null quando
// o profissional não definiu zona — o catálogo não mostra nada nesse caso.
export function descreverZona(area: ServiceArea | undefined): string | null {
  if (!area || (area.radius_km === null && area.provinces.length === 0)) return null
  const partes = [area.radius_km !== null ? `até ${area.radius_km} km` : null, area.provinces.length > 0 ? area.provinces.join(', ') : null]
  return `Atende: ${partes.filter(Boolean).join(' · ')}`
}
