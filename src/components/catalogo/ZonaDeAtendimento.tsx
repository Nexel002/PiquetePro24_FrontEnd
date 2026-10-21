import { useState } from 'react'
import { toast } from 'sonner'
import { useUpdateServiceArea } from '../../hooks/useCatalog'
import { MOZAMBIQUE_PROVINCES } from '../../lib/provinces'
import { RAIOS_DE_ATENDIMENTO_KM, type RaioDeAtendimentoKm, type ServiceArea } from '../../services/catalog'
import { Button } from '../ui/Button'

interface ZonaDeAtendimentoProps {
  professionalId: string
  guardada: ServiceArea
  // O raio conta a partir da localização do perfil; sem ela, só as províncias valem.
  temLocalizacao: boolean
}

// Fase 38 (TRD Adendo v1.66, N1): onde o profissional trabalha — até onde se desloca e que
// províncias cobre inteiras. Quem atende a zona do cliente aparece primeiro na pesquisa.
// Só províncias (lista fechada): distrito e bairro são texto livre e não se comparam com segurança.
export function ZonaDeAtendimento({ professionalId, guardada, temLocalizacao }: ZonaDeAtendimentoProps) {
  const guardar = useUpdateServiceArea(professionalId)
  // null = ainda sem edição local; nesse caso vale o que o servidor devolveu.
  const [raio, setRaio] = useState<RaioDeAtendimentoKm | null | undefined>(undefined)
  const [provincias, setProvincias] = useState<string[] | null>(null)

  const raioActual = raio === undefined ? guardada.radius_km : raio
  const provinciasActuais = provincias ?? guardada.provinces
  const mudou =
    raioActual !== guardada.radius_km ||
    provinciasActuais.length !== guardada.provinces.length ||
    provinciasActuais.some((p) => !guardada.provinces.includes(p))

  function alternarProvincia(nome: string) {
    setProvincias((atual) => {
      const base = atual ?? guardada.provinces
      return base.includes(nome) ? base.filter((p) => p !== nome) : [...base, nome]
    })
  }

  function aoGuardar() {
    guardar.mutate(
      { radius_km: raioActual, provinces: provinciasActuais },
      {
        onSuccess: () => {
          setRaio(undefined)
          setProvincias(null)
          toast.success('Zona de atendimento guardada.')
        },
        onError: (erro) => toast.error(erro instanceof Error ? erro.message : 'Não foi possível guardar a zona. Tenta novamente.'),
      },
    )
  }

  const classeDaOpcao = (activa: boolean) =>
    `min-h-[40px] rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
      activa ? 'border-piquete-blue bg-piquete-blue text-white' : 'border-gray-200 bg-white text-piquete-blue hover:border-piquete-blue/40'
    }`

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold text-gray-700">Até onde te deslocas</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Até onde te deslocas">
          {RAIOS_DE_ATENDIMENTO_KM.map((km) => (
            <button key={km} type="button" aria-pressed={raioActual === km} onClick={() => setRaio(km)} className={classeDaOpcao(raioActual === km)}>
              {km} km
            </button>
          ))}
          <button type="button" aria-pressed={raioActual === null} onClick={() => setRaio(null)} className={classeDaOpcao(raioActual === null)}>
            Não definido
          </button>
        </div>
        {raioActual !== null && !temLocalizacao && (
          <p className="rounded-xl bg-amber-50 p-2.5 text-xs text-amber-700">
            O teu perfil ainda não tem localização: o raio só conta depois de a definires no Perfil. As províncias contam já.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold text-gray-700">Províncias que cobres por inteiro</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Províncias que cobres">
          {MOZAMBIQUE_PROVINCES.map((nome) => {
            const activa = provinciasActuais.includes(nome)
            return (
              <button key={nome} type="button" aria-pressed={activa} onClick={() => alternarProvincia(nome)} className={classeDaOpcao(activa)}>
                {nome}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="button" size="sm" onClick={aoGuardar} disabled={!mudou || guardar.isPending} isLoading={guardar.isPending}>
          Guardar zona
        </Button>
      </div>
    </div>
  )
}

