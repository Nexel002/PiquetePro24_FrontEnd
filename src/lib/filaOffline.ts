import { ErroDeApi } from './api'
import type { CreateServiceRequestPayload, ServiceRequest } from '../services/serviceRequests'

// Fila local (IndexedDB) de pedidos criados sem ligação — Fase 5, TRD Adendo v1.27.
//
// A garantia contra duplicados não está aqui: está na Idempotency-Key. O `id` de cada item
// É essa chave (gerada ao enfileirar) e vai em todas as tentativas, por isso reenviar um
// pedido que na verdade já chegou ao servidor devolve o original (Backend, Adendo v1.26).
// Por isso também não é preciso «confirmar» antes de reenviar nem bloquear entre separadores:
// dois separadores a enviar o mesmo item dão um só pedido.

export interface PedidoPendente {
  // = Idempotency-Key (UUID).
  id: string
  // Cada item pertence a um utilizador: num telemóvel partilhado, quem entra a seguir não
  // vê nem envia os pedidos do anterior.
  userId: string
  payload: CreateServiceRequestPayload
  criadoEm: number
  tentativas: number
  // Mensagem do servidor quando recusou o pedido (4xx): reenviar não adianta. Fica à vista
  // do utilizador, que decide descartar — nunca se apaga em silêncio, senão o pedido
  // «desaparecia» sem explicação.
  recusado?: string
}

const NOME_DB = 'piquetepro24-fila'
const LOJA = 'pedidos-pendentes'

let ligacao: Promise<IDBDatabase> | null = null
const ouvintes = new Set<() => void>()

function abrir(): Promise<IDBDatabase> {
  ligacao ??= new Promise((resolve, reject) => {
    const pedido = indexedDB.open(NOME_DB, 1)
    pedido.onupgradeneeded = () => {
      pedido.result.createObjectStore(LOJA, { keyPath: 'id' })
    }
    pedido.onsuccess = () => resolve(pedido.result)
    pedido.onerror = () => {
      ligacao = null
      reject(pedido.error)
    }
  })
  return ligacao
}

async function transaccao<T>(modo: IDBTransactionMode, operacao: (loja: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await abrir()
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(LOJA, modo)
    const pedido = operacao(tx.objectStore(LOJA))
    tx.oncomplete = () => resolve(pedido.result)
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

function avisar() {
  ouvintes.forEach((ouvinte) => ouvinte())
}

export function aoMudarAFila(ouvinte: () => void): () => void {
  ouvintes.add(ouvinte)
  return () => ouvintes.delete(ouvinte)
}

// IndexedDB indisponível (modo privado antigo, Firefox com histórico desligado): a fila
// não funciona, mas o resto da app sim. Quem chama decide o que dizer ao utilizador.
export function filaDisponivel(): boolean {
  return typeof indexedDB !== 'undefined'
}

export async function enfileirar(pedido: Omit<PedidoPendente, 'criadoEm' | 'tentativas'>): Promise<void> {
  await transaccao('readwrite', (loja) => loja.put({ ...pedido, criadoEm: Date.now(), tentativas: 0 }))
  avisar()
}

export async function listarPendentes(userId: string): Promise<PedidoPendente[]> {
  const todos = await transaccao<PedidoPendente[]>('readonly', (loja) => loja.getAll())
  return todos.filter((p) => p.userId === userId).sort((a, b) => a.criadoEm - b.criadoEm)
}

export async function descartar(id: string): Promise<void> {
  await transaccao('readwrite', (loja) => loja.delete(id))
  avisar()
}

async function guardar(item: PedidoPendente): Promise<void> {
  await transaccao('readwrite', (loja) => loja.put(item))
  avisar()
}

export interface ResultadoDoEnvio {
  enviados: ServiceRequest[]
  recusados: number
  // Continuam na fila à espera de ligação (ou de nova sessão).
  pendentes: number
}

// Estados HTTP em que reenviar mais tarde pode resultar. 401: sessão expirada — volta a
// funcionar depois de o utilizador entrar de novo. 408/429/5xx: falha ou excesso temporário.
function esperarEReenviar(erro: ErroDeApi): boolean {
  const { status } = erro
  return status === undefined || status === 401 || status === 408 || status === 429 || status >= 500
}

let emCurso: Promise<ResultadoDoEnvio> | null = null

// Envia, por ordem, os pedidos pendentes de `userId`. Um só envio de cada vez dentro deste
// separador (o `online` e o intervalo podem disparar quase ao mesmo tempo); entre separadores
// a Idempotency-Key cobre o resto. Pára à primeira falha de rede: o item seguinte falharia
// pelo mesmo motivo e só gastaria bateria e dados.
export function enviarPendentes(
  userId: string,
  enviar: (payload: CreateServiceRequestPayload, idempotencyKey: string) => Promise<ServiceRequest>,
): Promise<ResultadoDoEnvio> {
  emCurso ??= (async () => {
    const resultado: ResultadoDoEnvio = { enviados: [], recusados: 0, pendentes: 0 }
    try {
      const itens = (await listarPendentes(userId)).filter((p) => !p.recusado)
      for (const [indice, item] of itens.entries()) {
        try {
          resultado.enviados.push(await enviar(item.payload, item.id))
          await descartar(item.id)
        } catch (erro) {
          if (!(erro instanceof ErroDeApi) || esperarEReenviar(erro)) {
            await guardar({ ...item, tentativas: item.tentativas + 1 })
            resultado.pendentes = itens.length - indice
            break
          }
          await guardar({ ...item, tentativas: item.tentativas + 1, recusado: erro.message })
          resultado.recusados += 1
        }
      }
      return resultado
    } finally {
      emCurso = null
    }
  })()
  return emCurso
}

// Só para os testes: fecha a ligação e apaga a base entre casos.
export async function reporFilaParaTestes(): Promise<void> {
  if (ligacao) (await ligacao).close()
  ligacao = null
  emCurso = null
  ouvintes.clear()
  await new Promise<void>((resolve) => {
    const pedido = indexedDB.deleteDatabase(NOME_DB)
    pedido.onsuccess = () => resolve()
    pedido.onerror = () => resolve()
    pedido.onblocked = () => resolve()
  })
}
