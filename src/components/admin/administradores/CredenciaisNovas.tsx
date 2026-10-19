import type { AddAdminResult } from '../../../services/adminAccounts'
import { PalavraPasseProvisoria } from '../../PalavraPasseProvisoria'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'

// Uma conta promovida já tem credenciais: não há palavra-passe a mostrar, só a confirmação.
export function CredenciaisNovas({ resultado, aoFechar }: { resultado: AddAdminResult; aoFechar: () => void }) {
  if (resultado.promoted) {
    return (
      <Card variant="solid" className="flex flex-col gap-2 border-emerald-200 bg-emerald-50/50 p-5 rounded-2xl" role="status">
        <p className="text-sm font-bold text-emerald-900">{resultado.account.full_name} passou a administrador.</p>
        <p className="text-sm text-emerald-700">Já tinha conta: entra com a palavra-passe ou o Google que já usa.</p>
        <Button type="button" variant="ghost" size="sm" className="self-start text-emerald-800 hover:bg-emerald-100" onClick={aoFechar}>
          Fechar
        </Button>
      </Card>
    )
  }

  return (
    <PalavraPasseProvisoria
      titulo={`Conta criada para ${resultado.account.email}.`}
      palavraPasse={resultado.temporary_password ?? ''}
      aoFechar={aoFechar}
    />
  )
}
