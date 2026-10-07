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

  it('descreve o que a plataforma faz hoje: contactos só depois da escolha e pagamento fora da app', () => {
    mostrar()

    expect(screen.getByText(/só se revelam depois da escolha/i)).toBeTruthy()
    expect(screen.getByText(/não recebe nem retém o dinheiro do serviço/i)).toBeTruthy()
  })

  it('diz quem opera a plataforma e onde se corrigem os dados e se elimina a conta', () => {
    mostrar()

    expect(screen.getByText(/operada pela empresa PiquetePro24/i)).toBeTruthy()
    expect(screen.getByText(/O meu perfil → Definições \(editar perfil\)/i)).toBeTruthy()
  })
})
