import { Button } from './ui/Button'

// Erro de rede ao carregar o perfil nos ecrãs que dependem dele para decidir o que mostrar
// (guarda do onboarding e os dois passos). Antes só dizia «tenta novamente» sem forma de o fazer:
// quem estava aqui ficava preso até recarregar a página à mão. `aoTentarDeNovo` repete só o
// pedido do perfil, sem perder o resto do estado da página.
export function ErroAoCarregarPerfil({ aoTentarDeNovo }: { aoTentarDeNovo: () => void }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
      <p role="alert" className="max-w-sm text-sm text-gray-600">
        Não foi possível carregar o teu perfil. Verifica a tua ligação e tenta novamente.
      </p>
      <Button type="button" size="sm" onClick={aoTentarDeNovo}>
        Tentar de novo
      </Button>
    </main>
  )
}
