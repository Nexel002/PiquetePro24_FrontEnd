import type { UserProfile } from '../../services/profile'

const memberSinceFormatter = new Intl.DateTimeFormat('pt-PT', { dateStyle: 'long' })

const ROLE_LABELS = { PROFESSIONAL: 'Profissional PiquetePro', ADMIN: 'Administrador', CLIENT: 'Cliente' } as const

// Sem selo de «verificado»: o perfil não traz nenhum dado de verificação (KYC), e um selo
// mostrado a qualquer papel afirmava uma garantia que o ecrã não sabe dar.
export function IdentidadeDoPerfil({ profile }: { profile: UserProfile }) {
  return (
    <div className="flex flex-col gap-1.5 lg:gap-2.5">
      <h1 className="font-heading text-2xl font-extrabold tracking-tight text-piquete-blue sm:text-3xl lg:text-white lg:drop-shadow xl:text-4xl">
        {profile.full_name}
      </h1>
      <p className="text-sm font-medium text-piquete-gray lg:text-base lg:text-white/90">{ROLE_LABELS[profile.role]}</p>
      <p className="text-xs font-semibold text-gray-400 lg:text-white/70">
        Membro desde {memberSinceFormatter.format(new Date(profile.created_at))}
      </p>
    </div>
  )
}
