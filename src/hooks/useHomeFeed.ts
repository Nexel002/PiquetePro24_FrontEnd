import { useMemo, useState } from 'react'
import { FEATURED_WORKS } from '../data/featuredWorks'
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
const doTema = (...slugs: string[]) => FEATURED_WORKS.filter((w) => slugs.includes(w.serviceSlug))
const CANALIZACAO = doTema('canalizacao')
const ELETRICIDADE = doTema('eletricidade')
const EXTERIORES = doTema('pintura', 'jardinagem', 'climatizacao')

export function useHomeFeed() {
  const categoriasQuery = useServiceCategories()
  const [pesquisa, setPesquisa] = useState('')
  const [categoria, setCategoria] = useState('all')

  const categorias = useMemo(() => {
    const daApi = categoriasQuery.data?.map(({ slug, name }) => ({ slug, name }))
    return daApi && daApi.length > 0 ? daApi : CATEGORIAS_POR_OMISSAO
  }, [categoriasQuery.data])

  const filtroActivo = categoria !== 'all' || pesquisa.trim() !== ''

  const trabalhosFiltrados = useMemo(() => {
    const termo = pesquisa.toLowerCase().trim()
    return FEATURED_WORKS.filter((w) => {
      if (categoria !== 'all' && w.serviceSlug !== categoria) return false
      if (!termo) return true
      return [w.title, w.serviceName, w.professionalName, w.location].some((campo) => campo.toLowerCase().includes(termo))
    })
  }, [categoria, pesquisa])

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
    destaques: FEATURED_WORKS,
    canalizacao: CANALIZACAO,
    eletricidade: ELETRICIDADE,
    exteriores: EXTERIORES,
  }
}
