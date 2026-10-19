import { Navigate, useLocation } from 'react-router-dom'

// Redirecciona uma rota antiga para o separador que a substituiu. Leva os parâmetros e o
// `state` que traz: o «Ver histórico» de um pedido (`?entity_type=…`) continua filtrado, e o
// aviso «exige verificação em dois passos» continua a aparecer na Segurança.
export function ParaOSeparador({ seccao, separador }: { seccao: string; separador: string }) {
  const { search, state } = useLocation()
  const parametros = new URLSearchParams(search)
  parametros.set('tab', separador)
  return <Navigate to={{ pathname: seccao, search: `?${parametros.toString()}` }} state={state} replace />
}
