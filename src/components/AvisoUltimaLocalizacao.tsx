import { descreverIdade, type UltimaLocalizacao } from '../lib/ultimaLocalizacao'

// Avisa que a pesquisa está a usar a posição de um GPS anterior. Sem este aviso, as
// distâncias mostradas pareceriam actuais quando podem ser de outro sítio.
export function AvisoUltimaLocalizacao({ ultima }: { ultima: UltimaLocalizacao }) {
  return (
    <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
      Não foi possível obter o GPS agora. A usar a tua última localização conhecida ({descreverIdade(ultima.guardadaEm)}).
    </p>
  )
}
