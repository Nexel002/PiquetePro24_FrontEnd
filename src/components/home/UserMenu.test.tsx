import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { UserMenu } from './UserMenu'

afterEach(cleanup)

function mostrar(papel: 'CLIENT' | 'PROFESSIONAL' | 'ADMIN' = 'CLIENT') {
  const aoTerminarSessao = vi.fn()
  render(
    <MemoryRouter>
      <UserMenu nome="Carlos Macamo" primeiroNome="Carlos" papel={papel} aoTerminarSessao={aoTerminarSessao} />
    </MemoryRouter>,
  )
  return { aoTerminarSessao, botao: screen.getByRole('button', { name: /menu da conta de carlos/i }) }
}

describe('UserMenu', () => {
  it('começa fechado e abre ao clicar no avatar', () => {
    const { botao } = mostrar()
    expect(botao.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByText('O meu perfil')).toBeNull()

    fireEvent.click(botao)

    expect(botao.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByText('O meu perfil')).toBeTruthy()
    expect(screen.getByText('Carlos Macamo')).toBeTruthy()
  })

  it.each([
    ['CLIENT', 'Os meus pedidos'],
    ['PROFESSIONAL', 'Pedidos recebidos'],
    ['ADMIN', 'Painel admin'],
  ] as const)('mostra a ligação própria do papel %s', (papel, rotulo) => {
    const { botao } = mostrar(papel)
    fireEvent.click(botao)

    expect(screen.getByRole('link', { name: rotulo })).toBeTruthy()
  })

  it('fecha com Escape e devolve o foco ao avatar', () => {
    const { botao } = mostrar()
    fireEvent.click(botao)

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.queryByText('O meu perfil')).toBeNull()
    expect(document.activeElement).toBe(botao)
  })

  it('fecha ao clicar fora, mas não ao clicar dentro do painel', () => {
    const { botao } = mostrar()
    fireEvent.click(botao)

    fireEvent.pointerDown(screen.getByText('Carlos Macamo'))
    expect(screen.getByText('O meu perfil')).toBeTruthy()

    fireEvent.pointerDown(document.body)
    expect(screen.queryByText('O meu perfil')).toBeNull()
  })

  it('"Sair" termina a sessão e fecha o menu', () => {
    const { botao, aoTerminarSessao } = mostrar()
    fireEvent.click(botao)

    fireEvent.click(screen.getByRole('button', { name: 'Sair' }))

    expect(aoTerminarSessao).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('O meu perfil')).toBeNull()
  })
})
