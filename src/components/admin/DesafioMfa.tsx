import { FormularioDeCodigo } from './FormularioDeCodigo'

// Ecrã que se mete à frente do painel quando a sessão ainda é aal1 e a conta tem um segundo
// factor. Ao verificar, o hook invalida o estado do MFA e a RotaDeAdmin deixa passar.
export function DesafioMfa({ factorId }: { factorId: string }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-4 p-6">
      <h1 className="font-heading text-xl font-extrabold text-piquete-blue">Verificação em dois passos</h1>
      <p className="text-sm text-gray-600">Abre a app de autenticação no telemóvel e escreve o código de 6 dígitos para entrar na administração.</p>
      <FormularioDeCodigo factorId={factorId} rotuloDoBotao="Verificar e entrar" />
    </main>
  )
}
