import { describe, expect, it } from 'vitest'
import { caminhoActivo } from './caminhoActivo'

const CAMINHOS = ['/admin/kyc', '/admin/utilizadores', '/admin/pedidos-servico', '/admin/visao-geral', '/admin/mais']

describe('caminhoActivo', () => {
  it('acende a secção da página aberta', () => {
    expect(caminhoActivo('/admin/kyc', CAMINHOS)).toBe('/admin/kyc')
  })

  it('a ficha de um utilizador acende «Utilizadores»', () => {
    expect(caminhoActivo('/admin/utilizadores/123', CAMINHOS)).toBe('/admin/utilizadores')
  })

  it('não confunde um prefixo de texto com um segmento', () => {
    expect(caminhoActivo('/admin/utilizadores-antigos', CAMINHOS)).toBeUndefined()
  })

  it('entre dois que contêm a página, ganha o mais específico', () => {
    expect(caminhoActivo('/admin/mais/x', ['/admin', '/admin/mais'])).toBe('/admin/mais')
  })

  it('fora das secções não acende nada', () => {
    expect(caminhoActivo('/perfil', CAMINHOS)).toBeUndefined()
  })
})
