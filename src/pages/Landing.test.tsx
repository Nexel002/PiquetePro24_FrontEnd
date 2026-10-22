import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CATEGORIAS, PERGUNTAS } from '../components/landing/dados'
import { Landing } from './Landing'

// A montra de trabalhos tem os seus próprios testes (useHomeFeed.test.ts, e2e/home.spec.ts).
vi.mock('../components/landing/DestaquesDaLanding', () => ({ DestaquesDaLanding: () => null }))

afterEach(cleanup)

const mostrar = () =>
  render(
    <MemoryRouter>
      <Landing />
    </MemoryRouter>,
  )

describe('Landing', () => {
  it('tem um único título principal e o convite a pedir um profissional', () => {
    mostrar()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('link', { name: /Pedir um profissional/ }).getAttribute('href')).toBe('/profissionais')
  })

  it('«Criar conta» e «Sou profissional» levam ao registo; «Entrar» ao login', () => {
    mostrar()
    expect(screen.getAllByRole('link', { name: 'Criar conta' })[0].getAttribute('href')).toBe('/entrar?modo=criar-conta')
    expect(screen.getByRole('link', { name: 'Sou profissional' }).getAttribute('href')).toBe('/entrar?modo=criar-conta')
    expect(screen.getAllByRole('link', { name: 'Entrar' })[0].getAttribute('href')).toBe('/entrar')
  })

  it('cada categoria da faixa leva à pesquisa dessa categoria, sem a cópia da faixa no teclado', () => {
    mostrar()
    const primeira = CATEGORIAS[0]
    const ligacoes = Array.from(document.querySelectorAll(`#servicos a[href="/profissionais?category=${primeira.slug}"]`))
    expect(ligacoes).toHaveLength(2)
    // A cópia (que fecha o loop da animação) está fora da ordem de tabulação.
    expect(ligacoes.filter((l) => l.getAttribute('tabindex') === '-1')).toHaveLength(1)
  })

  it('mostra todas as perguntas frequentes, fechadas até alguém abrir', () => {
    mostrar()
    for (const { pergunta } of PERGUNTAS) expect(screen.getByText(pergunta)).toBeTruthy()
    expect(document.querySelectorAll('details[open]')).toHaveLength(0)
  })

  it('leva aos Termos e à Política de privacidade', () => {
    mostrar()
    expect(screen.getByRole('link', { name: 'Termos de utilização' }).getAttribute('href')).toBe('/termos')
    expect(screen.getByRole('link', { name: 'Política de privacidade' }).getAttribute('href')).toBe('/privacidade')
  })
})
