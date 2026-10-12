import { useMemo, useState } from 'react'
import { TRABALHOS_DE_DEMONSTRACAO } from '../data/trabalhosDeDemonstracao'
import type { FeaturedWork } from '../services/featuredWorks'
import { useFeaturedWorks } from './useFeaturedWorks'
import { useServiceCategories } from './useServiceCategories'

// Categorias de reserva para quando a API não respondeu (offline ou ainda a carregar).
const CATEGORIAS_POR_OMISSAO = [
  { slug: 'canalizacao', name: 'Canalização' },
  { slug: 'eletricidade', name: 'Eletricidade' },
  { slug: 'pintura', name: 'Pintura' },
  { slug: 'jardinagem', name: 'Jardinagem' },
  { slug: 'climatizacao', name: 'Climatização' },
  { slug: 'carpintaria', name: 'Carpintaria' },
  { slug: 'limpeza-domestica', name: 'Limpeza' },
  { slug: 'serralharia', name: 'Serralharia' },
]

// Cada slider mostra só os trabalhos do seu tema. Antes completava-se com `concat(slice(...))`,
// o que repetia o mesmo cartão na fila e fazia o coração de um acender o do outro.
const doTema = (works: FeaturedWork[], ...slugs: string[]) => works.filter((w) => slugs.includes(w.service_slug))

// O que a montra de trabalhos pode estar a mostrar. Cada estado tem texto próprio no ecrã:
// «a carregar», «erro» e «vazio» não são a mesma coisa (CLAUDE.md, Secção 3).
export type EstadoDaMontra = 'a-carregar' | 'erro' | 'vazio' | 'pronto'

export function useHomeFeed() {
  const categoriasQuery = useServiceCategories()
  const trabalhosQuery = useFeaturedWorks()
  const [pesquisa, setPesquisa] = useState('')
  const [categoria, setCategoria] = useState('all')

  // Opção de avaliação visual (ver data/trabalhosDeDemonstracao.ts): só quando está ligada E a API
  // não trouxe trabalhos reais — com trabalhos reais mostram-se sempre os reais.
  const demonstracaoLigada = import.meta.env.VITE_MONTRA_DE_DEMONSTRACAO === 'true'
  const reais = useMemo(() => trabalhosQuery.data ?? [], [trabalhosQuery.data])
  const emDemonstracao = demonstracaoLigada && !trabalhosQuery.isLoading && reais.length === 0
  const trabalhos = emDemonstracao ? TRABALHOS_DE_DEMONSTRACAO : reais

  const estado: EstadoDaMontra =
    trabalhosQuery.isLoading ? 'a-carregar' : trabalhos.length > 0 ? 'pronto' : trabalhosQuery.isError ? 'erro' : 'vazio'

  const categorias = useMemo(() => {
    const daApi = categoriasQuery.data?.map(({ slug, name }) => ({ slug, name }))
    return daApi && daApi.length > 0 ? daApi : CATEGORIAS_POR_OMISSAO
  }, [categoriasQuery.data])

  const filtroActivo = categoria !== 'all' || pesquisa.trim() !== ''

  const trabalhosFiltrados = useMemo(() => {
    const termo = pesquisa.toLowerCase().trim()
    return trabalhos.filter((w) => {
      if (categoria !== 'all' && w.service_slug !== categoria) return false
      if (!termo) return true
      return [w.title, w.service_name, w.professional_name, w.location].some((campo) => campo.toLowerCase().includes(termo))
    })
  }, [categoria, pesquisa, trabalhos])

  function limparFiltros() {
    setCategoria('all')
    setPesquisa('')
  }

  return {
    pesquisa,
    setPesquisa,
    categoria,
    setCategoria,
    categorias,
    filtroActivo,
    trabalhosFiltrados,
    limparFiltros,
    estado,
    emDemonstracao,
    aoTentarDeNovo: () => void trabalhosQuery.refetch(),
    destaques: trabalhos,
    canalizacao: doTema(trabalhos, 'canalizacao'),
    eletricidade: doTema(trabalhos, 'eletricidade'),
    exteriores: doTema(trabalhos, 'pintura', 'jardinagem', 'climatizacao'),
  }
}
