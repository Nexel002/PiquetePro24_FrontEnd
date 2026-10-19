import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { EstadoDoComponente } from '../../../services/adminSystem'
import { Badge } from '../../ui/Badge'
import { Card } from '../../ui/Card'
import { IconeDeAdmin } from '../estrutura/IconeDeAdmin'
import type { NomeDoIconeDeAdmin } from '../estrutura/icones'

const ESTADOS: Record<EstadoDoComponente, { rotulo: string; variante: 'approved' | 'rejected' | 'pending' }> = {
  OK: { rotulo: 'A funcionar', variante: 'approved' },
  FALHA: { rotulo: 'Com falha', variante: 'rejected' },
  DESLIGADO: { rotulo: 'Desligado', variante: 'pending' },
}

interface BlocoDoSistemaProps {
  titulo: string
  icone: NomeDoIconeDeAdmin
  corDoIcone?: string
  className?: string
  children: ReactNode
}

export function BlocoDoSistema({ titulo, icone, corDoIcone = 'text-piquete-blue', className = '', children }: BlocoDoSistemaProps) {
  return (
    <Card variant="solid" className={`p-5 border border-slate-100 shadow-none bg-slate-50/50 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <IconeDeAdmin nome={icone} className={`w-4 h-4 ${corDoIcone}`} />
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">{titulo}</h3>
      </div>
      {children}
    </Card>
  )
}

export function LinhaDeComponente({ rotulo, estado, nota }: { rotulo: string; estado: EstadoDoComponente; nota?: string }) {
  return (
    <li className="flex items-start justify-between gap-3 py-3">
      <div>
        <p className="text-sm font-semibold text-slate-900">{rotulo}</p>
        {nota && <p className="text-xs text-slate-500 mt-0.5">{nota}</p>}
      </div>
      <Badge variant={ESTADOS[estado].variante}>{ESTADOS[estado].rotulo}</Badge>
    </li>
  )
}

export function LinhaDeConfiguracao({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <li className="flex justify-between items-center gap-3 py-3">
      <span className="text-slate-700">{rotulo}</span>
      <span className="font-semibold text-slate-900 bg-white px-2.5 py-1 rounded-md border border-slate-200/60 text-xs">{valor}</span>
    </li>
  )
}

// `avisar` pinta a amarelo um pendente que não devia existir (ex. comunicado preso); os outros
// são trabalho normal da fila.
export function LinhaDePendente({ rotulo, valor, to, avisar = false }: { rotulo: string; valor: number; to: string; avisar?: boolean }) {
  return (
    <li>
      <Link to={to} className="flex items-center justify-between gap-3 rounded-xl px-2 py-2.5 hover:bg-slate-50 transition-colors">
        <span className="text-sm text-slate-700 font-medium">{rotulo}</span>
        <span
          className={`text-sm font-bold px-2 py-0.5 rounded-full ${valor > 0 && avisar ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-piquete-blue'}`}
        >
          {valor === 0 ? 'Nenhum' : valor}
        </span>
      </Link>
    </li>
  )
}
