export interface SeccaoLegal {
  id: string
  titulo: string
  paragrafos?: string[]
  lista?: string[]
  // Parágrafo depois da lista (ex.: uma ressalva que se aplica a todos os itens).
  nota?: string
}

// "Última actualização" mostra-se na página e conta para o utilizador: mudar o texto sem mudar
// esta data é dizer-lhe que nada mudou.
export const TERMOS_ACTUALIZADOS_EM = '7 de outubro de 2026'

// Texto redigido a partir do que a plataforma faz hoje (identidade verificada, subscrição do
// profissional, pedido a 3 profissionais, partilha de contactos só depois da escolha,
// localização aproximada). É um rascunho de produto, não um parecer jurídico: **tem de ser
// revisto por um jurista** antes de se tornar vinculativo, em especial as secções 8 (o que se guarda e por quanto tempo), 9, 10 e 12.
// Quando uma funcionalidade mudar (ex.: pagamento do serviço dentro da app), as secções 3 e 4
// têm de mudar com ela.
export const TERMOS_DE_UTILIZACAO: SeccaoLegal[] = [
  {
    id: 'o-servico',
    titulo: '1. O que é o PiquetePro24',
    paragrafos: [
      'O PiquetePro24 é uma plataforma operada pela empresa PiquetePro24 (“nós”) que liga clientes a profissionais de serviços locais em Moçambique, como canalização, eletricidade, pintura ou jardinagem.',
      'Somos um intermediário: ajudamos-te a encontrar profissionais e a comparar propostas, mas não somos nós que executamos os serviços. Ao criares conta ou ao usares a plataforma, aceitas estes termos.',
    ],
  },
  {
    id: 'a-tua-conta',
    titulo: '2. A tua conta',
    lista: [
      'Tens de ter pelo menos 18 anos e dar informação verdadeira e atual.',
      'A conta é pessoal: não a partilhes nem cries várias contas para a mesma pessoa.',
      'A palavra-passe é tua. Se suspeitares que alguém a conhece, muda-a de imediato.',
      'Podes registar-te como cliente ou como profissional (singular ou empresa).',
    ],
  },
  {
    id: 'como-funciona-um-pedido',
    titulo: '3. Como funciona um pedido',
    paragrafos: [
      'O cliente descreve o serviço de que precisa e escolhe três profissionais. Cada um recebe o convite por email e pode responder com uma proposta: um preço em meticais (MZN) e uma mensagem. O cliente compara as propostas e escolhe uma.',
      'Os contactos só se revelam depois da escolha: o cliente passa a ver o nome e o telefone do profissional escolhido, e esse profissional passa a ver o contacto e a morada exata do cliente. Antes disso, os profissionais convidados só veem o título, a descrição e a zona do pedido.',
      'O que se combina a seguir — preço final, data, execução e pagamento do serviço — é um acordo entre cliente e profissional, feito fora da plataforma. O PiquetePro24 não recebe nem retém o dinheiro do serviço.',
    ],
  },
  {
    id: 'profissionais',
    titulo: '4. Se és profissional',
    lista: [
      'Para responderes a pedidos tens de ter a identidade verificada (bilhete de identidade, NUIT e documento de apoio) e uma subscrição ativa.',
      'A subscrição paga-se por M-Pesa ou e-Mola. Sem subscrição ativa, ou com a verificação por aprovar, não podes propor nem aceitar pedidos.',
      'Tens de indicar apenas serviços que sabes e podes fazer, e manter o perfil e as fotos do portfólio verdadeiros. Só carregues fotos que tens o direito de usar.',
      'Deves cumprir o que propões. Propostas que não pensas honrar prejudicam os clientes e a tua reputação.',
    ],
  },
  {
    id: 'clientes',
    titulo: '5. Se és cliente',
    lista: [
      'Descreve o pedido com verdade, para os profissionais poderem propor um preço justo.',
      'Trata os profissionais com respeito e avalia o trabalho com honestidade.',
      'Os dados de contacto de um profissional servem para combinar o serviço — não para outros fins.',
    ],
  },
  {
    id: 'condutas-proibidas',
    titulo: '6. O que não é permitido',
    lista: [
      'Dar informação falsa, usar a identidade de outra pessoa ou apresentar documentos que não são teus.',
      'Assediar, ameaçar ou discriminar outros utilizadores.',
      'Usar a plataforma para fraude, para atividades ilegais ou para enganar quem a usa.',
      'Publicar avaliações falsas, ou pedir a alguém que as publique em teu nome ou em troca de algo.',
      'Recolher dados de outros utilizadores de forma automática ou tentar contornar a segurança da plataforma.',
    ],
  },
  {
    id: 'avaliacoes-e-conteudos',
    titulo: '7. Avaliações e conteúdos que publicas',
    paragrafos: [
      'As avaliações, comentários e fotos que publicas continuam a ser teus, mas deixas-nos mostrá-los na plataforma para o serviço funcionar (por exemplo, no perfil público de um profissional).',
      'Podemos remover conteúdo que quebre estes termos ou que seja ilegal ou ofensivo.',
    ],
  },
  {
    id: 'dados-pessoais',
    titulo: '8. Os teus dados pessoais',
    paragrafos: ['Guardamos só o que precisamos para a plataforma funcionar:'],
    lista: [
      'Dados de conta: nome, email, telefone e fotografia de perfil (se a puseres).',
      'Localização: a que indicas no perfil e, se deres autorização, a do teu dispositivo. Para ordenar profissionais por proximidade usamos uma localização aproximada (arredondada a cerca de 500 m) e nunca mostramos coordenadas exatas a outros utilizadores.',
      'Profissionais: os documentos da verificação de identidade, que só a equipa autorizada vê.',
      'Mensagens do sistema: enviamos-te emails sobre a tua conta e os teus pedidos (por exemplo, um novo convite ou uma proposta recebida).',
    ],
    nota: 'Não vendemos os teus dados. Partilhamo-los apenas com quem for necessário para o serviço: o outro utilizador do pedido (nos termos da secção 3) e os fornecedores técnicos que nos permitem operar a plataforma. Podes corrigir os teus dados e eliminar a tua conta, tu mesmo, em O meu perfil → Definições (editar perfil). A eliminação é definitiva e apaga o teu perfil e os dados que estão ligados à tua conta.',
  },
  {
    id: 'responsabilidade',
    titulo: '9. Responsabilidade',
    paragrafos: [
      'O PiquetePro24 verifica a identidade dos profissionais, mas não garante a qualidade, o preço final nem o resultado de nenhum serviço, e não é parte no acordo entre cliente e profissional.',
      'Faz o possível para manter a plataforma disponível, mas podem acontecer interrupções. Na medida em que a lei o permite, não respondemos por danos que resultem do serviço prestado por um profissional ou de uma falha temporária da plataforma.',
    ],
  },
  {
    id: 'suspensao',
    titulo: '10. Suspensão e encerramento de contas',
    paragrafos: [
      'Podemos suspender ou encerrar uma conta que quebre estes termos, ou quando for necessário para proteger outros utilizadores. Podes deixar de usar a plataforma quando quiseres.',
    ],
  },
  {
    id: 'alteracoes',
    titulo: '11. Alterações a estes termos',
    paragrafos: [
      'Podemos atualizar estes termos quando a plataforma ou a lei mudarem. A data no topo da página mostra a última alteração. Se a mudança for importante, avisamos-te na plataforma ou por email; continuar a usá-la depois disso quer dizer que aceitas a nova versão.',
    ],
  },
  {
    id: 'lei-aplicavel',
    titulo: '12. Lei aplicável',
    paragrafos: ['Estes termos regem-se pela lei moçambicana. Qualquer litígio que não se resolva por acordo fica sujeito aos tribunais moçambicanos competentes.'],
  },
]
