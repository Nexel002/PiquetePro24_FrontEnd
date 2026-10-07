interface Categoria {
  slug: string
  name: string
}

interface CategoryFilterProps {
  categorias: Categoria[]
  selecionada: string
  aoSeleccionar: (slug: string) => void
}

// Barra de texto de largura total, com a opção activa sublinhada. O `w-max mx-auto` centra
// a lista quando cabe e deixa-a deslizar com o dedo quando não cabe (`justify-center` com
// overflow cortaria os primeiros itens à esquerda, sem forma de lá chegar).
export function CategoryFilter({ categorias, selecionada, aoSeleccionar }: CategoryFilterProps) {
  const item = (activo: boolean) =>
    `inline-flex min-h-12 items-center border-b-2 px-3 text-sm whitespace-nowrap transition-colors ${
      activo
        ? 'border-slate-900 font-bold text-slate-900'
        : 'border-transparent text-slate-600 hover:text-slate-900'
    }`

  return (
    <nav aria-label="Categorias de serviços" className="bg-white border-b border-slate-200 shadow-sm">
      <div className="overflow-x-auto no-scrollbar px-2 sm:px-4">
        <div className="flex w-max mx-auto">
          <button type="button" onClick={() => aoSeleccionar('all')} aria-pressed={selecionada === 'all'} className={item(selecionada === 'all')}>
            Todos
          </button>
          {categorias.map((categoria) => (
            <button
              key={categoria.slug}
              type="button"
              onClick={() => aoSeleccionar(categoria.slug)}
              aria-pressed={selecionada === categoria.slug}
              className={item(selecionada === categoria.slug)}
            >
              {categoria.name}
            </button>
          ))}
        </div>
      </div>
    </nav>
  )
}
