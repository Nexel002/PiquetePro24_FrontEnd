// Conversão de imagem para WebP no browser (Canvas API, sem dependência externa) —
// poupa espaço no Storage mantendo qualidade visual aceitável. Reutilizável: usado
// pelo upload de avatar (Fase 2) e, futuramente, pelo upload de fotos de trabalhos
// dos profissionais (fora do escopo desta fase, mas a mesma função serve).
//
// Não tenta converter GIFs animados (perderia a animação) nem SVGs (já são
// vetoriais/pequenos) — esses ficheiros passam tal como estão.
const SKIP_CONVERSION_TYPES = new Set(['image/gif', 'image/svg+xml'])

export interface ConvertToWebpOptions {
  /** Lado máximo (largura ou altura) em pixels; a imagem é redimensionada mantendo
   * proporção se exceder isto. Evita uploads desnecessariamente grandes vindos
   * diretamente da câmara de um telemóvel. */
  maxDimension?: number
  /** Qualidade WebP, 0–1. */
  quality?: number
}

const DEFAULT_OPTIONS: Required<ConvertToWebpOptions> = {
  maxDimension: 1280,
  quality: 0.85,
}

/**
 * Converte um ficheiro de imagem para WebP. Devolve o ficheiro original sem
 * modificação se o browser não suportar a conversão (Canvas.toBlob com WebP) ou se o
 * tipo estiver na lista de tipos a preservar — nunca lança, para não bloquear um
 * upload por causa de um browser/imagem que não colabora.
 */
export async function convertToWebp(file: File, options: ConvertToWebpOptions = {}): Promise<File> {
  if (SKIP_CONVERSION_TYPES.has(file.type)) {
    return file
  }

  const { maxDimension, quality } = { ...DEFAULT_OPTIONS, ...options }

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return file
  }

  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) {
    bitmap.close()
    return file
  }

  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/webp', quality)
  })

  // canvas.toBlob(resolve, 'image/webp') cai silenciosamente para PNG em browsers sem
  // suporte a WebP (ex. Safari antigo) — confirma o mime type antes de assumir sucesso.
  if (!blob || blob.type !== 'image/webp') {
    return file
  }

  const webpName = file.name.replace(/\.[^./\\]+$/, '') + '.webp'
  return new File([blob], webpName, { type: 'image/webp' })
}
