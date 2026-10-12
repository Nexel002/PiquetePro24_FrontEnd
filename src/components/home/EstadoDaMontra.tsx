import { Link } from 'react-router-dom'
import { caminhoDoLogin } from '../../lib/postLoginRedirect'
import type { EstadoDaMontra as Estado } from '../../hooks/useHomeFeed'

interface EstadoDaMontraProps {
  estado: Exclude<Estado, 'pronto'>
  aoTentarDeNovo: () => void
}

const CAIXA = 'mx-auto max-w-lg rounded-xl border border-slate-300 p-8 text-center sm:p-12'

// O que se mostra no lugar dos trabalhos em destaque quando não há trabalhos para mostrar. Cada
// caso diz o que se passa — um erro de rede não pode parecer «ainda não há trabalhos».
export function EstadoDaMontra({ estado, aoTentarDeNovo }: EstadoDaMontraProps) {
  if (estado === 'a-carregar') {
    return (
      <div aria-busy="true" aria-label="A carregar trabalhos em destaque" className="grid grid-cols-1 gap-5 min-[520px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="aspect-[4/3] animate-pulse rounded-xl bg-slate-200" />
        ))}
      </div>
    )
  }

  if (estado === 'erro') {
    return (
      <div role="alert" className={CAIXA}>
        <p className="text-base font-bold text-slate-900">Não foi possível carregar os trabalhos em destaque.</p>
        <p className="mt-1 text-sm text-slate-600">Verifica a tua ligação e tenta novamente.</p>
        <button
          type="button"
          onClick={aoTentarDeNovo}
          className="mt-4 inline-flex min-h-11 items-center rounded-full bg-slate-900 px-5 text-sm font-bold text-white transition-colors hover:bg-slate-800"
        >
          Tentar de novo
        </button>
      </div>
    )
  }

  if (estado === 'vazio') {
    return (
      <div className={CAIXA}>
        <p className="text-base font-bold text-slate-900">Ainda não há trabalhos publicados.</p>
        <p className="mt-1 text-sm text-slate-600">Os trabalhos dos profissionais aparecem aqui assim que os publicarem.</p>
        <Link
          to="/profissionais"
          className="mt-4 inline-flex min-h-11 items-center rounded-full bg-slate-900 px-5 text-sm font-bold text-white transition-colors hover:bg-slate-800"
        >
          Procurar profissionais
        </Link>
      </div>
    )
  }

  return (
    <div className={CAIXA}>
      <p className="text-base font-bold text-slate-900">Entra para ver trabalhos de profissionais.</p>
      <p className="mt-1 text-sm text-slate-600">Fotos de trabalhos reais, com as avaliações de quem os contratou.</p>
      <Link
        to={caminhoDoLogin()}
        className="mt-4 inline-flex min-h-11 items-center rounded-full bg-slate-900 px-5 text-sm font-bold text-white transition-colors hover:bg-slate-800"
      >
        Entrar
      </Link>
    </div>
  )
}
