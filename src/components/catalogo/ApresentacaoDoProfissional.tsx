import { Link } from 'react-router-dom'
import type { ProfessionalCatalog } from '../../services/catalog'
import { INVITATIONS_PER_REQUEST } from '../../services/invitations'
import { ContactoDoProfissional } from '../pedidos/ContactoDoProfissional'
import { Mosaico } from '../ui/Mosaico'

interface ApresentacaoDoProfissionalProps {
  catalog: ProfessionalCatalog
  ehDono: boolean
}

const CLASSE_DO_BOTAO =
  'flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-piquete-blue to-piquete-blue-light px-6 py-3.5 text-sm font-bold text-white shadow-glow-blue transition-all hover:brightness-110 active:scale-[0.98]'

// O pedido de serviço não é dirigido a um só profissional: segue para INVITATIONS_PER_REQUEST
// escolhidos na busca, e a busca precisa de um serviço. Por isso o botão leva à busca já com o
// serviço deste profissional — quando tem um só; com vários, não há como adivinhar qual — em
// vez de prometer «pedir a este profissional», que o fluxo não permite.
function destinoDoPedido(catalog: ProfessionalCatalog) {
  return catalog.services.length === 1 ? `/profissionais?category=${encodeURIComponent(catalog.services[0].slug)}` : '/profissionais'
}

function ContactoNoCatalogo({ catalog }: { catalog: ProfessionalCatalog }) {
  if (!catalog.contact_available) {
    return (
      <p className="rounded-2xl bg-gray-50 p-3 text-sm text-gray-700">
        O contacto de {catalog.full_name} fica disponível quando tiver a conta verificada e a subscrição ativa.
      </p>
    )
  }
  if (!catalog.phone) {
    return (
      <p className="rounded-2xl bg-gray-50 p-3 text-sm text-gray-700">
        {catalog.full_name} ainda não registou um número de telefone. Solicita o serviço e ele é avisado por email.
      </p>
    )
  }
  return <ContactoDoProfissional nome={catalog.full_name} telefone={catalog.phone} />
}

// Cartão de apresentação: descrição, estatísticas e a ação principal. O nome e os serviços
// ficam na coluna da foto (IdentidadeDoProfissional).
export function ApresentacaoDoProfissional({ catalog, ehDono }: ApresentacaoDoProfissionalProps) {
  const nomeDoServico = catalog.services.length === 1 ? catalog.services[0].name : null

  return (
    <section className="flex flex-col gap-5 rounded-[2.5rem] border border-gray-100 bg-white p-6 shadow-card sm:p-7">
      {catalog.bio ? (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-piquete-gray-dark">{catalog.bio}</p>
      ) : (
        ehDono && <p className="text-sm italic text-piquete-gray">Ainda não escreveste uma descrição. Acrescenta uma no teu catálogo.</p>
      )}

      <div className="flex gap-2.5">
        <Mosaico value={catalog.rating_avg !== null ? catalog.rating_avg.toFixed(1) : '—'} label="Classificação" />
        <Mosaico value={String(catalog.rating_count)} label={catalog.rating_count === 1 ? 'Avaliação' : 'Avaliações'} />
        <Mosaico value={String(catalog.projects.length)} label={catalog.projects.length === 1 ? 'Trabalho' : 'Trabalhos'} />
      </div>

      {ehDono ? (
        <Link to="/catalogo" className={CLASSE_DO_BOTAO}>
          Editar o meu catálogo
        </Link>
      ) : (
        <div className="flex flex-col gap-2">
          {/* Contacto sempre à vista (decisão do utilizador, 16/10/2026): o cliente pode ligar logo. O número
              só vem do servidor se o profissional pode atender (KYC e subscrição). «Solicitar serviço»
              continua a ser a via que regista o pedido, para haver estado, fotos e avaliação. */}
          <ContactoNoCatalogo catalog={catalog} />
          <Link to={`/solicitar/${catalog.id}`} className={CLASSE_DO_BOTAO}>
            Solicitar serviço
          </Link>
          <p className="text-center text-xs text-piquete-gray">Regista o pedido para acompanhares o estado e avaliares o trabalho.</p>
          <Link to={destinoDoPedido(catalog)} className="text-center text-xs font-semibold text-piquete-blue underline">
            {nomeDoServico ? `Ou pede propostas de ${nomeDoServico} a ${INVITATIONS_PER_REQUEST} profissionais` : `Ou pede propostas a ${INVITATIONS_PER_REQUEST} profissionais`}
          </Link>
        </div>
      )}
    </section>
  )
}
