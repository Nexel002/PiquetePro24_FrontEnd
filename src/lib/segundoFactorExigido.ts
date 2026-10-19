// O backend recusa com 403 qualquer pedido a /admin/* cuja sessão não passou o segundo factor
// quando ADMIN_REQUIRE_MFA está ligada (middlewares/auth.ts). Sem este aviso, um admin que ainda
// não registou o factor vê o painel abrir e cada lista falhar com 403, sem saber o que fazer.
//
// Reconhece-se pela mensagem e não por um código porque é o que o backend em produção já envia:
// um campo `code` no 403 seria mais robusto, mas obrigava a publicar o backend antes do frontend.
// Se a mensagem do backend mudar, este reconhecimento deixa de funcionar em silêncio — por isso
// o teste fixa a frase que o backend envia hoje.
const MENSAGEM_DO_BACKEND = /dois passos/i

export function eRecusaPorFaltaDeSegundoFactor(status: number | undefined, mensagem: string): boolean {
  return status === 403 && MENSAGEM_DO_BACKEND.test(mensagem)
}

const ouvintes = new Set<() => void>()

// Chamado pelo interceptor do axios. Fora do React de propósito: o interceptor não tem acesso ao
// router, e um `window.location` recarregava a página e perdia a sessão de navegação.
export function avisarQueFaltaSegundoFactor(): void {
  ouvintes.forEach((ouvinte) => ouvinte())
}

export function aoFaltarSegundoFactor(ouvinte: () => void): () => void {
  ouvintes.add(ouvinte)
  return () => {
    ouvintes.delete(ouvinte)
  }
}
