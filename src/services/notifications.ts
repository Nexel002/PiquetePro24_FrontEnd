import { api } from '../lib/api'

// TRD Adendo v1.7 (backend): endpoint idempotente — chamar duas vezes só reenvia o
// email de boas-vindas, não é erro. Por isso os chamadores (Login.tsx, AuthCallback.tsx)
// disparam isto sem aguardar nem mostrar o resultado ao utilizador: falhar aqui nunca
// pode fazer parecer que o signup em si falhou, e não há nada de útil a mostrar numa UI
// sobre o estado de um email de boas-vindas.
export async function sendWelcomeNotification(): Promise<void> {
  await api.post('/notifications/welcome')
}
