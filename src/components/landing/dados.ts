// Textos e listas da landing num só sítio, para o conteúdo se rever sem andar a abrir componentes.
// Sem números, testemunhos nem preços: nada disto existe ainda como dado real, e uma landing que
// inventa «4.8 estrelas» e «5000 serviços» é pior do que uma que não os mostra.

// Os slugs são os de `service_categories` (migration 20261005120000); o texto é o do catálogo.
export const CATEGORIAS = [
  { slug: 'canalizacao', nome: 'Canalização' },
  { slug: 'eletricidade', nome: 'Eletricidade' },
  { slug: 'pintura', nome: 'Pintura' },
  { slug: 'climatizacao', nome: 'Climatização' },
  { slug: 'carpintaria', nome: 'Carpintaria' },
  { slug: 'serralharia', nome: 'Serralharia' },
  { slug: 'jardinagem', nome: 'Jardinagem' },
  { slug: 'limpeza-domestica', nome: 'Limpeza doméstica' },
  { slug: 'mudancas-transporte', nome: 'Mudanças e transporte' },
  { slug: 'informatica-eletronica', nome: 'Informática e eletrónica' },
] as const

export const VANTAGENS = [
  {
    icone: 'escudo',
    titulo: 'Identidade verificada',
    texto: 'Só ganham o selo «Verificado» os profissionais que passaram pela verificação de identidade.',
  },
  {
    icone: 'grupo',
    titulo: 'Pede a 3 de uma vez',
    texto: 'Descreves o problema uma vez e escolhes até 3 profissionais para o receberem.',
  },
  {
    icone: 'balanca',
    titulo: 'Compara propostas',
    texto: 'Cada profissional responde com a sua proposta. Tu comparas e decides, sem compromisso.',
  },
  {
    icone: 'estrela',
    titulo: 'Avaliações de quem já contratou',
    texto: 'Vês as notas e o trabalho já feito antes de escolher, no catálogo de cada profissional.',
  },
] as const

export const PASSOS = [
  { titulo: 'Pede', texto: 'Diz o que precisas e onde. Se estiveres sem rede, o pedido fica guardado e segue quando ela voltar.' },
  { titulo: 'Compara', texto: 'Recebe as propostas, vê perfis, trabalhos feitos e avaliações.' },
  { titulo: 'Escolhe', texto: 'Fica com quem te convencer e combina o serviço directamente com essa pessoa.' },
] as const

export const PERGUNTAS = [
  {
    pergunta: 'Como faço um pedido?',
    resposta: 'Cria a tua conta, descreve o serviço de que precisas e escolhe até 3 profissionais da tua zona. Eles respondem com uma proposta e tu escolhes.',
  },
  {
    pergunta: 'Como sei que o profissional é de confiança?',
    resposta: 'Os profissionais com o selo «Verificado» passaram pela verificação de identidade. Além disso, vês as avaliações e os trabalhos que já fizeram.',
  },
  {
    pergunta: 'Quanto custa o serviço?',
    resposta: 'O preço é combinado contigo: cada profissional envia a sua proposta e tu comparas antes de decidir.',
  },
  {
    pergunta: 'E se a minha internet for fraca?',
    resposta: 'A app foi pensada para isso. Se perderes a ligação a meio de um pedido, ele fica guardado no telemóvel e é enviado quando a rede voltar.',
  },
  {
    pergunta: 'Preciso de descarregar alguma coisa?',
    resposta: 'Não. O PiquetePro24 abre no browser e podes instalá-lo no ecrã inicial do telemóvel, sem passar por nenhuma loja.',
  },
  {
    pergunta: 'Sou profissional. Como começo?',
    resposta: 'Cria a conta como profissional, completa o perfil e verifica a tua identidade. Com a subscrição activa, recebes os pedidos da tua zona e podes responder-lhes.',
  },
] as const
