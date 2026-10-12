import { describe, expect, it } from 'vitest'
import type { Invitation, InvitationStatus } from '../services/invitations'
import type { RequestStatus } from '../services/serviceRequests'
import { contarConvitesPorResponder } from './convitesPorResponder'

function convite(status: InvitationStatus, pedido: RequestStatus = 'OPEN'): Invitation {
  return {
    service_request_id: `${status}-${pedido}`,
    status,
    proposal_price: null,
    proposal_message: null,
    responded_at: null,
    created_at: '2026-10-01T10:00:00.000Z',
    request: {
      title: 'Torneira',
      description: null,
      status: pedido,
      province: 'Maputo Cidade',
      district: null,
      neighborhood: null,
      created_at: '2026-10-01T10:00:00.000Z',
    },
  }
}

describe('contarConvitesPorResponder', () => {
  it('sem dados (a carregar ou em erro) conta zero', () => {
    expect(contarConvitesPorResponder(undefined)).toBe(0)
    expect(contarConvitesPorResponder([])).toBe(0)
  })

  it('conta os convites ainda sem resposta de pedidos abertos', () => {
    expect(contarConvitesPorResponder([convite('INVITED'), convite('INVITED'), convite('INVITED')])).toBe(3)
  })

  it('não conta os que já tiveram resposta ou desfecho', () => {
    const convites = (['PROPOSED', 'DECLINED', 'CHOSEN', 'NOT_CHOSEN'] as const).map((estado) => convite(estado))

    expect(contarConvitesPorResponder(convites)).toBe(0)
  })

  it('não conta convites de pedidos que o cliente já fechou ou atribuiu', () => {
    const convites = (['ASSIGNED', 'COMPLETED', 'CANCELLED'] as const).map((estado) => convite('INVITED', estado))

    expect(contarConvitesPorResponder(convites)).toBe(0)
  })
})
