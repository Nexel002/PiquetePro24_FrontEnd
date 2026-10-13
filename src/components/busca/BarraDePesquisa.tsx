import { IconeDePesquisa } from './IconeDePesquisa'

interface BarraDePesquisaProps {
  texto: string
  aoMudar: (texto: string) => void
  aoPesquisar: () => void
  focarAoMontar: boolean
}

export function BarraDePesquisa({ texto, aoMudar, aoPesquisar, focarAoMontar }: BarraDePesquisaProps) {
  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault()
        aoPesquisar()
      }}
      className="relative mt-7 w-full max-w-2xl"
    >
      <div className="relative flex items-center overflow-hidden rounded-full border-2 border-gray-200/90 bg-white shadow-card transition-all focus-within:border-piquete-blue focus-within:shadow-card-hover">
        <div className="pl-5 text-gray-400">
          <IconeDePesquisa />
        </div>
        <input
          type="search"
          value={texto}
          onChange={(event) => aoMudar(event.target.value)}
          placeholder="Que serviço procuras? Ex: canalizador"
          aria-label="Pesquisar serviço ou profissional"
          className="w-full bg-transparent px-3.5 py-3.5 text-sm font-medium text-gray-900 placeholder-gray-400 outline-none sm:py-4"
          autoFocus={focarAoMontar}
        />
        <button
          type="submit"
          aria-label="Pesquisar"
          className="mr-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-piquete-blue text-white shadow-sm transition-all hover:bg-piquete-blue-light active:scale-95 sm:h-11 sm:w-11"
        >
          <IconeDePesquisa className="h-4 w-4" />
        </button>
      </div>
    </form>
  )
}
