import { beforeEach, describe, expect, it } from 'vitest'
import {
  caminhoDoLogin,
  consumirDestinoPosLogin,
  DESTINO_POS_LOGIN_KEY,
  destinoSeguro,
  guardarDestinoPosLogin,
} from './postLoginRedirect'

beforeEach(() => sessionStorage.clear())

describe('destinoSeguro', () => {
  it('aceita caminhos internos, com pesquisa', () => {
    expect(destinoSeguro('/profissionais?category=canalizacao')).toBe('/profissionais?category=canalizacao')
    expect(destinoSeguro('/os-meus-pedidos')).toBe('/os-meus-pedidos')
  })

  it.each([
    ['sem valor', null],
    ['vazio', ''],
    ['endereço externo', 'https://sitio-falso.com'],
    ['sem barra inicial', 'perfil'],
    ['protocolo implícito', '//sitio-falso.com'],
    ['barra invertida', '/\\sitio-falso.com'],
    ['tabulação que o browser remove', '/\t/sitio-falso.com'],
    ['quebra de linha', '/\n/sitio-falso.com'],
    ['o próprio login (ciclo)', '/entrar'],
    ['o próprio login com pesquisa', '/entrar?modo=criar-conta'],
    ['o callback do Google', '/auth/callback'],
  ])('rejeita %s', (_nome, valor) => {
    expect(destinoSeguro(valor)).toBeNull()
  })
})

describe('caminhoDoLogin', () => {
  it('sem destino nem modo, é só o login', () => {
    expect(caminhoDoLogin()).toBe('/entrar')
    expect(caminhoDoLogin('/')).toBe('/entrar')
  })

  it('leva o destino codificado e o modo', () => {
    expect(caminhoDoLogin('/profissionais?category=pintura')).toBe(
      '/entrar?next=%2Fprofissionais%3Fcategory%3Dpintura',
    )
    expect(caminhoDoLogin(undefined, 'criar-conta')).toBe('/entrar?modo=criar-conta')
  })

  it('ignora um destino inseguro em vez de o propagar', () => {
    expect(caminhoDoLogin('//sitio-falso.com')).toBe('/entrar')
  })
})

describe('destino guardado para o fluxo do Google', () => {
  it('guarda, devolve uma só vez e apaga', () => {
    guardarDestinoPosLogin('/catalogo')

    expect(consumirDestinoPosLogin()).toBe('/catalogo')
    expect(consumirDestinoPosLogin()).toBeNull()
  })

  it('guardar null limpa um destino antigo', () => {
    guardarDestinoPosLogin('/catalogo')
    guardarDestinoPosLogin(null)

    expect(sessionStorage.getItem(DESTINO_POS_LOGIN_KEY)).toBeNull()
  })

  it('não confia no que está guardado: um valor inseguro é descartado', () => {
    sessionStorage.setItem(DESTINO_POS_LOGIN_KEY, '//sitio-falso.com')

    expect(consumirDestinoPosLogin()).toBeNull()
  })
})
