import { Component, type ErrorInfo, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { Button } from './ui/Button'

interface Props {
  children: ReactNode
}

interface Estado {
  falhou: boolean
}

// Rede de segurança das rotas: sem ela, um ecrã que falha a carregar (ficheiro em falta depois
// de um deploy, rede a falhar) ou que rebenta a renderizar deixa a página em branco, sem
// explicação nem saída. Não substitui o tratamento de erros dos pedidos (esses mostram a sua
// própria mensagem); apanha só o que escapou.
export class ErroDeEcra extends Component<Props, Estado> {
  state: Estado = { falhou: false }

  static getDerivedStateFromError(): Estado {
    return { falhou: true }
  }

  componentDidCatch(erro: Error, info: ErrorInfo) {
    // Fica na consola para diagnóstico; ao utilizador mostra-se uma mensagem sem termos técnicos.
    console.error('Falha ao mostrar o ecrã:', erro, info.componentStack)
  }

  render() {
    if (!this.state.falhou) return this.props.children

    return (
      <main role="alert" className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="font-heading text-xl font-bold text-piquete-blue">Não foi possível abrir este ecrã</h1>
        <p className="text-sm text-gray-700">Verifica a tua ligação à internet e tenta de novo. Se o problema continuar, volta ao início.</p>
        <div className="flex w-full flex-col gap-2">
          <Button type="button" onClick={() => window.location.reload()} className="w-full">
            Tentar de novo
          </Button>
          <Button type="button" variant="ghost" onClick={() => window.location.assign('/')} className="w-full">
            Voltar ao início
          </Button>
        </div>
      </main>
    )
  }
}

// Com a rota como chave, o erro de um ecrã não fica preso: ao navegar para outro, o aviso desaparece.
export function ErroDeEcraPorRota({ children }: Props) {
  const { pathname } = useLocation()
  return <ErroDeEcra key={pathname}>{children}</ErroDeEcra>
}
