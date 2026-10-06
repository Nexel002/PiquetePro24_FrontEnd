import { Link } from 'react-router-dom'
import { useWorkedWithProfessionals } from '../hooks/useWorkedWithProfessionals'
import { BackButton } from '../components/BackButton'
import { Button } from '../components/ui/Button'
import { Card, CardContent } from '../components/ui/Card'

const dateFormatter = new Intl.DateTimeFormat('pt-PT', { dateStyle: 'medium' })

// "Profissionais com quem já trabalhaste" (Backend Fase 11, Bloco C, TRD Adendo v1.18):
// só quem concluiu pelo menos um pedido deste cliente. "Pedir outra vez" abre o catálogo
// do profissional (/profissionais/:id), de onde o cliente decide o que pedir — não cria
// um pedido directo, porque o fluxo de pedido parte sempre da escolha de 3 profissionais.
export function MyProfessionals() {
  const { data, isLoading, isError, refetch } = useWorkedWithProfessionals()

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-5 p-4 pb-12 sm:p-6 animate-fade-in">
      <header className="flex items-center gap-3">
        <BackButton />
        <h1 className="flex-1 font-heading text-xl font-bold text-piquete-blue">Os meus profissionais</h1>
      </header>

      <p className="text-sm text-piquete-gray">Profissionais com quem já concluíste trabalhos.</p>

      {isLoading && (
        <div className="flex flex-col gap-3">
          <div className="h-24 animate-pulse rounded-3xl bg-gray-200" />
          <div className="h-24 animate-pulse rounded-3xl bg-gray-200" />
        </div>
      )}

      {isError && (
        <Card className="border-red-100 bg-red-50 p-4 text-center">
          <p className="text-sm font-medium text-red-600">Não foi possível carregar os teus profissionais. Verifica a tua ligação.</p>
          <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => void refetch()}>
            Tentar de novo
          </Button>
        </Card>
      )}

      {data && data.length === 0 && (
        <p className="text-sm text-gray-600">
          Ainda não concluíste nenhum trabalho.{' '}
          <Link to="/profissionais" className="underline">
            Procura um profissional
          </Link>{' '}
          para começar.
        </p>
      )}

      {data && data.length > 0 && (
        <ul className="flex flex-col gap-3">
          {data.map((professional) => (
            <li key={professional.professional_id}>
              <Card variant="solid">
                <CardContent className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    {professional.avatar_url ? (
                      <img src={professional.avatar_url} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
                    ) : (
                      <div
                        aria-hidden
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-piquete-blue/10 text-lg font-bold text-piquete-blue"
                      >
                        {professional.full_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex min-w-0 flex-1 flex-col">
                      <p className="truncate text-sm font-bold text-gray-900">{professional.full_name}</p>
                      <p className="text-xs text-piquete-gray">
                        {professional.jobs_count} {professional.jobs_count === 1 ? 'trabalho' : 'trabalhos'} · último em{' '}
                        {dateFormatter.format(new Date(professional.last_job_at))}
                      </p>
                      <p className="truncate text-xs text-gray-500">{professional.last_job_title}</p>
                    </div>
                    <p className="shrink-0 text-xs text-piquete-gray">
                      {professional.my_rating !== null ? (
                        <>
                          <span className="text-piquete-yellow">★</span> {professional.my_rating}{' '}
                          <span className="sr-only">(a tua avaliação)</span>
                        </>
                      ) : (
                        'Sem avaliação'
                      )}
                    </p>
                  </div>
                  <Link to={`/profissionais/${professional.professional_id}`} className="self-start">
                    <Button type="button" size="sm" variant="outline">
                      Pedir outra vez
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
