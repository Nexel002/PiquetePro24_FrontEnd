import { NavLink, useLocation } from 'react-router-dom'
import { useAdminMetrics } from '../../../hooks/useAdminMetrics'
import { LogoOficial } from '../../ui/LogoOficial'
import { IconeDeAdmin } from '../estrutura/IconeDeAdmin'
import { caminhoActivo } from './caminhoActivo'
import { MenuDoPerfil } from './MenuDoPerfil'
import { GRUPOS_DO_PAINEL, SECCOES_DO_PAINEL } from './seccoes'
import { SECCAO_KYC } from './rotas'

interface BarraLateralProps {
  recolhida: boolean
  // Na gaveta do telemóvel a barra está sempre aberta e, em vez de recolher, fecha.
  naGaveta?: boolean
  aoRecolher?: () => void
  aoFechar?: () => void
}

const CLASSE_DO_BOTAO_DE_CANTO =
  'p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100/80 transition-colors'

// Menu lateral do painel inspirado na referência Iconly: as secções e ícones ficam centrados
// verticalmente tanto no modo recolhido (só ícones) como no modo expandido.
export function BarraLateral({ recolhida, naGaveta = false, aoRecolher, aoFechar }: BarraLateralProps) {
  const { pathname } = useLocation()

  const { data: metricas } = useAdminMetrics()
  const kycPorRever = metricas?.kycByStatus.PENDING ?? 0

  const soIcones = recolhida && !naGaveta
  const seccaoAcesa = caminhoActivo(
    pathname,
    SECCOES_DO_PAINEL.map((s) => s.to),
  )

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-white border-r border-slate-100 transition-all duration-300 ${
        naGaveta ? 'w-72' : soIcones ? 'w-20' : 'w-64'
      }`}
    >
      <div className={`flex items-center pt-6 pb-4 ${soIcones ? 'justify-center px-0' : 'justify-between px-5'}`}>
        {!soIcones && <LogoOficial largura={142} />}

        {naGaveta ? (
          <button type="button" onClick={aoFechar} className={CLASSE_DO_BOTAO_DE_CANTO} aria-label="Fechar menu">
            <IconeDeAdmin nome="fechar" className="w-5 h-5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={aoRecolher}
            className={CLASSE_DO_BOTAO_DE_CANTO}
            aria-label={recolhida ? 'Expandir menu' : 'Recolher menu'}
          >
            <IconeDeAdmin nome={recolhida ? 'expandir' : 'recolher'} className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Centrado verticalmente tanto em modo recolhido como em modo expandido */}
      <nav
        aria-label="Secções do painel de administração"
        className="flex-1 overflow-y-auto px-3 py-4 flex flex-col justify-center"
      >
        <div className="space-y-5">
          {GRUPOS_DO_PAINEL.map((grupo) => (
            <div key={grupo.rotulo}>
              {!soIcones && (
                <h3 className="px-3 mb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  {grupo.rotulo}
                </h3>
              )}
              <ul className={soIcones ? 'space-y-3 flex flex-col items-center' : 'space-y-1.5'}>
                {grupo.seccoes.map((seccao) => {
                  const acesa = seccao.to === seccaoAcesa
                  const selo = seccao.to === SECCAO_KYC && kycPorRever > 0 ? kycPorRever : null
                  return (
                    <li key={seccao.to} className={soIcones ? '' : 'w-full'}>
                      <NavLink
                        to={seccao.to}
                        aria-current={acesa ? 'page' : undefined}
                        title={soIcones ? seccao.rotulo : undefined}
                        aria-label={soIcones ? seccao.rotulo : undefined}
                        className={
                          soIcones
                            ? `relative flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-200 ${
                                acesa
                                  ? 'bg-[#1D5BD8] text-white shadow-md shadow-blue-600/25'
                                  : 'text-slate-500 hover:bg-slate-100/80 hover:text-slate-900'
                              }`
                            : `group flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                                acesa
                                  ? 'bg-[#1D5BD8] text-white shadow-sm shadow-blue-600/20'
                                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                              }`
                        }
                      >
                        <span className={`flex items-center ${soIcones ? 'gap-0' : 'gap-3'}`}>
                          <IconeDeAdmin
                            nome={seccao.icone}
                            className={`w-5 h-5 transition-colors ${
                              acesa ? 'text-white' : 'text-slate-500 group-hover:text-slate-800'
                            }`}
                          />
                          {!soIcones && <span className="truncate">{seccao.rotulo}</span>}
                        </span>

                        {!soIcones && selo !== null && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                              acesa
                                ? 'bg-white/20 text-white'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {selo}
                          </span>
                        )}
                      </NavLink>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      <MenuDoPerfil soIcones={soIcones} />
    </aside>
  )
}
