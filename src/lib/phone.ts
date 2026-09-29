// Todos os telefones deste projeto seguem a convenção +258 (Moçambique — ver
// Login.tsx). Em qualquer formulário de telefone, o prefixo fica visível mas fixo: o
// utilizador só edita os dígitos locais, nunca reescreve o indicativo do país.
export const PHONE_PREFIX = '+258'

export function stripPhonePrefix(phone: string): string {
  return phone.startsWith(PHONE_PREFIX) ? phone.slice(PHONE_PREFIX.length) : phone
}

// Os telefones chegam do backend em dois formatos: users_profile.phone guarda
// '+258XXXXXXXXX' (como o signup o envia), e payment_transactions.payer_phone guarda
// '258XXXXXXXXX' (normalizado pelo backend para o formato que os gateways esperam).
// Mostrar/ligar sempre com um único '+' à frente, qualquer que seja a origem.
export function formatInternationalPhone(phone: string): string {
  return phone.startsWith('+') ? phone : `+${phone}`
}
