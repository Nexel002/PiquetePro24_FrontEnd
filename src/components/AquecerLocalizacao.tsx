import { useEffect, useRef } from 'react'
import { localizar, permissaoConcedida, repor } from '../lib/servicoDeLocalizacao'
import { useAuth } from '../store/AuthContext'

// Não desenha nada: começa a captar a localização logo depois do login, para que o botão
// «localizar» (Perfil, pesquisa, pedidos próximos) encontre a posição já pronta em vez de esperar
// até 30 s (Fase 36). Regras:
// - só com a permissão já concedida — o primeiro pedido de permissão vem sempre de um toque;
// - captar não é gravar: a posição só vai para o perfil quando o utilizador carrega no botão;
// - uma captação ao entrar e outra ao voltar ao primeiro plano; `localizar` ignora ambas se já
//   houver uma em curso ou uma posição com menos de 3 min. Não segue o GPS continuamente (bateria).
export function AquecerLocalizacao() {
  const { session } = useAuth()
  const userId = session?.user.id
  const anteriorRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    // A posição pertence a quem a captou: ao sair (ou trocar de conta) não passa para o seguinte.
    // Só na transição — sem sessão desde o início, um visitante pode estar a localizar na pesquisa.
    if (anteriorRef.current && anteriorRef.current !== userId) repor()
    anteriorRef.current = userId
    if (!userId) return

    let cancelado = false
    const tentar = () => {
      void permissaoConcedida().then((concedida) => {
        if (concedida && !cancelado) localizar()
      })
    }
    const aoMudarVisibilidade = () => {
      if (document.visibilityState === 'visible') tentar()
    }

    tentar()
    document.addEventListener('visibilitychange', aoMudarVisibilidade)
    return () => {
      cancelado = true
      document.removeEventListener('visibilitychange', aoMudarVisibilidade)
    }
  }, [userId])

  return null
}
