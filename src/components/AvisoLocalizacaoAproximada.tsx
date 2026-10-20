import { descreverPrecisao } from '../lib/ultimaLocalizacao'

// Avisa que a pesquisa usa uma posição com erro grande (zona com pouco Wi-Fi conhecido, GPS sem
// sinal, «localização precisa» desligada). Usá-la é melhor do que não ter distâncias, mas sem o
// aviso os resultados «perto de ti» pareceriam exactos.
export function AvisoLocalizacaoAproximada({ precisaoM, aoTentarDeNovo }: { precisaoM: number; aoTentarDeNovo: () => void }) {
  return (
    <div role="status" className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
      <p>Localização aproximada ({descreverPrecisao(precisaoM)}): as distâncias podem não ser exactas.</p>
      <button type="button" onClick={aoTentarDeNovo} className="shrink-0 rounded-lg px-2 py-1 font-semibold underline underline-offset-2 hover:bg-amber-100">
        Tentar de novo
      </button>
    </div>
  )
}
