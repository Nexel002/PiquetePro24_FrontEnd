import { Link } from 'react-router-dom'

// Só aparece a uma empresa (ver Profile.tsx): é daqui que o administrador da empresa chega à equipa.
export function AtalhoDaEquipa() {
  return (
    <Link
      to="/equipa"
      className="flex items-center gap-3 rounded-2xl border border-piquete-blue/20 bg-piquete-blue/5 p-4 text-piquete-blue transition-all hover:bg-piquete-blue/10 active:scale-[0.98]"
    >
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-bold">A minha equipa</span>
        <span className="text-xs text-piquete-gray">Técnicos da empresa, com login e verificação própria</span>
      </span>
      <span aria-hidden className="text-lg">›</span>
    </Link>
  )
}
