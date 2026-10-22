// Estrelas geradas uma vez, com uma sequência determinística em vez de Math.random(): o mesmo
// céu em cada render (sem estrelas a saltar de sítio) e testes estáveis. Partilhado pela página
// 404 e pela landing para as duas terem o mesmo céu.
function gerarEstrelas(quantas: number) {
  let semente = 24
  const seguinte = () => {
    semente = (semente * 9301 + 49297) % 233280
    return semente / 233280
  }
  return Array.from({ length: quantas }, () => ({
    x: seguinte() * 100,
    y: seguinte() * 100,
    tamanho: 1 + seguinte() * 2.2,
    atraso: seguinte() * 3.2,
    amarela: seguinte() > 0.86,
  }))
}

const ESTRELAS = gerarEstrelas(46)

// Decorativo: ocupa o elemento posicionado onde for posto e não apanha toques.
export function CeuEstrelado({ className = '' }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 ${className}`}>
      {ESTRELAS.map((estrela, i) => (
        <span
          key={i}
          className={`absolute animate-cintilar rounded-full motion-reduce:animate-none ${estrela.amarela ? 'bg-piquete-yellow' : 'bg-white'}`}
          style={{
            left: `${estrela.x}%`,
            top: `${estrela.y}%`,
            width: estrela.tamanho,
            height: estrela.tamanho,
            animationDelay: `${estrela.atraso}s`,
          }}
        />
      ))}
    </div>
  )
}
