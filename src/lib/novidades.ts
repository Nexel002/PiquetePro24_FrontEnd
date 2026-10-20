import { compararVersoes, MAXIMO_DE_CARACTERES, MAXIMO_DE_ITENS, novidadesDesde, type EntradaDeVersao } from './versoes'

export interface Novidades {
  // Data de publicação da versão mais recente (AAAA-MM-DD).
  atualizadoEm: string
  novidades: string[]
}

// Declaradas em vite.config.ts (`define`): a versão do package.json do build em que o código corre,
// e o histórico de src/data/novidadesPorVersao.json, já validado no build.
declare const __APP_VERSION__: string
declare const __NOVIDADES__: EntradaDeVersao[]

// Fora do Vite (ex. alguns testes) as constantes não existem.
export function versaoDaApp(): string {
  return typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0'
}
function historicoDaApp(): EntradaDeVersao[] {
  return typeof __NOVIDADES__ === 'undefined' ? [] : __NOVIDADES__
}

// A última versão cujas novidades o utilizador já viu (ou em que a app foi aberta pela primeira vez).
const CHAVE = 'piquete:versao-vista'

interface Dependencias {
  historico?: EntradaDeVersao[]
  versaoActual?: string
  armazenamento?: Pick<Storage, 'getItem' | 'setItem' | 'length' | 'key'>
}

// Alguém que já usava a app antes de esta chave existir: tem a sessão do Supabase guardada. Sem isto,
// toda a gente que vem da versão do aviso antigo (sem a chave) actualizava sem saber o que mudou.
function jaUsavaAApp(armazenamento: Pick<Storage, 'length' | 'key'>): boolean {
  for (let i = 0; i < armazenamento.length; i++) {
    if (/^sb-.+-auth-token$/.test(armazenamento.key(i) ?? '')) return true
  }
  return false
}

function limpar(itens: string[]): string[] {
  return itens
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .map((item) => (item.length > MAXIMO_DE_CARACTERES ? `${item.slice(0, MAXIMO_DE_CARACTERES - 1)}…` : item))
}

/**
 * O que mostrar no aviso «A app foi actualizada», ou null se não há nada. Diz só o que falta a QUEM
 * está a ver: as versões posteriores à última que viu, não «a última» às cegas.
 * - Primeira abertura de alguém novo: nada (não houve actualização); fica marcada a versão actual.
 * - Quem já usava a app antes da chave existir: as novidades da versão actual.
 */
export function novidadesPorMostrar({
  historico = historicoDaApp(),
  versaoActual = versaoDaApp(),
  armazenamento = localStorage,
}: Dependencias = {}): Novidades | null {
  try {
    const vista = armazenamento.getItem(CHAVE)
    let resultado: Novidades | null
    if (vista === null) {
      if (!jaUsavaAApp(armazenamento)) {
        armazenamento.setItem(CHAVE, versaoActual)
        return null
      }
      const actual = historico.find((e) => e.versao === versaoActual)
      resultado = actual ? { atualizadoEm: actual.data, novidades: actual.novidades.slice(0, MAXIMO_DE_ITENS) } : null
    } else {
      if (compararVersoes(versaoActual, vista) <= 0) return null
      // Só até à versão que corre: o histórico nunca devia ter entradas futuras, mas não se anuncia o que não chegou.
      resultado = novidadesDesde(historico.filter((e) => compararVersoes(e.versao, versaoActual) <= 0), vista)
    }
    if (!resultado) return null
    const novidades = limpar(resultado.novidades)
    return novidades.length > 0 ? { atualizadoEm: resultado.atualizadoEm, novidades } : null
  } catch {
    // localStorage indisponível (modo privado, quota): sem aviso — actualizar não depende dele.
    return null
  }
}

/** Ao fechar o aviso: não volta a aparecer até à versão seguinte. */
export function marcarNovidadesVistas({ versaoActual = versaoDaApp(), armazenamento = localStorage }: Dependencias = {}): void {
  try {
    armazenamento.setItem(CHAVE, versaoActual)
  } catch {
    // Melhor-esforço: no pior caso o aviso reaparece na próxima abertura.
  }
}

// «13 de outubro de 2026». Constrói a data com ano/mês/dia locais: `new Date('2026-10-13')` é
// meia-noite UTC e, em fusos a oeste de UTC, mostraria o dia anterior.
export function formatarData(aaaaMmDd: string): string {
  const [ano, mes, dia] = aaaaMmDd.split('-').map(Number)
  return new Intl.DateTimeFormat('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(ano, mes - 1, dia))
}
