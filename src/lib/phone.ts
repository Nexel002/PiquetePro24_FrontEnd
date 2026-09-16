// Todos os telefones deste projeto seguem a convenção +258 (Moçambique — ver
// Login.tsx). Em qualquer formulário de telefone, o prefixo fica visível mas fixo: o
// utilizador só edita os dígitos locais, nunca reescreve o indicativo do país.
export const PHONE_PREFIX = '+258'

export function stripPhonePrefix(phone: string): string {
  return phone.startsWith(PHONE_PREFIX) ? phone.slice(PHONE_PREFIX.length) : phone
}
