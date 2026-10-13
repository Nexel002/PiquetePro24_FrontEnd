import { useRef, type ChangeEvent } from 'react'
import type { UserProfile } from '../../services/profile'
import { BackButton } from '../BackButton'
import { IdentidadeDoPerfil } from './IdentidadeDoPerfil'

const BOTAO_SOBRE_FOTO =
  'rounded-2xl border p-2.5 shadow-lg backdrop-blur-md transition-all active:scale-95'
const BOTAO_SOBRE_FOTO_NEUTRO = 'border-white/20 bg-white/85 text-piquete-blue hover:bg-white'

interface FotoDoPerfilProps {
  profile: UserProfile
  definicoesAbertas: boolean
  aEnviarFoto: boolean
  aoAlternarDefinicoes: () => void
  aoEscolherFoto: (ficheiro: File) => void
}

// Coluna da foto: no telemóvel é o topo do ecrã a toda a largura; em desktop ocupa a
// metade esquerda inteira, fixa, com o nome sobreposto. Os botões de câmara e definições
// ficam sobre a foto (e não ao lado do nome) para não competirem com ele.
export function FotoDoPerfil({ profile, definicoesAbertas, aEnviarFoto, aoAlternarDefinicoes, aoEscolherFoto }: FotoDoPerfilProps) {
  const entradaDeFicheiro = useRef<HTMLInputElement>(null)

  function aoSeleccionar(event: ChangeEvent<HTMLInputElement>) {
    const ficheiro = event.target.files?.[0]
    // Limpar o valor deixa escolher o mesmo ficheiro duas vezes seguidas.
    event.target.value = ''
    if (ficheiro) aoEscolherFoto(ficheiro)
  }

  return (
    <aside className="relative w-full lg:sticky lg:top-0 lg:h-dvh lg:overflow-hidden">
      <div className="relative aspect-[4/5] sm:aspect-[16/10] lg:aspect-auto lg:h-full w-full overflow-hidden rounded-b-[2.5rem] lg:rounded-none bg-gradient-to-br from-piquete-blue via-piquete-blue-light to-piquete-blue-bright shadow-card-hover lg:shadow-none">
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt={profile.full_name} className="h-full w-full object-cover object-top filter brightness-95 contrast-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-tr from-[#021431] via-[#052456] to-slate-900">
            <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-piquete-yellow/30 bg-piquete-yellow/15 text-4xl font-extrabold text-piquete-yellow">
              {profile.full_name.charAt(0).toUpperCase()}
            </div>
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-piquete-blue-deep/60 via-piquete-blue-deep/20 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-piquete-blue-deep via-piquete-blue-deep/50 to-transparent lg:h-2/5" />

        <div className="absolute left-4 top-4 lg:left-8 lg:top-8 z-20">
          <BackButton className={`${BOTAO_SOBRE_FOTO} ${BOTAO_SOBRE_FOTO_NEUTRO}`} />
        </div>

        <div className="absolute right-4 top-4 lg:right-8 lg:top-8 z-20 flex items-center gap-2">
          <button
            type="button"
            onClick={() => entradaDeFicheiro.current?.click()}
            disabled={aEnviarFoto}
            aria-label="Alterar foto"
            className={`${BOTAO_SOBRE_FOTO} ${BOTAO_SOBRE_FOTO_NEUTRO}`}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          <button
            type="button"
            onClick={aoAlternarDefinicoes}
            aria-label="Definições da conta"
            aria-expanded={definicoesAbertas}
            className={`${BOTAO_SOBRE_FOTO} ${definicoesAbertas ? 'border-piquete-blue bg-piquete-blue text-white' : BOTAO_SOBRE_FOTO_NEUTRO}`}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>

        <input ref={entradaDeFicheiro} type="file" accept="image/*" capture="user" onChange={aoSeleccionar} hidden />

        <IdentidadeDoPerfil profile={profile} variante="sobreFoto" />
      </div>
    </aside>
  )
}
