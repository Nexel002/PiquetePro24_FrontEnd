// A secção do menu que corresponde à página aberta: a **mais específica** que a contém, por
// segmentos. Com `startsWith` simples, `/admin/utilizadores-x` acenderia `/admin/utilizadores`;
// aqui só conta um prefixo que acabe num `/` (ou seja igual), e entre vários ganha o mais
// comprido. Mesma regra do menu lateral do ControlCore, de onde esta lógica vem.
export function caminhoActivo(pathname: string, caminhos: string[]): string | undefined {
  let melhor: string | undefined
  for (const c of caminhos) {
    const contem = pathname === c || pathname.startsWith(c.endsWith('/') ? c : `${c}/`)
    if (contem && (melhor === undefined || c.length > melhor.length)) melhor = c
  }
  return melhor
}
