import { CAMINHOS_DOS_ICONES_DE_ADMIN, type NomeDoIconeDeAdmin } from './icones'

interface IconeDeAdminProps {
  nome: NomeDoIconeDeAdmin
  className?: string
  strokeWidth?: number
}

// Decorativo por omissão: o texto ao lado é que diz o que o ícone significa (WCAG — estado
// comunicado por texto, não só por imagem).
export function IconeDeAdmin({ nome, className = 'w-4 h-4', strokeWidth = 2 }: IconeDeAdminProps) {
  return (
    <svg className={`shrink-0 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={strokeWidth} aria-hidden="true">
      {CAMINHOS_DOS_ICONES_DE_ADMIN[nome].map((d) => (
        <path key={d} strokeLinecap="round" strokeLinejoin="round" d={d} />
      ))}
    </svg>
  )
}
