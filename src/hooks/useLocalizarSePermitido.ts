import { useEffect } from 'react'
import { permissaoConcedida } from '../lib/servicoDeLocalizacao'

// Se o utilizador já deu permissão de localização noutra visita, localiza sem esperar que
// carregue em «Localizar». Sem permissão concedida não faz nada: pedir a permissão sem um
// gesto do utilizador é o que os browsers penalizam.
export function useLocalizarSePermitido(locate: () => void) {
  useEffect(() => {
    let cancelled = false
    void permissaoConcedida().then((concedida) => {
      if (!cancelled && concedida) locate()
    })
    return () => {
      cancelled = true
    }
  }, [locate])
}
