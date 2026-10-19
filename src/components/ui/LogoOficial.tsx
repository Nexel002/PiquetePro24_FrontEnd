// O logótipo oficial (public/logo.png), tal como foi entregue — não é redesenhado em SVG como o
// LogoIcon. O ficheiro tem 293×207 px com fundo branco opaco e o desenho só ocupa a caixa
// abaixo; mostrá-lo inteiro deixava o logótipo pequeno no meio de margem branca. Por isso a
// imagem é recortada por CSS à caixa do desenho, sem alterar o ficheiro.
//
// Fundo branco opaco: só serve sobre fundos claros. Sobre o azul da marca aparece como um
// rectângulo branco.
const IMAGEM = { largura: 293, altura: 207 }
const DESENHO = { x: 28, y: 57, largura: 234, altura: 79 }

export function LogoOficial({ largura, className = '' }: { largura: number; className?: string }) {
  const escala = largura / DESENHO.largura
  return (
    <div
      className={`relative shrink-0 overflow-hidden ${className}`}
      style={{ width: largura, height: Math.round(DESENHO.altura * escala) }}
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
          left: -DESENHO.x * escala,
          top: -DESENHO.y * escala,
        }}
      />
    </div>
  )
}
