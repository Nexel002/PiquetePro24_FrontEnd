import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useProfile } from '../hooks/useProfile'
import { useCreateServiceRequest } from '../hooks/useServiceRequests'
import type { ServiceRequestLocationInput } from '../services/serviceRequests'
import type { UserProfile } from '../services/profile'
import { BackButton } from '../components/BackButton'
import { Button } from '../components/ui/Button'
import { Card, CardContent } from '../components/ui/Card'
import { Input } from '../components/ui/Input'

// Estado de navegação vindo de FindProfessionals.tsx: o serviço e os profissionais
// escolhidos. Sem ele (abrir /novo-pedido diretamente, ou refrescar depois de limpar o
// histórico) não há a quem enviar — volta-se à pesquisa em vez de mostrar um formulário
// que não pode ser enviado.
export interface NewServiceRequestState {
  categoryId: string
  categoryName: string
  professionals: { id: string; full_name: string }[]
}

// O local do serviço é o que o cliente já registou no perfil (o onboarding obriga a
// ter localização) — não se pede outra vez. Sem província não há local válido para o
// backend (province é obrigatória em ambas as variantes).
function locationFromProfile(profile: UserProfile): ServiceRequestLocationInput | null {
  if (!profile.province) return null

  const hierarchy = {
    province: profile.province,
    district: profile.district ?? undefined,
    neighborhood: profile.neighborhood ?? undefined,
  }

  return profile.latitude !== null && profile.longitude !== null
    ? { latitude: profile.latitude, longitude: profile.longitude, ...hierarchy }
    : hierarchy
}

// Novo pedido dirigido (Backend Fase 11, TRD Adendo v1.18): o cliente descreve o que
// precisa e o pedido segue para os profissionais escolhidos, que respondem com uma
// proposta.
export function NewServiceRequest() {
  const navigate = useNavigate()
  const routerLocation = useLocation()
  const state = routerLocation.state as NewServiceRequestState | null
  const { data: profile, isLoading: isProfileLoading } = useProfile()
  const createRequest = useCreateServiceRequest()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  if (!state || state.professionals.length === 0) {
    return <Navigate to="/profissionais" replace />
  }

  const serviceLocation = profile ? locationFromProfile(profile) : null
  const locationText = serviceLocation
    ? [serviceLocation.neighborhood, serviceLocation.district, serviceLocation.province].filter(Boolean).join(', ')
    : null

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!state || !serviceLocation || !title.trim()) return

    createRequest.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        location: serviceLocation,
        category_id: state.categoryId,
        professional_ids: state.professionals.map((professional) => professional.id),
      },
      { onSuccess: () => navigate('/os-meus-pedidos', { replace: true }) },
    )
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-5 p-4 pb-12 sm:p-6 animate-fade-in">
      <header className="flex items-center gap-3">
        <BackButton />
        <h1 className="flex-1 font-heading text-xl font-bold text-piquete-blue">Novo pedido</h1>
      </header>

      <Card variant="solid">
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm font-bold text-piquete-blue">{state.categoryName}</p>
          <p className="text-xs text-piquete-gray-dark">
            O pedido vai ser enviado a estes profissionais, que respondem com uma proposta. Depois escolhes a que preferires.
          </p>
          <ul className="flex flex-wrap gap-2">
            {state.professionals.map((professional) => (
              <li key={professional.id} className="rounded-full bg-piquete-blue/10 px-3 py-1 text-xs font-semibold text-piquete-blue">
                {professional.full_name}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card variant="solid">
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="O que precisas?"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              maxLength={200}
              placeholder="Ex: Reparar uma torneira a pingar"
            />

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-piquete-blue-dark">Detalhes (opcional)</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={2000}
                rows={4}
                placeholder="Quanto mais detalhe, mais certa será a proposta."
                className="w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-900 focus:border-piquete-blue focus:outline-none focus:ring-2 focus:ring-piquete-blue/20"
              />
            </label>

            {isProfileLoading && <div className="h-10 animate-pulse rounded-xl bg-gray-200" />}

            {!isProfileLoading && locationText && (
              <p className="rounded-xl bg-gray-50 p-3 text-xs text-piquete-gray-dark">
                <span className="font-semibold text-piquete-blue">Local do serviço:</span> {locationText}.{' '}
                <Link to="/perfil" className="font-semibold text-piquete-blue underline">
                  Alterar no perfil
                </Link>
              </p>
            )}

            {!isProfileLoading && !locationText && (
              <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-700">
                Ainda não tens uma localização no perfil.{' '}
                <Link to="/perfil" className="font-semibold underline">
                  Define-a no perfil
                </Link>{' '}
                para enviares o pedido.
              </p>
            )}

            <Button
              type="submit"
              size="lg"
              disabled={createRequest.isPending || !serviceLocation || !title.trim()}
              isLoading={createRequest.isPending}
              className="w-full"
            >
              Enviar a {state.professionals.length} profissiona{state.professionals.length === 1 ? 'l' : 'is'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
