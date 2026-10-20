// Versões da app e o que cada uma trouxe, para o aviso «A app foi actualizada» dizer só o que
// realmente mudou. Tem de ser TypeScript puro (sem DOM): o vite.config.ts importa-o para validar
// o histórico e o injectar no bundle.

export interface EntradaDeVersao {
  versao: string
  // Dia da publicação (AAAA-MM-DD).
  data: string
  novidades: string[]
}

// O aviso aparece por cima de tudo, e uma lista comprida num ecrã de telemóvel empurra o botão
// «Continuar» para fora da vista.
export const MAXIMO_DE_ITENS = 4
export const MAXIMO_DE_CARACTERES = 140

const FORMATO_DA_VERSAO = /^\d+\.\d+\.\d+$/
const FORMATO_DA_DATA = /^\d{4}-\d{2}-\d{2}$/

export function versaoValida(valor: unknown): valor is string {
  return typeof valor === 'string' && FORMATO_DA_VERSAO.test(valor)
}

export function dataValida(valor: unknown): valor is string {
  if (typeof valor !== 'string' || !FORMATO_DA_DATA.test(valor)) return false
  const [ano, mes, dia] = valor.split('-').map(Number)
  const data = new Date(Date.UTC(ano, mes - 1, dia))
  // 2026-02-31 passa no formato e deixa de passar aqui: a data «rola» para Março.
  return data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia
}

// Negativo se a < b, zero se iguais, positivo se a > b.
export function compararVersoes(a: string, b: string): number {
  const [pa, pb] = [a, b].map((v) => v.split('.').map(Number))
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i]
  }
  return 0
}

export function ordenarDaMaisRecente(entradas: EntradaDeVersao[]): EntradaDeVersao[] {
  return [...entradas].sort((a, b) => compararVersoes(b.versao, a.versao))
}

// O que a app já instalada (`versaoInstalada`) ainda não tem: as novidades das versões posteriores,
// da mais recente para a mais antiga. Quem saltou várias versões vê todas (até ao limite do ecrã);
// quem já tem a última vê `null`, e o aviso não inventa novidades.
export function novidadesDesde(entradas: EntradaDeVersao[], versaoInstalada: string): { atualizadoEm: string; novidades: string[] } | null {
  const novas = ordenarDaMaisRecente(entradas).filter((e) => compararVersoes(e.versao, versaoInstalada) > 0)
  if (novas.length === 0) return null
  const itens = [...new Set(novas.flatMap((e) => e.novidades))].slice(0, MAXIMO_DE_ITENS)
  return { atualizadoEm: novas[0].data, novidades: itens }
}

// Valida o histórico escrito à mão em src/data/novidadesPorVersao.json. Falha o build quando a
// versão do package.json não tem entrada: é o que impede de publicar uma versão com o aviso
// a falar da anterior (ou de uma data que não é a do dia).
export function validarHistorico(historico: unknown, versaoDoPacote: string): EntradaDeVersao[] {
  const ficheiro = 'src/data/novidadesPorVersao.json'
  if (!Array.isArray(historico) || historico.length === 0) throw new Error(`${ficheiro}: tem de ser uma lista com pelo menos uma versão.`)

  const vistas = new Set<string>()
  const entradas = historico.map((bruto, i): EntradaDeVersao => {
    const { versao, data, novidades } = (bruto ?? {}) as Record<string, unknown>
    const onde = `${ficheiro}, entrada ${i + 1}`
    if (!versaoValida(versao)) throw new Error(`${onde}: «versao» tem de ser AAA.BBB.CCC (ex.: 0.2.0).`)
    if (vistas.has(versao)) throw new Error(`${onde}: a versão ${versao} aparece duas vezes.`)
    vistas.add(versao)
    if (!dataValida(data)) throw new Error(`${onde} (${versao}): «data» tem de ser uma data real AAAA-MM-DD.`)
    if (!Array.isArray(novidades) || novidades.length < 1 || novidades.length > MAXIMO_DE_ITENS || novidades.some((n) => typeof n !== 'string' || n.trim() === '')) {
      throw new Error(`${onde} (${versao}): «novidades» tem de ter de 1 a ${MAXIMO_DE_ITENS} frases.`)
    }
    const comprida = (novidades as string[]).find((n) => n.length > MAXIMO_DE_CARACTERES)
    if (comprida) throw new Error(`${onde} (${versao}): frase com ${comprida.length} caracteres (máximo ${MAXIMO_DE_CARACTERES}): «${comprida.slice(0, 40)}…»`)
    return { versao, data, novidades: (novidades as string[]).map((n) => n.trim()) }
  })

  if (!vistas.has(versaoDoPacote)) {
    throw new Error(
      `A versão ${versaoDoPacote} (package.json) não tem entrada em ${ficheiro}. Acrescenta uma, com a data de hoje e o que mudou para o utilizador — é o texto do aviso «Nova versão disponível».`,
    )
  }
  const maisRecente = ordenarDaMaisRecente(entradas)[0]
  if (maisRecente.versao !== versaoDoPacote) {
    throw new Error(`${ficheiro} tem a versão ${maisRecente.versao}, mais recente do que a do package.json (${versaoDoPacote}). Sobe a versão do package.json.`)
  }
  return entradas
}
