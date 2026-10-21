import { useKycSubmissions } from '../hooks/useKyc'
import type { KycStatus } from '../services/kyc'
import { ConteudoDoSeparador } from '../components/admin/estrutura/ConteudoDoSeparador'
import { ACarregar, ErroAoCarregar, ListaVazia } from '../components/admin/estrutura/EstadosDaLista'
import { SeccaoComSeparadores, type DefinicaoDeSeparador } from '../components/admin/estrutura/Separadores'
import { useSeparadorDoEndereco } from '../components/admin/estrutura/useSeparadorDoEndereco'
import { CartaoDeKyc } from '../components/admin/kyc/CartaoDeKyc'
import { FilaDeCredenciais } from '../components/admin/kyc/FilaDeCredenciais'

type Separador = 'pendentes' | 'aprovados' | 'rejeitados' | 'todos' | 'credenciais'

// A fila abre no que falta decidir: é por isso que se entra aqui.
const SEPARADORES: DefinicaoDeSeparador<Separador>[] = [
  { id: 'pendentes', rotulo: 'Em análise' },
  { id: 'aprovados', rotulo: 'Aprovados' },
  { id: 'rejeitados', rotulo: 'Rejeitados' },
  { id: 'todos', rotulo: 'Todos' },
  // Fase 41 (N5): o mesmo trabalho (ver um documento e decidir), por isso fica na secção KYC.
  { id: 'credenciais', rotulo: 'Credenciais' },
]
const IDS = SEPARADORES.map((s) => s.id)

const ESTADO_DO_SEPARADOR: Record<Separador, KycStatus | undefined> = {
  pendentes: 'PENDING',
  aprovados: 'APPROVED',
  rejeitados: 'REJECTED',
  todos: undefined,
  credenciais: undefined,
}

// TRD Adendo v1.6: superfície mínima para o ADMIN exercer GET/PATCH /admin/kyc — não é um
// "painel" com métricas, só a fila de revisão. O guard de role está na rota (RotaDeAdmin).
export function AdminKyc() {
  const [separador, mudarSeparador] = useSeparadorDoEndereco(IDS)
  const { data: submissions, isLoading, isError } = useKycSubmissions(ESTADO_DO_SEPARADOR[separador])

  if (separador === 'credenciais') {
    return (
      <SeccaoComSeparadores rotulo="Estados da verificação" separadores={SEPARADORES} activo={separador} aoMudar={mudarSeparador}>
        <ConteudoDoSeparador icone="escudo" titulo="Credenciais por verificar" subtitulo="Selos opcionais: registo criminal, carteira, formação" selo="Cada documento aberto fica na auditoria" iconeDoSelo="cadeado">
          <FilaDeCredenciais />
        </ConteudoDoSeparador>
      </SeccaoComSeparadores>
    )
  }

  return (
    <SeccaoComSeparadores rotulo="Estados da verificação" separadores={SEPARADORES} activo={separador} aoMudar={mudarSeparador}>
      <ConteudoDoSeparador
        icone="escudo"
        titulo="Fila de Verificação"
        subtitulo={submissions ? `${submissions.length} pedidos nesta listagem` : 'Carregando fila...'}
        selo="Documentos confidenciais sob sigilo de auditoria"
        iconeDoSelo="cadeado"
      >
        {isLoading && (
          <div className="p-4 sm:p-6">
            <ACarregar blocos={3} bloco="h-28" />
          </div>
        )}

        {isError && (
          <div className="m-4 sm:m-6">
            <ErroAoCarregar>Não foi possível carregar as submissões. Verifica a tua ligação e tenta novamente.</ErroAoCarregar>
          </div>
        )}

        {submissions && submissions.length === 0 && (
          <ListaVazia
            icone="circuloVerificado"
            titulo="Não há submissões neste estado"
            descricao="Todos os pedidos foram processados ou não correspondem ao filtro."
          />
        )}

        {submissions && submissions.length > 0 && (
          <ul className="divide-y divide-slate-100 border-t border-slate-100">
            {submissions.map((kyc) => (
              <li key={kyc.id}>
                <CartaoDeKyc kyc={kyc} />
              </li>
            ))}
          </ul>
        )}
      </ConteudoDoSeparador>
    </SeccaoComSeparadores>
  )
}
