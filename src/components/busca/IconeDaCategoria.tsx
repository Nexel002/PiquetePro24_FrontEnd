import { CAMINHOS_DO_ICONE_GENERICO, CAMINHOS_DOS_ICONES } from './caminhosDosIcones'

export function IconeDaCategoria({ slug }: { slug: string }) {
  const caminhos = CAMINHOS_DOS_ICONES[slug]
  if (!caminhos && import.meta.env.DEV) console.warn(`Sem ícone para a categoria «${slug}»; a usar o genérico.`)

  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      {(caminhos ?? CAMINHOS_DO_ICONE_GENERICO).map((d) => (
        <path key={d} strokeLinecap="round" strokeLinejoin="round" d={d} />
      ))}
    </svg>
  )
}
