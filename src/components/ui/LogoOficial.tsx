// O logótipo oficial (public/logo.png), tal como foi entregue — é o único logótipo da app (o
// redesenho em SVG que existia antes não era o oficial e foi retirado). O ficheiro tem 293×207 px
// com fundo branco opaco e o desenho só ocupa uma caixa no meio; mostrá-lo inteiro deixava o
// logótipo pequeno no meio de margem branca. Por isso a imagem é recortada por CSS à caixa do
// desenho, sem alterar o ficheiro.
//
// Caixas medidas nos píxeis do PNG: «completo» é escudo + texto; «escudo» é só o escudo com as
// linhas de velocidade (o texto começa na coluna 129), para cabeçalhos estreitos no telemóvel.
//
// O PNG oficial tem fundo branco opaco, que sobre o painel escuro do login aparecia como um cartão
// branco. Por isso a app usa duas versões geradas a partir dele (scripts/gerar-logotipos.mjs), com
// as mesmas dimensões e o desenho no mesmo sítio — as caixas abaixo servem às três:
// - «claro» (logo-transparente.png): fundo transparente, para fundos claros;
// - «escuro» (logo-negativo.png): também com o «PIQUETE PRO» em branco — o azul-escuro original
//   desaparecia sobre o azul da marca.
const IMAGEM = { largura: 293, altura: 207 }
const FICHEIROS = { claro: '/logo-transparente.png', escuro: '/logo-negativo.png' } as const
const CAIXAS = {
  completo: { x: 28, y: 57, largura: 234, altura: 79 },
  escudo: { x: 28, y: 57, largura: 100, altura: 79 },
} as const

export function LogoOficial({
  largura,
  variante = 'completo',
  fundo = 'claro',
  className = '',
}: {
  largura: number
  variante?: keyof typeof CAIXAS
  // O tom do fundo onde o logótipo é posto, não o do logótipo.
  fundo?: keyof typeof FICHEIROS
  className?: string
}) {
  const desenho = CAIXAS[variante]
  const escala = largura / desenho.largura
  return (
    <div
      className={`relative shrink-0 overflow-hidden ${className}`}
      style={{ width: largura, height: Math.round(desenho.altura * escala) }}
    >
      <img
        src={FICHEIROS[fundo]}
        alt="PiquetePro24"
        width={IMAGEM.largura}
        height={IMAGEM.altura}
        className="absolute max-w-none"
        style={{
          width: IMAGEM.largura * escala,
          height: IMAGEM.altura * escala,
          left: -desenho.x * escala,
          top: -desenho.y * escala,
        }}
      />
    </div>
  )
}
