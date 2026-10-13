import { PhoneIcon } from './PhoneIcon'

export function TelefoneRegistado({ telefone }: { telefone: string | null }) {
  return (
    <div className="flex items-center gap-3.5 rounded-2xl bg-gray-50 border border-gray-100 p-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white border border-gray-200/80 text-piquete-blue shadow-xs">
        <PhoneIcon className="h-5 w-5" />
      </div>
      <div className="flex flex-col text-xs min-w-0">
        <span className="text-gray-400 font-medium">Telefone</span>
        <span className="text-gray-900 font-bold text-sm tracking-wide">{telefone}</span>
      </div>
    </div>
  )
}
