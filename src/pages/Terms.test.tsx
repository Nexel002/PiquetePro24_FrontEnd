import { cleanup, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { TERMOS_ACTUALIZADOS_EM, TERMOS_DE_UTILIZACAO } from '../data/termosDeUtilizacao'
import { Terms } from './Terms'

afterEach(cleanup)

function mostrar() {
  render(
    <MemoryRouter>
      <Terms />
    </MemoryRouter>,
  )
}

describe('Termos de utilização — conteúdo', () => {
  it('cada secção tem um id único e algum texto', () => {
    const ids = TERMOS_DE_UTILIZACAO.map((s) => s.id)

    expect(new Set(ids).size).toBe(ids.length)
    for (const seccao of TERMOS_DE_UTILIZACAO) {
      expect(seccao.titulo.trim()).not.toBe('')
      expect((seccao.paragrafos?.length ?? 0) + (seccao.lista?.length ?? 0)).toBeGreaterThan(0)
    }
  })
})

describe('Termos de utilização — empresas e técnicos', () => {
  const texto = (id: string) => {
    const seccao = TERMOS_DE_UTILIZACAO.find((x) => x.id === id)
    return [...(seccao?.paragrafos ?? []), ...(seccao?.lista ?? []), seccao?.nota ?? ''].join(' ')
  }

  it('a numeração das secções é contínua, sem saltos nem repetições', () => {
    const numeros = TERMOS_DE_UTILIZACAO.map((s) => Number(s.titulo.split('.')[0]))
    expect(numeros).toEqual(numeros.map((_, i) => i + 1))
  })

  it('tem uma secção para empresas, a seguir à dos profissionais', () => {
    const ids = TERMOS_DE_UTILIZACAO.map((s) => s.id)
    expect(ids.indexOf('empresas-e-tecnicos')).toBe(ids.indexOf('profissionais') + 1)
  })

  it('diz que a empresa responde pelos técnicos (decisão do utilizador)', () => {
    expect(texto('empresas-e-tecnicos')).toMatch(/a empresa responde pelos seus técnicos/i)
  })

  it('diz o limite de 15 técnicos, que o técnico tem identidade verificada própria e que a subscrição é a mesma', () => {
    const empresa = texto('empresas-e-tecnicos')
    expect(empresa).toMatch(/15 técnicos/)
    expect(empresa).toMatch(/identidade verificada/i)
    expect(empresa).toMatch(/mesma de qualquer profissional/i)
  })

  it('diz a quem se revela o contacto do cliente, e a quem não', () => {
    expect(texto('empresas-e-tecnicos')).toMatch(/só é revelado à empresa e ao técnico a quem o trabalho foi atribuído/i)
  })

  it('diz que um singular não se converte em empresa, na secção da conta', () => {
    expect(texto('a-tua-conta')).toMatch(/não se converte em empresa/i)
  })

  it('as referências cruzadas apontam para secções que existem e dizem o que se espera', () => {
    const titulo = (n: number) => TERMOS_DE_UTILIZACAO[n - 1]?.titulo ?? ''
    expect(titulo(5)).toMatch(/empresa/i)
    expect(titulo(8)).toMatch(/Avaliações e conteúdos/)
    // «(ver a secção 8)» na secção dos profissionais refere-se aos conteúdos que se publicam.
    expect(texto('profissionais')).toContain('(ver a secção 8)')
  })
})

describe('Termos de utilização — página', () => {
  it('mostra o título, a data da última atualização e todas as secções', () => {
    mostrar()

    expect(screen.getByRole('heading', { level: 1, name: 'Termos de utilização' })).toBeTruthy()
    expect(screen.getByText(`Última atualização: ${TERMOS_ACTUALIZADOS_EM}`)).toBeTruthy()
    for (const seccao of TERMOS_DE_UTILIZACAO) {
      expect(screen.getByRole('heading', { level: 2, name: seccao.titulo })).toBeTruthy()
    }
  })

  it('o índice liga a cada secção pelo seu id', () => {
    mostrar()
    const indice = screen.getByRole('navigation', { name: 'Índice' })

    for (const seccao of TERMOS_DE_UTILIZACAO) {
      const ligacao = within(indice).getByRole('link', { name: seccao.titulo })
      expect(ligacao.getAttribute('href')).toBe(`#${seccao.id}`)
      expect(document.getElementById(seccao.id)).toBeTruthy()
    }
  })

  it('é pública: abre sem sessão e leva de volta ao início', () => {
    mostrar()

    expect(screen.getByRole('link', { name: 'Ir para o início' }).getAttribute('href')).toBe('/')
  })

  it('descreve o que a plataforma faz hoje: contacto do profissional à vista e pagamento fora da app', () => {
    mostrar()

    expect(screen.getByText(/ficam à vista no catálogo dele, para o cliente poder ligar/i)).toBeTruthy()
    expect(screen.getByText(/não recebe nem retém o dinheiro do serviço/i)).toBeTruthy()
  })

  it('diz quem opera a plataforma e onde se corrigem os dados e se elimina a conta', () => {
    mostrar()

    expect(screen.getByText(/operada pela empresa PiquetePro24/i)).toBeTruthy()
    expect(screen.getByText(/O meu perfil → Definições \(editar perfil\)/i)).toBeTruthy()
  })
})
