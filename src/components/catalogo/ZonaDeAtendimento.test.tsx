import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ZonaDeAtendimento } from './ZonaDeAtendimento'
import { descreverZona } from './zona'

// Fase 38 (TRD Adendo v1.66, N1). O hook é simulado: o que se testa é o que o editor deixa
// escolher e o que manda gravar.
const mocks = vi.hoisted(() => ({ mutate: vi.fn(), toastErro: vi.fn(), toastSucesso: vi.fn() }))

vi.mock('../../hooks/useCatalog', () => ({ useUpdateServiceArea: () => ({ mutate: mocks.mutate, isPending: false }) }))
vi.mock('sonner', () => ({ toast: { error: mocks.toastErro, success: mocks.toastSucesso } }))

beforeEach(() => {
  mocks.mutate.mockReset()
})
afterEach(cleanup)

const botaoGuardar = () => screen.getByRole('button', { name: 'Guardar zona' }) as HTMLButtonElement

describe('ZonaDeAtendimento', () => {
  it('sem mudanças, não deixa guardar; escolher raio e províncias manda-as gravar', () => {
    render(<ZonaDeAtendimento professionalId="p1" guardada={{ radius_km: null, provinces: [] }} temLocalizacao />)
    expect(botaoGuardar().disabled).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: '25 km' }))
    fireEvent.click(screen.getByRole('button', { name: 'Gaza' }))
    fireEvent.click(botaoGuardar())

    expect(mocks.mutate).toHaveBeenCalledWith({ radius_km: 25, provinces: ['Gaza'] }, expect.anything())
  })

  it('tirar uma província já guardada e escolher «Não definido» também se grava', () => {
    render(<ZonaDeAtendimento professionalId="p1" guardada={{ radius_km: 10, provinces: ['Gaza', 'Maputo'] }} temLocalizacao />)

    expect(screen.getByRole('button', { name: 'Gaza' }).getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: 'Gaza' }))
    fireEvent.click(screen.getByRole('button', { name: 'Não definido' }))
    fireEvent.click(botaoGuardar())

    expect(mocks.mutate).toHaveBeenCalledWith({ radius_km: null, provinces: ['Maputo'] }, expect.anything())
  })

  it('com raio e sem localização no perfil, explica que o raio ainda não conta', () => {
    render(<ZonaDeAtendimento professionalId="p1" guardada={{ radius_km: 25, provinces: [] }} temLocalizacao={false} />)
    expect(screen.getByText(/o raio só conta depois de a definires/)).toBeTruthy()
  })

  it('erro ao gravar: mostra a mensagem do servidor', () => {
    mocks.mutate.mockImplementation((_valores, opcoes: { onError: (e: Error) => void }) => opcoes.onError(new Error('Província desconhecida: X.')))
    render(<ZonaDeAtendimento professionalId="p1" guardada={{ radius_km: null, provinces: [] }} temLocalizacao />)

    fireEvent.click(screen.getByRole('button', { name: '5 km' }))
    fireEvent.click(botaoGuardar())

    expect(mocks.toastErro).toHaveBeenCalledWith('Província desconhecida: X.')
  })
})

describe('descreverZona', () => {
  it('sem zona definida, o catálogo não mostra nada', () => {
    expect(descreverZona({ radius_km: null, provinces: [] })).toBeNull()
    expect(descreverZona(undefined)).toBeNull()
  })

  it('junta o raio e as províncias numa frase', () => {
    expect(descreverZona({ radius_km: 25, provinces: ['Cidade de Maputo', 'Maputo'] })).toBe('Atende: até 25 km · Cidade de Maputo, Maputo')
    expect(descreverZona({ radius_km: null, provinces: ['Gaza'] })).toBe('Atende: Gaza')
  })
})
