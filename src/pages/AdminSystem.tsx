import { ConteudoDoSeparador } from '../components/admin/estrutura/ConteudoDoSeparador'
import { noSeparador, SECCAO_KYC, SECCAO_MAIS } from '../components/admin/layout/rotas'
import { ACarregar, ErroAoCarregar } from '../components/admin/estrutura/EstadosDaLista'
import { BlocoDoSistema, LinhaDeComponente, LinhaDeConfiguracao, LinhaDePendente } from '../components/admin/sistema/BlocosDoSistema'
import { useEstadoDeSistema } from '../hooks/useAdminSystem'

const horaFormatter = new Intl.DateTimeFormat('pt-PT', { timeStyle: 'medium', timeZone: 'Africa/Maputo' })

export function AdminSystem() {
  const { data, isLoading, isError } = useEstadoDeSistema()

  return (
    <ConteudoDoSeparador
      icone="servidor"
      titulo="Estado do Sistema"
      subtitulo="Saúde dos componentes, configurações de segurança e processos em espera"
      selo="Actualiza de 30 em 30 segundos"
      iconeDoSelo="relogio"
    >
      <div className="border-t border-slate-100 p-4 sm:p-6">
        {isLoading && <ACarregar bloco="h-32" />}

        {isError && <ErroAoCarregar>Não foi possível ler o estado do sistema. Se isto persistir, a própria API pode estar em baixo.</ErroAoCarregar>}

        {data && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <BlocoDoSistema titulo="Componentes" icone="pulso">
                <ul className="divide-y divide-slate-100">
                  <LinhaDeComponente
                    rotulo="Base de dados"
                    estado={data.base_de_dados.estado}
                    nota={data.base_de_dados.latencia_ms !== null ? `${data.base_de_dados.latencia_ms} ms` : data.base_de_dados.detalhe}
                  />
                  <LinhaDeComponente
                    rotulo="Cache (Redis)"
                    estado={data.redis.estado}
                    nota={data.redis.estado === 'DESLIGADO' ? 'Sem cache: a app funciona, só mais devagar.' : data.redis.detalhe}
                  />
                  <LinhaDeComponente
                    rotulo="Email"
                    estado={data.email.estado}
                    nota={data.email.estado === 'DESLIGADO' ? 'Sem SMTP: os emails ficam no log e não saem.' : undefined}
                  />
                </ul>
              </BlocoDoSistema>

              <BlocoDoSistema titulo="Configuração" icone="escudo">
                <ul className="divide-y divide-slate-100 text-sm">
                  <LinhaDeConfiguracao
                    rotulo="Pagamentos"
                    valor={data.pagamentos.modo === 'SIMULADO' ? 'Simulados (teste)' : 'Confirmação manual'}
                  />
                  <LinhaDeConfiguracao
                    rotulo="Verificação em dois passos obrigatória"
                    valor={data.seguranca.verificacao_dois_passos_obrigatoria ? 'Sim' : 'Não'}
                  />
                </ul>
              </BlocoDoSistema>

              <BlocoDoSistema titulo="Pendentes" icone="alerta" corDoIcone="text-amber-500" className="md:col-span-2 lg:col-span-1">
                <ul className="space-y-1">
                  <LinhaDePendente rotulo="Verificações de identidade em análise" valor={data.pendentes.kyc_em_analise} to={SECCAO_KYC} />
                  <LinhaDePendente rotulo="Denúncias por tratar" valor={data.pendentes.denuncias_abertas} to={noSeparador(SECCAO_MAIS, 'moderacao')} />
                  <LinhaDePendente
                    rotulo="Comunicados presos a meio do envio"
                    valor={data.pendentes.comunicados_presos}
                    to={noSeparador(SECCAO_MAIS, 'comunicados')}
                    avisar
                  />
                </ul>
              </BlocoDoSistema>
            </div>

            <p className="pt-4 border-t border-slate-100 text-xs text-slate-500">
              Verificado às {horaFormatter.format(new Date(data.verificado_em))} · actualiza sozinho de 30 em 30 segundos.
            </p>
          </div>
        )}
      </div>
    </ConteudoDoSeparador>
  )
}
