import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useProfile } from '../hooks/useProfile'
import { useAdminUsers } from '../hooks/useAdminUsers'
import { BackButton } from '../components/BackButton'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'
import type { UserRole } from '../services/profile'

const PAGE_SIZE = 25

type RoleFilter = 'ALL' | UserRole

const ROLE_LABELS: Record<UserRole, string> = {
  CLIENT: 'Cliente',
  PROFESSIONAL: 'Profissional',
  ADMIN: 'Administrador',
}

const selectClassName =
  'rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-piquete-blue/20 focus:border-piquete-blue'

// TRD Adendo v1.9, item B: diretório geral de utilizadores — mesma convenção de
// guard de role dentro do próprio componente já usada em AdminKyc.tsx/
// AdminAuditLog.tsx.
export function AdminUsers() {
  const { data: profile, isLoading: isProfileLoading } = useProfile()
  const [searchDraft, setSearchDraft] = useState('')
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL')
  const [offset, setOffset] = useState(0)

  const { data: users, isLoading, isError } = useAdminUsers({
    role: roleFilter === 'ALL' ? undefined : roleFilter,
    search,
    limit: PAGE_SIZE,
    offset,
  })

  if (isProfileLoading) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-piquete-yellow border-t-piquete-blue" />
      </main>
    )
  }

  if (profile?.role !== 'ADMIN') {
    return <Navigate to="/" replace />
  }

  function handleSearchSubmit(event: FormEvent) {
    event.preventDefault()
    setOffset(0)
    setSearch(searchDraft.trim())
  }

  function handleRoleChange(value: RoleFilter) {
    setOffset(0)
    setRoleFilter(value)
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 p-4 sm:p-6 pb-12 animate-fade-in">
      <header className="flex items-center gap-3">
        <BackButton />
        <h1 className="flex-1 text-xl sm:text-2xl font-extrabold text-piquete-blue tracking-tight font-heading">
          Utilizadores
        </h1>
      </header>

      <div className="flex flex-wrap gap-2 text-sm">
        <form onSubmit={handleSearchSubmit} className="flex flex-1 gap-2">
          <input
            type="text"
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            placeholder="Pesquisar por nome ou telefone"
            className="flex-1 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-piquete-blue/20 focus:border-piquete-blue"
          />
          <Button type="submit" variant="outline" size="sm">
            Pesquisar
          </Button>
        </form>
        <select
          value={roleFilter}
          onChange={(event) => handleRoleChange(event.target.value as RoleFilter)}
          className={selectClassName}
        >
          <option value="ALL">Todos os roles</option>
          <option value="CLIENT">Clientes</option>
          <option value="PROFESSIONAL">Profissionais</option>
          <option value="ADMIN">Administradores</option>
        </select>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-2">
          <div className="h-14 animate-pulse rounded-2xl bg-gray-200" />
          <div className="h-14 animate-pulse rounded-2xl bg-gray-200" />
          <div className="h-14 animate-pulse rounded-2xl bg-gray-200" />
        </div>
      )}

      {isError && (
        <p className="text-sm text-gray-600">Não foi possível carregar os utilizadores. Verifica a tua ligação e tenta novamente.</p>
      )}

      {users && users.length === 0 && <p className="text-sm text-gray-600">Nenhum utilizador encontrado.</p>}

      {users && users.length > 0 && (
        <ul className="flex flex-col gap-2">
          {users.map((user) => (
            <li key={user.id}>
              <Link to={`/admin/utilizadores/${user.id}`}>
                <Card variant="interactive">
                  <div className="flex items-center justify-between gap-2 p-4">
                    <div>
                      <p className="text-sm font-bold text-piquete-blue">{user.full_name}</p>
                      <p className="text-xs text-gray-500">{user.phone ?? 'sem telefone'}</p>
                    </div>
                    <Badge variant="info">{ROLE_LABELS[user.role]}</Badge>
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {users && (offset > 0 || users.length === PAGE_SIZE) && (
        <div className="flex justify-between text-sm">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setOffset((current) => Math.max(0, current - PAGE_SIZE))}
            disabled={offset === 0}
          >
            Anterior
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setOffset((current) => current + PAGE_SIZE)}
            disabled={users.length < PAGE_SIZE}
          >
            Seguinte
          </Button>
        </div>
      )}
    </main>
  )
}
