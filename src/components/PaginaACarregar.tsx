// Fallback do Suspense das rotas carregadas sob pedido. Um esqueleto e não um spinner em ecrã
// vazio (CLAUDE.md, secção 3). `role="status"` + texto só para leitores de ecrã: sem ele, quem
// não vê a página não sabe que algo está a carregar.
export function PaginaACarregar() {
  return (
    <main role="status" aria-busy="true" className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 p-6">
      <span className="sr-only">A carregar…</span>
      <div className="h-8 w-2/3 animate-pulse rounded-lg bg-gray-200 motion-reduce:animate-none" />
      <div className="h-24 animate-pulse rounded-xl bg-gray-200 motion-reduce:animate-none" />
      <div className="h-24 animate-pulse rounded-xl bg-gray-200 motion-reduce:animate-none" />
      <div className="h-24 animate-pulse rounded-xl bg-gray-200 motion-reduce:animate-none" />
    </main>
  )
}
