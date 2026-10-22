import { useRef, type CSSProperties, type PointerEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LogoOficial } from '../components/ui/LogoOficial'

// Estrelas geradas uma vez, com uma sequência determinística em vez de Math.random(): o mesmo
// céu em cada render (sem estrelas a saltar de sítio) e testes estáveis.
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

// Ecrã para qualquer endereço que a app não conhece. Antes, a rota «*» reencaminhava em silêncio
// para «/»: quem errava um link não percebia que errou. Só CSS e SVG, sem dependências novas — o
// público usa telemóveis de gama baixa em 3G e uma biblioteca de animação não compensa o download.
// Toda a cena é decorativa (aria-hidden): o que importa para quem não a vê é o título e as saídas.
export function PaginaNaoEncontrada() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const cena = useRef<HTMLElement>(null)
  // `idx` é o índice da entrada no histórico do React Router. Sem ele, «Voltar atrás» num link
  // aberto directamente (sem página anterior) não fazia nada, ou saía da app.
  const podeVoltar = (window.history.state?.idx ?? 0) > 0

  // Paralaxe pelo ponteiro: escreve duas variáveis CSS no elemento em vez de guardar estado,
  // para não re-renderizar a cada movimento. Cada camada multiplica-as por uma profundidade.
  const aoMoverPonteiro = (e: PointerEvent<HTMLElement>) => {
    const caixa = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - caixa.left) / caixa.width - 0.5) * 2
    const py = ((e.clientY - caixa.top) / caixa.height - 0.5) * 2
    cena.current?.style.setProperty('--px', px.toFixed(3))
    cena.current?.style.setProperty('--py', py.toFixed(3))
  }

  const camada = (profundidade: number): CSSProperties => ({
    transform: `translate3d(calc(var(--px, 0) * ${profundidade}px), calc(var(--py, 0) * ${profundidade}px), 0)`,
  })

  return (
    <main
      ref={cena}
      onPointerMove={aoMoverPonteiro}
      className="bg-mesh-dark relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 py-10 text-center text-white"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 motion-reduce:!transform-none" style={camada(-6)}>
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
        <span className="absolute right-[12%] top-[8%] hidden h-px w-24 origin-left animate-estrela-cadente bg-gradient-to-r from-white to-transparent motion-reduce:hidden sm:block" />
        <span
          className="absolute right-[40%] top-[3%] hidden h-px w-16 origin-left animate-estrela-cadente bg-gradient-to-r from-piquete-yellow to-transparent motion-reduce:hidden sm:block"
          style={{ animationDelay: '3s' }}
        />
      </div>

      <LogoOficial largura={132} fundo="escuro" className="relative mb-6" />

      <span className="sr-only">Erro 404</span>
      <div
        aria-hidden="true"
        className="relative flex items-center justify-center font-heading font-extrabold leading-none text-[clamp(6.5rem,34vw,15rem)]"
      >
        <span className="drop-shadow-[0_6px_30px_rgba(29,91,216,0.45)]">4</span>

        {/* O «0» é um planeta com anel e uma lua em órbita; o astronauta flutua à frente dele. */}
        <div className="relative mx-[0.02em] h-[0.8em] w-[0.8em]" style={camada(10)}>
          <svg viewBox="0 0 200 200" className="h-full w-full overflow-visible">
            <defs>
              <radialGradient id="planeta404" cx="35%" cy="30%" r="80%">
                <stop offset="0%" stopColor="#FFE373" />
                <stop offset="55%" stopColor="#FFC700" />
                <stop offset="100%" stopColor="#D98F00" />
              </radialGradient>
            </defs>
            <circle cx="100" cy="100" r="78" fill="url(#planeta404)" />
            <circle cx="70" cy="72" r="13" fill="#E6A100" opacity="0.65" />
            <circle cx="132" cy="64" r="8" fill="#E6A100" opacity="0.65" />
            <circle cx="140" cy="122" r="16" fill="#E6A100" opacity="0.65" />
            <circle cx="82" cy="136" r="9" fill="#E6A100" opacity="0.65" />
            <ellipse cx="100" cy="100" rx="112" ry="26" fill="none" stroke="#FFE373" strokeOpacity="0.55" strokeWidth="3" transform="rotate(-18 100 100)" />
          </svg>
          <div className="absolute inset-0 animate-orbitar motion-reduce:animate-none">
            <span className="absolute -top-[4%] left-1/2 h-[9%] w-[9%] -translate-x-1/2 rounded-full bg-sky-200 shadow-[0_0_14px_rgba(186,230,253,0.9)]" />
          </div>

          <div className="absolute -bottom-[12%] -right-[26%] w-[62%] animate-astronauta motion-reduce:animate-none" style={camada(22)}>
            <Astronauta />
          </div>
        </div>

        <span className="drop-shadow-[0_6px_30px_rgba(29,91,216,0.45)]">4</span>
      </div>

      <h1 className="relative mt-8 font-heading text-2xl font-bold text-white sm:text-3xl">Perdeste-te no espaço?</h1>
      <p className="relative mt-3 max-w-sm text-sm text-slate-300 sm:text-base">
        O endereço que abriste não existe ou mudou de sítio. Vamos levar-te de volta à Terra.
      </p>
      <p className="relative mt-3 max-w-full break-all rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-xs text-slate-400">
        {pathname.length > 60 ? `${pathname.slice(0, 60)}…` : pathname}
      </p>

      <div className="relative mt-8 flex w-full max-w-xs flex-col gap-3 sm:max-w-md sm:flex-row sm:justify-center">
        <Link
          to="/"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-yellow-300/30 bg-gradient-to-r from-piquete-yellow via-yellow-400 to-amber-400 px-6 py-3 text-sm font-bold tracking-wide text-piquete-blue shadow-glow-yellow transition hover:brightness-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-piquete-yellow focus-visible:ring-offset-2 focus-visible:ring-offset-piquete-blue-dark active:scale-[0.97]"
        >
          Voltar ao início
        </Link>
        {podeVoltar && (
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold tracking-wide text-white transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-piquete-yellow focus-visible:ring-offset-2 focus-visible:ring-offset-piquete-blue-dark active:scale-[0.97]"
          >
            Voltar atrás
          </button>
        )}
      </div>
    </main>
  )
}

// Astronauta de capacete de obra: é um profissional do Piquete perdido, não um turista espacial.
// O cabo tracejado corre (animate-cabo) como se ainda estivesse preso à nave.
function Astronauta() {
  return (
    <svg viewBox="0 0 140 170" className="h-auto w-full overflow-visible drop-shadow-[0_10px_18px_rgba(0,0,0,0.45)]">
      <path
        d="M52 98 C 10 120, 0 150, -30 150"
        fill="none"
        stroke="#94A3B8"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="7 7"
        className="animate-cabo motion-reduce:animate-none"
      />
      <rect x="34" y="52" width="72" height="62" rx="14" fill="#94A3B8" />
      <rect x="40" y="58" width="60" height="60" rx="16" fill="#F1F5F9" />
      <rect x="58" y="76" width="24" height="16" rx="4" fill="#FFC700" />
      <rect x="62" y="82" width="16" height="3" rx="1.5" fill="#031F4B" />
      <rect x="44" y="108" width="20" height="44" rx="10" fill="#E2E8F0" transform="rotate(10 54 108)" />
      <rect x="76" y="108" width="20" height="44" rx="10" fill="#E2E8F0" transform="rotate(-14 86 108)" />
      <rect x="44" y="142" width="22" height="12" rx="6" fill="#475569" transform="rotate(10 54 148)" />
      <rect x="74" y="142" width="22" height="12" rx="6" fill="#475569" transform="rotate(-14 86 148)" />
      <rect x="92" y="62" width="40" height="16" rx="8" fill="#F1F5F9" transform="rotate(-38 96 70)" />
      <circle cx="124" cy="46" r="8" fill="#CBD5E1" />
      <rect x="6" y="66" width="40" height="16" rx="8" fill="#F1F5F9" transform="rotate(28 40 74)" />
      <circle cx="12" cy="94" r="8" fill="#CBD5E1" />
      <circle cx="70" cy="40" r="30" fill="#F8FAFC" />
      <ellipse cx="70" cy="43" rx="21" ry="16" fill="#0A3B82" />
      <ellipse cx="62" cy="38" rx="7" ry="4" fill="#fff" opacity="0.35" transform="rotate(-20 62 38)" />
      <path d="M36 28 C 36 2, 104 2, 104 28 Z" fill="#FFC700" />
      <rect x="31" y="26" width="78" height="7" rx="3.5" fill="#E6B300" />
      <rect x="66" y="4" width="8" height="22" rx="4" fill="#FFE373" />
    </svg>
  )
}
