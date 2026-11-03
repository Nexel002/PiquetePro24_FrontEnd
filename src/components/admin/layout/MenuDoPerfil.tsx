import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useProfile } from '../../../hooks/useProfile'
import { useAuth } from '../../../store/AuthContext'
import { IconeDeAdmin } from '../estrutura/IconeDeAdmin'

// Rodapé da barra lateral: quem está ligado, e o menu para voltar à aplicação ou terminar sessão.
// Com a barra recolhida mostra só o avatar e o ícone de definições, empilhados.
export function MenuDoPerfil({ soIcones }: { soIcones: boolean }) {
  const { data: perfil } = useProfile()
  const { signOut } = useAuth()
  const [aberto, setAberto] = useState(false)

  if (!perfil) return null

  return (
    <div className="relative p-3 border-t border-slate-100 bg-white">
      {aberto && (
        <div className="absolute bottom-full left-3 right-3 mb-2 bg-white border border-slate-200/90 shadow-lg rounded-2xl overflow-hidden animate-slide-up">
          <Link
            to="/"
            className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <IconeDeAdmin nome="casa" className="w-4 h-4 text-slate-500" /> Voltar à aplicação
          </Link>
          <button
            type="button"
            onClick={() => void signOut()}
            className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-rose-600 hover:bg-rose-50 transition-colors text-left border-t border-slate-100"
          >
            <IconeDeAdmin nome="sair" className="w-4 h-4 text-rose-500" /> Terminar sessão
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => setAberto((estado) => !estado)}
        aria-expanded={aberto}
        aria-label={soIcones ? `Perfil de ${perfil.full_name}` : undefined}
        title={soIcones ? 'Perfil' : undefined}
        className={
          soIcones
            ? 'mx-auto flex flex-col items-center gap-3 py-2 px-1.5 rounded-full bg-slate-100/80 hover:bg-slate-200/70 transition-colors'
            : 'w-full flex items-center justify-between p-2 rounded-2xl bg-slate-50/90 hover:bg-slate-100/90 transition-colors'
        }
      >
        <span className={`flex items-center ${soIcones ? 'flex-col gap-2.5' : 'gap-3 min-w-0'}`}>
          {perfil.avatar_url ? (
            <img
              src={perfil.avatar_url}
              alt={perfil.full_name}
              className="w-9 h-9 rounded-full object-cover shrink-0 border border-white shadow-xs"
            />
          ) : (
            <span className="w-9 h-9 rounded-full bg-slate-800 text-white flex items-center justify-center shrink-0 text-xs font-bold shadow-xs">
              {(perfil.full_name || 'A').charAt(0).toUpperCase()}
            </span>
          )}
          {!soIcones && (
            <span className="flex-1 min-w-0 text-left">
              <span className="block text-slate-900 text-sm font-semibold truncate leading-none">{perfil.full_name}</span>
              <span className="block text-slate-500 text-xs truncate mt-1">Administrador</span>
            </span>
          )}
          {soIcones && <IconeDeAdmin nome="definicoes" className="w-5 h-5 text-slate-500 mb-0.5" />}
        </span>
        {!soIcones && <IconeDeAdmin nome="definicoes" className="w-5 h-5 text-slate-400 mr-1" />}
      </button>
    </div>
  )
}
