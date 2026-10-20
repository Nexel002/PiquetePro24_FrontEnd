// O logótipo oficial (public/logo.png), tal como foi entregue — é o único logótipo da app (o
// redesenho em SVG que existia antes não era o oficial e foi retirado). O ficheiro tem 293×207 px
// com fundo branco opaco e o desenho só ocupa uma caixa no meio; mostrá-lo inteiro deixava o
// logótipo pequeno no meio de margem branca. Por isso a imagem é recortada por CSS à caixa do
// desenho, sem alterar o ficheiro.
//
// A caixa do desenho (escudo + texto) foi medida nos píxeis do PNG. Sempre o logótipo completo, em
// todos os tamanhos de ecrã: no telemóvel chegou a mostrar-se só o escudo, e o utilizador não o
// reconheceu como o logótipo oficial.
//
// O PNG oficial tem fundo branco opaco, que sobre o painel escuro do login aparecia como um cartão
// branco. Por isso a app usa duas versões geradas a partir dele (scripts/gerar-logotipos.mjs), com
// as mesmas dimensões e o desenho no mesmo sítio — a caixa abaixo serve às três:
// - «claro» (logo-transparente.png): fundo transparente, para fundos claros;
// - «escuro» (logo-negativo.png): também com o «PIQUETE PRO» em branco — o azul-escuro original
//   desaparecia sobre o azul da marca.
const IMAGEM = { largura: 293, altura: 207 }
const FICHEIROS = { claro: '/logo-transparente.png', escuro: '/logo-negativo.png' } as const
const DESENHO = { x: 28, y: 57, largura: 234, altura: 79 }

export function LogoOficial({
  largura,
  fundo = 'claro',
  className = '',
}: {
  largura: number
  // O tom do fundo onde o logótipo é posto, não o do logótipo.
  fundo?: keyof typeof FICHEIROS
  className?: string
}) {
  const escala = largura / DESENHO.largura
  return (
    <div
      className={`relative shrink-0 overflow-hidden ${className}`}
      style={{ width: largura, height: Math.round(DESENHO.altura * escala) }}
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
          left: -DESENHO.x * escala,
          top: -DESENHO.y * escala,
        }}
      />
    </div>
  )
}
