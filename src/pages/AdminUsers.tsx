import { useState, type FormEvent } from 'react'
import { NavegacaoAdmin } from '../components/admin/NavegacaoAdmin'
import { Link } from 'react-router-dom'
import { useAdminUsers } from '../hooks/useAdminUsers'
import { BackButton } from '../components/BackButton'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import type { UserRole } from '../services/profile'

const PAGE_SIZE = 25

type RoleFilter = 'ALL' | UserRole

const ROLE_LABELS: Record<UserRole, string> = {
  CLIENT: 'Cliente',
  PROFESSIONAL: 'Profissional',
  ADMIN: 'Administrador',
  TECHNICIAN: 'Técnico',
}

const ROLE_STYLES: Record<UserRole, { badge: string; avatarBg: string; text: string }> = {
  CLIENT: {
    badge: 'bg-blue-50 text-blue-700 border-blue-200/90',
    avatarBg: 'bg-blue-100 text-piquete-blue',
    text: 'Cliente',
  },
  PROFESSIONAL: {
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/90',
    avatarBg: 'bg-emerald-100 text-emerald-800',
    text: 'Profissional',
  },
  ADMIN: {
    badge: 'bg-purple-50 text-purple-700 border-purple-200/90',
    avatarBg: 'bg-purple-100 text-purple-800',
    text: 'Administrador',
  },
  TECHNICIAN: {
    badge: 'bg-amber-50 text-amber-800 border-amber-200/90',
    avatarBg: 'bg-amber-100 text-amber-900',
    text: 'Técnico',
  },
}

const selectClassName =
  'rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-piquete-blue/20 focus:border-piquete-blue transition-colors cursor-pointer'

export function AdminUsers() {
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
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl font-extrabold text-piquete-blue tracking-tight font-heading">
            Utilizadores
          </h1>
          <p className="text-xs sm:text-sm text-gray-500">Gestão e diretório de contas da plataforma</p>
        </div>
      </header>

      <NavegacaoAdmin />

      {/* Barra de pesquisa e filtro de roles */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <form onSubmit={handleSearchSubmit} className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Pesquisar por nome ou telefone..."
              className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-3.5 py-2 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-piquete-blue/20 focus:border-piquete-blue transition-colors"
            />
          </div>
          <Button type="submit" variant="primary" size="sm" className="shrink-0 px-4">
            Pesquisar
          </Button>
        </form>

        <select
          value={roleFilter}
          onChange={(event) => handleRoleChange(event.target.value as RoleFilter)}
          className={selectClassName}
          aria-label="Filtrar por tipo de utilizador"
        >
          <option value="ALL">Todos os roles</option>
          <option value="CLIENT">Clientes</option>
          <option value="PROFESSIONAL">Profissionais</option>
          <option value="ADMIN">Administradores</option>
          <option value="TECHNICIAN">Técnicos</option>
        </select>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm animate-pulse">
              <div className="w-12 h-12 rounded-full bg-gray-200 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 bg-gray-200 rounded" />
                <div className="h-3 w-28 bg-gray-100 rounded" />
              </div>
              <div className="w-20 h-6 bg-gray-100 rounded-full" />
            </div>
          ))}
        </div>
      )}

      {isError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-center">
          <p className="text-sm font-medium text-rose-700">Não foi possível carregar os utilizadores. Verifica a tua ligação e tenta novamente.</p>
        </div>
      )}

      {users && users.length === 0 && (
        <div className="flex flex-col items-center justify-center p-8 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center gap-2">
          <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm text-slate-400">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-slate-700">Nenhum utilizador encontrado</p>
          <p className="text-xs text-slate-500">Tenta ajustar os termos de pesquisa ou o filtro de tipo de utilizador.</p>
        </div>
      )}

      {users && users.length > 0 && (
        <ul className="flex flex-col gap-2.5">
          {users.map((user) => {
            const style = ROLE_STYLES[user.role] ?? ROLE_STYLES.CLIENT
            const initial = (user.full_name || 'U').trim().charAt(0).toUpperCase()
            const localidade = [user.neighborhood, user.district, user.province].filter(Boolean).join(', ')

            return (
              <li key={user.id}>
                <Link to={`/admin/utilizadores/${user.id}`} className="block group">
                  <Card variant="interactive" className="p-3.5 sm:p-4 hover:border-piquete-blue/30 transition-all duration-200">
                    <div className="flex items-center justify-between gap-3">
                      {/* Avatar redondo e dados do perfil */}
                      <div className="flex items-center gap-3.5 min-w-0">
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt={user.full_name}
                            className="h-12 w-12 rounded-full object-cover shrink-0 border-2 border-white shadow-sm ring-2 ring-slate-100"
                          />
                        ) : (
                          <div
                            aria-hidden="true"
                            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${style.avatarBg} text-base font-bold shadow-sm ring-2 ring-white`}
                          >
                            {initial}
                          </div>
                        )}

                        <div className="min-w-0">
                          <p className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-piquete-blue transition-colors truncate">
                            {user.full_name}
                          </p>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              {user.phone ?? 'sem telefone'}
                            </span>
                            {localidade && (
                              <span className="flex items-center gap-1 truncate text-gray-400">
                                <span>•</span>
                                <span className="truncate">{localidade}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Badge do role e seta de navegação */}
                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border shadow-sm ${style.badge}`}>
                          {ROLE_LABELS[user.role]}
                        </span>
                        <svg
                          className="w-5 h-5 text-gray-400 group-hover:text-piquete-blue group-hover:translate-x-0.5 transition-all"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                          aria-hidden="true"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </Card>
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      {users && (offset > 0 || users.length === PAGE_SIZE) && (
        <div className="flex justify-between items-center text-sm pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setOffset((current) => Math.max(0, current - PAGE_SIZE))}
            disabled={offset === 0}
          >
            ← Anterior
          </Button>
          <span className="text-xs text-gray-500 font-medium">
            A mostrar {offset + 1}–{offset + users.length}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setOffset((current) => current + PAGE_SIZE)}
            disabled={users.length < PAGE_SIZE}
          >
            Seguinte →
          </Button>
        </div>
      )}
    </main>
  )
}
