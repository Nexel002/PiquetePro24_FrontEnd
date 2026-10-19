import type { ReactNode } from 'react'

// Filtro que chega pelo endereço (vindo de outro ecrã, ex. «Ver histórico» de um pedido): não
// tem controlo na barra de filtros, por isso diz-se o que está aplicado e deixa-se limpar.
export function FiltroDoEndereco({ children, aoLimpar }: { children: ReactNode; aoLimpar: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-piquete-blue/5 border border-piquete-blue/20 px-4 py-2.5 text-sm text-piquete-blue">
      <span>{children}</span>
      <button type="button" onClick={aoLimpar} className="font-semibold underline hover:text-piquete-blue-bright">
        Limpar
      </button>
    </div>
  )
}
