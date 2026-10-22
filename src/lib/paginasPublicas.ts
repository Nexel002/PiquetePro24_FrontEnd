// Endereço oficial do site (TRD Adendo v1.70): o `www` é o canónico, e a raiz faz 308 para ele na
// Vercel. É a base do `canonical`, do sitemap e do Open Graph — um endereço diferente aqui dizia ao
// Google que a página oficial é outra, e as duas competiam entre si nos resultados.
export const ORIGEM_DO_SITE = 'https://www.piquetepro24.co.mz'

export const TITULO_POR_OMISSAO = 'PiquetePro24'

export interface PaginaPublica {
  caminho: string
  // ≤ 60 caracteres: o Google corta o resto nos resultados.
  titulo: string
  // ≤ 155 caracteres, pelo mesmo motivo.
  descricao: string
}

// As únicas páginas que os motores de pesquisa devem indexar. Esta lista é a fonte de três coisas
// que têm de bater certo: o sitemap gerado no build (vite.config.ts), os `rewrites` do vercel.json
// para o index.html (as outras rotas recebem o app.html, com `noindex`) e os metadados que a app
// aplica ao mudar de ecrã. O teste paginasPublicas.test.ts falha se o vercel.json divergir.
// Este ficheiro não pode usar o `document`: o vite.config.ts importa-o, e corre em Node (o que mexe no
// DOM está em metadadosDaPagina.ts).
export const PAGINAS_PUBLICAS: PaginaPublica[] = [
  {
    caminho: '/',
    titulo: 'PiquetePro24 — profissionais verificados em Moçambique',
    descricao:
      'Encontra canalizadores, eletricistas, pintores e outros profissionais com identidade verificada perto de ti, em Moçambique. Pede propostas e compara.',
  },
  {
    caminho: '/termos',
    titulo: 'Termos de utilização — PiquetePro24',
    descricao: 'As regras de utilização do PiquetePro24: contas, pedidos, profissionais, empresas, avaliações e responsabilidade.',
  },
  {
    caminho: '/privacidade',
    titulo: 'Política de privacidade — PiquetePro24',
    descricao: 'Que dados pessoais o PiquetePro24 guarda, para quê, com quem os partilha, onde ficam, durante quanto tempo e como exerces os teus direitos.',
  },
]

export function paginaPublica(caminho: string): PaginaPublica | undefined {
  const semBarraFinal = caminho.length > 1 ? caminho.replace(/\/+$/, '') : caminho
  return PAGINAS_PUBLICAS.find((pagina) => pagina.caminho === semBarraFinal)
}

export function enderecoCanonico(caminho: string): string {
  return caminho === '/' ? `${ORIGEM_DO_SITE}/` : `${ORIGEM_DO_SITE}${caminho}`
}

// Sem <lastmod>: a data do build mudaria em todos os deploys sem o conteúdo mudar, e o Google
// passa a ignorar o campo num sitemap em que ele não é fiável.
export function gerarSitemap(paginas: PaginaPublica[] = PAGINAS_PUBLICAS): string {
  const urls = paginas.map((pagina) => `  <url><loc>${enderecoCanonico(pagina.caminho)}</loc></url>`).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
}
