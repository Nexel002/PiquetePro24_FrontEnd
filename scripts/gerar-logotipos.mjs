// Gera, a partir do logótipo oficial (public/logo.png, fundo branco opaco), as duas versões que a
// app usa — o ficheiro oficial não é alterado:
//   public/logo-transparente.png — fundo transparente, para fundos claros;
//   public/logo-negativo.png     — fundo transparente e texto «PIQUETE PRO» em branco, para fundos
//                                  escuros (o azul-escuro original desaparecia sobre o painel do login).
// Correr de novo se o logótipo oficial mudar: `node scripts/gerar-logotipos.mjs`.
// Sem dependências (sharp/jimp pesavam mais do que isto): o PNG oficial é RGBA 8 bits sem
// entrelaçamento, e só esse formato é suportado — outro formato falha com erro.
import { readFileSync, writeFileSync } from 'node:fs'
import zlib from 'node:zlib'
function ler(caminho) {
  const b = readFileSync(caminho); let p = 8, idat = [], W, H
  while (p < b.length) { const len = b.readUInt32BE(p), t = b.toString('ascii', p + 4, p + 8), d = b.subarray(p + 8, p + 8 + len)
    if (t === 'IHDR') { W = d.readUInt32BE(0); H = d.readUInt32BE(4); if (d[8] !== 8 || d[9] !== 6 || d[12] !== 0) throw new Error('formato não suportado') }
    if (t === 'IDAT') idat.push(d); p += 12 + len }
  const raw = zlib.inflateSync(Buffer.concat(idat)), st = W * 4, px = Buffer.alloc(H * st)
  for (let y = 0; y < H; y++) { const f = raw[y * (st + 1)]
    for (let x = 0; x < st; x++) { const r = raw[y * (st + 1) + 1 + x], a = x >= 4 ? px[y * st + x - 4] : 0, u = y ? px[(y - 1) * st + x] : 0, c = x >= 4 && y ? px[(y - 1) * st + x - 4] : 0
      let v = f === 0 ? r : f === 1 ? r + a : f === 2 ? r + u : f === 3 ? r + ((a + u) >> 1) : (() => { const q = a + u - c, pa = Math.abs(q - a), pb = Math.abs(q - u), pc = Math.abs(q - c); return r + (pa <= pb && pa <= pc ? a : pb <= pc ? u : c) })()
      px[y * st + x] = v & 255 } }
  return { W, H, px }
}
const crcT = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c })
const crc = (buf) => { let c = -1; for (const x of buf) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0 }
const bloco = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]) }
function escrever(caminho, { W, H, px }) {
  const st = W * 4, raw = Buffer.alloc(H * (st + 1))
  for (let y = 0; y < H; y++) px.copy(raw, y * (st + 1) + 1, y * st, (y + 1) * st)
  const ih = Buffer.alloc(13); ih.writeUInt32BE(W); ih.writeUInt32BE(H, 4); ih[8] = 8; ih[9] = 6
  writeFileSync(caminho, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), bloco('IHDR', ih), bloco('IDAT', zlib.deflateSync(raw, { level: 9 })), bloco('IEND', Buffer.alloc(0))]))
}

const quaseBranco = (px, k) => px[k] > 232 && px[k + 1] > 232 && px[k + 2] > 232

function tornarTransparente({ W, H, px }) {
  const i = (x, y) => (y * W + x) * 4
  // 1. Fundo = branco ligado à borda (flood fill). O branco DENTRO do desenho (reflexos do escudo,
  //    gota) não toca na borda e fica opaco.
  const fundo = new Uint8Array(W * H), fila = []
  for (let x = 0; x < W; x++) fila.push([x, 0], [x, H - 1])
  for (let y = 0; y < H; y++) fila.push([0, y], [W - 1, y])
  while (fila.length) {
    const [x, y] = fila.pop()
    if (x < 0 || y < 0 || x >= W || y >= H || fundo[y * W + x] || !quaseBranco(px, i(x, y))) continue
    fundo[y * W + x] = 1
    fila.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1])
  }
  // 2. Fundo → transparente; a orla anti-aliased (2 px à volta do fundo) perde o branco por «cor para
  //    alfa», senão ficava um halo branco sobre fundos escuros.
  const perto = (x, y) => {
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const a = x + dx, b = y + dy
      if (a >= 0 && b >= 0 && a < W && b < H && fundo[b * W + a]) return true
    }
    return false
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = i(x, y)
    if (fundo[y * W + x]) { px[k + 3] = 0; continue }
    if (!perto(x, y)) continue
    const a = Math.max(255 - px[k], 255 - px[k + 1], 255 - px[k + 2]) / 255
    if (a <= 0) { px[k + 3] = 0; continue }
    for (let c = 0; c < 3; c++) px[k + c] = Math.round(255 - (255 - px[k + c]) / a)
    px[k + 3] = Math.round(px[k + 3] * a)
  }
}

// Só a zona do texto (a partir da coluna 129, medida no PNG; é também onde LogoOficial corta a
// variante «escudo»). O escudo e o «24» amarelo ficam iguais.
const TEXTO_X = 129
function tornarNegativo({ W, H, px }) {
  for (let y = 0; y < H; y++) for (let x = TEXTO_X; x < W; x++) {
    const k = (y * W + x) * 4, [r, g, b] = [px[k], px[k + 1], px[k + 2]]
    if (px[k + 3] === 0 || (r > 150 && g > 110 && b < 120)) continue
    // Azul-escuro e a sua orla → branco, com a opacidade que tinha contra o branco. Inclui o interior
    // branco das letras (P, Q, O, R), que o flood fill não apanha e fica assim transparente.
    const a = Math.max(255 - r, 255 - g, 255 - b) / 255
    px[k] = px[k + 1] = px[k + 2] = 255
    px[k + 3] = Math.round(px[k + 3] * a)
  }
}

const imagem = ler('public/logo.png')
tornarTransparente(imagem)
escrever('public/logo-transparente.png', imagem)
tornarNegativo(imagem)
escrever('public/logo-negativo.png', imagem)
console.log('Gerados public/logo-transparente.png e public/logo-negativo.png')
