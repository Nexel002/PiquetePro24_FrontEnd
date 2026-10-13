import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { HomeShortcuts } from './HomeShortcuts'

afterEach(cleanup)

function mostrar(props: React.ComponentProps<typeof HomeShortcuts>) {
  render(
    <MemoryRouter>
      <HomeShortcuts {...props} />
    </MemoryRouter>,
  )
}

describe('HomeShortcuts', () => {
  it('uma empresa tem o atalho «A minha equipa»', () => {
    mostrar({ papel: 'PROFESSIONAL', tipoProfissional: 'COMPANY' })
    expect(screen.getByRole('link', { name: /a minha equipa/i }).getAttribute('href')).toBe('/equipa')
  })

  it('um profissional singular não tem equipa', () => {
    mostrar({ papel: 'PROFESSIONAL', tipoProfissional: 'SINGULAR' })
    expect(screen.queryByRole('link', { name: /a minha equipa/i })).toBeNull()
  })

  it('um cliente, mesmo com um tipo de profissional qualquer, não tem equipa', () => {
    mostrar({ papel: 'CLIENT', tipoProfissional: 'COMPANY' })
    expect(screen.queryByRole('link', { name: /a minha equipa/i })).toBeNull()
  })

  it('o técnico vê os seus trabalhos e a verificação de identidade', () => {
    mostrar({ papel: 'TECHNICIAN' })
    expect(screen.getByRole('link', { name: /os meus trabalhos/i }).getAttribute('href')).toBe('/tecnico/trabalhos')
    expect(screen.getByRole('link', { name: /verificação de identidade/i }).getAttribute('href')).toBe('/verificacao-identidade')
  })
})
