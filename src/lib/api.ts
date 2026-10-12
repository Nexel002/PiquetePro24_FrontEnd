import axios, { type AxiosError } from 'axios'
import { supabase } from './supabase'
import { registarRespostaDoServidor } from './conectividade'

interface ApiEnvelope<T> {
  success: boolean
  data?: T
  error?: string
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

api.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => {
    registarRespostaDoServidor(true)
    const envelope = response.data as ApiEnvelope<unknown>
    return { ...response, data: envelope.data }
  },
  (error: AxiosError<ApiEnvelope<unknown>>) => {
    // Sem error.response o pedido nem chegou ao servidor (rede caiu, DNS, timeout). Qualquer
    // resposta HTTP, mesmo 4xx/5xx, prova que o servidor está vivo.
    registarRespostaDoServidor(error.response !== undefined)
    const message = error.response?.data?.error ?? error.message
    return Promise.reject(new Error(message))
  },
)
