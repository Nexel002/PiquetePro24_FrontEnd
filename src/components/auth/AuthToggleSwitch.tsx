interface AuthToggleSwitchProps {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  description?: string
}

// A linha inteira é o interruptor (e não só o botão de 44×24 px): em ecrã tátil, acertar na
// "bolinha" é difícil, e tocar no texto ao lado é o que as pessoas fazem por instinto.
export function AuthToggleSwitch({ label, checked, onChange, disabled = false, description }: AuthToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="group flex min-h-11 w-full select-none items-center justify-between gap-4 rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-piquete-blue/40 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className="flex flex-col">
        <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900">{label}</span>
        {description && <span className="text-xs text-slate-500">{description}</span>}
      </span>

      <span
        aria-hidden="true"
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${
          checked ? 'bg-piquete-blue' : 'bg-slate-300 group-hover:bg-slate-400'
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 motion-reduce:transition-none ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </span>
    </button>
  )
}
