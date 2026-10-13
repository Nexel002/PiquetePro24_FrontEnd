import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RotaDeEmpresa, RotaDeTecnico } from './RotaDeEmpresa'

const perfil = vi.hoisted(() => ({ data: undefined as { role: string; professional_type: string | null } | undefined, isLoading: false }))
vi.mock('../../hooks/useProfile', () => ({ useProfile: () => perfil }))

function mostrar(guarda: 'empresa' | 'tecnico') {
  const Guarda = guarda === 'empresa' ? RotaDeEmpresa : RotaDeTecnico
  render(
    <MemoryRouter initialEntries={['/ecra']}>
      <Routes>
        <Route path="/" element={<p>Home</p>} />
        <Route
          path="/ecra"
          element={
            <Guarda>
              <p>Ecrã protegido</p>
            </Guarda>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

afterEach(() => {
  cleanup()
  perfil.isLoading = false
})

describe('RotaDeEmpresa', () => {
  it('deixa passar uma empresa', () => {
    perfil.data = { role: 'PROFESSIONAL', professional_type: 'COMPANY' }
    mostrar('empresa')
    expect(screen.getByText('Ecrã protegido')).toBeTruthy()
  })

  it.each([
    ['singular', { role: 'PROFESSIONAL', professional_type: 'SINGULAR' }],
    ['cliente', { role: 'CLIENT', professional_type: null }],
    ['técnico', { role: 'TECHNICIAN', professional_type: null }],
    ['admin', { role: 'ADMIN', professional_type: null }],
  ])('manda %s para a Home', (_nome, p) => {
    perfil.data = p
    mostrar('empresa')
    expect(screen.getByText('Home')).toBeTruthy()
    expect(screen.queryByText('Ecrã protegido')).toBeNull()
  })

  it('não decide enquanto o perfil carrega', () => {
    perfil.data = undefined
    perfil.isLoading = true
    mostrar('empresa')
    expect(screen.queryByText('Home')).toBeNull()
    expect(screen.queryByText('Ecrã protegido')).toBeNull()
  })
})

describe('RotaDeTecnico', () => {
  it('deixa passar um técnico', () => {
    perfil.data = { role: 'TECHNICIAN', professional_type: null }
    mostrar('tecnico')
    expect(screen.getByText('Ecrã protegido')).toBeTruthy()
  })

  it.each([
    ['empresa', { role: 'PROFESSIONAL', professional_type: 'COMPANY' }],
    ['cliente', { role: 'CLIENT', professional_type: null }],
  ])('manda %s para a Home', (_nome, p) => {
    perfil.data = p
    mostrar('tecnico')
    expect(screen.getByText('Home')).toBeTruthy()
  })
})
