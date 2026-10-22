import { enderecoCanonico, paginaPublica, TITULO_POR_OMISSAO } from './paginasPublicas'

function metaComNome(documento: Document, nome: string): HTMLMetaElement {
  let meta = documento.head.querySelector<HTMLMetaElement>(`meta[name="${nome}"]`)
  if (!meta) {
    meta = documento.createElement('meta')
    meta.name = nome
    documento.head.appendChild(meta)
  }
  return meta
}

// Chamado a cada mudança de ecrã (components/MetadadosDaPagina.tsx). O HTML estático já traz os
// metadados certos para quem não executa JavaScript; isto mantém-nos certos para o Google, que
// executa, e para o título do separador do browser durante a navegação dentro da app.
// O `canonical` só existe aqui, e não no index.html: o index.html também é servido em /termos e
// /privacidade, e um `canonical` fixo para `/` dizia ao Google que essas páginas eram cópias da
// página inicial.
export function aplicarMetadados(caminho: string, documento: Document = document): void {
  const pagina = paginaPublica(caminho)
  let canonico = documento.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')

  if (!pagina) {
    documento.title = TITULO_POR_OMISSAO
    metaComNome(documento, 'robots').content = 'noindex'
    canonico?.remove()
    return
  }

  documento.title = pagina.titulo
  metaComNome(documento, 'description').content = pagina.descricao
  metaComNome(documento, 'robots').content = 'index, follow'
  if (!canonico) {
    canonico = documento.createElement('link')
    canonico.rel = 'canonical'
    documento.head.appendChild(canonico)
  }
  canonico.href = enderecoCanonico(pagina.caminho)
}
