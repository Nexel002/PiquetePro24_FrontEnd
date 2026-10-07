import { useId, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDeleteAccount } from '../../hooks/useProfile'
import type { UserRole } from '../../services/profile'
import { Button } from '../ui/Button'

const PALAVRA_DE_CONFIRMACAO = 'ELIMINAR'

// O que desaparece, por papel. Descrito com rigor porque é irreversível: o utilizador tem de
// saber o que perde antes de confirmar. Segue o comportamento do DELETE /profile (cascata nas
// tabelas do dono da conta; um pedido em que o profissional foi escolhido volta a ficar aberto
// para o cliente, que não perde o pedido).
const O_QUE_SE_PERDE: Record<Exclude<UserRole, 'ADMIN'>, string[]> = {
  CLIENT: [
    'O teu perfil, a foto e os dados pessoais.',
    'Os teus pedidos de serviço e as propostas que recebeste.',
    'As avaliações que deste a profissionais.',
  ],
  PROFESSIONAL: [
    'O teu perfil, a foto e os dados pessoais.',
    'A verificação de identidade, a subscrição e o catálogo (fotos e avaliações recebidas).',
    'As propostas que enviaste. Os pedidos em que foste escolhido voltam a ficar abertos para o cliente.',
  ],
}

interface DeleteAccountSectionProps {
  papel: Exclude<UserRole, 'ADMIN'>
}

// Eliminar a própria conta, dentro das Definições do perfil (junto de editar os dados). Pede
// uma confirmação escrita: um botão "Tens a certeza?" confirma-se por reflexo, escrever a
// palavra obriga a parar. Não se mostra a administradores: apagar o último admin deixava a
// plataforma sem quem a modere.
export function DeleteAccountSection({ papel }: DeleteAccountSectionProps) {
  const navigate = useNavigate()
  const [aberto, setAberto] = useState(false)
  const [confirmacao, setConfirmacao] = useState('')
  const campoId = useId()
  // Vai para a Home (pública) antes de a sessão terminar: se a sessão caísse primeiro, o
  // ProtectedRoute mandava a pessoa para o login com "voltar ao perfil", que já não existe.
  const eliminar = useDeleteAccount({ aoApagar: () => navigate('/', { replace: true }) })

  const confirmado = confirmacao.trim().toUpperCase() === PALAVRA_DE_CONFIRMACAO

  function fechar() {
    setAberto(false)
    setConfirmacao('')
    eliminar.reset()
  }

  function submeter(event: FormEvent) {
    event.preventDefault()
    if (confirmado) eliminar.mutate()
  }

  if (!aberto) {
    return (
      <div className="border-t border-gray-200 pt-4">
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="min-h-11 text-xs font-semibold text-rose-600 underline hover:text-rose-700"
        >
          Eliminar conta
        </button>
      </div>
    )
  }

  return (
    <section aria-labelledby={`${campoId}-titulo`} className="border-t border-gray-200 pt-4">
      <form onSubmit={submeter} className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
        <h3 id={`${campoId}-titulo`} className="text-sm font-bold text-rose-800">
          Eliminar a tua conta?
        </h3>
        <p className="text-xs leading-relaxed text-rose-900">
          Isto é definitivo e não se pode desfazer. Vamos apagar:
        </p>
        <ul className="list-disc space-y-1 pl-4 text-xs leading-relaxed text-rose-900">
          {O_QUE_SE_PERDE[papel].map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        <label htmlFor={campoId} className="flex flex-col gap-1 text-xs font-semibold text-rose-900">
          Para confirmares, escreve {PALAVRA_DE_CONFIRMACAO}
          <input
            id={campoId}
            type="text"
            value={confirmacao}
            onChange={(event) => setConfirmacao(event.target.value)}
            autoComplete="off"
            autoCapitalize="characters"
            // 16 px no telemóvel: abaixo disso o Safari/iOS faz zoom ao focar o campo.
            className="h-11 w-full rounded-xl border border-rose-300 bg-white px-3.5 text-base text-gray-900 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 sm:text-sm"
          />
        </label>

        {eliminar.isError && (
          <p role="alert" className="text-xs font-semibold text-rose-700">
            Não foi possível eliminar a conta. Verifica a ligação e tenta novamente.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={fechar} disabled={eliminar.isPending}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="danger"
            size="sm"
            disabled={!confirmado || eliminar.isPending}
            isLoading={eliminar.isPending}
          >
            Eliminar definitivamente
          </Button>
        </div>
      </form>
    </section>
  )
}
