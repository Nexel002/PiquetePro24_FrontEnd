import { useLocation } from 'react-router-dom'
import { BackButton } from '../../BackButton'
import { IconeDeAdmin } from '../estrutura/IconeDeAdmin'
import { caminhoActivo } from './caminhoActivo'
import { SECCOES_DO_PAINEL } from './seccoes'

interface CabecalhoProps {
  recolhida: boolean
  aoAbrirMenu: () => void
}

// O título da página é o nome da secção, resolvido pela mesma regra que acende o menu: a ficha
// de um utilizador (`/admin/utilizadores/:id`) diz «Utilizadores». Por isso os ecrãs deixaram de
// ter o seu próprio `<h1>` — o nome aparecia duas vezes, e no telemóvel empurrava o conteúdo
// para um terço do ecrã abaixo.
export function Cabecalho({ recolhida, aoAbrirMenu }: CabecalhoProps) {
  const { pathname } = useLocation()
  const seccao = SECCOES_DO_PAINEL.find((s) => s.to === caminhoActivo(pathname, SECCOES_DO_PAINEL.map((x) => x.to)))

  return (
    <header
      className={`fixed top-0 right-0 left-0 z-30 h-16 flex items-center gap-3 px-4 sm:px-6 bg-white/95 backdrop-blur-sm border-b border-slate-200 transition-all duration-300 ${
        recolhida ? 'lg:left-20' : 'lg:left-64'
      }`}
    >
      {/* Só abaixo de `lg`: em desktop a barra lateral está sempre à vista. */}
      <button
        type="button"
        onClick={aoAbrirMenu}
        className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors lg:hidden"
        aria-label="Abrir menu"
      >
        <IconeDeAdmin nome="menu" className="w-[22px] h-[22px]" />
      </button>

      {/* Sem ecrã anterior (link directo): de uma subpágina, como a ficha de um utilizador, volta à
          sua secção; de uma secção, volta à Home da app. */}
      <BackButton destinoSemHistorico={seccao && pathname !== seccao.to ? seccao.to : '/'} />

      <h1 className="text-base sm:text-lg font-bold text-piquete-blue font-heading truncate">{seccao?.rotulo ?? 'Administração'}</h1>
    </header>
  )
}
