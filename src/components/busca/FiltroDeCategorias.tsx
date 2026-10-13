import { IconeDaCategoria } from './IconeDaCategoria'

interface FiltroDeCategoriasProps {
  categorias: { id: string; slug: string; name: string }[]
  selecionada: string
  aoSeleccionar: (slug: string) => void
}

export function FiltroDeCategorias({ categorias, selecionada, aoSeleccionar }: FiltroDeCategoriasProps) {
  return (
    <div className="mt-8 w-full">
      <div
        className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 pt-1 sm:mx-0 sm:flex-wrap sm:justify-center sm:px-0"
        role="group"
        aria-label="Filtrar por serviço"
      >
        {categorias.map((service) => {
          const isSelected = selecionada === service.slug
          return (
            <button
              key={service.id}
              type="button"
              onClick={() => aoSeleccionar(service.slug)}
              aria-pressed={isSelected}
              className={`group flex shrink-0 flex-col items-center gap-2 rounded-2xl p-2 transition-all duration-200 active:scale-95 ${
                isSelected ? 'text-piquete-blue' : 'text-gray-500 hover:text-piquete-blue'
              }`}
            >
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-2xl border transition-all duration-200 ${
                  isSelected
                    ? 'border-piquete-blue bg-piquete-blue text-white shadow-glow-blue scale-105'
                    : 'border-gray-200 bg-white text-gray-600 shadow-xs group-hover:border-piquete-blue/40 group-hover:text-piquete-blue'
                }`}
              >
                <IconeDaCategoria slug={service.slug} />
              </div>
              <span
                className={`text-xs transition-colors ${
                  isSelected ? 'font-bold text-piquete-blue' : 'font-semibold text-gray-600 group-hover:text-piquete-blue'
                }`}
              >
                {service.name}
              </span>
              {isSelected && <span className="h-0.5 w-6 rounded-full bg-piquete-blue" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
