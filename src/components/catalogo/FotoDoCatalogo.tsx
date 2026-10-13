import { Link } from 'react-router-dom'
import type { ProfessionalCatalog } from '../../services/catalog'
import { CLASSE_BOTAO_SOBRE_FOTO, ColunaDaFoto } from '../layout/LayoutDividido'
import { Estrela } from './Estrelas'
import { IdentidadeDoProfissional } from './IdentidadeDoProfissional'

interface FotoDoCatalogoProps {
  catalog: ProfessionalCatalog
  // Sem foto de perfil, a primeira foto do trabalho mais recente serve de capa; sem nenhuma
  // das duas, cai para um fundo da marca com a inicial.
  capa: string | null
  ehDono: boolean
}

export function FotoDoCatalogo({ catalog, capa, ehDono }: FotoDoCatalogoProps) {
  const imagem = capa ? (
    <img src={capa} alt={catalog.full_name} className="h-full w-full object-cover object-top" />
  ) : (
    <div aria-hidden className="flex h-full w-full items-center justify-center font-heading text-8xl font-extrabold text-white/80">
      {catalog.full_name.charAt(0).toUpperCase()}
    </div>
  )

  const temNota = catalog.rating_count > 0 && catalog.rating_avg !== null

  return (
    <ColunaDaFoto
      imagem={imagem}
      identidade={<IdentidadeDoProfissional catalog={catalog} />}
      acoes={
        <>
          {temNota && catalog.rating_avg !== null && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/90 px-3.5 py-1.5 text-xs font-bold text-piquete-blue shadow-lg backdrop-blur-md">
              <Estrela filled className="h-3.5 w-3.5" />
              {catalog.rating_avg.toFixed(1)}
            </span>
          )}
          {ehDono && (
            <Link to="/catalogo" aria-label="Definições do catálogo" className={CLASSE_BOTAO_SOBRE_FOTO}>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Link>
          )}
        </>
      }
    />
  )
}
