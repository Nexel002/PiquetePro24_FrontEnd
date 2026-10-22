import { cleanup, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { CONTACTO_DE_PRIVACIDADE, POLITICA_DE_PRIVACIDADE, PRIVACIDADE_ACTUALIZADA_EM } from '../data/politicaDePrivacidade'
import { Privacidade } from './Privacidade'

afterEach(cleanup)

function mostrar() {
  render(
    <MemoryRouter>
      <Privacidade />
    </MemoryRouter>,
  )
}

const textoDe = (id: string) => {
  const seccao = POLITICA_DE_PRIVACIDADE.find((x) => x.id === id)
  return [...(seccao?.paragrafos ?? []), ...(seccao?.lista ?? []), seccao?.nota ?? ''].join(' ')
}

describe('Política de privacidade — conteúdo', () => {
  it('cada secção tem um id único e algum texto, e a numeração é contínua', () => {
    const ids = POLITICA_DE_PRIVACIDADE.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const seccao of POLITICA_DE_PRIVACIDADE) {
      expect((seccao.paragrafos?.length ?? 0) + (seccao.lista?.length ?? 0)).toBeGreaterThan(0)
    }
    const numeros = POLITICA_DE_PRIVACIDADE.map((s) => Number(s.titulo.split('.')[0]))
    expect(numeros).toEqual(numeros.map((_, i) => i + 1))
  })

  it('diz a quem escrever, no domínio próprio', () => {
    expect(CONTACTO_DE_PRIVACIDADE).toMatch(/@piquetepro24\.co\.mz$/)
    expect(textoDe('quem-somos')).toContain(CONTACTO_DE_PRIVACIDADE)
  })

  it('diz onde ficam os dados e os 12 meses das pesquisas sem resultado (mesmo prazo dos termos)', () => {
    expect(textoDe('onde-ficam')).toMatch(/Frankfurt, na Alemanha/)
    expect(textoDe('durante-quanto-tempo')).toMatch(/Pesquisas sem resultado: 12 meses/)
  })

  it('não promete que os documentos de identidade são apagados com a conta (hoje não são — TRD Adendo v1.67)', () => {
    expect(textoDe('durante-quanto-tempo')).not.toMatch(/verificação de identidade[^.]*apagados com a conta/i)
  })
})

describe('Política de privacidade — página', () => {
  it('mostra o título, a data e todas as secções', () => {
    mostrar()

    expect(screen.getByRole('heading', { level: 1, name: 'Política de privacidade' })).toBeTruthy()
    expect(screen.getByText(`Última atualização: ${PRIVACIDADE_ACTUALIZADA_EM}`)).toBeTruthy()
    for (const seccao of POLITICA_DE_PRIVACIDADE) {
      expect(screen.getByRole('heading', { level: 2, name: seccao.titulo })).toBeTruthy()
    }
  })

  it('liga aos termos e a si própria no fim', () => {
    mostrar()
    const documentos = screen.getByRole('navigation', { name: 'Documentos legais' })

    expect(within(documentos).getByRole('link', { name: 'Termos de utilização' }).getAttribute('href')).toBe('/termos')
    expect(within(documentos).getByRole('link', { name: 'Política de privacidade' }).getAttribute('href')).toBe('/privacidade')
  })
})
