import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { AdminUserSummary } from '../../../services/adminUsers'
import { IconeDeAdmin } from '../estrutura/IconeDeAdmin'
import { AvatarDoUtilizador } from './AvatarDoUtilizador'
import { ROTULO_DO_PAPEL } from './utilizadores'

interface PesquisaDeUtilizadoresProps {
  termo: string
  aoMudar: (termo: string) => void
  aoLimpar: () => void
  // Já filtradas pela página: a caixa só as mostra.
  sugestoes: AdminUserSummary[]
}

// Caixa de pesquisa com sugestões instantâneas letra a letra. O termo vive na página (filtra também a
// tabela e a pesquisa no servidor); aqui fica só o que é da caixa: abrir e fechar as sugestões.
export function PesquisaDeUtilizadores({ termo, aoMudar, aoLimpar, sugestoes }: PesquisaDeUtilizadoresProps) {
  const [sugestoesAbertas, setSugestoesAbertas] = useState(false)
  const contentorRef = useRef<HTMLDivElement>(null)

  // Fecha a caixa de sugestões ao clicar fora.
  useEffect(() => {
    if (!sugestoesAbertas) return
    function aoClicarFora(evento: MouseEvent) {
      if (contentorRef.current && !contentorRef.current.contains(evento.target as Node)) {
        setSugestoesAbertas(false)
      }
    }
    document.addEventListener('mousedown', aoClicarFora)
    return () => document.removeEventListener('mousedown', aoClicarFora)
  }, [sugestoesAbertas])

  const mostrarSugestoes = sugestoesAbertas && termo.trim().length > 0 && sugestoes.length > 0

  return (
    <div ref={contentorRef} className="relative w-full max-w-lg">
      <div className="relative flex items-center">
        <IconeDeAdmin
          nome="pesquisa"
          className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
        />
        <input
          type="text"
          value={termo}
          onFocus={() => setSugestoesAbertas(true)}
          onChange={(event) => {
            aoMudar(event.target.value)
            setSugestoesAbertas(true)
          }}
          placeholder="Pesquisar utilizador por nome ou telefone..."
          aria-label="Pesquisar utilizadores"
          autoComplete="off"
          className="w-full rounded-xl bg-slate-50/90 border border-slate-200/80 pl-11 pr-10 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#1D5BD8] transition-all"
        />
        {termo ? (
          <button
            type="button"
            onClick={() => {
              aoLimpar()
              setSugestoesAbertas(false)
            }}
            aria-label="Limpar pesquisa"
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs font-bold transition-colors"
          >
            ✕
          </button>
        ) : (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <IconeDeAdmin nome="filtro" className="w-4 h-4" />
          </span>
        )}
      </div>

      {mostrarSugestoes && (
        <div
          role="listbox"
          aria-label="Sugestões de utilizadores"
          className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-white rounded-2xl border border-slate-200/90 shadow-lg overflow-hidden divide-y divide-slate-100"
        >
          {sugestoes.map((utilizador) => (
            <Link
              key={utilizador.id}
              to={`/admin/utilizadores/${utilizador.id}`}
              onClick={() => setSugestoesAbertas(false)}
              className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <AvatarDoUtilizador utilizador={utilizador} tamanho="pequeno" />
                <div className="min-w-0">
                  <span className="block text-sm font-medium text-slate-900 truncate">{utilizador.full_name}</span>
                  <span className="block text-xs text-slate-500 truncate">
                    {ROTULO_DO_PAPEL[utilizador.role] ?? 'Cliente'}
                    {utilizador.phone ? ` · ${utilizador.phone}` : ''}
                  </span>
                </div>
              </div>
              <IconeDeAdmin nome="olho" className="w-4 h-4 text-slate-400 shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
