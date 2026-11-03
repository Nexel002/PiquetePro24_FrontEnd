import type { AdminUserSummary } from '../../../services/adminUsers'
import type { UserRole } from '../../../services/profile'

// Partilhado pela tabela e pelas sugestões da pesquisa: estavam duplicados nos dois sítios.
export const ROTULO_DO_PAPEL: Record<UserRole, string> = {
  CLIENT: 'Cliente',
  PROFESSIONAL: 'Profissional',
  ADMIN: 'Administrador',
  TECHNICIAN: 'Técnico',
}

// Sem acentos nem maiúsculas: «amelia» encontra «Amélia».
function normalizarTexto(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

// Filtragem local por nome, telefone ou localidade, sobre a página que o servidor já devolveu.
export function filtrarUtilizadores(utilizadores: AdminUserSummary[], termoPesquisa: string): AdminUserSummary[] {
  const termo = normalizarTexto(termoPesquisa)
  if (!termo) return utilizadores
  return utilizadores.filter((u) => {
    const nome = normalizarTexto(u.full_name || '')
    const telefone = normalizarTexto(u.phone || '')
    const localidade = normalizarTexto([u.neighborhood, u.district, u.province].filter(Boolean).join(' '))
    return nome.includes(termo) || telefone.includes(termo) || localidade.includes(termo)
  })
}
