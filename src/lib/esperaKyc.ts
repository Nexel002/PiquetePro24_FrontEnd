// Acima disto uma verificação de identidade está «em atraso» na fila de revisão. 48h é o
// prazo que o admin se propõe cumprir; mudar o prazo é mudar só esta constante.
export const LIMITE_ESPERA_KYC_HORAS = 48

export interface EsperaKyc {
  horas: number
  emAtraso: boolean
  texto: string
}

// `agora` é parâmetro para o teste não depender do relógio. Datas inválidas ou no futuro
// (relógio do telemóvel adiantado) contam como 0h em vez de um número negativo.
export function esperaDaSubmissao(submittedAt: string, agora: Date = new Date()): EsperaKyc {
  const decorrido = agora.getTime() - new Date(submittedAt).getTime()
  const horas = Number.isFinite(decorrido) && decorrido > 0 ? Math.floor(decorrido / (60 * 60 * 1000)) : 0

  let texto: string
  if (horas < 1) texto = 'menos de 1 hora'
  else if (horas < 48) texto = horas === 1 ? '1 hora' : `${horas} horas`
  else {
    const dias = Math.floor(horas / 24)
    texto = `${dias} dias`
  }

  return { horas, emAtraso: horas >= LIMITE_ESPERA_KYC_HORAS, texto }
}

// Motivos que se repetem; escolher um preenche a caixa de texto, que continua editável. Ficam
// em português claro porque o texto segue por email para o profissional.
export const MOTIVOS_DE_REJEICAO_KYC = [
  'Fotografia do documento ilegível. Envia uma imagem nítida e sem reflexos.',
  'O número do BI não corresponde ao documento enviado.',
  'O NUIT não corresponde ao titular do BI.',
  'Documento fora de validade.',
] as const
