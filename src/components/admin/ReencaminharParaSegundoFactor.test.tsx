import { act, cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { avisarQueFaltaSegundoFactor } from '../../lib/segundoFactorExigido'
import { ReencaminharParaSegundoFactor } from './ReencaminharParaSegundoFactor'

afterEach(cleanup)

function Local() {
  const { pathname, state } = useLocation()
  return <p data-testid="local">{`${pathname}|${(state as { segundoFactorExigido?: boolean } | null)?.segundoFactorExigido ?? ''}`}</p>
}

function mostrar(inicial: string) {
  render(
    <MemoryRouter initialEntries={[inicial]}>
      <ReencaminharParaSegundoFactor />
      <Routes>
        <Route path="*" element={<Local />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ReencaminharParaSegundoFactor', () => {
  it('leva o admin de qualquer ecrã de admin para a Segurança, a dizer porquê', () => {
    mostrar('/admin/users')
    expect(screen.getByTestId('local').textContent).toBe('/admin/users|')

    act(() => avisarQueFaltaSegundoFactor())

    expect(screen.getByTestId('local').textContent).toBe('/admin/seguranca|true')
  })

  it('já na Segurança não navega outra vez (não apaga o aviso nem pisca o ecrã)', () => {
    mostrar('/admin/seguranca')

    act(() => avisarQueFaltaSegundoFactor())

    expect(screen.getByTestId('local').textContent).toBe('/admin/seguranca|')
  })
})
