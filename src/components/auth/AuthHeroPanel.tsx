import { Logo } from '../ui/Logo'

interface AuthHeroPanelProps {
  imageUrl?: string
  className?: string
}

// O que a plataforma entrega, em frases que são verdade hoje: KYC aprovado para propor
// (Adendo v1.12), pedido a três profissionais com propostas comparáveis (Adendo v1.18) e o
// "24/7" da marca. Substitui um depoimento de uma cliente inventada: uma citação com nome e
// cara que não existe é publicidade enganosa; só entra um depoimento quando for real.
const BENEFICIOS = [
  'Profissionais com identidade verificada',
  'Pede a 3 profissionais e compara as propostas',
  'Serviços locais disponíveis 24 horas por dia',
]

export function AuthHeroPanel({ imageUrl = '/auth-hero.jpg', className = '' }: AuthHeroPanelProps) {
  return (
    <div className={`relative flex h-full w-full select-none flex-col justify-between overflow-hidden bg-piquete-blue p-10 text-white xl:p-14 ${className}`}>
      {/* Imagem decorativa (alt vazio). `loading="lazy"` por causa do telemóvel: este painel é
          `hidden` abaixo de `lg`, mas uma <img> normal descarrega mesmo dentro de um bloco
          escondido — eram 300 KB gastos em rede 3G para uma imagem que nunca se vê. */}
      <img
        src={imageUrl}
        alt=""
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover object-center"
        // Se faltar, fica o azul da marca — o texto continua legível.
        onError={(e) => {
          e.currentTarget.style.display = 'none'
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-piquete-blue-deep via-piquete-blue/70 to-piquete-blue/30" aria-hidden="true" />

      <div className="relative z-10">
        <Logo variant="full" size="md" theme="dark" showSubtitle />
      </div>

      <div className="relative z-10 max-w-md">
        <h2 className="font-heading text-3xl font-extrabold leading-tight tracking-tight text-balance text-white xl:text-4xl">
          O profissional certo, quando precisas.
        </h2>
        <ul className="mt-6 space-y-3">
          {BENEFICIOS.map((beneficio) => (
            <li key={beneficio} className="flex items-start gap-3 text-sm font-medium text-slate-100 xl:text-base">
              <svg className="mt-0.5 h-5 w-5 shrink-0 text-piquete-yellow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span>{beneficio}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
