import type { SeccaoLegal } from './termosDeUtilizacao'

// Mesma regra dos termos: mudar o texto sem mudar esta data é dizer ao utilizador que nada mudou.
export const PRIVACIDADE_ACTUALIZADA_EM = '22 de outubro de 2026'

// Endereço indicado ao utilizador para pedidos sobre os seus dados. Se mudar (ex.: uma caixa
// `privacidade@` própria), muda também no security.txt e nos termos, se lá aparecer.
export const CONTACTO_DE_PRIVACIDADE = 'geral@piquetepro24.co.mz'

// Redigida a partir do que a plataforma faz hoje (TRD Adendo v1.70) e coerente com a secção 9 dos
// termos. É um rascunho de produto, não um parecer jurídico: **tem de ser revista por um jurista**
// antes do lançamento, incluindo a lei aplicável (confirmar o alcance da Lei n.º 3/2017, das
// Transacções Electrónicas) e o prazo de resposta da secção 8.
// Fica de fora de propósito o que ainda não é verdade:
// - não se promete que os documentos da verificação de identidade são apagados com a conta: hoje
//   não são (TRD Adendo v1.67, achados fora do âmbito). Corrigido isso, a secção 6 muda com ele;
// - não se fala em verificação em dois passos da equipa enquanto ADMIN_REQUIRE_MFA estiver desligada.
// Se entrar uma ferramenta de estatísticas (TRD Adendo v1.69, D7) ou um fornecedor novo, a secção 4
// ou a 7 tem de mudar no mesmo deploy.
export const POLITICA_DE_PRIVACIDADE: SeccaoLegal[] = [
  {
    id: 'quem-somos',
    titulo: '1. Quem somos',
    paragrafos: [
      'O PiquetePro24 é uma plataforma operada pela empresa PiquetePro24 (“nós”), que liga clientes a profissionais de serviços locais em Moçambique. Somos nós que decidimos que dados pessoais se tratam na plataforma e para quê.',
      `Para qualquer questão sobre os teus dados, escreve-nos para ${CONTACTO_DE_PRIVACIDADE}.`,
    ],
  },
  {
    id: 'dados-que-recolhemos',
    titulo: '2. Que dados recolhemos',
    lista: [
      'Dados de conta: nome, email, telefone, o papel que escolheste (cliente, profissional ou técnico) e a fotografia de perfil, se a puseres. Se entrares com o Google, recebemos dele o teu nome, email e fotografia.',
      'Localização: a que indicas no perfil e nos pedidos e, se deres autorização, a do teu dispositivo.',
      'Verificação de identidade (profissionais e técnicos): o bilhete de identidade, o NUIT e o documento de apoio que envias.',
      'Credenciais (opcionais): os documentos que envias como prova, por exemplo o registo criminal.',
      'Perfil profissional: os serviços que prestas, a zona onde atendes, o catálogo e as fotos dos trabalhos.',
      'Pedidos, propostas e avaliações: o que descreves num pedido, as fotos que juntas, as propostas, o estado de cada pedido e as avaliações e comentários.',
      'Empresas e instituições clientes: o nome, o NUIT e os locais que guardares.',
      'Pesquisas sem resultado: o serviço, a província e uma localização arredondada a cerca de 1 km.',
      'Dados técnicos e de segurança: o endereço IP, a data e hora e a ação feita, quando crias ou alteras dados na plataforma.',
    ],
  },
  {
    id: 'para-que-usamos',
    titulo: '3. Para que usamos os teus dados',
    lista: [
      'Para a plataforma funcionar: criar a tua conta, mostrar profissionais perto de ti, enviar pedidos e propostas e pôr cliente e profissional em contacto.',
      'Para dar confiança a quem usa a plataforma: verificar a identidade e as credenciais dos profissionais.',
      'Para te avisar: emails sobre a tua conta e os teus pedidos, como um convite novo ou uma proposta recebida.',
      'Para melhorar o serviço: saber onde faltam profissionais, a partir das pesquisas sem resultado.',
      'Para proteger a plataforma e quem a usa: detetar abusos, investigar denúncias e cumprir a lei.',
    ],
    nota: 'Não vendemos os teus dados nem os usamos para publicidade.',
  },
  {
    id: 'com-quem-partilhamos',
    titulo: '4. Com quem partilhamos',
    paragrafos: [
      'Com o outro utilizador de um pedido, só no que é preciso e nos termos da secção 3 dos Termos de utilização: o profissional escolhido vê o teu contacto e a morada do pedido; o cliente vê o nome e o telefone do profissional. Os trabalhos que um profissional publica podem aparecer na página inicial, como explicado na secção 8 dos termos.',
      'Com a nossa equipa autorizada, que vê os documentos de verificação para os aprovar. Cada acesso a um documento de credencial fica registado.',
      'Com os fornecedores técnicos que nos permitem operar a plataforma, que só tratam os dados para nos prestar esse serviço:',
    ],
    lista: [
      'Supabase — base de dados, contas e armazenamento de ficheiros.',
      'Fly.io — servidor da aplicação.',
      'Upstash — memória temporária para acelerar pesquisas.',
      'Vercel — publicação do site.',
      'Zoho — envio de emails.',
      'Google — entrada com a conta Google, se a escolheres.',
      'OpenStreetMap (Nominatim), OpenRouteService e Google Maps — transformar coordenadas no nome da rua ou do bairro. Recebem as coordenadas, sem o teu nome nem o teu contacto.',
    ],
    nota: 'Podemos ainda ter de entregar dados às autoridades quando a lei o exigir.',
  },
  {
    id: 'onde-ficam',
    titulo: '5. Onde ficam guardados',
    paragrafos: [
      'A base de dados, os ficheiros e o servidor da aplicação ficam em Frankfurt, na Alemanha. Os outros fornecedores podem tratar dados noutros países, sempre só para nos prestar o serviço.',
    ],
  },
  {
    id: 'durante-quanto-tempo',
    titulo: '6. Durante quanto tempo',
    lista: [
      'Conta, perfil, pedidos e avaliações: enquanto a conta existir. Quando a eliminas, apagamos o teu perfil e os dados ligados a ela, como explicado na secção 9 dos Termos de utilização.',
      'Documentos de credenciais: até apagares a credencial ou a conta.',
      `Documentos da verificação de identidade: enquanto a conta existir. Depois de a eliminares, se quiseres confirmar que foram apagados, escreve-nos para ${CONTACTO_DE_PRIVACIDADE}.`,
      'Pesquisas sem resultado: 12 meses. Um pedido para seres avisado fica até te avisarmos ou o apagares no perfil.',
      'Dados técnicos e de segurança: o tempo necessário para proteger a plataforma e cumprir a lei.',
    ],
  },
  {
    id: 'no-teu-dispositivo',
    titulo: '7. O que fica guardado no teu dispositivo',
    paragrafos: [
      'A app guarda no teu telemóvel ou computador o que precisa para funcionar: a sessão iniciada, a última localização, os profissionais favoritos, os pedidos criados sem internet que ainda faltam enviar e a versão instalada da app.',
      'Não usamos cookies de publicidade nem ferramentas de estatística de terceiros.',
    ],
  },
  {
    id: 'os-teus-direitos',
    titulo: '8. Os teus direitos',
    lista: [
      'Ver e corrigir os teus dados, em O meu perfil → Definições.',
      'Eliminar a tua conta, no mesmo sítio. A eliminação é definitiva.',
      'Retirar a autorização de localização, nas definições do teu dispositivo ou do browser. Continuas a poder indicar a zona à mão.',
      `Pedir uma cópia dos teus dados, ou opor-te a um tratamento, escrevendo para ${CONTACTO_DE_PRIVACIDADE}.`,
    ],
    nota: 'Respondemos o mais depressa possível e, em regra, no prazo de 30 dias.',
  },
  {
    id: 'seguranca',
    titulo: '9. Segurança',
    paragrafos: [
      'Toda a comunicação com a plataforma é cifrada (HTTPS). Os documentos de verificação e de credenciais ficam num armazenamento privado, a que só a equipa autorizada acede. Nunca mostramos coordenadas exatas a outros utilizadores.',
    ],
  },
  {
    id: 'menores',
    titulo: '10. Menores',
    paragrafos: ['O PiquetePro24 é só para maiores de 18 anos. Se souberes de uma conta de um menor, avisa-nos para a removermos.'],
  },
  {
    id: 'alteracoes',
    titulo: '11. Alterações a esta política',
    paragrafos: [
      'Podemos atualizar esta política quando a plataforma ou a lei mudarem. A data no topo da página mostra a última alteração. Se a mudança for importante, avisamos-te na plataforma ou por email.',
    ],
  },
  {
    id: 'lei-aplicavel',
    titulo: '12. Lei aplicável',
    paragrafos: ['Esta política rege-se pela lei moçambicana.'],
  },
]
