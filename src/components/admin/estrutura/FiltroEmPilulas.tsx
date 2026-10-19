interface OpcaoDoFiltro<T extends string> {
  valor: T
  rotulo: string
}

interface FiltroEmPilulasProps<T extends string> {
  rotulo: string
  opcoes: Array<OpcaoDoFiltro<T>>
  valor: T
  aoMudar: (valor: T) => void
  // Separadores mudam o conteúdo inteiro (Subscrições ↔ Pagamentos) e anunciam-se como `tab`;
  // filtros só estreitam a mesma lista e anunciam-se como botões premidos.
  separadores?: boolean
}

export function FiltroEmPilulas<T extends string>({ rotulo, opcoes, valor, aoMudar, separadores = false }: FiltroEmPilulasProps<T>) {
  return (
    <div
      role={separadores ? 'tablist' : 'group'}
      aria-label={rotulo}
      className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar scroll-smooth pb-0.5"
    >
      {opcoes.map((opcao) => {
        const activo = opcao.valor === valor
        return (
          <button
            key={opcao.valor}
            type="button"
            role={separadores ? 'tab' : undefined}
            aria-selected={separadores ? activo : undefined}
            aria-pressed={separadores ? undefined : activo}
            onClick={() => aoMudar(opcao.valor)}
            className={`rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all duration-200 shrink-0 cursor-pointer ${
              activo ? 'bg-piquete-blue-bright text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            {opcao.rotulo}
          </button>
        )
      })}
    </div>
  )
}
