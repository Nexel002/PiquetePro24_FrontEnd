import type { Invitation } from '../services/invitations'

// Um convite está «por responder» enquanto o profissional ainda não propôs nem recusou E o
// cliente ainda não fechou o pedido — a mesma regra de ReceivedInvitations.tsx, que só mostra o
// formulário nesse caso. Contar convites de pedidos já fechados acenderia o sino por algo a que
// já não se pode responder.
export function contarConvitesPorResponder(convites: Invitation[] | undefined): number {
  if (!convites) return 0
  return convites.filter((convite) => convite.status === 'INVITED' && convite.request.status === 'OPEN').length
}
