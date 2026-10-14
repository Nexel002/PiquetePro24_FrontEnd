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
export const TERMOS_ACTUALIZADOS_EM = '16 de outubro de 2026'

// Texto redigido a partir do que a plataforma faz hoje (identidade verificada, subscrição do
// profissional, pedido a 3 profissionais, partilha de contactos só depois da escolha,
// localização aproximada). É um rascunho de produto, não um parecer jurídico: **tem de ser
// revisto por um jurista** antes de se tornar vinculativo, em especial as secções 5 (empresas e técnicos), 8 (montra pública de trabalhos), 9 (o que se guarda e por quanto tempo), 10, 11 e 13.
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
      'Podes registar-te como cliente ou como profissional (singular ou empresa). O tipo de profissional escolhido no registo não se altera depois: um profissional singular não se converte em empresa; para ter uma empresa, cria-se outra conta (ver a secção 5).',
    ],
  },
  {
    id: 'como-funciona-um-pedido',
    titulo: '3. Como funciona um pedido',
    paragrafos: [
      'Há duas formas de pedir um serviço. Na primeira, o cliente carrega em «Solicitar serviço» no catálogo de um profissional ou de uma empresa: o pedido fica registado e o profissional é avisado. Na segunda, o cliente descreve o serviço, escolhe três profissionais, que respondem com uma proposta (um preço em meticais, MZN, e uma mensagem), compara-as e escolhe uma.',
      'O nome e o telefone de um profissional (ou da empresa) ficam à vista no catálogo dele, para o cliente poder ligar, mas só enquanto o profissional tiver a identidade verificada e a subscrição ativa. Recomendamos registar o pedido em «Solicitar serviço» mesmo que a conversa comece por telefone: é o que permite acompanhar o estado, juntar fotos e avaliar o trabalho. O profissional vê o contacto e a morada exata do cliente quando abre o pedido, e só se tiver a identidade verificada e a subscrição ativa. Antes disso, os profissionais convidados a um pedido de três só veem o título, a descrição e a zona.',
      'Para que o pedido seja registado e o PiquetePro24 funcione para todos, o cliente deve manter o pedido atualizado: dá-lo como concluído quando o trabalho acabar e avaliar o profissional. Não é possível ter dois pedidos em curso com o mesmo profissional.',
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
      'Os trabalhos que publicas no portfólio podem aparecer na página inicial, visíveis a qualquer pessoa, mesmo sem conta (ver a secção 8).',
    ],
  },
  {
    id: 'empresas-e-tecnicos',
    titulo: '5. Se és uma empresa',
    paragrafos: [
      'Uma empresa regista-se como profissional do tipo empresa e fica representada por quem administra a conta. Esse administrador pode criar contas para os técnicos da empresa, até ao máximo de 15 técnicos ativos, e é ele que lhes atribui os trabalhos.',
    ],
    lista: [
      'A empresa é o profissional perante o PiquetePro24 e perante o cliente: é ela que recebe os convites, responde com a proposta e paga a subscrição, que é a mesma de qualquer profissional e cobre toda a equipa.',
      'A empresa responde pelos seus técnicos: pelo que fazem e pelo que deixam de fazer nos trabalhos que lhes atribui, como se fosse ela a fazê-los. Tem de escolher pessoas capazes de fazer o serviço e de os acompanhar.',
      'Cada técnico tem a sua própria conta, entra com o seu email e palavra-passe e tem de ter a identidade verificada (bilhete de identidade, NUIT e documento de apoio), como qualquer profissional. Sem a identidade verificada, um técnico não recebe trabalhos.',
      'Um técnico só atua em nome da empresa a que pertence. O contacto do cliente só é revelado à empresa e ao técnico a quem o trabalho foi atribuído, depois de o cliente escolher a empresa, e apenas enquanto a empresa tiver a identidade verificada e a subscrição ativa.',
      'O cliente vê no pedido o primeiro nome, o título e a fotografia do técnico que vai ao seu domicílio, e pode avaliar a empresa e, se quiser, o técnico. A empresa não pode usar os contactos dos clientes para outro fim que não o trabalho do pedido.',
      'Ao criar a conta de um técnico, a empresa garante que o técnico sabe e aceita que os seus dados (nome, fotografia, título e identidade) são tratados pelo PiquetePro24 para este fim. O técnico pode corrigir os dados e eliminar a sua conta no seu perfil.',
    ],
    nota: 'Se um técnico deixar a empresa, a empresa desativa a conta dele; os trabalhos e avaliações que ficaram no histórico mantêm-se sem alterar. Uma pessoa só pode ser técnico de uma empresa de cada vez.',
  },
  {
    id: 'clientes',
    titulo: '6. Se és cliente',
    lista: [
      'Descreve o pedido com verdade, para os profissionais poderem propor um preço justo.',
      'Trata os profissionais com respeito e avalia o trabalho com honestidade.',
      'Os dados de contacto de um profissional servem para combinar o serviço — não para outros fins.',
    ],
  },
  {
    id: 'condutas-proibidas',
    titulo: '7. O que não é permitido',
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
    titulo: '8. Avaliações e conteúdos que publicas',
    paragrafos: [
      'As avaliações, comentários e fotos que publicas continuam a ser teus, mas deixas-nos mostrá-los na plataforma para o serviço funcionar (por exemplo, no perfil público de um profissional).',
      'Podemos remover conteúdo que quebre estes termos ou que seja ilegal ou ofensivo.',
      'Se és profissional, os trabalhos que publicas no teu portfólio podem aparecer, na página inicial, a qualquer pessoa, mesmo sem conta. Só mostramos trabalhos de profissionais com a identidade verificada, e só isto: a foto de capa, a descrição, o serviço, o teu primeiro nome e a inicial do último, a província e o distrito, a tua avaliação média e o número de trabalhos concluídos. Nunca mostramos o teu contacto, a tua morada nem a tua fotografia de perfil.',
      'Podes retirar um trabalho da página inicial apagando-o em O meu catálogo, ou eliminando a tua conta; como a lista é guardada alguns minutos, a retirada pode demorar até 5 minutos a notar-se.',
    ],
  },
  {
    id: 'dados-pessoais',
    titulo: '9. Os teus dados pessoais',
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
    titulo: '10. Responsabilidade',
    paragrafos: [
      'O PiquetePro24 verifica a identidade dos profissionais, mas não garante a qualidade, o preço final nem o resultado de nenhum serviço, e não é parte no acordo entre cliente e profissional.',
      'Faz o possível para manter a plataforma disponível, mas podem acontecer interrupções. Na medida em que a lei o permite, não respondemos por danos que resultem do serviço prestado por um profissional ou de uma falha temporária da plataforma.',
    ],
  },
  {
    id: 'suspensao',
    titulo: '11. Suspensão e encerramento de contas',
    paragrafos: [
      'Podemos suspender ou encerrar uma conta que quebre estes termos, ou quando for necessário para proteger outros utilizadores. Podes deixar de usar a plataforma quando quiseres.',
    ],
  },
  {
    id: 'alteracoes',
    titulo: '12. Alterações a estes termos',
    paragrafos: [
      'Podemos atualizar estes termos quando a plataforma ou a lei mudarem. A data no topo da página mostra a última alteração. Se a mudança for importante, avisamos-te na plataforma ou por email; continuar a usá-la depois disso quer dizer que aceitas a nova versão.',
    ],
  },
  {
    id: 'lei-aplicavel',
    titulo: '13. Lei aplicável',
    paragrafos: ['Estes termos regem-se pela lei moçambicana. Qualquer litígio que não se resolva por acordo fica sujeito aos tribunais moçambicanos competentes.'],
  },
]
