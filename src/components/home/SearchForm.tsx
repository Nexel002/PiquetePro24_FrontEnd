import type { FormEvent } from 'react'

interface SearchFormProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (event: FormEvent) => void
}

// Campo em pílula com a lupa dentro e sem botão: Enter submete. O botão fica só para
// leitores de ecrã — num telemóvel o teclado já traz "Ir"/"Pesquisar", e um segundo botão
// só roubaria largura ao campo.
export function SearchForm({ value, onChange, onSubmit }: SearchFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      role="search"
      className="flex h-12 w-full items-center gap-3 rounded-full border border-slate-400 bg-white px-4 transition-colors hover:bg-slate-50 focus-within:border-slate-900 focus-within:bg-white focus-within:ring-2 focus-within:ring-slate-900/10"
    >
      <svg className="h-5 w-5 shrink-0 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Pesquisar serviços ou profissionais"
        placeholder="Pesquisar canalizador, eletricista, pintor..."
        enterKeyHint="search"
        // 16px em mobile: abaixo disso o Safari/iOS faz zoom ao focar o campo.
        className="min-w-0 flex-1 border-none bg-transparent p-0 text-base text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-0 sm:text-sm"
      />
      <button type="submit" className="sr-only">
        Pesquisar
      </button>
    </form>
  )
}
