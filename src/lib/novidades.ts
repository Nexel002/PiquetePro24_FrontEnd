export interface Novidades {
  // Data de publicação da versão (AAAA-MM-DD), como escrita em public/novidades.json.
  atualizadoEm: string
  novidades: string[]
}

// Quantas novidades se mostram, e o tamanho de cada: o aviso aparece por cima de tudo, e uma
// lista comprida num ecrã de telemóvel empurra o botão «Actualizar» para fora da vista.
const MAXIMO_DE_ITENS = 4
const MAXIMO_DE_CARACTERES = 140

// public/novidades.json é editado à mão em cada versão que o utilizador deva ver anunciada
// (texto simples, sem termos técnicos). Vem de fora do bundle de propósito: quem vê o aviso
// está a correr a versão ANTIGA, que não conhece as novidades da nova — só um ficheiro lido
// da rede (sem cache) as pode dizer. Qualquer falha devolve null e o aviso mostra-se na mesma,
// sem lista: nunca se perde a possibilidade de actualizar por causa de um texto.
export async function carregarNovidades(pedir: typeof fetch = fetch): Promise<Novidades | null> {
  try {
    const resposta = await pedir('/novidades.json', { cache: 'no-store' })
    if (!resposta.ok) return null
    const bruto: unknown = await resposta.json()
    if (typeof bruto !== 'object' || bruto === null) return null

    const { atualizadoEm, novidades } = bruto as Record<string, unknown>
    if (typeof atualizadoEm !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(atualizadoEm)) return null
    if (!Array.isArray(novidades)) return null

    const itens = novidades
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
      .map((item) => (item.length > MAXIMO_DE_CARACTERES ? `${item.slice(0, MAXIMO_DE_CARACTERES - 1)}…` : item))
      .slice(0, MAXIMO_DE_ITENS)

    return { atualizadoEm, novidades: itens }
  } catch {
    // Sem rede, JSON inválido, ficheiro em falta (a Vercel devolveria o index.html).
    return null
  }
}

// «13 de outubro de 2026». Constrói a data com ano/mês/dia locais: `new Date('2026-10-13')` é
// meia-noite UTC e, em fusos a oeste de UTC, mostraria o dia anterior.
export function formatarData(aaaaMmDd: string): string {
  const [ano, mes, dia] = aaaaMmDd.split('-').map(Number)
  return new Intl.DateTimeFormat('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(ano, mes - 1, dia))
}
