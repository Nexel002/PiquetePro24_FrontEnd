import type { Canal } from '../../lib/authIntent'

interface ChannelTabsProps {
  value: Canal
  onChange: (canal: Canal) => void
}

const OPCOES: { valor: Canal; rotulo: string }[] = [
  { valor: 'email', rotulo: 'Email' },
  { valor: 'phone', rotulo: 'Telefone' },
]

export function ChannelTabs({ value, onChange }: ChannelTabsProps) {
  return (
    <div role="group" aria-label="Como queres entrar" className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
      {OPCOES.map(({ valor, rotulo }) => (
        <button
          key={valor}
          type="button"
          onClick={() => onChange(valor)}
          aria-pressed={value === valor}
          className={`min-h-11 rounded-lg text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-piquete-blue/40 ${
            value === valor ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {rotulo}
        </button>
      ))}
    </div>
  )
}
