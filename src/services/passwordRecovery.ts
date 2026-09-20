import { api } from '../lib/api'

// Devolve a mensagem exata que o backend gera (sempre a mesma, exista ou não a
// conta — defesa anti-enumeração, TRD Adendo v1.7 do backend) em vez de a duplicar
// aqui como texto fixo: se o backend alguma vez a mudar, esta tela acompanha sem
// precisar de deploy coordenado. Um erro (rede, 400 de email inválido, 429 de rate
// limit) propaga normalmente — só o *sucesso* é sempre a mesma mensagem; uma falha
// real não deve ser mascarada de sucesso.
export async function requestPasswordRecovery(email: string): Promise<string> {
  const response = await api.post<{ message: string }>('/auth/password-recovery', { email })
  return response.data.message
}
