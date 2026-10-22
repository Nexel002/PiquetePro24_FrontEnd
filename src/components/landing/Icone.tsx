// Ícones da landing. `lucide-react` não é dependência do projecto (CLAUDE.md: o peso do bundle é
// uma decisão de produto), por isso são SVG inline, com o mesmo traço, só os que se usam.
const CAMINHOS = {
  escudo: 'M12 3 4 6v6c0 4.5 3.2 8.2 8 9 4.8-.8 8-4.5 8-9V6l-8-3Zm-3 9 2.2 2.2L15.5 10',
  grupo: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7 1a2.5 2.5 0 1 0 0-5M3 19c0-3 2.7-5 6-5s6 2 6 5m2-4.5c2.5.2 4.5 1.8 4.5 4.5',
  balanca: 'M12 4v16M6 20h12M5 7h14M5 7l-3 7a3.5 3.5 0 0 0 6 0L5 7Zm14 0-3 7a3.5 3.5 0 0 0 6 0l-3-7Z',
  estrela: 'm12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3Z',
  seta: 'M5 12h14m-6-6 6 6-6 6',
  mais: 'M12 5v14M5 12h14',
  visto: 'm5 12.5 4.5 4.5L19 7.5',
} as const

export type NomeDoIcone = keyof typeof CAMINHOS

export function Icone({ nome, className = 'h-6 w-6' }: { nome: NomeDoIcone; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d={CAMINHOS[nome]} />
    </svg>
  )
}
