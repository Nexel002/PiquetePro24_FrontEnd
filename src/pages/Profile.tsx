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
import type { ProfessionalType, UserRole } from '../services/profile'
import type { RequestStatus } from '../services/serviceRequests'
import { supabase } from '../lib/supabase'
import { describeAuthError } from '../lib/authErrors'

const ROLE_LABELS: Record<UserRole, string> = {
  CLIENT: 'Cliente',
  PROFESSIONAL: 'Profissional',
  ADMIN: 'Administrador',
}

const PROFESSIONAL_TYPE_LABELS: Record<ProfessionalType, string> = {
  SINGULAR: 'Singular',
  COMPANY: 'Empresa',
}

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

  const [isEditingDetails, setIsEditingDetails] = useState(false)
  const [fullNameDraft, setFullNameDraft] = useState('')
  const [phoneDraft, setPhoneDraft] = useState('')

  const [isChangingPassword, setIsChangingPassword] = useState(false)
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

  function handleStartEditingDetails() {
    if (!profile) return
    setFullNameDraft(profile.full_name)
    setPhoneDraft(stripPhonePrefix(profile.phone ?? ''))
    setIsEditingDetails(true)
  }

  function handleCancelEditingDetails() {
    setIsEditingDetails(false)
    updateDetails.reset()
  }

  function handleSubmitDetails(event: FormEvent) {
    event.preventDefault()
    updateDetails.mutate(
      { full_name: fullNameDraft, phone: `${PHONE_PREFIX}${phoneDraft}` },
      { onSuccess: () => setIsEditingDetails(false) },
    )
  }

  function handleStartChangingPassword() {
    setIsChangingPassword(true)
    setPasswordError(null)
    setPasswordSuccess(null)
  }

  function handleCancelChangingPassword() {
    setIsChangingPassword(false)
    setNewPassword('')
    setConfirmNewPassword('')
    setPasswordError(null)
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

  const orderCount = requests?.length ?? 0
  const completedOrders = requests?.filter((r) => r.status === 'COMPLETED').length ?? 0

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col p-3 sm:p-6 pb-12 animate-fade-in">
      {/* 1. HERO PROFILE CARD (100% inspirado na imagem de referência) */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 border border-white/10 shadow-2xl">
        
        {/* Full Bleed Hero Image with Gradient Fusion */}
        <div className="relative w-full h-80 sm:h-96 overflow-hidden bg-gradient-to-b from-slate-800 to-slate-950">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.full_name}
              className="w-full h-full object-cover object-center filter brightness-95 contrast-105 transition-transform duration-700 hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-tr from-[#021431] via-[#052456] to-slate-900">
              <div className="w-28 h-28 rounded-full bg-piquete-yellow/15 border-2 border-piquete-yellow/30 flex items-center justify-center text-5xl font-extrabold text-piquete-yellow shadow-glow-yellow mb-2">
                {profile.full_name.charAt(0).toUpperCase()}
              </div>
              <p className="text-xs text-slate-400 font-medium">Toque para adicionar foto de perfil</p>
            </div>
          )}

          {/* Smooth Dark Gradient Overlay for Seamless Transition */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
          
          {/* Top Quick Actions (Back Button & Settings) */}
          <div className="absolute top-4 inset-x-4 flex items-center justify-between z-20">
            <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl p-1 border border-white/15 shadow-lg">
              <BackButton />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadAvatar.isPending}
                aria-label="Alterar foto"
                className="p-2.5 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-white/15 text-slate-200 hover:text-piquete-yellow hover:border-piquete-yellow/40 transition-all shadow-lg active:scale-95"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>

              <button
                type="button"
                onClick={handleStartEditingDetails}
                aria-label="Editar dados"
                className="p-2.5 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-white/15 text-slate-200 hover:text-piquete-yellow hover:border-piquete-yellow/40 transition-all shadow-lg active:scale-95"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Floating Badges Over Image (Left Side) */}
          <div className="absolute left-4 bottom-8 flex flex-col gap-2 z-20">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-white/20 text-white text-xs font-semibold shadow-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>{orderCount} {orderCount === 1 ? 'Pedido' : 'Pedidos'}</span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-white/20 text-white text-xs font-semibold shadow-lg">
              <span className="text-rose-500">❤️</span>
              <span>{completedOrders} Concluídos</span>
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

        {/* Content Area Inside the Card */}
        <div className="p-6 sm:p-8 pt-2 relative z-20 flex flex-col gap-5 bg-slate-950">
          
          {/* Header Info: Name + Verified Icon + Role */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-heading">
                  {profile.full_name}
                </h1>
                {/* Verified PiquetePro Badge Icon */}
                <svg className="w-5 h-5 text-sky-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>

              <p className="text-sm font-medium text-slate-400 mt-0.5">
                {ROLE_LABELS[profile.role]}
                {profile.role === 'PROFESSIONAL' && profile.professional_type && (
                  <span> · {PROFESSIONAL_TYPE_LABELS[profile.professional_type]}</span>
                )}
              </p>

              {/* Star Rating / Reliability Indicator */}
              <div className="flex items-center gap-1.5 mt-2">
                <div className="flex text-piquete-yellow text-sm">
                  {'★'.repeat(5)}
                </div>
                <span className="text-xs text-slate-400 font-semibold ml-1">
                  Membro desde {memberSinceFormatter.format(new Date(profile.created_at))}
                </span>
              </div>
            </div>

            {/* Quick Profile Edit Pill Action */}
            <div className="shrink-0">
              <Button
                variant="glass"
                size="sm"
                onClick={handleStartEditingDetails}
                className="rounded-full px-4 text-xs font-bold border-white/20"
              >
                Editar
              </Button>
            </div>
          </div>

          {/* Messages and Feedback Alerts */}
          {uploadAvatar.isPending && (
            <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl text-center animate-pulse">
              A atualizar foto de perfil...
            </p>
          )}
          {uploadAvatar.isError && (
            <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl text-center">
              {avatarErrorMessage}
            </p>
          )}

          {/* Section: Profile Details / Sobre */}
          <div className="flex flex-col gap-2 rounded-2xl bg-slate-900/80 border border-white/10 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Informações de Perfil
              </span>
              {profile.avatar_url && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  disabled={updateDetails.isPending}
                  className="text-xs text-rose-400 hover:text-rose-300 underline"
                >
                  Remover foto
                </button>
              )}
            </div>

            {isEditingDetails ? (
              <form onSubmit={handleSubmitDetails} className="flex flex-col gap-3 mt-2">
                <label className="flex flex-col gap-1 text-xs font-semibold text-slate-300">
                  Nome Completo
                  <input
                    type="text"
                    value={fullNameDraft}
                    onChange={(event) => setFullNameDraft(event.target.value)}
                    required
                    className="w-full bg-slate-800 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-piquete-yellow/40"
                  />
                </label>

                <label className="flex flex-col gap-1 text-xs font-semibold text-slate-300">
                  Telefone
                  <div className="flex overflow-hidden rounded-xl border border-white/15 bg-slate-800">
                    <span className="flex items-center bg-slate-700/60 px-3 text-sm text-slate-300 font-mono">
                      {PHONE_PREFIX}
                    </span>
                    <input
                      type="tel"
                      value={phoneDraft}
                      onChange={(event) => setPhoneDraft(event.target.value)}
                      required
                      className="flex-1 bg-transparent px-3 py-2.5 text-sm text-white outline-none"
                    />
                  </div>
                </label>

                <div className="flex gap-2 mt-1">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={updateDetails.isPending}
                    isLoading={updateDetails.isPending}
                  >
                    Guardar
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelEditingDetails}
                    disabled={updateDetails.isPending}
                  >
                    Cancelar
                  </Button>
                </div>
                {updateDetails.isError && (
                  <p className="text-xs text-rose-400 mt-1">{detailsErrorMessage}</p>
                )}
              </form>
            ) : (
              <div className="grid grid-cols-2 gap-3 text-xs mt-1">
                <div>
                  <span className="text-slate-500 block">Telefone</span>
                  <span className="text-slate-200 font-medium font-mono">{profile.phone}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Conta</span>
                  <span className="text-slate-200 font-medium">{ROLE_LABELS[profile.role]}</span>
                </div>
              </div>
            )}
          </div>

          {/* Section: Localização (Apenas GPS - sem campos manuais conforme solicitado) */}
          <div className="flex flex-col gap-2 rounded-2xl bg-slate-900/80 border border-white/10 p-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Localização Registada
            </span>
            <LocationForm profile={profile} allowManual={false} />
          </div>

          {/* Section: Segurança & Alterar Password */}
          <div className="flex flex-col gap-2 rounded-2xl bg-slate-900/80 border border-white/10 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Segurança da Conta
              </span>
              {!isChangingPassword && (
                <button
                  type="button"
                  onClick={handleStartChangingPassword}
                  className="text-xs text-piquete-yellow hover:text-yellow-300 font-semibold"
                >
                  Mudar password
                </button>
              )}
            </div>

            {isChangingPassword && (
              <form onSubmit={(event) => void handleChangePassword(event)} className="flex flex-col gap-3 mt-2">
                <input
                  type="password"
                  placeholder="Nova password (mín. 6 caracteres)"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  required
                  minLength={6}
                  className="w-full bg-slate-800 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-piquete-yellow/40"
                />
                <input
                  type="password"
                  placeholder="Confirmar nova password"
                  value={confirmNewPassword}
                  onChange={(event) => setConfirmNewPassword(event.target.value)}
                  required
                  minLength={6}
                  className="w-full bg-slate-800 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-piquete-yellow/40"
                />

                {passwordError && <p role="alert" className="text-xs text-rose-400">{passwordError}</p>}
                {passwordSuccess && <p role="status" className="text-xs text-emerald-400">{passwordSuccess}</p>}

                <div className="flex gap-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={isSubmittingPassword}
                    isLoading={isSubmittingPassword}
                  >
                    Guardar password
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelChangingPassword}
                  >
                    Fechar
                  </Button>
                </div>
              </form>
            )}
          </div>

          {/* Section: CTA / Ação Principal no Rodapé do Card */}
          <div className="pt-2">
            <Link to="/profissionais" className="w-full block">
              <Button
                variant="primary"
                size="lg"
                className="w-full py-3.5 text-base rounded-2xl shadow-glow-yellow"
                rightIcon={<span>→</span>}
              >
                Solicitar Novo Serviço
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. HISTÓRICO DE PEDIDOS DE SERVIÇO (Parte Inferior com Empty State & CTA) */}
      <section className="mt-8 flex flex-col gap-4">
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
          /* Empty State com CTA Chamativo */
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
            <Link to="/profissionais" className="mt-2">
              <Button variant="primary" size="md" className="rounded-xl font-bold shadow-glow-yellow">
                Fazer o Meu Primeiro Pedido
              </Button>
            </Link>
          </div>
        )}
      </section>
    </main>
  )
}
