// O logótipo oficial (public/logo.png), tal como foi entregue — é o único logótipo da app (o
// redesenho em SVG que existia antes não era o oficial e foi retirado). O ficheiro tem 293×207 px
// com fundo branco opaco e o desenho só ocupa uma caixa no meio; mostrá-lo inteiro deixava o
// logótipo pequeno no meio de margem branca. Por isso a imagem é recortada por CSS à caixa do
// desenho, sem alterar o ficheiro.
//
// Caixas medidas nos píxeis do PNG: «completo» é escudo + texto; «escudo» é só o escudo com as
// linhas de velocidade (o texto começa na coluna 129), para cabeçalhos estreitos no telemóvel.
//
// Fundo branco opaco: só serve sobre fundos claros. Sobre o azul da marca aparece como um
// rectângulo branco — quem o põe num fundo escuro dá-lhe um cartão branco à volta.
const IMAGEM = { largura: 293, altura: 207 }
const CAIXAS = {
  completo: { x: 28, y: 57, largura: 234, altura: 79 },
  escudo: { x: 28, y: 57, largura: 100, altura: 79 },
} as const

export function LogoOficial({
  largura,
  variante = 'completo',
  className = '',
}: {
  largura: number
  variante?: keyof typeof CAIXAS
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
        src="/logo.png"
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
