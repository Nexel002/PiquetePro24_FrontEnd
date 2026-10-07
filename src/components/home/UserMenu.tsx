import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { UserRole } from '../../services/profile'
import { LIGACAO_DO_PAPEL, ROTULO_PAPEL } from './papeis'
import { UserAvatar } from './UserAvatar'

interface UserMenuProps {
  nome: string
  primeiroNome: string
  avatarUrl?: string | null
  papel?: UserRole
  aoTerminarSessao: () => void
}

const ITEM =
  'flex min-h-11 w-full items-center rounded px-3 text-left text-sm text-slate-800 transition-colors hover:bg-slate-100'

// Menu do avatar: perfil, a ligação do papel e "Sair". Serve telemóvel e desktop — antes o
// "Sair" só existia a partir de `md`, e no telemóvel só se saía passando pelo perfil.
// Padrão "disclosure" (botão com aria-expanded + painel de ligações) em vez de role="menu":
// não obriga a gerir setas e foco, e os leitores de ecrã tratam-no bem.
export function UserMenu({ nome, primeiroNome, avatarUrl, papel, aoTerminarSessao }: UserMenuProps) {
  const [aberto, setAberto] = useState(false)
  const raiz = useRef<HTMLDivElement>(null)
  const botao = useRef<HTMLButtonElement>(null)
  const painelId = useId()

  useEffect(() => {
    if (!aberto) return

    function foraDoMenu(event: PointerEvent) {
      if (!raiz.current?.contains(event.target as Node)) setAberto(false)
    }
    function comEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      setAberto(false)
      // O foco volta ao botão: quem navega por teclado não o perde.
      botao.current?.focus()
    }

    document.addEventListener('pointerdown', foraDoMenu)
    document.addEventListener('keydown', comEscape)
    return () => {
      document.removeEventListener('pointerdown', foraDoMenu)
      document.removeEventListener('keydown', comEscape)
    }
  }, [aberto])

  const ligacaoDoPapel = papel ? LIGACAO_DO_PAPEL[papel] : null
  const fechar = () => setAberto(false)

  return (
    <div ref={raiz} className="relative ml-1">
      <button
        ref={botao}
        type="button"
        onClick={() => setAberto((valor) => !valor)}
        aria-expanded={aberto}
        aria-controls={painelId}
        aria-label={`Menu da conta de ${primeiroNome}`}
        className="flex rounded-full transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
      >
        <UserAvatar nome={nome} avatarUrl={avatarUrl} className="h-11 w-11 text-sm" />
      </button>

      {aberto && (
        <div
          id={painelId}
          // `right-0` ancora o painel ao avatar, que está no canto: abrir para a direita
          // sairia do ecrã no telemóvel. A largura máxima deixa sempre uma folga lateral.
          className="absolute right-0 top-full z-50 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-lg border border-slate-300 bg-white p-2 shadow-lg"
        >
          <div className="flex items-center gap-3 border-b border-slate-200 px-3 pb-3 pt-2">
            <UserAvatar nome={nome} avatarUrl={avatarUrl} className="h-12 w-12 text-base" />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900">{nome}</p>
              <p className="text-xs text-slate-600">{papel ? ROTULO_PAPEL[papel] : 'Cliente'}</p>
            </div>
          </div>

          <div className="py-1">
            <Link to="/perfil" onClick={fechar} className={ITEM}>
              O meu perfil
            </Link>
            {ligacaoDoPapel && (
              <Link to={ligacaoDoPapel.to} onClick={fechar} className={ITEM}>
                {ligacaoDoPapel.rotulo}
              </Link>
            )}
          </div>

          <div className="border-t border-slate-200 pt-1">
            <button
              type="button"
              onClick={() => {
                fechar()
                aoTerminarSessao()
              }}
              className={`${ITEM} hover:text-rose-600`}
            >
              Sair
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
