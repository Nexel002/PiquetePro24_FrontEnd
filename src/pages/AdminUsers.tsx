import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useProfile } from '../hooks/useProfile'
import { useAdminUsers } from '../hooks/useAdminUsers'
import { BackButton } from '../components/BackButton'
import type { UserRole } from '../services/profile'

const PAGE_SIZE = 25

type RoleFilter = 'ALL' | UserRole

const ROLE_LABELS: Record<UserRole, string> = {
  CLIENT: 'Cliente',
  PROFESSIONAL: 'Profissional',
  ADMIN: 'Administrador',
}

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
        <div className="h-6 w-6 animate-pulse rounded-full bg-gray-300" />
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
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 p-6">
      <header className="flex items-center gap-3">
        <BackButton />
        <h1 className="flex-1 text-2xl font-semibold text-gray-900">Utilizadores</h1>
      </header>

      <div className="flex flex-wrap gap-2 text-sm">
        <form onSubmit={handleSearchSubmit} className="flex flex-1 gap-2">
          <input
            type="text"
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            placeholder="Pesquisar por nome ou telefone"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5"
          />
          <button type="submit" className="rounded-lg border border-gray-300 px-3 py-1.5 text-gray-700">
            Pesquisar
          </button>
        </form>
        <select
          value={roleFilter}
          onChange={(event) => handleRoleChange(event.target.value as RoleFilter)}
          className="rounded-lg border border-gray-300 px-3 py-1.5"
        >
          <option value="ALL">Todos os roles</option>
          <option value="CLIENT">Clientes</option>
          <option value="PROFESSIONAL">Profissionais</option>
          <option value="ADMIN">Administradores</option>
        </select>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-2">
          <div className="h-14 animate-pulse rounded-lg bg-gray-200" />
          <div className="h-14 animate-pulse rounded-lg bg-gray-200" />
          <div className="h-14 animate-pulse rounded-lg bg-gray-200" />
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
              <Link
                to={`/admin/utilizadores/${user.id}`}
                className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 p-3 hover:bg-gray-50"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                  <p className="text-xs text-gray-500">{user.phone ?? 'sem telefone'}</p>
                </div>
                <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                  {ROLE_LABELS[user.role]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {users && (offset > 0 || users.length === PAGE_SIZE) && (
        <div className="flex justify-between text-sm">
          <button
            type="button"
            onClick={() => setOffset((current) => Math.max(0, current - PAGE_SIZE))}
            disabled={offset === 0}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-gray-700 disabled:opacity-50"
          >
            Anterior
          </button>
          <button
            type="button"
            onClick={() => setOffset((current) => current + PAGE_SIZE)}
            disabled={users.length < PAGE_SIZE}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-gray-700 disabled:opacity-50"
          >
            Seguinte
          </button>
        </div>
      )}
    </main>
  )
}
