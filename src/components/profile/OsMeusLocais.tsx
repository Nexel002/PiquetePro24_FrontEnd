import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { useClientLocations, useCreateClientLocation, useDeleteClientLocation } from '../../hooks/useClientLocations'
import { MOZAMBIQUE_PROVINCES } from '../../lib/provinces'
import { MAX_LOCAIS_POR_CLIENTE } from '../../services/clientLocations'
import type { UserProfile } from '../../services/profile'
import { Button } from '../ui/Button'

const CLASSE_DO_CAMPO =
  'min-h-[44px] rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-piquete-blue focus:outline-none'

// Fase 40 (TRD Adendo v1.66, N6): locais guardados («Sede», «Loja da Baixa», «Casa»), para escolher
// num pedido em vez de usar a localização do perfil. Apagar um local não muda pedidos já feitos (a
// morada é copiada para o pedido).
export function OsMeusLocais({ profile }: { profile: UserProfile }) {
  const locais = useClientLocations(true)
  const criar = useCreateClientLocation()
  const apagar = useDeleteClientLocation()
  const [aCriar, setACriar] = useState(false)
  const [rotulo, setRotulo] = useState('')
  const [provincia, setProvincia] = useState(profile.province ?? MOZAMBIQUE_PROVINCES[0])
  const [distrito, setDistrito] = useState('')
  const [bairro, setBairro] = useState('')
  // As coordenadas do perfil servem a quem guarda «Casa» onde está registado; noutro sítio, fica só
  // a hierarquia (o profissional abre o mapa só quando há coordenadas).
  const [comCoordenadasDoPerfil, setComCoordenadasDoPerfil] = useState(false)
  const temCoordenadas = profile.latitude !== null && profile.longitude !== null

  const total = locais.data?.length ?? 0

  function aoCriar(evento: FormEvent) {
    evento.preventDefault()
    criar.mutate(
      {
        label: rotulo.trim(),
        province: provincia,
        district: distrito.trim() || undefined,
        neighborhood: bairro.trim() || undefined,
        ...(comCoordenadasDoPerfil && temCoordenadas ? { latitude: profile.latitude as number, longitude: profile.longitude as number } : {}),
      },
      {
        onSuccess: () => {
          setACriar(false)
          setRotulo('')
          setDistrito('')
          setBairro('')
          setComCoordenadasDoPerfil(false)
          toast.success('Local guardado.')
        },
        onError: (erro) => toast.error(erro instanceof Error ? erro.message : 'Não foi possível guardar o local.'),
      },
    )
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-4">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Os meus locais</span>
        <span className="text-xs text-gray-400">
          {total}/{MAX_LOCAIS_POR_CLIENTE}
        </span>
      </div>

      {locais.isLoading && <div className="h-12 animate-pulse rounded-xl bg-gray-200" />}
      {locais.isError && <p className="text-sm text-gray-600">Não foi possível carregar os teus locais.</p>}
      {locais.data && locais.data.length === 0 && !aCriar && (
        <p className="text-sm text-gray-600">Guarda os sítios onde costumas pedir serviços, para os escolheres num pedido.</p>
      )}

      {locais.data && locais.data.length > 0 && (
        <ul className="flex flex-col gap-2">
          {locais.data.map((local) => (
            <li key={local.id} className="flex items-center justify-between gap-3 rounded-xl bg-white p-3 text-sm">
              <span className="min-w-0">
                <span className="font-semibold text-piquete-blue">{local.label}</span>
                <span className="block text-xs text-gray-500">{[local.neighborhood, local.district, local.province].filter(Boolean).join(', ')}</span>
              </span>
              <button
                type="button"
                onClick={() => apagar.mutate(local.id, { onError: () => toast.error('Não foi possível apagar o local.') })}
                disabled={apagar.isPending}
                className="min-h-[40px] shrink-0 rounded-full px-3 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
              >
                Apagar
              </button>
            </li>
          ))}
        </ul>
      )}

      {aCriar ? (
        <form onSubmit={aoCriar} className="flex flex-col gap-2">
          <input aria-label="Nome do local" placeholder="Ex.: Sede, Loja da Baixa" value={rotulo} onChange={(e) => setRotulo(e.target.value)} maxLength={40} required className={CLASSE_DO_CAMPO} />
          <select aria-label="Província" value={provincia} onChange={(e) => setProvincia(e.target.value)} className={CLASSE_DO_CAMPO}>
            {MOZAMBIQUE_PROVINCES.map((nome) => (
              <option key={nome}>{nome}</option>
            ))}
          </select>
          <input aria-label="Distrito" placeholder="Distrito (opcional)" value={distrito} onChange={(e) => setDistrito(e.target.value)} maxLength={100} className={CLASSE_DO_CAMPO} />
          <input aria-label="Bairro" placeholder="Bairro (opcional)" value={bairro} onChange={(e) => setBairro(e.target.value)} maxLength={100} className={CLASSE_DO_CAMPO} />
          {temCoordenadas && (
            <label className="flex min-h-[44px] items-center gap-2 text-xs text-gray-700">
              <input type="checkbox" checked={comCoordenadasDoPerfil} onChange={(e) => setComCoordenadasDoPerfil(e.target.checked)} className="h-5 w-5 accent-piquete-blue" />
              É onde estou registado (usar a localização GPS do perfil)
            </label>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setACriar(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={!rotulo.trim() || criar.isPending} isLoading={criar.isPending}>
              Guardar local
            </Button>
          </div>
        </form>
      ) : (
        <Button type="button" variant="glass" size="sm" className="self-start" onClick={() => setACriar(true)} disabled={total >= MAX_LOCAIS_POR_CLIENTE}>
          Acrescentar local
        </Button>
      )}
    </div>
  )
}
