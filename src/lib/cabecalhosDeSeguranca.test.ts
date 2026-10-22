import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// Cabeçalhos de segurança servidos pela Vercel (TRD Adendo v1.71, item S7). Um teste e não só uma
// nota: o vercel.json não passa pelo build nem pelo E2E (o `vite preview` ignora-o), e um
// wildcard a voltar ao connect-src não partiria nada que se visse.

interface Cabecalho {
  key: string
  value: string
}

const vercel = JSON.parse(readFileSync('vercel.json', 'utf8')) as { headers: { source: string; headers: Cabecalho[] }[] }
const cabecalhos = vercel.headers.find((h) => h.source === '/(.*)')?.headers ?? []
const valor = (chave: string) => cabecalhos.find((c) => c.key === chave)?.value

function directiva(csp: string, nome: string): string[] {
  const encontrada = csp.split(';').map((d) => d.trim().split(/\s+/)).find(([n]) => n === nome)
  return encontrada?.slice(1) ?? []
}

describe('vercel.json — cabeçalhos de segurança', () => {
  it('connect-src só com origens exactas: um XSS não pode mandar dados para outro projecto Supabase ou app do Fly', () => {
    const connect = directiva(valor('Content-Security-Policy') ?? '', 'connect-src')

    expect(connect).toContain("'self'")
    expect(connect).toContain('https://piquetepro24-backend.fly.dev')
    expect(connect.some((origem) => /^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(origem))).toBe(true)
    expect(connect.filter((origem) => origem.includes('*'))).toEqual([])
  })

  it('scripts só da própria origem, sem inline', () => {
    expect(directiva(valor('Content-Security-Policy') ?? '', 'script-src')).toEqual(["'self'"])
  })

  // Sem includeSubDomains: obrigaria a HTTPS todos os subdomínios do .co.mz, incluindo os que
  // apontam para serviços de terceiros (o email Zoho), e um browser que o visse não voltaria atrás
  // durante 2 anos. Acrescenta-se só com essa decisão tomada.
  it('HSTS explícito, só para o próprio domínio', () => {
    expect(valor('Strict-Transport-Security')).toBe('max-age=63072000')
  })
})
