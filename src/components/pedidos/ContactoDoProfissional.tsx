import { formatInternationalPhone } from '../../lib/phone'

interface ContactoDoProfissionalProps {
  nome: string
  // null: a conta ainda não tem telefone (por exemplo, registou-se por Google).
  telefone: string | null
}

// O contacto de quem o cliente escolheu, com o número pronto a ligar. Aparece depois de «Solicitar
// serviço» e na lista de pedidos do cliente; nunca no catálogo nem na pesquisa.
export function ContactoDoProfissional({ nome, telefone }: ContactoDoProfissionalProps) {
  if (!telefone) {
    return (
      <p className="rounded-2xl bg-gray-50 p-3 text-sm text-gray-700">
        {nome} ainda não registou um número de telefone. Foi avisado por email e vai contactar-te.
      </p>
    )
  }

  const numero = formatInternationalPhone(telefone)

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
      <p className="text-sm font-bold text-emerald-900">{nome}</p>
      <a
        href={`tel:${numero}`}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-base font-bold text-white shadow-sm hover:bg-emerald-700"
      >
        Ligar: {numero}
      </a>
    </div>
  )
}
