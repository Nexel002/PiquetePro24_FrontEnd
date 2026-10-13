import { useRef, type ChangeEvent } from 'react'
import type { UserProfile } from '../../services/profile'
import { CLASSE_BOTAO_SOBRE_FOTO, CLASSE_BOTAO_SOBRE_FOTO_ACTIVO, ColunaDaFoto } from '../layout/LayoutDividido'
import { IdentidadeDoPerfil } from './IdentidadeDoPerfil'

interface FotoDoPerfilProps {
  profile: UserProfile
  definicoesAbertas: boolean
  aEnviarFoto: boolean
  aoAlternarDefinicoes: () => void
  aoEscolherFoto: (ficheiro: File) => void
}

// Os botões de câmara e definições ficam sobre a foto (e não ao lado do nome) para não
// competirem com ele.
export function FotoDoPerfil({ profile, definicoesAbertas, aEnviarFoto, aoAlternarDefinicoes, aoEscolherFoto }: FotoDoPerfilProps) {
  const entradaDeFicheiro = useRef<HTMLInputElement>(null)

  function aoSeleccionar(event: ChangeEvent<HTMLInputElement>) {
    const ficheiro = event.target.files?.[0]
    // Limpar o valor deixa escolher o mesmo ficheiro duas vezes seguidas.
    event.target.value = ''
    if (ficheiro) aoEscolherFoto(ficheiro)
  }

  const imagem = profile.avatar_url ? (
    <img src={profile.avatar_url} alt={profile.full_name} className="h-full w-full object-cover object-top filter brightness-95 contrast-105" />
  ) : (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-tr from-[#021431] via-[#052456] to-slate-900">
      <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-piquete-yellow/30 bg-piquete-yellow/15 text-4xl font-extrabold text-piquete-yellow">
        {profile.full_name.charAt(0).toUpperCase()}
      </div>
    </div>
  )

  return (
    <ColunaDaFoto
      imagem={imagem}
      identidade={<IdentidadeDoPerfil profile={profile} />}
      acoes={
        <>
          <button
            type="button"
            onClick={() => entradaDeFicheiro.current?.click()}
            disabled={aEnviarFoto}
            aria-label="Alterar foto"
            className={CLASSE_BOTAO_SOBRE_FOTO}
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
            className={definicoesAbertas ? CLASSE_BOTAO_SOBRE_FOTO_ACTIVO : CLASSE_BOTAO_SOBRE_FOTO}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          <input ref={entradaDeFicheiro} type="file" accept="image/*" capture="user" onChange={aoSeleccionar} hidden />
        </>
      }
    />
  )
}
