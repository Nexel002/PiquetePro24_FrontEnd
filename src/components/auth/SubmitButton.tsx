import type { ReactNode } from 'react'

interface SubmitButtonProps {
  isLoading: boolean
  textoAEnviar: string
  children: ReactNode
}

export function SubmitButton({ isLoading, textoAEnviar, children }: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={isLoading}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-piquete-blue font-heading text-base font-bold text-white shadow-md shadow-piquete-blue/20 transition-colors hover:bg-piquete-blue-light focus:outline-none focus-visible:ring-4 focus-visible:ring-piquete-blue/25 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isLoading ? (
        <>
          <svg className="h-5 w-5 animate-spin motion-reduce:animate-none" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>{textoAEnviar}</span>
        </>
      ) : (
        <span>{children}</span>
      )}
    </button>
  )
}
