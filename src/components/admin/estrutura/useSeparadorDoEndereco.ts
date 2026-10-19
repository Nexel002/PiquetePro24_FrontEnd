import { useSearchParams } from 'react-router-dom'

// O separador activo vive no endereço (`?tab=`), como nas secções do ControlCore: um separador
// partilha-se por link, sobrevive a um recarregamento e os atalhos de outros ecrãs (cartões da
// Visão Geral, «Ver histórico» de um pedido) abrem directamente o certo. Um valor desconhecido
// cai no primeiro separador em vez de mostrar uma secção vazia.
//
// Mudar de separador usa `replace`: o «voltar» do telemóvel sai da secção, em vez de percorrer
// todos os separadores por onde se passou.
export function useSeparadorDoEndereco<T extends string>(ids: readonly T[]): [T, (id: T) => void] {
  const [searchParams, setSearchParams] = useSearchParams()
  const doEndereco = searchParams.get('tab')
  const activo = ids.find((id) => id === doEndereco) ?? ids[0]

  // Só `tab` fica: os filtros de um separador (ex. `user_id` da Auditoria) não fazem sentido
  // no seguinte.
  const mudar = (id: T) => setSearchParams({ tab: id }, { replace: true })

  return [activo, mudar]
}
