import { useState } from 'react'
import { toast } from 'sonner'
import { BackButton } from '../components/BackButton'
import { NavegacaoAdmin } from '../components/admin/NavegacaoAdmin'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useExportar, useFunil } from '../hooks/useAdminReports'
import { fimDoDia, guardarFicheiro, inicioDoDia, type Funil, type TipoDeExportacao } from '../services/adminReports'

const ETAPAS: Array<{ chave: keyof Funil; rotulo: string }> = [
  { chave: 'profissionais_registados', rotulo: 'Profissionais registados' },
  { chave: 'kyc_submetido', rotulo: 'Enviaram o KYC' },
  { chave: 'kyc_aprovado', rotulo: 'KYC aprovado' },
  { chave: 'com_pagamento_confirmado', rotulo: 'Com pagamento confirmado' },
  { chave: 'com_trabalho_concluido', rotulo: 'Com um trabalho concluído' },
]

const EXPORTACOES: Array<{ tipo: TipoDeExportacao; titulo: string; descricao: string }> = [
  { tipo: 'users', titulo: 'Utilizadores', descricao: 'Sem telefone nem email, só nome, papel e zona.' },
  { tipo: 'service-requests', titulo: 'Pedidos de serviço', descricao: 'Estado, zona e datas de cada pedido.' },
  { tipo: 'payments', titulo: 'Pagamentos', descricao: 'Transacções de subscrição e o seu estado.' },
]

function BarrasDoFunil({ funil }: { funil: Funil }) {
  const base = funil.profissionais_registados
  return (
    <ol className="flex flex-col gap-3">
      {ETAPAS.map(({ chave, rotulo }) => {
        const valor = funil[chave]
        // Percentagem do total de registados. Sem registados no período não há percentagem a mostrar.
        const percentagem = base > 0 ? Math.round((valor / base) * 100) : null
        return (
          <li key={chave} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="text-gray-700">{rotulo}</span>
              <span className="font-bold text-piquete-blue">
                {valor}
                {percentagem !== null && <span className="ml-1 text-xs font-normal text-gray-500">({percentagem}%)</span>}
              </span>
            </div>
            <div className="h-2 rounded-full bg-gray-100" aria-hidden>
              <div className="h-2 rounded-full bg-piquete-blue" style={{ width: `${Math.min(100, percentagem ?? 0)}%` }} />
            </div>
          </li>
        )
      })}
    </ol>
  )
}

// Fase 19: números para decidir (funil) e dados para levar (CSV). O período aplica-se às duas
// coisas. O guard de role está na rota.
export function AdminReports() {
  const [de, setDe] = useState('')
  const [ate, setAte] = useState('')
  const filtros = { from: inicioDoDia(de), to: fimDoDia(ate) }

  const funil = useFunil(filtros)
  const exportar = useExportar()
  const [aExportar, setAExportar] = useState<TipoDeExportacao | null>(null)

  function descarregar(tipo: TipoDeExportacao) {
    setAExportar(tipo)
    exportar.mutate(
      { tipo, filtros },
      {
        onSuccess: (ficheiro) => {
          if (ficheiro.linhas === 0) {
            toast.error('Não há dados neste período.')
            return
          }
          guardarFicheiro(ficheiro)
          if (ficheiro.truncada) {
            toast.error(`O ficheiro foi cortado nas primeiras ${ficheiro.linhas} linhas. Reduz o período para exportar o resto.`)
          } else {
            toast.success(`${ficheiro.linhas} linhas exportadas.`)
          }
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Não foi possível exportar.'),
        onSettled: () => setAExportar(null),
      },
    )
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 p-4 sm:p-6 pb-12 animate-fade-in">
      <header className="flex items-center gap-3">
        <BackButton />
        <h1 className="flex-1 text-xl sm:text-2xl font-extrabold text-piquete-blue tracking-tight font-heading">Relatórios</h1>
      </header>

      <NavegacaoAdmin />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">
          De
          <input type="date" value={de} max={ate || undefined} onChange={(e) => setDe(e.target.value)} className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-normal" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">
          Até
          <input type="date" value={ate} min={de || undefined} onChange={(e) => setAte(e.target.value)} className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-normal" />
        </label>
      </div>
      <p className="-mt-3 text-xs text-gray-500">Sem datas, mostra tudo. As datas são na hora de Maputo.</p>

      <Card variant="solid" className="flex flex-col gap-3 p-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">Funil de profissionais</h2>
        {funil.isLoading && <div role="status" aria-label="A carregar" className="h-32 animate-pulse rounded-xl bg-gray-200" />}
        {funil.isError && <p className="text-sm text-gray-600">Não foi possível carregar o funil. Verifica a tua ligação e tenta novamente.</p>}
        {funil.data && funil.data.profissionais_registados === 0 && (
          <p className="text-sm text-gray-600">Ainda não há profissionais registados neste período.</p>
        )}
        {funil.data && funil.data.profissionais_registados > 0 && <BarrasDoFunil funil={funil.data} />}
        <p className="text-xs text-gray-500">
          Cada linha conta pessoas, não eventos. As etapas a seguir ao registo contam o que aconteceu no período, por isso nem sempre diminuem.
        </p>
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">Exportar (CSV)</h2>
        <ul className="flex flex-col gap-3">
          {EXPORTACOES.map(({ tipo, titulo, descricao }) => (
            <li key={tipo}>
              <Card variant="solid" className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="text-sm font-bold text-piquete-blue">{titulo}</p>
                  <p className="text-xs text-gray-500">{descricao}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label={`Exportar ${titulo}`}
                  onClick={() => descarregar(tipo)}
                  isLoading={aExportar === tipo}
                  disabled={aExportar !== null}
                >
                  Exportar
                </Button>
              </Card>
            </li>
          ))}
        </ul>
        <p className="text-xs text-gray-500">Máximo de 5000 linhas por ficheiro. Cada exportação fica registada na auditoria.</p>
      </section>
    </main>
  )
}
