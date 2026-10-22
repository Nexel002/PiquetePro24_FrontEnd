// Gera public/favicon.ico (16, 32 e 48 px) a partir de public/pwa-192x192.png (só o escudo do
// logótipo). O Google, e os browsers que ainda pedem `/favicon.ico` à raiz sem ler o HTML, vão
// buscá-lo por omissão; só com o PNG ligado no index.html o ícone demorava mais a aparecer nos
// resultados de pesquisa. Correr de novo se o logótipo mudar: `node scripts/gerar-favicon.mjs`.
// Sem dependências, como scripts/gerar-logotipos.mjs: o PNG de origem tem de ser RGBA de 8 bits
// sem entrelaçamento (outro formato falha com erro), e 192 é múltiplo de 16, 32 e 48, por isso a
// redução é uma média exacta de blocos, com o alfa pesado para as margens transparentes não
// escurecerem o contorno.
import { readFileSync, writeFileSync } from 'node:fs'
import zlib from 'node:zlib'

const ORIGEM = 'public/pwa-192x192.png'
const DESTINO = 'public/favicon.ico'
const TAMANHOS = [16, 32, 48]

function lerPng(caminho) {
  const b = readFileSync(caminho)
  let p = 8
  const idat = []
  let W, H
  while (p < b.length) {
    const len = b.readUInt32BE(p)
    const tipo = b.toString('ascii', p + 4, p + 8)
    const d = b.subarray(p + 8, p + 8 + len)
    if (tipo === 'IHDR') {
      W = d.readUInt32BE(0)
      H = d.readUInt32BE(4)
      if (d[8] !== 8 || d[9] !== 6 || d[12] !== 0) throw new Error('formato não suportado: só RGBA de 8 bits sem entrelaçamento')
    }
    if (tipo === 'IDAT') idat.push(d)
    p += 12 + len
  }
  const raw = zlib.inflateSync(Buffer.concat(idat))
  const st = W * 4
  const px = Buffer.alloc(H * st)
  for (let y = 0; y < H; y++) {
    const filtro = raw[y * (st + 1)]
    for (let x = 0; x < st; x++) {
      const r = raw[y * (st + 1) + 1 + x]
      const a = x >= 4 ? px[y * st + x - 4] : 0
      const u = y ? px[(y - 1) * st + x] : 0
      const c = x >= 4 && y ? px[(y - 1) * st + x - 4] : 0
      let v
      if (filtro === 0) v = r
      else if (filtro === 1) v = r + a
      else if (filtro === 2) v = r + u
      else if (filtro === 3) v = r + ((a + u) >> 1)
      else {
        const q = a + u - c
        const pa = Math.abs(q - a)
        const pb = Math.abs(q - u)
        const pc = Math.abs(q - c)
        v = r + (pa <= pb && pa <= pc ? a : pb <= pc ? u : c)
      }
      px[y * st + x] = v & 255
    }
  }
  return { W, H, px }
}

function reduzir({ W, px }, lado) {
  const f = W / lado
  const saida = Buffer.alloc(lado * lado * 4)
  for (let y = 0; y < lado; y++) {
    for (let x = 0; x < lado; x++) {
      let r = 0, g = 0, b = 0, a = 0
      for (let j = 0; j < f; j++) {
        for (let i = 0; i < f; i++) {
          const o = ((y * f + j) * W + (x * f + i)) * 4
          const alfa = px[o + 3]
          r += px[o] * alfa
          g += px[o + 1] * alfa
          b += px[o + 2] * alfa
          a += alfa
        }
      }
      const o = (y * lado + x) * 4
      if (a > 0) {
        saida[o] = Math.round(r / a)
        saida[o + 1] = Math.round(g / a)
        saida[o + 2] = Math.round(b / a)
      }
      saida[o + 3] = Math.round(a / (f * f))
    }
  }
  return { W: lado, H: lado, px: saida }
}

const tabelaCrc = new Int32Array(256).map((_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c
})
const crc = (buf) => {
  let c = -1
  for (const x of buf) c = tabelaCrc[(c ^ x) & 255] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}
const bloco = (tipo, dados) => {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(dados.length)
  const corpo = Buffer.concat([Buffer.from(tipo), dados])
  const soma = Buffer.alloc(4)
  soma.writeUInt32BE(crc(corpo))
  return Buffer.concat([len, corpo, soma])
}
function codificarPng({ W, H, px }) {
  const st = W * 4
  const raw = Buffer.alloc(H * (st + 1))
  for (let y = 0; y < H; y++) px.copy(raw, y * (st + 1) + 1, y * st, (y + 1) * st)
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(W)
  ihdr.writeUInt32BE(H, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    bloco('IHDR', ihdr),
    bloco('IDAT', zlib.deflateSync(raw, { level: 9 })),
    bloco('IEND', Buffer.alloc(0)),
  ])
}

// ICO com as imagens em PNG (aceite desde o Windows Vista e por todos os browsers actuais).
const origem = lerPng(ORIGEM)
if (origem.W !== 192 || origem.H !== 192) throw new Error(`${ORIGEM} devia ter 192×192`)
const imagens = TAMANHOS.map((lado) => ({ lado, png: codificarPng(reduzir(origem, lado)) }))

const cabecalho = Buffer.alloc(6)
cabecalho.writeUInt16LE(1, 2) // tipo: ícone
cabecalho.writeUInt16LE(imagens.length, 4)
let deslocamento = 6 + 16 * imagens.length
const entradas = imagens.map(({ lado, png }) => {
  const e = Buffer.alloc(16)
  e[0] = lado
  e[1] = lado
  e.writeUInt16LE(1, 4) // planos
  e.writeUInt16LE(32, 6) // bits por pixel
  e.writeUInt32LE(png.length, 8)
  e.writeUInt32LE(deslocamento, 12)
  deslocamento += png.length
  return e
})
writeFileSync(DESTINO, Buffer.concat([cabecalho, ...entradas, ...imagens.map((i) => i.png)]))
console.log(`${DESTINO}: ${TAMANHOS.join(', ')} px, ${deslocamento} bytes`)
