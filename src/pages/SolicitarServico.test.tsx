import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { DirectRequestResult } from '../services/directRequest'
import { SolicitarServico } from './SolicitarServico'

const estado = vi.hoisted(() => ({
  catalogo: { data: undefined as unknown, isLoading: false, isError: false },
  perfil: { data: undefined as unknown, isLoading: false, isError: false, refetch: vi.fn() },
  criar: vi.fn(),
  erro: vi.fn(),
}))
vi.mock('../hooks/useCatalog', () => ({ useProfessionalCatalog: () => estado.catalogo }))
vi.mock('../hooks/useProfile', () => ({ useProfile: () => estado.perfil }))
vi.mock('../hooks/useDirectRequest', () => ({ useCreateDirectRequest: () => ({ mutate: estado.criar, isPending: false }) }))
vi.mock('sonner', () => ({ toast: { error: estado.erro, success: vi.fn() } }))

const CANALIZACAO = { id: 'cat-1', slug: 'canalizacao', name: 'Canalização' }
const ELETRICIDADE = { id: 'cat-2', slug: 'eletricidade', name: 'Eletricidade' }

function catalogo(services = [CANALIZACAO]) {
  return { id: 'pro-1', full_name: 'Paulo Canalizador', services }
}

const PERFIL = { id: 'cli-1', province: 'Maputo', district: 'KaMpfumo', neighborhood: 'Polana', latitude: null, longitude: null }

const RESULTADO: DirectRequestResult = {
  request: { id: 'p1', title: 'Torneira a pingar' } as DirectRequestResult['request'],
  professional: { id: 'pro-1', full_name: 'Paulo Canalizador', phone: '258841111111' },
}

afterEach(() => {
  cleanup()
  estado.criar.mockReset()
  estado.erro.mockReset()
})

function mostrar(opcoes: { catalogo?: Partial<typeof estado.catalogo>; perfil?: Partial<typeof estado.perfil> } = {}) {
  estado.catalogo = { data: catalogo(), isLoading: false, isError: false, ...opcoes.catalogo }
  estado.perfil = { data: PERFIL, isLoading: false, isError: false, refetch: vi.fn(), ...opcoes.perfil }
  render(
    <MemoryRouter initialEntries={['/solicitar/pro-1']}>
      <Routes>
        <Route path="/solicitar/:id" element={<SolicitarServico />} />
      </Routes>
    </MemoryRouter>,
  )
}

function preencher(titulo = 'Torneira a pingar') {
  fireEvent.change(screen.getByLabelText('O que precisas?'), { target: { value: titulo } })
}

describe('SolicitarServico — carregar', () => {
  it('distingue a carregar e erro', () => {
    mostrar({ catalogo: { data: undefined, isLoading: true } })
    expect(screen.getByRole('status', { name: /a carregar/i })).toBeTruthy()
    cleanup()

    mostrar({ catalogo: { data: undefined, isError: true } })
    expect(screen.getByRole('alert').textContent).toMatch(/não foi possível carregar este profissional/i)
  })
})

describe('SolicitarServico — formulário', () => {
  it('avisa que o contacto só aparece depois de enviar, e mostra o local do perfil', () => {
    mostrar()
    expect(screen.getByText(/o contacto de paulo canalizador aparece para poderes ligar/i)).toBeTruthy()
    expect(screen.getByText(/polana, kampfumo, maputo/i)).toBeTruthy()
    // O número nunca está no formulário, antes de enviar.
    expect(document.body.textContent).not.toMatch(/\+?258\d{9}/)
  })

  it('com um só serviço não pergunta qual; envia o profissional, o serviço e o local', () => {
    mostrar()
    expect(screen.queryByLabelText('Serviço')).toBeNull()
    preencher(' Torneira a pingar ')
    fireEvent.click(screen.getByRole('button', { name: 'Enviar pedido e ver o contacto' }))

    expect(estado.criar.mock.calls[0][0]).toEqual({
      professional_id: 'pro-1',
      category_id: 'cat-1',
      title: 'Torneira a pingar',
      description: undefined,
      location: { province: 'Maputo', district: 'KaMpfumo', neighborhood: 'Polana' },
    })
  })

  it('com vários serviços obriga a escolher um antes de enviar', () => {
    mostrar({ catalogo: { data: catalogo([CANALIZACAO, ELETRICIDADE]) } })
    preencher()
    const enviar = screen.getByRole('button', { name: 'Enviar pedido e ver o contacto' }) as HTMLButtonElement
    expect(enviar.disabled).toBe(true)

    fireEvent.change(screen.getByLabelText('Serviço'), { target: { value: 'cat-2' } })
    expect(enviar.disabled).toBe(false)
    fireEvent.click(enviar)
    expect(estado.criar.mock.calls[0][0].category_id).toBe('cat-2')
  })

  it('sem título não deixa enviar', () => {
    mostrar()
    expect((screen.getByRole('button', { name: 'Enviar pedido e ver o contacto' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('sem localização no perfil explica e não deixa enviar', () => {
    mostrar({ perfil: { data: { ...PERFIL, province: null } } })
    preencher()

    expect(screen.getByText(/ainda não tens uma localização no perfil/i)).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Enviar pedido e ver o contacto' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('um profissional sem serviços indicados não pode receber pedidos', () => {
    mostrar({ catalogo: { data: catalogo([]) } })
    preencher()

    expect(screen.getByRole('alert').textContent).toMatch(/ainda não indicou os serviços/i)
    expect((screen.getByRole('button', { name: 'Enviar pedido e ver o contacto' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('o erro do servidor (ex. já há um pedido em curso) aparece e o formulário fica', () => {
    estado.criar.mockImplementation((_in, opcoes) => opcoes.onError(new Error('Já tens um pedido em curso com este profissional.')))
    mostrar()
    preencher()
    fireEvent.click(screen.getByRole('button', { name: 'Enviar pedido e ver o contacto' }))

    expect(estado.erro).toHaveBeenCalledWith('Já tens um pedido em curso com este profissional.')
    expect(screen.getByLabelText('O que precisas?')).toBeTruthy()
  })
})

describe('SolicitarServico — depois de enviar', () => {
  it('só então mostra o telefone, pronto a ligar, e o que fazer a seguir', () => {
    estado.criar.mockImplementation((_in, opcoes) => opcoes.onSuccess(RESULTADO))
    mostrar()
    preencher()
    fireEvent.click(screen.getByRole('button', { name: 'Enviar pedido e ver o contacto' }))

    expect(screen.getByRole('heading', { name: 'Pedido enviado' })).toBeTruthy()
    expect(screen.getByRole('link', { name: /ligar: \+258841111111/i }).getAttribute('href')).toBe('tel:+258841111111')
    expect(screen.getByText(/dares como concluído e o avaliares/i)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Ver os meus pedidos' }).getAttribute('href')).toBe('/os-meus-pedidos')
  })

  it('um profissional sem telefone diz que foi avisado por email, sem inventar um número', () => {
    estado.criar.mockImplementation((_in, opcoes) => opcoes.onSuccess({ ...RESULTADO, professional: { ...RESULTADO.professional, phone: null } }))
    mostrar()
    preencher()
    fireEvent.click(screen.getByRole('button', { name: 'Enviar pedido e ver o contacto' }))

    expect(screen.getByText(/ainda não registou um número de telefone/i)).toBeTruthy()
    expect(screen.queryByRole('link', { name: /ligar/i })).toBeNull()
  })
})
