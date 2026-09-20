// Traduz os erros mais comuns do Supabase Auth para mensagens compreensíveis (CLAUDE.md
// Secção 3: nunca mostrar o erro técnico cru). O rate limit de segurança do Supabase
// ("For security purposes, you can only request this after N seconds") aparece quando
// se tenta submeter o formulário mais do que uma vez em sucessão rápida — não é uma
// falha do signup em si.
//
// Vive em lib/ (não em Login.tsx, onde nasceu) porque DefinirNovaPassword.tsx também
// precisa da mesma tradução para o erro de supabase.auth.updateUser() — exportar uma
// função pura de um ficheiro de página dispara o aviso react-refresh/only-export-
// components (fast refresh só é granular quando o ficheiro só exporta componentes).
export function describeAuthError(error: unknown): string {
  const message = error instanceof Error ? error.message : ''

  if (message.includes('security purposes')) {
    return 'Aguarda alguns segundos antes de tentar novamente.'
  }
  if (message.includes('email rate limit exceeded')) {
    return 'Foram enviados demasiados emails de confirmação recentemente. Aguarda uns minutos e tenta novamente.'
  }
  if (message.includes('already registered') || message.includes('already exists')) {
    return 'Já existe uma conta com este email ou telefone. Tenta entrar em vez de criar uma nova conta.'
  }
  if (message.includes('Invalid login credentials')) {
    return 'Email/telefone ou palavra-passe incorretos.'
  }
  if (message.includes('Email not confirmed')) {
    return 'Ainda não confirmaste o teu email. Verifica a caixa de entrada antes de entrares.'
  }
  if (message.includes('Phone not confirmed')) {
    return 'Ainda não confirmaste o teu telefone. Verifica o SMS recebido antes de entrares.'
  }

  return message || 'Não foi possível autenticar. Tenta novamente.'
}
