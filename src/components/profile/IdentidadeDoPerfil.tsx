import type { UserProfile } from '../../services/profile'
import { IconeDeVisto } from '../ui/IconeDeVisto'

const memberSinceFormatter = new Intl.DateTimeFormat('pt-PT', { dateStyle: 'long' })

const ROLE_LABELS = { PROFESSIONAL: 'Profissional PiquetePro', ADMIN: 'Administrador', CLIENT: 'Cliente' } as const

interface IdentidadeDoPerfilProps {
  profile: UserProfile
  // 'sobreFoto' é o desktop (texto branco sobre a foto, sem título semântico); 'cabecalho' é
  // o telemóvel e o tablet (por baixo da foto) e é o único que leva o <h1> — dois <h1> na
  // mesma página seriam um defeito de acessibilidade, e só um dos dois está visível.
  variante: 'sobreFoto' | 'cabecalho'
}

export function IdentidadeDoPerfil({ profile, variante }: IdentidadeDoPerfilProps) {
  const membroDesde = `Membro desde ${memberSinceFormatter.format(new Date(profile.created_at))}`
  const verificado = profile.role !== 'CLIENT'

  if (variante === 'sobreFoto') {
    return (
      <div className="hidden lg:absolute lg:inset-x-0 lg:bottom-0 lg:flex lg:flex-col lg:gap-2.5 lg:p-8 xl:p-12">
        <div className="flex items-center gap-2.5">
          <p className="font-heading text-3xl font-extrabold tracking-tight text-white xl:text-4xl drop-shadow">{profile.full_name}</p>
          {verificado && (
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-piquete-yellow text-piquete-blue shadow-sm" title="Profissional Verificado">
              <IconeDeVisto className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
        <p className="text-base font-medium text-white/90">{ROLE_LABELS[profile.role]}</p>
        <p className="text-xs font-semibold text-white/70">{membroDesde}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2.5 lg:hidden">
      <div className="flex items-center gap-2">
        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-piquete-blue sm:text-3xl">{profile.full_name}</h1>
        {verificado && (
          <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-piquete-blue text-white" title="Verificado">
            <IconeDeVisto className="h-3 w-3" />
          </span>
        )}
      </div>
      <p className="text-xs font-semibold text-gray-400">{membroDesde}</p>
    </div>
  )
}
