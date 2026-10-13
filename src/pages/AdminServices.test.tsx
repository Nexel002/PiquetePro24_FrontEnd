import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { palavrasChaveDe, type AdminCategory } from '../services/adminCategories'
import { AdminServices } from './AdminServices'

type Fonte = { data: AdminCategory[] | undefined; isLoading: boolean; isError: boolean }

const estado = vi.hoisted(() => ({
  fonte: {} as Fonte,
  criar: vi.fn(),
  atualizar: vi.fn(),
  apagar: vi.fn(),
  erro: vi.fn(),
}))
vi.mock('../hooks/useAdminCategories', () => ({
  useAdminCategories: () => estado.fonte,
  useCreateAdminCategory: () => ({ mutate: estado.criar, isPending: false }),
  useUpdateAdminCategory: () => ({ mutate: estado.atualizar, isPending: false }),
  useDeleteAdminCategory: () => ({ mutate: estado.apagar, isPending: false }),
}))
vi.mock('sonner', () => ({ toast: { error: estado.erro, success: vi.fn() } }))

const CANALIZACAO: AdminCategory = { id: 'c1', slug: 'canalizacao', name: 'Canalização', keywords: ['canalizador'], professional_count: 2 }
const NOVO: AdminCategory = { id: 'c2', slug: 'ar-condicionado-novo', name: 'Serviço Novo', keywords: [], professional_count: 0 }

afterEach(() => {
  cleanup()
  Object.values(estado).forEach((v) => typeof v === 'function' && 'mockReset' in v && v.mockReset())
})

function mostrar(servicos: AdminCategory[]) {
  estado.fonte = { data: servicos, isLoading: false, isError: false }
  render(
    <MemoryRouter>
      <AdminServices />
    </MemoryRouter>,
  )
}

describe('palavrasChaveDe', () => {
  it('separa por vírgulas e ignora vazias', () => {
    expect(palavrasChaveDe(' canalizador, , encanador ,')).toEqual(['canalizador', 'encanador'])
    expect(palavrasChaveDe('')).toEqual([])
  })
})

describe('AdminServices', () => {
  it('distingue a carregar, erro e vazio', () => {
    estado.fonte = { data: undefined, isLoading: true, isError: false }
    render(
      <MemoryRouter>
        <AdminServices />
      </MemoryRouter>,
    )
    expect(screen.getByRole('status', { name: /a carregar/i })).toBeTruthy()
    cleanup()

    estado.fonte = { data: undefined, isLoading: false, isError: true }
    render(
      <MemoryRouter>
        <AdminServices />
      </MemoryRouter>,
    )
    expect(screen.getByText(/não foi possível carregar os serviços/i)).toBeTruthy()
    cleanup()

    mostrar([])
    expect(screen.getByText('Ainda não há serviços.')).toBeTruthy()
  })

  it('mostra quantos profissionais usam o serviço e avisa quando não tem ícone', () => {
    mostrar([CANALIZACAO, NOVO])

    expect(screen.getByText(/2 profissionais/)).toBeTruthy()
    // «canalizacao» tem ícone; o serviço novo não.
    expect(screen.getAllByText('Sem ícone')).toHaveLength(1)
    expect(screen.getByText(/acrescenta «ar-condicionado-novo»/i)).toBeTruthy()
  })

  it('um serviço em uso não se pode apagar a partir do ecrã', () => {
    mostrar([CANALIZACAO, NOVO])
    const botoes = screen.getAllByRole('button', { name: 'Apagar' }) as HTMLButtonElement[]
    expect(botoes[0].disabled).toBe(true)
    expect(botoes[1].disabled).toBe(false)
  })

  it('apagar pede confirmação antes de chamar o backend', () => {
    mostrar([NOVO])
    fireEvent.click(screen.getByRole('button', { name: 'Apagar' }))
    expect(estado.apagar).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Sim, apagar' }))
    expect(estado.apagar.mock.calls[0][0]).toBe('c2')
  })

  it('criar envia o nome e as palavras separadas; nome curto é recusado', () => {
    mostrar([])
    fireEvent.click(screen.getByRole('button', { name: 'Novo serviço' }))

    fireEvent.change(screen.getByLabelText(/nome do serviço/i), { target: { value: 'A' } })
    fireEvent.click(screen.getByRole('button', { name: 'Criar serviço' }))
    expect(estado.criar).not.toHaveBeenCalled()
    expect(estado.erro).toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText(/nome do serviço/i), { target: { value: ' Ar Condicionado ' } })
    fireEvent.change(screen.getByLabelText(/palavras de pesquisa/i), { target: { value: 'frio, AC' } })
    fireEvent.click(screen.getByRole('button', { name: 'Criar serviço' }))

    expect(estado.criar.mock.calls[0][0]).toEqual({ name: 'Ar Condicionado', keywords: ['frio', 'AC'] })
  })

  it('editar envia só o que o formulário tem', () => {
    mostrar([CANALIZACAO])
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
    fireEvent.change(screen.getByLabelText(/nome do serviço/i), { target: { value: 'Canalização e Esgotos' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar alterações' }))

    expect(estado.atualizar.mock.calls[0][0]).toEqual({
      id: 'c1',
      changes: { name: 'Canalização e Esgotos', keywords: ['canalizador'] },
    })
  })
})
