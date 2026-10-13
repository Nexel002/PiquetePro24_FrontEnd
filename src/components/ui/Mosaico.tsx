// Número grande com legenda, em linha de três (estatísticas do perfil e do catálogo).
export function Mosaico({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-0.5 rounded-2xl border border-gray-100 bg-gray-50 px-2 py-3 text-center">
      <span className="font-heading text-lg font-extrabold leading-none text-piquete-blue">{value}</span>
      <span className="text-[11px] font-medium leading-tight text-piquete-gray">{label}</span>
    </div>
  )
}
