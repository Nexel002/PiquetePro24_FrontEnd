import { useState } from 'react'
import { toast } from 'sonner'
import { BackButton } from '../components/BackButton'
import { NavegacaoAdmin } from '../components/admin/NavegacaoAdmin'
import { PalavraPasseProvisoria } from '../components/PalavraPasseProvisoria'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useAddAdmin, useAdmins, useRevokeAdmin } from '../hooks/useAdminAccounts'
import { useProfile } from '../hooks/useProfile'
import type { AddAdminResult, AdminAccount } from '../services/adminAccounts'

const dataFormatter = new Intl.DateTimeFormat('pt-PT', { dateStyle: 'medium', timeZone: 'Africa/Maputo' })

function CredenciaisNovas({ resultado, aoFechar }: { resultado: AddAdminResult; aoFechar: () => void }) {
  if (resultado.promoted) {
    return (
      <Card variant="solid" className="flex flex-col gap-2 border-emerald-200 p-4" role="status">
        <p className="text-sm font-bold text-emerald-800">{resultado.account.full_name} passou a administrador.</p>
        <p className="text-sm text-gray-600">Já tinha conta: entra com a palavra-passe ou o Google que já usa.</p>
        <Button type="button" variant="ghost" size="sm" className="self-start" onClick={aoFechar}>
          Fechar
        </Button>
      </Card>
    )
  }

  return (
    <PalavraPasseProvisoria
      titulo={`Conta criada para ${resultado.account.email}.`}
      palavraPasse={resultado.temporary_password ?? ''}
      aoFechar={aoFechar}
    />
  )
}

function LinhaDeAdmin({ conta, ehEu }: { conta: AdminAccount; ehEu: boolean }) {
  const remover = useRevokeAdmin()
  const [aConfirmar, setAConfirmar] = useState(false)

  function confirmar() {
    remover.mutate(conta.id, {
      onSuccess: () => toast.success(`${conta.full_name} deixou de ser administrador.`),
      // O 409 («último administrador») e o 400 chegam com mensagem própria do backend.
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : 'Não foi possível retirar o acesso.')
        setAConfirmar(false)
      },
    })
  }

  return (
    <Card variant="solid" className="flex flex-col gap-2 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-piquete-blue">
            {conta.full_name}
            {ehEu && <span className="ml-2 text-xs font-semibold text-gray-500">(tu)</span>}
          </p>
          <p className="truncate text-xs text-gray-500">
            {conta.email ?? 'sem email'} · desde {dataFormatter.format(new Date(conta.created_at))}
          </p>
        </div>
        {!ehEu && !aConfirmar && (
          <Button type="button" variant="outline" size="sm" onClick={() => setAConfirmar(true)} aria-label={`Remover ${conta.full_name}`}>
            Remover
          </Button>
        )}
      </div>

      {aConfirmar && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-gray-700">Retirar o acesso a {conta.full_name}? A conta fica como cliente, não é apagada.</span>
          <Button type="button" variant="danger" size="sm" onClick={confirmar} disabled={remover.isPending}>
            Sim, retirar
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setAConfirmar(false)}>
            Voltar
          </Button>
        </div>
      )}
    </Card>
  )
}

// Fase 22: o admin gere quem é admin. Adicionar cria a conta (palavra-passe provisória) ou promove
// um cliente que já exista; remover rebaixa para cliente. O guard de role está na rota.
export function AdminAdmins() {
  const { data: admins, isLoading, isError } = useAdmins()
  const { data: perfil } = useProfile()
  const adicionar = useAddAdmin()

  const [email, setEmail] = useState('')
  const [nome, setNome] = useState('')
  const [resultado, setResultado] = useState<AddAdminResult | null>(null)

  function submeter(event: React.FormEvent) {
    event.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email.trim()) || nome.trim().length < 2) {
      toast.error('Indica um email válido e o nome completo.')
      return
    }
    adicionar.mutate(
      { email: email.trim(), full_name: nome.trim() },
      {
        onSuccess: (r) => {
          setResultado(r)
          setEmail('')
          setNome('')
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Não foi possível adicionar o administrador.'),
      },
    )
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 p-4 sm:p-6 pb-12 animate-fade-in">
      <header className="flex items-center gap-3">
        <BackButton />
        <h1 className="flex-1 text-xl sm:text-2xl font-extrabold text-piquete-blue tracking-tight font-heading">Administradores</h1>
      </header>

      <NavegacaoAdmin />

      {resultado && <CredenciaisNovas resultado={resultado} aoFechar={() => setResultado(null)} />}

      <Card variant="solid" className="p-4">
        <form onSubmit={submeter} noValidate className="flex flex-col gap-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">Adicionar administrador</h2>
          <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">
            Nome completo
            <input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={100} className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-normal" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-normal" />
          </label>
          <p className="text-xs text-gray-500">
            Se o email já tem conta de cliente, essa conta passa a administrador. Se não tem, é criada com uma palavra-passe provisória. Contas de
            profissional não se promovem.
          </p>
          <Button type="submit" size="sm" className="self-start" isLoading={adicionar.isPending} disabled={adicionar.isPending}>
            Adicionar administrador
          </Button>
        </form>
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">Administradores atuais</h2>
        {isLoading && <div role="status" aria-label="A carregar" className="h-20 animate-pulse rounded-2xl bg-gray-200" />}
        {isError && <p className="text-sm text-gray-600">Não foi possível carregar os administradores. Verifica a tua ligação e tenta novamente.</p>}
        {admins && (
          <ul className="flex flex-col gap-3">
            {admins.map((conta) => (
              <li key={conta.id}>
                <LinhaDeAdmin conta={conta} ehEu={conta.id === perfil?.id} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
