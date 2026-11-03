import { Link, useLocation } from 'react-router-dom'
import { BackButton } from '../../BackButton'
import { IconeDeAdmin } from '../estrutura/IconeDeAdmin'
import { caminhoActivo } from './caminhoActivo'
import { SECCOES_DO_PAINEL } from './seccoes'

interface CabecalhoProps {
  recolhida: boolean
  aoAbrirMenu: () => void
}

// Cabeçalho superior do painel administrativo, seguindo a estrutura limpa da imagem de referência:
// título principal e trilho de navegação («Painel de Admin > Secção») alinhados à esquerda.
export function Cabecalho({ recolhida, aoAbrirMenu }: CabecalhoProps) {
  const { pathname } = useLocation()
  const seccao = SECCOES_DO_PAINEL.find((s) => s.to === caminhoActivo(pathname, SECCOES_DO_PAINEL.map((x) => x.to)))
  const rotulo = seccao?.rotulo ?? 'Administração'

  return (
    <header
      className={`fixed top-0 right-0 left-0 z-30 h-20 flex items-center justify-between px-4 sm:px-8 bg-white border-b border-slate-100 transition-all duration-300 ${
        recolhida ? 'lg:left-20' : 'lg:left-64'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={aoAbrirMenu}
          className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors lg:hidden"
          aria-label="Abrir menu"
        >
          <IconeDeAdmin nome="menu" className="w-[22px] h-[22px]" />
        </button>

        <BackButton destinoSemHistorico={seccao && pathname !== seccao.to ? seccao.to : '/'} />

        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 truncate leading-tight">{rotulo}</h1>
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 mt-0.5">
            <Link to="/admin/visao-geral" className="text-[#1D5BD8] hover:underline font-medium">
              Painel de Admin
            </Link>
            <span>›</span>
            <span className="text-slate-500">{rotulo}</span>
          </div>
        </div>
      </div>
    </header>
  )
}
