interface Opcao<T extends string> {
  valor: T
  rotulo: string
}

interface OptionCardsProps<T extends string> {
  legenda: string
  nome: string
  opcoes: Opcao<T>[]
  value: T
  onChange: (valor: T) => void
}

// Grupo de rádios apresentados como cartões. Os <input type="radio"> ficam no DOM (só
// escondidos visualmente), por isso o teclado (setas) e os leitores de ecrã funcionam como
// num grupo de rádios normal; `focus-within` mostra o foco no cartão.
export function OptionCards<T extends string>({ legenda, nome, opcoes, value, onChange }: OptionCardsProps<T>) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-semibold text-slate-700">{legenda}</legend>
      <div className="grid grid-cols-2 gap-2">
        {opcoes.map(({ valor, rotulo }) => (
          <label
            key={valor}
            className={`flex min-h-11 cursor-pointer items-center justify-center rounded-xl border px-3 text-center text-sm font-semibold transition-colors focus-within:ring-4 focus-within:ring-piquete-blue/10 ${
              value === valor
                ? 'border-piquete-blue bg-piquete-blue/5 text-piquete-blue ring-1 ring-piquete-blue'
                : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'
            }`}
          >
            <input
              type="radio"
              name={nome}
              value={valor}
              checked={value === valor}
              onChange={() => onChange(valor)}
              className="sr-only"
            />
            {rotulo}
          </label>
        ))}
      </div>
    </fieldset>
  )
}
