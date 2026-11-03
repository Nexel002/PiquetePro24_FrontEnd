import { Fragment, useState } from 'react'
import { Link } from 'react-router-dom'
import type { AdminUserSummary } from '../../../services/adminUsers'
import { IconeDeAdmin } from '../estrutura/IconeDeAdmin'
import { AvatarDoUtilizador } from './AvatarDoUtilizador'
import { ROTULO_DO_PAPEL } from './utilizadores'

function obterModalidade(utilizador: AdminUserSummary): string {
  if (utilizador.role === 'PROFESSIONAL') {
    return utilizador.professional_type === 'COMPANY' ? 'Empresa' : 'Singular'
  }
  if (utilizador.role === 'TECHNICIAN') return 'Equipa Técnica'
  if (utilizador.role === 'ADMIN') return 'Gestão'
  return 'Particular'
}

function formatarDataCurta(iso: string): string {
  const data = new Date(iso)
  if (Number.isNaN(data.getTime())) return '—'
  return data.toLocaleDateString('pt-MZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

interface LinhaDeUtilizadorProps {
  utilizador: AdminUserSummary
  expandida: boolean
  aoAlternarExpansao: () => void
}

function LinhaDeUtilizador({ utilizador, expandida, aoAlternarExpansao }: LinhaDeUtilizadorProps) {
  const cargo = ROTULO_DO_PAPEL[utilizador.role] ?? 'Cliente'
  const modalidade = obterModalidade(utilizador)
  const localidadeCompleta = [utilizador.neighborhood, utilizador.district, utilizador.province]
    .filter(Boolean)
    .join(', ')
  const localidadeResumida = [utilizador.district, utilizador.province].filter(Boolean).join(', ') || 'Não definida'
  const ficha = `/admin/utilizadores/${utilizador.id}`

  return (
    <Fragment>
      <tr
        className={`group transition-colors ${
          expandida
            ? 'bg-slate-50/60 md:border-t md:border-x md:border-[#1D5BD8]'
            : 'hover:bg-slate-50/70 border-b border-slate-100'
        }`}
      >
        {/* Coluna 1: Seta de expansão (só desktop) + Avatar circular maior + Nome */}
        <td className="py-3.5 pl-4 pr-3 sm:pl-8 sm:pr-4">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={aoAlternarExpansao}
              aria-expanded={expandida}
              aria-label={expandida ? `Recolher resumo de ${utilizador.full_name}` : `Expandir resumo de ${utilizador.full_name}`}
              className="hidden md:inline-flex items-center justify-center w-6 h-6 rounded text-slate-400 hover:text-slate-700 transition-colors shrink-0"
            >
              <IconeDeAdmin nome={expandida ? 'setaCima' : 'setaBaixo'} className="w-3.5 h-3.5" />
            </button>

            <AvatarDoUtilizador utilizador={utilizador} />

            <Link
              to={ficha}
              className={`text-sm truncate max-w-[200px] sm:max-w-[240px] transition-colors ${
                expandida ? 'font-bold text-slate-900' : 'font-medium text-slate-700 group-hover:text-slate-900'
              }`}
            >
              {utilizador.full_name}
            </Link>
          </div>
        </td>

        {/* Colunas visíveis apenas em ecrãs maiores (md+): em mobile aparece apenas Foto + Nome + Olho */}
        <td className={`hidden md:table-cell py-3.5 px-4 text-sm ${expandida ? 'font-semibold text-slate-900' : 'text-slate-500'}`}>
          {cargo}
        </td>

        <td className={`hidden lg:table-cell py-3.5 px-4 text-sm ${expandida ? 'font-semibold text-slate-900' : 'text-slate-500'}`}>
          {modalidade}
        </td>

        <td className={`hidden lg:table-cell py-3.5 px-4 text-sm ${expandida ? 'font-semibold text-slate-900' : 'text-slate-500'}`}>
          <span className="truncate block max-w-[220px]">{localidadeResumida}</span>
        </td>

        <td className={`hidden md:table-cell py-3.5 px-4 text-sm ${expandida ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>
          {utilizador.phone ?? 'Sem telefone'}
        </td>

        {/* Estado com cor de fonte normal, sem pílulas coloridas */}
        <td className={`hidden md:table-cell py-3.5 px-4 text-sm ${expandida ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>
          Activo
        </td>

        {/* Coluna de Acções: botão com ícone de olho (visível em todos os tamanhos de ecrã) */}
        <td className="py-3.5 pl-3 pr-4 sm:pr-8 text-right">
          <Link
            to={ficha}
            aria-label="Ver ficha"
            title={`Ver detalhes de ${utilizador.full_name}`}
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-slate-100/90 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900 transition-colors"
          >
            <IconeDeAdmin nome="olho" className="w-[18px] h-[18px]" />
          </Link>
        </td>
      </tr>

      {/* Painel de detalhe rápido expandido em desktop (inspirado na linha expandida da imagem de referência) */}
      {expandida && (
        <tr className="hidden md:table-row bg-white border-b border-x border-[#1D5BD8]">
          <td colSpan={7} className="py-5 pl-24 pr-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-left">
              <div>
                <span className="block text-xs font-bold text-slate-800 mb-2">Localização Registada</span>
                <span className="flex items-start gap-2 text-xs text-slate-500">
                  <IconeDeAdmin nome="local" className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <span>{localidadeCompleta || 'Sem endereço registado'}</span>
                </span>
              </div>

              <div>
                <span className="block text-xs font-bold text-slate-800 mb-2">Perfil e Modalidade</span>
                <span className="flex items-center gap-2 text-xs text-slate-500">
                  <IconeDeAdmin nome="pessoa" className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>
                    {cargo} · {modalidade}
                  </span>
                </span>
              </div>

              <div>
                <span className="block text-xs font-bold text-slate-800 mb-2">Data de Registo</span>
                <span className="flex items-center gap-2 text-xs text-slate-500">
                  <IconeDeAdmin nome="calendario" className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{formatarDataCurta(utilizador.created_at)}</span>
                </span>
              </div>

              <div>
                <span className="block text-xs font-bold text-slate-800 mb-2">Contacto Directo</span>
                <span className="flex items-center gap-2 text-xs text-slate-500">
                  <IconeDeAdmin nome="telefone" className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{utilizador.phone ?? 'Sem telefone'}</span>
                </span>
              </div>
            </div>
          </td>
        </tr>
      )}
    </Fragment>
  )
}

export function TabelaDeUtilizadores({ utilizadores }: { utilizadores: AdminUserSummary[] }) {
  const [idExpandido, setIdExpandido] = useState<string | null>(null)

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50/70 border-y border-slate-100 text-xs font-bold text-slate-800">
            <th scope="col" className="py-3.5 pl-4 pr-3 sm:pl-8 sm:pr-4">
              <span className="md:pl-9">Nome</span>
            </th>
            <th scope="col" className="hidden md:table-cell py-3.5 px-4">
              Cargo
            </th>
            <th scope="col" className="hidden lg:table-cell py-3.5 px-4">
              Modalidade
            </th>
            <th scope="col" className="hidden lg:table-cell py-3.5 px-4">
              Localização
            </th>
            <th scope="col" className="hidden md:table-cell py-3.5 px-4">
              Telefone
            </th>
            <th scope="col" className="hidden md:table-cell py-3.5 px-4">
              Estado
            </th>
            <th scope="col" className="py-3.5 pl-3 pr-4 sm:pr-8 text-right">
              Acções
            </th>
          </tr>
        </thead>
        <tbody>
          {utilizadores.map((utilizador) => (
            <LinhaDeUtilizador
              key={utilizador.id}
              utilizador={utilizador}
              expandida={idExpandido === utilizador.id}
              aoAlternarExpansao={() =>
                setIdExpandido((actual) => (actual === utilizador.id ? null : utilizador.id))
              }
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
