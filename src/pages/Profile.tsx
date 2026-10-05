import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useProfile, useUpdateProfileDetails, useUploadAvatar } from '../hooks/useProfile'
import { useMyServiceRequests, useCancelServiceRequest, useCompleteServiceRequest } from '../hooks/useServiceRequests'
import { LocationForm } from '../components/LocationForm'
import { BackButton } from '../components/BackButton'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { PHONE_PREFIX, stripPhonePrefix } from '../lib/phone'
import { AvatarUploadError } from '../services/avatar'
import type { RequestStatus } from '../services/serviceRequests'
import { supabase } from '../lib/supabase'
import { describeAuthError } from '../lib/authErrors'

const STATUS_LABELS: Record<RequestStatus, string> = {
  OPEN: 'Aberto',
  ASSIGNED: 'Atribuído',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
}

const STATUS_BADGE_VARIANT: Record<RequestStatus, 'info' | 'pending' | 'approved' | 'rejected'> = {
  OPEN: 'info',
  ASSIGNED: 'pending',
  COMPLETED: 'approved',
  CANCELLED: 'rejected',
}

const memberSinceFormatter = new Intl.DateTimeFormat('pt-PT', { dateStyle: 'long' })
const orderDateFormatter = new Intl.DateTimeFormat('pt-PT', { dateStyle: 'medium', timeStyle: 'short' })

export function Profile() {
  const { data: profile, isLoading, isError } = useProfile()

  const { data: requests, isLoading: isLoadingRequests } = useMyServiceRequests()
  const completeRequest = useCompleteServiceRequest()
  const cancelRequest = useCancelServiceRequest()

  const updateDetails = useUpdateProfileDetails()
  const uploadAvatar = useUploadAvatar()
  const avatarInputRef = useRef<HTMLInputElement>(null)

  // Um só interruptor ("Definições") substitui os três que existiam antes (editar
  // dados, remover foto, mudar password) — pedido do utilizador para simplificar o
  // ecrã: tudo o que mexe na conta fica atrás do ícone de engrenagem, nada solto.
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [fullNameDraft, setFullNameDraft] = useState('')
  const [phoneDraft, setPhoneDraft] = useState('')

  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null)
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false)

  function handleAvatarSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) uploadAvatar.mutate(file)
  }

  function handleRemoveAvatar() {
    updateDetails.mutate({ avatar_url: null })
  }

  function handleToggleSettings() {
    if (!isSettingsOpen && profile) {
      setFullNameDraft(profile.full_name)
      setPhoneDraft(stripPhonePrefix(profile.phone ?? ''))
    }
    setIsSettingsOpen((current) => !current)
    setPasswordError(null)
    setPasswordSuccess(null)
  }

  function handleSubmitDetails(event: FormEvent) {
    event.preventDefault()
    updateDetails.mutate({ full_name: fullNameDraft, phone: `${PHONE_PREFIX}${phoneDraft}` })
  }

  async function handleChangePassword(event: FormEvent) {
    event.preventDefault()
    setPasswordError(null)
    setPasswordSuccess(null)

    if (newPassword.length < 6) {
      setPasswordError('A password tem de ter pelo menos 6 caracteres.')
      return
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError('As passwords não coincidem.')
      return
    }

    setIsSubmittingPassword(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setIsSubmittingPassword(false)

    if (error) {
      setPasswordError(describeAuthError(error))
      return
    }

    setPasswordSuccess('Password atualizada com sucesso.')
    setNewPassword('')
    setConfirmNewPassword('')
  }

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

  const detailsErrorMessage =
    updateDetails.error instanceof Error
      ? updateDetails.error.message
      : 'Não foi possível guardar os dados. Tenta novamente.'

  const avatarErrorMessage =
    uploadAvatar.error instanceof AvatarUploadError
      ? uploadAvatar.error.message
      : 'Não foi possível enviar a foto. Tenta novamente.'

  return (
    <main className="mx-auto flex min-h-dvh w-full flex-col pb-12 sm:max-w-lg sm:p-6 animate-fade-in">
      {/* Cartão de perfil — fundo claro, consistente com o resto da app. Em mobile
          ocupa o ecrã todo, sem margens nem cantos arredondados (pedido do
          utilizador: "não pode haver espaços em branco no lado"); a partir do
          breakpoint sm: fica um cartão simples flutuando sobre a página branca —
          sem fundo escurecido nem modal (tentámos, não ficou bem, revertido). */}
      <div className="relative overflow-hidden bg-white border-b border-gray-100 sm:rounded-[2.5rem] sm:border sm:border-gray-100 sm:shadow-card">
        {/* Hero image */}
        <div className="relative w-full h-72 sm:h-80 overflow-hidden bg-gradient-to-b from-slate-800 to-slate-950">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.full_name}
              className="w-full h-full object-cover object-top filter brightness-95 contrast-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-[#021431] via-[#052456] to-slate-900">
              <div className="w-24 h-24 rounded-full bg-piquete-yellow/15 border-2 border-piquete-yellow/30 flex items-center justify-center text-4xl font-extrabold text-piquete-yellow">
                {profile.full_name.charAt(0).toUpperCase()}
              </div>
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10" />

          {/* Só o botão de voltar fica sobre a imagem — as ações de conta mudaram-se
              para junto do nome (ver abaixo), em vez de flutuarem aqui. */}
          <div className="absolute top-4 left-4 z-20">
            <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl p-1 border border-white/15 shadow-lg">
              <BackButton className="text-white hover:bg-white/15" />
            </div>
          </div>

          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            capture="user"
            onChange={handleAvatarSelected}
            hidden
          />
        </div>

        {/* Conteúdo */}
        <div className="p-6 sm:p-8 flex flex-col gap-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-piquete-blue tracking-tight font-heading truncate">
                {profile.full_name}
              </h1>
            </div>

            {/* Câmara (ação direta: trocar foto) e Definições (painel com editar
                dados, password e remover foto) — substituem o botão "Editar" e os
                ícones que antes flutuavam sobre a imagem. */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadAvatar.isPending}
                aria-label="Alterar foto"
                className="p-2.5 rounded-2xl bg-gray-100 border border-gray-200 text-gray-600 hover:text-piquete-blue hover:border-piquete-blue/30 transition-all active:scale-95"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>

              <button
                type="button"
                onClick={handleToggleSettings}
                aria-label="Definições da conta"
                aria-expanded={isSettingsOpen}
                className={`p-2.5 rounded-2xl border transition-all active:scale-95 ${
                  isSettingsOpen
                    ? 'bg-piquete-blue text-white border-piquete-blue'
                    : 'bg-gray-100 border-gray-200 text-gray-600 hover:text-piquete-blue hover:border-piquete-blue/30'
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>

          <p className="text-xs font-semibold text-gray-400">
            Membro desde {memberSinceFormatter.format(new Date(profile.created_at))}
          </p>

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

          {/* Fase 9 (TRD Adendo v1.17): é aqui que o profissional chega ao catálogo —
              antes só havia o botão em Home.tsx, e quem entra pelo Perfil não o via. */}
          {profile.role === 'PROFESSIONAL' && (
            <Link
              to="/catalogo"
              className="flex items-center gap-3 rounded-2xl bg-piquete-blue p-4 text-white shadow-glow-blue transition-all hover:bg-piquete-blue-light active:scale-[0.98]"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm font-bold">O meu catálogo</span>
                <span className="text-xs text-white/70">Bio, fotos dos trabalhos e avaliações</span>
              </span>
              <span aria-hidden className="text-lg text-white/70">›</span>
            </Link>
          )}

          {/* Painel de definições — editar nome/telefone, mudar password e remover
              foto, tudo atrás do mesmo interruptor (pedido do utilizador). */}
          {isSettingsOpen ? (
            <div className="flex flex-col gap-5 rounded-2xl bg-gray-50 border border-gray-100 p-4">
              <form onSubmit={handleSubmitDetails} className="flex flex-col gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Dados pessoais</span>

                <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">
                  Nome completo
                  <input
                    type="text"
                    value={fullNameDraft}
                    onChange={(event) => setFullNameDraft(event.target.value)}
                    required
                    className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-piquete-blue/20 focus:border-piquete-blue"
                  />
                </label>

                <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">
                  Telefone
                  <div className="flex overflow-hidden rounded-xl border border-gray-200 bg-white">
                    <span className="flex items-center bg-gray-100 px-3 text-sm text-gray-500 font-mono">
                      {PHONE_PREFIX}
                    </span>
                    <input
                      type="tel"
                      value={phoneDraft}
                      onChange={(event) => setPhoneDraft(event.target.value)}
                      required
                      className="flex-1 bg-transparent px-3 py-2.5 text-sm text-gray-900 outline-none"
                    />
                  </div>
                </label>

                <Button type="submit" variant="primary" size="sm" disabled={updateDetails.isPending} isLoading={updateDetails.isPending} className="self-start">
                  Guardar dados
                </Button>
                {updateDetails.isError && <p className="text-xs text-rose-600">{detailsErrorMessage}</p>}
              </form>

              <form onSubmit={(event) => void handleChangePassword(event)} className="flex flex-col gap-3 border-t border-gray-200 pt-4">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Alterar password</span>
                <input
                  type="password"
                  placeholder="Nova password (mín. 6 caracteres)"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  required
                  minLength={6}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-piquete-blue/20 focus:border-piquete-blue"
                />
                <input
                  type="password"
                  placeholder="Confirmar nova password"
                  value={confirmNewPassword}
                  onChange={(event) => setConfirmNewPassword(event.target.value)}
                  required
                  minLength={6}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-piquete-blue/20 focus:border-piquete-blue"
                />
                {passwordError && <p role="alert" className="text-xs text-rose-600">{passwordError}</p>}
                {passwordSuccess && <p role="status" className="text-xs text-emerald-600">{passwordSuccess}</p>}
                <Button type="submit" variant="primary" size="sm" disabled={isSubmittingPassword} isLoading={isSubmittingPassword} className="self-start">
                  Guardar password
                </Button>
              </form>

              {profile.avatar_url && (
                <div className="border-t border-gray-200 pt-4">
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    disabled={updateDetails.isPending}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700 underline"
                  >
                    Remover foto de perfil
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2 rounded-2xl bg-gray-50 border border-gray-100 p-4">
              <div className="text-xs">
                <span className="text-gray-400 block">Telefone</span>
                <span className="text-gray-900 font-medium">{profile.phone}</span>
              </div>
            </div>
          )}

          {/* Localização */}
          <div className="flex flex-col gap-2 rounded-2xl bg-gray-50 border border-gray-100 p-4">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Localização Registada
            </span>
            <LocationForm profile={profile} allowManual={false} />
          </div>
        </div>
      </div>

      {/* Histórico de Pedidos de Serviço */}
      <section className="mt-8 flex flex-col gap-4 px-4 sm:px-0">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-lg font-bold text-piquete-blue tracking-tight font-heading">
              Histórico de Pedidos
            </h2>
            <p className="text-xs text-gray-500">Serviços solicitados e respetivo estado</p>
          </div>
          {requests && requests.length > 0 && (
            <Link to="/os-meus-pedidos" className="text-xs font-semibold text-piquete-blue hover:text-piquete-yellow-hover hover:underline">
              Ver todos ({requests.length})
            </Link>
          )}
        </div>

        {isLoadingRequests ? (
          <div className="flex flex-col gap-3">
            <div className="h-20 animate-pulse rounded-2xl bg-gray-200" />
            <div className="h-20 animate-pulse rounded-2xl bg-gray-200" />
          </div>
        ) : requests && requests.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {requests.map((serviceRequest) => (
              <li
                key={serviceRequest.id}
                className="flex flex-col gap-2.5 rounded-2xl bg-white border border-gray-100 shadow-card p-4 transition-all duration-300 hover:shadow-card-hover"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-bold text-piquete-blue">{serviceRequest.title}</h3>
                  <Badge variant={STATUS_BADGE_VARIANT[serviceRequest.status]}>
                    {STATUS_LABELS[serviceRequest.status]}
                  </Badge>
                </div>

                {serviceRequest.description && (
                  <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                    {serviceRequest.description}
                  </p>
                )}

                <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-[11px] text-gray-400">
                  <span>
                    {[serviceRequest.province, serviceRequest.district, serviceRequest.neighborhood]
                      .filter(Boolean)
                      .join(' — ') || 'Localização GPS'}
                  </span>
                  <span>{orderDateFormatter.format(new Date(serviceRequest.created_at))}</span>
                </div>

                {(serviceRequest.status === 'OPEN' || serviceRequest.status === 'ASSIGNED') && (
                  <div className="flex gap-2 pt-1">
                    {serviceRequest.status === 'ASSIGNED' && (
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() => completeRequest.mutate(serviceRequest.id)}
                        disabled={completeRequest.isPending}
                        isLoading={completeRequest.isPending}
                      >
                        Concluir
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => cancelRequest.mutate(serviceRequest.id)}
                      disabled={cancelRequest.isPending}
                      className="text-red-600 hover:text-red-700"
                    >
                      Cancelar
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 rounded-3xl bg-white border border-gray-100 shadow-card text-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-piquete-yellow/15 border border-piquete-yellow/30 flex items-center justify-center text-2xl text-piquete-blue">
              📋
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-base font-bold text-piquete-blue">Nenhum pedido realizado</h3>
              <p className="text-xs text-gray-500 max-w-xs">
                Ainda não fizeste nenhum pedido de serviço no PiquetePro24. Encontra canalizadores, eletricistas e técnicos disponíveis perto de ti.
              </p>
            </div>
            <Link
              to="/profissionais"
              aria-label="Fazer o meu primeiro pedido"
              className="mt-2 w-14 h-14 rounded-full bg-gradient-to-r from-piquete-yellow via-yellow-400 to-amber-400 text-piquete-blue shadow-glow-yellow border border-yellow-300/30 flex items-center justify-center hover:brightness-105 active:scale-95 transition-all"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 5a.75.75 0 01.75.75v3.5h3.5a.75.75 0 010 1.5h-3.5v3.5a.75.75 0 01-1.5 0v-3.5h-3.5a.75.75 0 010-1.5h3.5v-3.5A.75.75 0 0110 5z" clipRule="evenodd" />
              </svg>
            </Link>
          </div>
        )}
      </section>
    </main>
  )
}
