import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { INVITATIONS_PER_REQUEST } from '../services/invitations'
import type { SearchedProfessional } from '../services/professionalSearch'
import type { NewServiceRequestState } from '../pages/NewServiceRequest'

interface Servico {
  id: string
  slug: string
  name: string
}

// A escolha de profissionais para um pedido. O serviço pedido é o da categoria filtrada ou,
// sem filtro, o único serviço que todos os resultados têm em comum; sem serviço não há
// pedido possível. Escolhe-se um número fixo (INVITATIONS_PER_REQUEST), ou todos, se houver
// menos resultados do que isso e já não houver mais páginas.
export function useSelecaoParaPedido(opcoes: {
  categoria: string
  categorias: Servico[] | undefined
  profissionais: SearchedProfessional[]
  temMaisPaginas: boolean
}) {
  const { categoria, categorias, profissionais, temMaisPaginas } = opcoes
  const navigate = useNavigate()
  const [idsEscolhidos, setIdsEscolhidos] = useState<string[]>([])

  const servicoPedido = useMemo(() => {
    if (categoria) return categorias?.find((service) => service.slug === categoria) ?? null
    if (profissionais.length === 0) return null
    const comuns = profissionais[0].services.filter((service) =>
      profissionais.every((profissional) => profissional.services.some((s) => s.id === service.id)),
    )
    return comuns.length === 1 ? comuns[0] : null
  }, [categoria, categorias, profissionais])

  const necessarios = temMaisPaginas ? INVITATIONS_PER_REQUEST : Math.min(INVITATIONS_PER_REQUEST, profissionais.length)
  const escolhidos = profissionais.filter((profissional) => idsEscolhidos.includes(profissional.id))
  const podeEnviar = servicoPedido !== null && necessarios > 0 && escolhidos.length === necessarios

  function alternar(profissionalId: string) {
    setIdsEscolhidos((atuais) =>
      atuais.includes(profissionalId) ? atuais.filter((id) => id !== profissionalId) : [...atuais, profissionalId],
    )
  }

  function enviar() {
    if (!servicoPedido || !podeEnviar) return
    const state: NewServiceRequestState = {
      categoryId: servicoPedido.id,
      categoryName: servicoPedido.name,
      professionals: escolhidos.map((profissional) => ({ id: profissional.id, full_name: profissional.full_name })),
    }
    navigate('/novo-pedido', { state })
  }

  return { servicoPedido, necessarios, escolhidos, idsEscolhidos, podeEnviar, alternar, enviar }
}
