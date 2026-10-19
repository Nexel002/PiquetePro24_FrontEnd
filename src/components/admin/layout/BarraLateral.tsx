import { useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useAdminMetrics } from '../../../hooks/useAdminMetrics'
import { useProfile } from '../../../hooks/useProfile'
import { useAuth } from '../../../store/AuthContext'
import { LogoOficial } from '../../ui/LogoOficial'
import { IconeDeAdmin } from '../estrutura/IconeDeAdmin'
import { caminhoActivo } from './caminhoActivo'
import { GRUPOS_DO_PAINEL, SECCOES_DO_PAINEL } from './seccoes'
import { SECCAO_KYC } from './rotas'

interface BarraLateralProps {
  recolhida: boolean
  // Na gaveta do telemóvel a barra está sempre aberta e, em vez de recolher, fecha.
  naGaveta?: boolean
  aoRecolher?: () => void
  aoFechar?: () => void
}

const CLASSE_DO_BOTAO_DE_CANTO = 'p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors'

// Menu lateral do painel, no desenho do ControlCore: grupos com etiqueta, uma secção acesa (a
// mais específica, ver `caminhoActivo`), recolhível a só ícones em desktop e gaveta no
// telemóvel. O perfil e o «Terminar sessão» ficam no rodapé.
export function BarraLateral({ recolhida, naGaveta = false, aoRecolher, aoFechar }: BarraLateralProps) {
  const { pathname } = useLocation()
  const { data: perfil } = useProfile()
  const { signOut } = useAuth()
  const [menuDoPerfilAberto, setMenuDoPerfilAberto] = useState(false)

  // As mesmas métricas do Painel (mesma chave de cache): o número do selo e o do cartão
  // «Verificações em análise» são sempre o mesmo, sem um pedido a mais.
  const { data: metricas } = useAdminMetrics()
  const kycPorRever = metricas?.kycByStatus.PENDING ?? 0

  const soIcones = recolhida && !naGaveta
  const seccaoAcesa = caminhoActivo(
    pathname,
    SECCOES_DO_PAINEL.map((s) => s.to),
  )

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-white border-r border-slate-200 transition-all duration-300 ${
        naGaveta ? 'w-72' : soIcones ? 'w-20' : 'w-64'
      }`}
    >
      <div className={`flex items-center pt-6 pb-4 ${soIcones ? 'justify-center px-0' : 'justify-between px-6'}`}>
        {/* Recolhida, a barra tem 80 px: o logótipo não cabe legível, e fica só o botão de expandir. */}
        {!soIcones && <LogoOficial largura={150} />}

        {naGaveta ? (
          <button type="button" onClick={aoFechar} className={CLASSE_DO_BOTAO_DE_CANTO} aria-label="Fechar menu">
            <IconeDeAdmin nome="fechar" className="w-5 h-5" />
          </button>
        ) : (
          <button type="button" onClick={aoRecolher} className={CLASSE_DO_BOTAO_DE_CANTO} aria-label={recolhida ? 'Expandir menu' : 'Recolher menu'}>
            <IconeDeAdmin nome={recolhida ? 'expandir' : 'recolher'} className="w-5 h-5" />
          </button>
        )}
      </div>

      <nav aria-label="Secções do painel de administração" className="flex-1 overflow-y-auto px-3 pb-6">
        {GRUPOS_DO_PAINEL.map((grupo) => (
          <div key={grupo.rotulo} className="mb-6">
            {soIcones ? (
              <div className="h-4" />
            ) : (
              <h3 className="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">{grupo.rotulo}</h3>
            )}
            <ul className="space-y-1">
              {grupo.seccoes.map((seccao) => {
                const acesa = seccao.to === seccaoAcesa
                const selo = seccao.to === SECCAO_KYC && kycPorRever > 0 ? kycPorRever : null
                return (
                  <li key={seccao.to}>
                    <NavLink
                      to={seccao.to}
                      aria-current={acesa ? 'page' : undefined}
                      title={soIcones ? seccao.rotulo : undefined}
                      aria-label={soIcones ? seccao.rotulo : undefined}
                      className={`group flex items-center rounded-lg text-sm font-medium transition-all duration-150 ${
                        soIcones ? 'justify-center py-3' : 'justify-between px-3 py-2'
                      } ${acesa ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                      <span className={`flex items-center ${soIcones ? 'gap-0' : 'gap-3'}`}>
                        <IconeDeAdmin
                          nome={seccao.icone}
                          className={`${soIcones ? 'w-5 h-5' : 'w-[18px] h-[18px]'} transition-colors ${
                            acesa ? 'text-piquete-blue' : 'text-slate-400 group-hover:text-slate-600'
                          }`}
                        />
                        {!soIcones && <span className="truncate">{seccao.rotulo}</span>}
                      </span>

                      {/* Âmbar e não verde: é trabalho à espera, não uma novidade. Zero não mostra
                          selo — um «0» permanente ensina a ignorar o sítio onde o número aparece. */}
                      {!soIcones && selo !== null && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
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
      </nav>

      {perfil && (
        <div className="relative p-4 border-t border-slate-200 bg-white">
          {menuDoPerfilAberto && (
            <div className="absolute bottom-full left-4 right-4 mb-2 bg-white border border-slate-200 shadow-lg rounded-xl overflow-hidden animate-slide-up">
              {/* O painel vive dentro da app (o admin também é utilizador): sem esta saída, só
                  terminando a sessão se voltava à Home. */}
              <Link to="/" className="w-full flex items-center gap-2 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                <IconeDeAdmin nome="casa" /> Voltar à aplicação
              </Link>
              <button
                type="button"
                onClick={() => void signOut()}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-rose-600 hover:bg-rose-50 transition-colors text-left border-t border-slate-100"
              >
                <IconeDeAdmin nome="sair" /> Terminar sessão
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setMenuDoPerfilAberto((aberto) => !aberto)}
            aria-expanded={menuDoPerfilAberto}
            aria-label={soIcones ? `Perfil de ${perfil.full_name}` : undefined}
            title={soIcones ? 'Perfil' : undefined}
            className={`w-full flex items-center p-2 rounded-lg hover:bg-slate-50 transition-colors ${soIcones ? 'justify-center' : 'justify-between'}`}
          >
            <span className="flex items-center gap-3 min-w-0">
              <span className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-700 text-sm font-bold">
                {(perfil.full_name || 'A').charAt(0).toUpperCase()}
              </span>
              {!soIcones && (
                <span className="flex-1 min-w-0 text-left">
                  <span className="block text-slate-900 text-sm font-semibold truncate leading-none">{perfil.full_name}</span>
                  <span className="block text-slate-500 text-xs truncate mt-1">Administrador</span>
                </span>
              )}
            </span>
            {!soIcones && <IconeDeAdmin nome="pontosVerticais" className="w-4 h-4 text-slate-400" />}
          </button>
        </div>
      )}
    </aside>
  )
}
