import { LegalDocument } from '../components/legal/LegalDocument'
import { TERMOS_ACTUALIZADOS_EM, TERMOS_DE_UTILIZACAO } from '../data/termosDeUtilizacao'

// Pública de propósito (sem ProtectedRoute): quem ainda não tem conta tem de poder ler os
// termos antes de os aceitar ao registar-se.
export function Terms() {
  return <LegalDocument titulo="Termos de utilização" actualizadoEm={TERMOS_ACTUALIZADOS_EM} seccoes={TERMOS_DE_UTILIZACAO} />
}
