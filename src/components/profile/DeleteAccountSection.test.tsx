import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DeleteAccountSection } from './DeleteAccountSection'

const eliminar = vi.hoisted(() => ({
  mutate: vi.fn(),
  reset: vi.fn(),
  isPending: false,
  isError: false,
  opcoes: undefined as { aoApagar?: () => void } | undefined,
}))

// O hook é simulado: o que se testa é o que a pessoa vê e quando se pode confirmar, não o
// pedido de rede (esse está validado no backend).
vi.mock('../../hooks/useProfile', () => ({
  useDeleteAccount: (opcoes?: { aoApagar?: () => void }) => {
    eliminar.opcoes = opcoes
    return eliminar
  },
}))

function mostrar(papel: 'CLIENT' | 'PROFESSIONAL' = 'CLIENT') {
  render(
    <MemoryRouter initialEntries={['/perfil']}>
      <Routes>
        <Route path="/perfil" element={<DeleteAccountSection papel={papel} />} />
        <Route path="/" element={<p>Página inicial</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  eliminar.mutate.mockReset()
  eliminar.reset.mockReset()
  eliminar.isPending = false
  eliminar.isError = false
})

afterEach(cleanup)

describe('DeleteAccountSection', () => {
  it('fecha por omissão: só há a ligação "Eliminar conta", sem nenhum botão destrutivo', () => {
    mostrar()

    expect(screen.getByRole('button', { name: 'Eliminar conta' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Eliminar definitivamente' })).toBeNull()
  })

  it('ao abrir, avisa que é definitivo e o que se perde, conforme o papel', () => {
    mostrar('CLIENT')
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar conta' }))

    expect(screen.getByText(/definitivo e não se pode desfazer/i)).toBeTruthy()
    expect(screen.getByText(/os teus pedidos de serviço/i)).toBeTruthy()
    expect(screen.queryByText(/verificação de identidade/i)).toBeNull()
  })

  it('para um profissional lista o catálogo e avisa que os pedidos em que foi escolhido reabrem', () => {
    mostrar('PROFESSIONAL')
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar conta' }))

    expect(screen.getByText(/verificação de identidade, a subscrição e o catálogo/i)).toBeTruthy()
    expect(screen.getByText(/voltam a ficar abertos para o cliente/i)).toBeTruthy()
  })

  it('só deixa confirmar depois de escrever ELIMINAR (sem importar maiúsculas nem espaços)', () => {
    mostrar()
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar conta' }))
    const confirmar = screen.getByRole('button', { name: 'Eliminar definitivamente' }) as HTMLButtonElement
    const campo = screen.getByLabelText(/escreve ELIMINAR/i)

    expect(confirmar.disabled).toBe(true)

    fireEvent.change(campo, { target: { value: 'elimin' } })
    expect(confirmar.disabled).toBe(true)

    fireEvent.change(campo, { target: { value: '  eliminar ' } })
    expect(confirmar.disabled).toBe(false)
  })

  it('confirmar pede a eliminação uma vez; sem a palavra, submeter não faz nada', () => {
    mostrar()
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar conta' }))
    const campo = screen.getByLabelText(/escreve ELIMINAR/i)

    fireEvent.submit(campo.closest('form')!)
    expect(eliminar.mutate).not.toHaveBeenCalled()

    fireEvent.change(campo, { target: { value: 'ELIMINAR' } })
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar definitivamente' }))

    expect(eliminar.mutate).toHaveBeenCalledTimes(1)
  })

  it('cancelar volta a fechar, apaga o que foi escrito e limpa o erro', () => {
    mostrar()
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar conta' }))
    fireEvent.change(screen.getByLabelText(/escreve ELIMINAR/i), { target: { value: 'ELIMINAR' } })

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByLabelText(/escreve ELIMINAR/i)).toBeNull()
    expect(eliminar.reset).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar conta' }))
    expect((screen.getByLabelText(/escreve ELIMINAR/i) as HTMLInputElement).value).toBe('')
  })

  it('mostra o erro quando a eliminação falha, sem fechar', () => {
    eliminar.isError = true
    mostrar()
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar conta' }))

    expect(screen.getByRole('alert').textContent).toMatch(/não foi possível eliminar a conta/i)
  })

  it('durante o pedido não deixa cancelar nem confirmar outra vez', () => {
    eliminar.isPending = true
    mostrar()
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar conta' }))

    expect((screen.getByRole('button', { name: 'Cancelar' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: /eliminar definitivamente/i }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('depois de apagar leva à página inicial (pública), antes de a sessão terminar', () => {
    mostrar()

    eliminar.opcoes?.aoApagar?.()

    return screen.findByText('Página inicial').then((elemento) => expect(elemento).toBeTruthy())
  })
})
