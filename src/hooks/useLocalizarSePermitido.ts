import { useEffect } from 'react'

// Se o utilizador já deu permissão de localização noutra visita, localiza sem esperar que
// carregue em «Localizar». Sem permissão concedida não faz nada: pedir a permissão sem um
// gesto do utilizador é o que os browsers penalizam.
export function useLocalizarSePermitido(locate: () => void) {
  useEffect(() => {
    let cancelled = false
    navigator.permissions
      ?.query({ name: 'geolocation' })
      .then((status) => {
        if (!cancelled && status.state === 'granted') locate()
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [locate])
}
