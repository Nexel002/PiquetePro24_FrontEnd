import { dataValida, MAXIMO_DE_CARACTERES, MAXIMO_DE_ITENS, novidadesDesde, versaoValida, type EntradaDeVersao } from './versoes'

export interface Novidades {
  // Data de publicação da versão mais recente (AAAA-MM-DD).
  atualizadoEm: string
  novidades: string[]
}

// Declarada em vite.config.ts (`define`) com a versão do package.json do build em que o código corre.
declare const __APP_VERSION__: string

// Fora do Vite (ex. alguns testes) a constante não existe: 0.0.0 faz de qualquer entrada «mais nova».
export function versaoDaApp(): string {
  return typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0'
}

function limpar(itens: unknown[]): string[] {
  return itens
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .map((item) => (item.length > MAXIMO_DE_CARACTERES ? `${item.slice(0, MAXIMO_DE_CARACTERES - 1)}…` : item))
}

// O /novidades.json é gerado no build a partir de src/data/novidadesPorVersao.json (ver
// vite.config.ts), que tem uma entrada por versão. Vem de fora do bundle de propósito: quem vê o
// aviso está a correr a versão ANTIGA, que não conhece as novidades da nova — só um ficheiro lido
// da rede (sem cache) as pode dizer. E dizemos só o que falta a QUEM está a ver: as entradas
// posteriores à versão instalada (`versaoInstalada`), não «a última» às cegas. Qualquer falha — ou
// nenhuma entrada posterior — devolve null e o aviso mostra-se na mesma, sem lista: nunca se perde a
// possibilidade de actualizar por causa de um texto, e nunca se mostra uma novidade que não é desta
// actualização.
export async function carregarNovidades(pedir: typeof fetch = fetch, versaoInstalada: string = versaoDaApp()): Promise<Novidades | null> {
  try {
    const resposta = await pedir('/novidades.json', { cache: 'no-store' })
    if (!resposta.ok) return null
    const bruto: unknown = await resposta.json()
    if (typeof bruto !== 'object' || bruto === null) return null

    const { atualizadoEm, novidades, versoes } = bruto as Record<string, unknown>

    if (Array.isArray(versoes)) {
      const entradas: EntradaDeVersao[] = versoes
        .filter((v): v is Record<string, unknown> => typeof v === 'object' && v !== null)
        .filter((v) => versaoValida(v.versao) && dataValida(v.data) && Array.isArray(v.novidades))
        .map((v) => ({ versao: v.versao as string, data: v.data as string, novidades: limpar(v.novidades as unknown[]) }))
      const desde = novidadesDesde(entradas, versaoInstalada)
      return desde && desde.novidades.length > 0 ? desde : null
    }

    // Formato antigo (sem histórico): só a última versão publicada.
    if (typeof atualizadoEm !== 'string' || !dataValida(atualizadoEm)) return null
    if (!Array.isArray(novidades)) return null
    return { atualizadoEm, novidades: limpar(novidades).slice(0, MAXIMO_DE_ITENS) }
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
