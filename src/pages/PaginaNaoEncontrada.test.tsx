import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { PaginaNaoEncontrada } from './PaginaNaoEncontrada'

afterEach(cleanup)

function mostrar(caminho: string) {
  return render(
    <MemoryRouter initialEntries={[caminho]}>
      <PaginaNaoEncontrada />
    </MemoryRouter>,
  )
}

describe('PaginaNaoEncontrada', () => {
  it('diz que o endereço não existe e mostra qual foi', () => {
    mostrar('/rota-que-nao-existe')

    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Perdeste-te no espaço')
    expect(screen.getByText('/rota-que-nao-existe')).toBeTruthy()
    expect(screen.getByText('Erro 404')).toBeTruthy()
  })

  it('oferece sempre a saída para o início', () => {
    mostrar('/xpto')

    const ligacao = screen.getByRole('link', { name: /Voltar ao início/ })
    expect(ligacao.getAttribute('href')).toBe('/')
  })

  it('sem página anterior no histórico, não oferece «Voltar atrás»', () => {
    mostrar('/xpto')

    expect(screen.queryByRole('button', { name: /Voltar atrás/ })).toBeNull()
  })

  it('corta um endereço enorme em vez de rebentar o layout', () => {
    mostrar(`/${'a'.repeat(300)}`)

    const mostrado = screen.getByText(/^\/a+…$/)
    expect(mostrado.textContent!.length).toBeLessThan(70)
  })
})
