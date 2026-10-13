import { Link } from 'react-router-dom'

// Fase 9: é aqui que o profissional chega ao catálogo a partir do Perfil — antes só havia o
// botão na Home, e quem entra pelo Perfil não o via.
export function AtalhoDoCatalogo() {
  return (
    <Link
      to="/catalogo"
      className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-piquete-blue to-piquete-blue-light p-4 text-white shadow-glow-blue transition-all hover:brightness-110 active:scale-[0.98]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-bold">O meu catálogo</span>
        <span className="text-xs text-white/70">Bio, fotos dos trabalhos e avaliações</span>
      </span>
      <span aria-hidden className="text-lg text-white/70">›</span>
    </Link>
  )
}
