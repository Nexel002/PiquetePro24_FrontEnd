import { LegalDocument } from '../components/legal/LegalDocument'
import { POLITICA_DE_PRIVACIDADE, PRIVACIDADE_ACTUALIZADA_EM } from '../data/politicaDePrivacidade'

// Pública de propósito (sem ProtectedRoute), como os termos: quem ainda não tem conta tem de a poder
// ler antes de se registar, e o ecrã de consentimento do Google aponta para aqui.
export function Privacidade() {
  return <LegalDocument titulo="Política de privacidade" actualizadoEm={PRIVACIDADE_ACTUALIZADA_EM} seccoes={POLITICA_DE_PRIVACIDADE} />
}
