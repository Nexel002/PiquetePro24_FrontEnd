import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useProfile, useUpdateProfileDetails } from '../hooks/useProfile'
import { useProfessionalCatalog } from '../hooks/useCatalog'
import { useReplaceMyServices, useServiceCategories } from '../hooks/useServiceCategories'
import { MAX_SERVICES_PER_PROFESSIONAL } from '../services/serviceCategories'
import { NewProjectForm } from '../components/portfolio/NewProjectForm'
import { ProjectEditor } from '../components/portfolio/ProjectEditor'
import { BackButton } from '../components/BackButton'
import { Button } from '../components/ui/Button'
import { Card, CardContent } from '../components/ui/Card'

// Ecrã de edição do próprio catálogo (Fase 9, TRD Adendo v1.17): bio (reaproveita
// PATCH /profile já existente) e fotos de portfólio. Guard inline, mesmo padrão de
// AdminKyc.tsx/Kyc.tsx — qualquer PROFESSIONAL, independente de KYC/subscrição (ver
// decisão no Adendo v1.17, item C).
export function MyCatalog() {
  const { data: profile, isLoading: isProfileLoading } = useProfile()
  const catalog = useProfessionalCatalog(profile?.role === 'PROFESSIONAL' ? profile.id : undefined)
  const updateProfile = useUpdateProfileDetails()
  const [showNewProject, setShowNewProject] = useState(false)

  const categories = useServiceCategories()
  const replaceServices = useReplaceMyServices(profile?.id)

  const [bio, setBio] = useState<string | null>(null)
  const bioValue = bio ?? profile?.bio ?? ''

  // null = ainda sem edição local; nesse caso vale o que o servidor devolveu.
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[] | null>(null)
  const savedServiceIds = catalog.data?.services.map((service) => service.id) ?? []
  const serviceIds = selectedServiceIds ?? savedServiceIds
  const servicesChanged =
    selectedServiceIds !== null &&
    (selectedServiceIds.length !== savedServiceIds.length || selectedServiceIds.some((id) => !savedServiceIds.includes(id)))

  if (isProfileLoading) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-6 p-4 sm:p-6">
        <div className="h-6 w-40 animate-pulse rounded-xl bg-gray-200" />
        <div className="h-40 animate-pulse rounded-3xl bg-gray-200" />
      </main>
    )
  }

  if (profile?.role !== 'PROFESSIONAL') {
    return <Navigate to="/" replace />
  }

  function handleSaveBio() {
    updateProfile.mutate(
      { bio: bioValue.trim() || null },
      {
        onSuccess: () => toast.success('Bio atualizada.'),
        onError: () => toast.error('Não foi possível guardar a bio. Tenta novamente.'),
      },
    )
  }

  function toggleService(serviceId: string) {
    setSelectedServiceIds((current) => {
      const base = current ?? savedServiceIds
      if (base.includes(serviceId)) return base.filter((id) => id !== serviceId)
      return base.length >= MAX_SERVICES_PER_PROFESSIONAL ? base : [...base, serviceId]
    })
  }

  function handleSaveServices() {
    replaceServices.mutate(serviceIds, {
      onSuccess: () => {
        setSelectedServiceIds(null)
        toast.success('Serviços atualizados.')
      },
      onError: () => toast.error('Não foi possível guardar os serviços. Tenta novamente.'),
    })
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-6 p-4 sm:p-6 pb-12 animate-fade-in">
      <header className="flex items-center gap-3">
        <BackButton />
        <h1 className="flex-1 text-xl sm:text-2xl font-extrabold text-piquete-blue tracking-tight font-heading">
          O meu catálogo
        </h1>
        <Link to={`/profissionais/${profile.id}`} className="text-xs font-semibold text-piquete-blue hover:underline">
          Pré-visualizar
        </Link>
      </header>

      <Card variant="solid">
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm font-bold text-piquete-blue">Sobre ti</p>
          <textarea
            value={bioValue}
            onChange={(event) => setBio(event.target.value)}
            maxLength={500}
            rows={4}
            placeholder="Conta aos clientes um pouco sobre o teu trabalho..."
            className="w-full rounded-2xl border border-gray-200 p-3 text-sm text-gray-900 focus:border-piquete-blue focus:outline-none focus:ring-1 focus:ring-piquete-blue"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">{bioValue.length}/500</span>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveBio}
              disabled={updateProfile.isPending}
              isLoading={updateProfile.isPending}
            >
              Guardar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card variant="solid">
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-bold text-piquete-blue">Serviços que prestas</p>
            <span className="text-xs text-gray-400">
              {serviceIds.length}/{MAX_SERVICES_PER_PROFESSIONAL}
            </span>
          </div>
          <p className="text-xs text-gray-500">
            É por estes serviços que os clientes te encontram na pesquisa. Escolhe até {MAX_SERVICES_PER_PROFESSIONAL}.
          </p>

          {(categories.isLoading || catalog.isLoading) && (
            <div className="flex flex-wrap gap-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-8 w-24 animate-pulse rounded-full bg-gray-200" />
              ))}
            </div>
          )}

          {categories.isError && <p className="text-sm text-gray-600">Não foi possível carregar a lista de serviços.</p>}

          {categories.data && !catalog.isLoading && (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Serviços que prestas">
              {categories.data.map((service) => {
                const selected = serviceIds.includes(service.id)
                const blocked = !selected && serviceIds.length >= MAX_SERVICES_PER_PROFESSIONAL
                return (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => toggleService(service.id)}
                    disabled={blocked}
                    aria-pressed={selected}
                    className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-40 ${
                      selected
                        ? 'border-piquete-blue bg-piquete-blue text-white'
                        : 'border-gray-200 bg-white text-piquete-blue hover:border-piquete-blue/40'
                    }`}
                  >
                    {service.name}
                  </button>
                )
              })}
            </div>
          )}

          {catalog.data && savedServiceIds.length === 0 && selectedServiceIds === null && (
            <p className="rounded-xl bg-amber-50 p-2.5 text-xs text-amber-700">
              Ainda não escolheste nenhum serviço — os clientes só te encontram pelo nome.
            </p>
          )}

          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              onClick={handleSaveServices}
              disabled={!servicesChanged || serviceIds.length === 0 || replaceServices.isPending}
              isLoading={replaceServices.isPending}
            >
              Guardar serviços
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card variant="solid">
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-bold text-piquete-blue">Os teus trabalhos</p>
            {!showNewProject && (
              <Button type="button" size="sm" onClick={() => setShowNewProject(true)} disabled={savedServiceIds.length === 0}>
                Novo trabalho
              </Button>
            )}
          </div>
          <p className="text-xs text-gray-500">
            Cada trabalho é um serviço que fizeste, com as suas fotos e uma descrição — os clientes veem-no como um carrossel.
          </p>

          {catalog.isLoading && (
            <div className="flex flex-col gap-3">
              {[0, 1].map((i) => (
                <div key={i} className="aspect-[4/3] animate-pulse rounded-2xl bg-gray-200" />
              ))}
            </div>
          )}

          {catalog.isError && <p className="text-sm text-gray-600">Não foi possível carregar os teus trabalhos. Tenta novamente.</p>}

          {catalog.data && savedServiceIds.length === 0 && (
            <p className="rounded-xl bg-amber-50 p-2.5 text-xs text-amber-700">
              Escolhe e guarda primeiro os serviços que prestas (acima): cada trabalho tem de estar ligado a um deles.
            </p>
          )}

          {catalog.data && showNewProject && (
            <NewProjectForm professionalId={profile.id} services={catalog.data.services} onDone={() => setShowNewProject(false)} />
          )}

          {catalog.data && catalog.data.projects.length === 0 && !showNewProject && (
            <p className="text-sm text-gray-500">Ainda não adicionaste nenhum trabalho.</p>
          )}

          {catalog.data && catalog.data.projects.length > 0 && (
            <div className="flex flex-col gap-4">
              {catalog.data.projects.map((project) => (
                <ProjectEditor key={project.id} professionalId={profile.id} project={project} services={catalog.data.services} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {catalog.data && catalog.data.rating_count > 0 && (
        <Card variant="solid">
          <CardContent className="flex flex-col gap-1">
            <p className="text-sm font-bold text-piquete-blue">Avaliações</p>
            <p className="text-sm text-gray-600">
              {catalog.data.rating_avg?.toFixed(1)} / 5 · {catalog.data.rating_count} avaliação
              {catalog.data.rating_count === 1 ? '' : 'ões'}
            </p>
          </CardContent>
        </Card>
      )}
    </main>
  )
}
