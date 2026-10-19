import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { SeccaoComSeparadores } from './Separadores'
import { useSeparadorDoEndereco } from './useSeparadorDoEndereco'

afterEach(cleanup)

const IDS = ['um', 'dois', 'tres'] as const

function Endereco() {
  const { search } = useLocation()
  return <p data-testid="endereco">{search}</p>
}

function Seccao() {
  const [activo, mudar] = useSeparadorDoEndereco(IDS)
  return (
    <SeccaoComSeparadores
      rotulo="Exemplo"
      separadores={[
        { id: 'um', rotulo: 'Um' },
        { id: 'dois', rotulo: 'Dois', selo: 3 },
        { id: 'tres', rotulo: 'Três' },
      ]}
      activo={activo}
      aoMudar={mudar}
    >
      <p>Conteúdo de {activo}</p>
    </SeccaoComSeparadores>
  )
}

function mostrar(inicial = '/admin/x') {
  render(
    <MemoryRouter initialEntries={[inicial]}>
      <Seccao />
      <Endereco />
    </MemoryRouter>,
  )
}

describe('Separadores', () => {
  it('sem `tab` no endereço abre o primeiro, e só ele está na ordem do Tab', () => {
    mostrar()
    const um = screen.getByRole('tab', { name: 'Um' })
    expect(um.getAttribute('aria-selected')).toBe('true')
    expect(um.tabIndex).toBe(0)
    expect(screen.getByRole('tab', { name: /dois/i }).tabIndex).toBe(-1)
    expect(screen.getByText('Conteúdo de um')).toBeTruthy()
  })

  it('abre o separador do endereço; um valor desconhecido cai no primeiro', () => {
    mostrar('/admin/x?tab=tres')
    expect(screen.getByText('Conteúdo de tres')).toBeTruthy()
    cleanup()

    mostrar('/admin/x?tab=inexistente')
    expect(screen.getByText('Conteúdo de um')).toBeTruthy()
  })

  it('carregar num separador escreve-o no endereço e larga os outros parâmetros', () => {
    mostrar('/admin/x?tab=um&user_id=abc')
    fireEvent.click(screen.getByRole('tab', { name: /dois/i }))
    expect(screen.getByTestId('endereco').textContent).toBe('?tab=dois')
    expect(screen.getByText('Conteúdo de dois')).toBeTruthy()
  })

  it('as setas andam entre separadores e dão a volta; Home e End vão aos extremos', () => {
    mostrar()
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Um' }), { key: 'ArrowLeft' })
    expect(screen.getByText('Conteúdo de tres')).toBeTruthy()

    fireEvent.keyDown(screen.getByRole('tab', { name: 'Três' }), { key: 'ArrowRight' })
    expect(screen.getByText('Conteúdo de um')).toBeTruthy()

    fireEvent.keyDown(screen.getByRole('tab', { name: 'Um' }), { key: 'End' })
    expect(screen.getByText('Conteúdo de tres')).toBeTruthy()

    fireEvent.keyDown(screen.getByRole('tab', { name: 'Três' }), { key: 'Home' })
    expect(screen.getByText('Conteúdo de um')).toBeTruthy()
  })

  it('mostra o selo ao lado do rótulo', () => {
    mostrar()
    expect(screen.getByRole('tab', { name: /dois/i }).textContent).toContain('3')
  })
})
