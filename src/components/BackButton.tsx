import { useNavigate } from 'react-router-dom'

interface BackButtonProps {
  className?: string
  // Para onde ir quando não há ecrã anterior nesta app (link aberto directamente, email de
  // recuperação, separador novo). Sem isto, `navigate(-1)` saía do site ou não fazia nada.
  destinoSemHistorico?: string
}

// Volta ao ecrã anterior no histórico do browser (navigate(-1)), não sempre para um
// destino fixo — se o utilizador entrou nesta tela a partir de um link diferente da
// Home, "voltar" deve respeitar essa navegação em vez de a ignorar.
//
// `className` sobrepõe a cor por omissão (cinza, para cabeçalhos em fundo branco) —
// necessário em Profile.tsx, onde o botão fica sobre uma foto escura e precisa de
// ficar branco para ter contraste suficiente.
export function BackButton({ className = 'text-gray-600 hover:bg-gray-100', destinoSemHistorico }: BackButtonProps = {}) {
  const navigate = useNavigate()

  function voltar() {
    // O BrowserRouter guarda em `history.state.idx` a posição na pilha desta app: 0 é o primeiro
    // ecrã aberto, e aí não há para onde voltar dentro dela.
    const posicao = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (destinoSemHistorico && posicao === 0) {
      navigate(destinoSemHistorico, { replace: true })
      return
    }
    navigate(-1)
  }

  return (
    <button
      type="button"
      onClick={voltar}
      aria-label="Voltar"
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${className}`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
        <path
          fillRule="evenodd"
          d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z"
          clipRule="evenodd"
        />
      </svg>
    </button>
  )
}
