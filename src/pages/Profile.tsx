import { useState } from 'react'
import { useProfile, useUploadAvatar } from '../hooks/useProfile'
import { LocationForm } from '../components/LocationForm'
import { LayoutDividido } from '../components/layout/LayoutDividido'
import { Button } from '../components/ui/Button'
import { AtalhoDoCatalogo } from '../components/profile/AtalhoDoCatalogo'
import { AtalhoDaEquipa } from '../components/profile/AtalhoDaEquipa'
import { DefinicoesDaConta } from '../components/profile/DefinicoesDaConta'
import { EstatisticasDaConta } from '../components/profile/EstatisticasDaConta'
import { FotoDoPerfil } from '../components/profile/FotoDoPerfil'
import { HistoricoDePedidos } from '../components/profile/HistoricoDePedidos'
import { TelefoneRegistado } from '../components/profile/TelefoneRegistado'
import { AvatarUploadError } from '../services/avatar'

// Compõe o ecrã; cada bloco tem o seu estado e os seus hooks no próprio componente
// (components/profile/). Aqui só vive o que é partilhado entre blocos: o perfil, o envio da
// foto (o botão está na foto, a mensagem de estado no cartão) e o interruptor das definições.
export function Profile() {
  const { data: profile, isLoading, isError } = useProfile()
  const uploadAvatar = useUploadAvatar()

  // Um só interruptor ("Definições") substitui os três que existiam antes (editar dados,
  // remover foto, mudar password) — pedido do utilizador para simplificar o ecrã: tudo o que
  // mexe na conta fica atrás do ícone de engrenagem, nada solto.
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  if (isLoading) {
    return (
      <main className="flex min-h-dvh items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-piquete-yellow border-t-piquete-blue" />
          <p className="text-sm font-medium text-gray-600">A carregar perfil...</p>
        </div>
      </main>
    )
  }

  if (isError || !profile) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 text-xl">
          ⚠️
        </div>
        <p className="text-sm text-gray-700 max-w-sm">
          Não foi possível carregar o teu perfil. Verifica a tua ligação e tenta novamente.
        </p>
        <Button variant="primary" size="sm" onClick={() => window.location.reload()}>
          Tentar novamente
        </Button>
      </main>
    )
  }

  const avatarErrorMessage =
    uploadAvatar.error instanceof AvatarUploadError
      ? uploadAvatar.error.message
      : 'Não foi possível enviar a foto. Tenta novamente.'

  return (
    <main className="min-h-dvh w-full pb-28 animate-fade-in lg:pb-0">
      <LayoutDividido
        foto={
          <FotoDoPerfil
            profile={profile}
            definicoesAbertas={isSettingsOpen}
            aEnviarFoto={uploadAvatar.isPending}
            aoAlternarDefinicoes={() => setIsSettingsOpen((aberto) => !aberto)}
            aoEscolherFoto={(ficheiro) => uploadAvatar.mutate(ficheiro)}
          />
        }
      >
        <section className="flex flex-col gap-5 rounded-[2.5rem] bg-white p-6 shadow-card border border-gray-100 sm:p-7">
          {uploadAvatar.isPending && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 p-2.5 rounded-xl text-center">
              A atualizar foto de perfil...
            </p>
          )}
          {uploadAvatar.isError && (
            <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded-xl text-center">
              {avatarErrorMessage}
            </p>
          )}

          {profile.role === 'PROFESSIONAL' && <AtalhoDoCatalogo />}
          {profile.role === 'PROFESSIONAL' && profile.professional_type === 'COMPANY' && <AtalhoDaEquipa />}

          <EstatisticasDaConta profile={profile} />

          {isSettingsOpen ? <DefinicoesDaConta profile={profile} /> : <TelefoneRegistado telefone={profile.phone} />}

          <div className="flex flex-col gap-2 rounded-2xl bg-gray-50 border border-gray-100 p-4">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Localização Registada</span>
            <LocationForm profile={profile} allowManual={false} />
          </div>
        </section>

        <HistoricoDePedidos />
      </LayoutDividido>
    </main>
  )
}
