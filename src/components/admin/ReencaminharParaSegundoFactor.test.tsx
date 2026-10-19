import { act, cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { avisarQueFaltaSegundoFactor } from '../../lib/segundoFactorExigido'
import { ReencaminharParaSegundoFactor } from './ReencaminharParaSegundoFactor'

afterEach(cleanup)

function Local() {
  const { pathname, search, state } = useLocation()
  return <p data-testid="local">{`${pathname}${search}|${(state as { segundoFactorExigido?: boolean } | null)?.segundoFactorExigido ?? ''}`}</p>
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
  it('leva o admin de qualquer ecrã de admin para o separador Segurança, a dizer porquê', () => {
    mostrar('/admin/utilizadores')
    expect(screen.getByTestId('local').textContent).toBe('/admin/utilizadores|')

    act(() => avisarQueFaltaSegundoFactor())

    expect(screen.getByTestId('local').textContent).toBe('/admin/mais?tab=seguranca|true')
  })

  it('já na Segurança não navega outra vez (não apaga o aviso nem pisca o ecrã)', () => {
    mostrar('/admin/mais?tab=seguranca')

    act(() => avisarQueFaltaSegundoFactor())

    expect(screen.getByTestId('local').textContent).toBe('/admin/mais?tab=seguranca|')
  })

  it('noutro separador de «Mais» ainda leva à Segurança', () => {
    mostrar('/admin/mais?tab=moderacao')

    act(() => avisarQueFaltaSegundoFactor())

    expect(screen.getByTestId('local').textContent).toBe('/admin/mais?tab=seguranca|true')
  })
})
