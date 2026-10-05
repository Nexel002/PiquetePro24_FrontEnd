import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useProfile, useUpdateProfileDetails } from '../hooks/useProfile'
import { useAddPortfolioPhoto, useProfessionalCatalog, useRemovePortfolioPhoto } from '../hooks/useCatalog'
import { PortfolioUploadError } from '../services/portfolio'
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
  const addPhoto = useAddPortfolioPhoto(profile?.id)
  const removePhoto = useRemovePortfolioPhoto(profile?.id)

  const [bio, setBio] = useState<string | null>(null)
  const bioValue = bio ?? profile?.bio ?? ''

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

  function handleAddPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    addPhoto.mutate(file, {
      onError: (err) => {
        const message = err instanceof PortfolioUploadError ? err.message : 'Não foi possível enviar a foto.'
        toast.error(message)
      },
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
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-piquete-blue">Fotos dos trabalhos</p>
            <label className="cursor-pointer text-xs font-semibold text-piquete-blue hover:underline">
              {addPhoto.isPending ? 'A enviar...' : 'Adicionar foto'}
              <input type="file" accept="image/*" className="hidden" disabled={addPhoto.isPending} onChange={handleAddPhoto} />
            </label>
          </div>

          {catalog.isLoading && (
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="aspect-square animate-pulse rounded-2xl bg-gray-200" />
              ))}
            </div>
          )}

          {catalog.isError && (
            <p className="text-sm text-gray-600">Não foi possível carregar as tuas fotos. Tenta novamente.</p>
          )}

          {catalog.data && catalog.data.portfolio.length === 0 && (
            <p className="text-sm text-gray-500">Ainda não adicionaste nenhuma foto de trabalho.</p>
          )}

          {catalog.data && catalog.data.portfolio.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {catalog.data.portfolio.map((photo) => (
                <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-2xl">
                  <img src={photo.photo_url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto.mutate(photo.id)}
                    disabled={removePhoto.isPending}
                    aria-label="Remover foto"
                    className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-piquete-blue-deep/70 text-base font-bold leading-none text-white backdrop-blur transition-colors hover:bg-rose-600 disabled:opacity-50"
                  >
                    ×
                  </button>
                </div>
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
