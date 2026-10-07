interface NotificationButtonProps {
  onClick: () => void
}

// Ícone simples, sem moldura, como o resto das acções da barra. Não tem ponto de "por ler":
// ainda não existe uma contagem real de notificações, e um ponto fixo dizia sempre "tens
// novidades" mesmo sem nenhuma. Quando houver contagem (ex.: convites pendentes), entra aqui.
export function NotificationButton({ onClick }: NotificationButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Notificações e pedidos"
      aria-label="Notificações"
      className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-slate-700 transition-colors hover:bg-slate-100"
    >
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    </button>
  )
}
