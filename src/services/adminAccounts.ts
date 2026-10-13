import { api } from '../lib/api'

// Espelha adminAccountService.ts do backend (Fase 24).
export interface AdminAccount {
  id: string
  full_name: string
  email: string | null
  created_at: string
}

export interface AddAdminResult {
  account: AdminAccount
  // Só quando a conta foi criada agora, e só nesta resposta: o backend não a guarda.
  temporary_password: string | null
  // true = o email já tinha conta de cliente, que foi promovida (mantém a palavra-passe).
  promoted: boolean
}

export async function fetchAdmins(): Promise<AdminAccount[]> {
  const response = await api.get<AdminAccount[]>('/admin/admins')
  return response.data
}

export async function addAdmin(input: { email: string; full_name: string }): Promise<AddAdminResult> {
  const response = await api.post<AddAdminResult>('/admin/admins', input)
  return response.data
}

export async function revokeAdmin(id: string): Promise<AdminAccount> {
  const response = await api.post<AdminAccount>(`/admin/admins/${id}/revoke`)
  return response.data
}
