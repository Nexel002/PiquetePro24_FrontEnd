import { api } from '../lib/api'
import type { RequestStatus, ServiceRequest } from './serviceRequests'

export interface AdminServiceRequestFilters {
  status?: RequestStatus
  province?: string
  limit: number
  offset: number
}

// TRD Adendo v1.9, item C: visão de admin sobre todos os pedidos, sem o âmbito de
// dono que GET /service_requests (o próprio) e GET /service_requests/nearby têm.
export async function fetchAllServiceRequests(filters: AdminServiceRequestFilters): Promise<ServiceRequest[]> {
  const response = await api.get<ServiceRequest[]>('/admin/service-requests', {
    params: {
      status: filters.status,
      province: filters.province || undefined,
      limit: filters.limit,
      offset: filters.offset,
    },
  })
  return response.data
}

// Override de admin — cancela independentemente de quem é o dono (o endpoint do
// próprio cliente, POST /service_requests/:id/cancel, continua a exigir ownership).
export async function cancelServiceRequestAsAdmin(requestId: string): Promise<ServiceRequest> {
  const response = await api.post<ServiceRequest>(`/admin/service-requests/${requestId}/cancel`)
  return response.data
}
