import { useState, useId, forwardRef, type InputHTMLAttributes } from 'react'

interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  showPasswordToggle?: boolean
}

// Etiqueta por cima e campo de 48 px: o formato clássico lê-se melhor em ecrã pequeno do que a
// etiqueta dentro da caixa, e o `text-base` (16 px) impede o zoom automático do Safari/iOS ao
// focar o campo (abaixo de 16 px o iOS amplia a página e ela fica desalinhada).
export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  ({ label, error, type = 'text', showPasswordToggle = false, className = '', id, ...props }, ref) => {
    const generatedId = useId()
    const inputId = id ?? generatedId
    const erroId = `${inputId}-erro`
    const [palavraVisivel, setPalavraVisivel] = useState(false)

    const temToggle = showPasswordToggle && type === 'password'
    const tipoEfectivo = type === 'password' && palavraVisivel ? 'text' : type

    return (
      <div className="w-full">
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-semibold text-slate-700">
          {label}
        </label>
        <div
          className={`relative flex items-center rounded-xl border bg-white transition-colors focus-within:ring-4 ${
            error
              ? 'border-rose-400 focus-within:border-rose-500 focus-within:ring-rose-500/10'
              : 'border-slate-300 hover:border-slate-400 focus-within:border-piquete-blue focus-within:ring-piquete-blue/10'
          }`}
        >
          <input
            ref={ref}
            id={inputId}
            type={tipoEfectivo}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? erroId : undefined}
            className={`h-12 w-full rounded-xl bg-transparent px-4 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none ${
              temToggle ? 'pr-12' : ''
            } ${className}`}
            {...props}
          />

          {temToggle && (
            <button
              type="button"
              onClick={() => setPalavraVisivel((visivel) => !visivel)}
              aria-pressed={palavraVisivel}
              aria-label={palavraVisivel ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'}
              title={palavraVisivel ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'}
              // 44 px de alvo de toque, encostado ao canto do campo.
              className="absolute right-0 flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 transition-colors hover:text-slate-800"
            >
              {palavraVisivel ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          )}
        </div>

        {error && (
          <p id={erroId} role="alert" className="mt-1.5 px-1 text-xs font-semibold text-rose-600">
            {error}
          </p>
        )}
      </div>
    )
  },
)

AuthInput.displayName = 'AuthInput'
