import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { FicheiroExportado, Funil } from '../services/adminReports'
import { AdminReports } from './AdminReports'

type FonteFunil = { data: Funil | undefined; isLoading: boolean; isError: boolean }

const estado = vi.hoisted(() => ({
  funil: {} as FonteFunil,
  filtrosDoFunil: [] as unknown[],
  exportar: vi.fn(),
  guardar: vi.fn(),
  erro: vi.fn(),
  sucesso: vi.fn(),
}))
vi.mock('../hooks/useAdminReports', () => ({
  useFunil: (filtros: unknown) => {
    estado.filtrosDoFunil.push(filtros)
    return estado.funil
  },
  useExportar: () => ({ mutate: estado.exportar, isPending: false }),
}))
vi.mock('../services/adminReports', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/adminReports')>()),
  guardarFicheiro: estado.guardar,
}))
vi.mock('sonner', () => ({ toast: { error: estado.erro, success: estado.sucesso } }))

const FUNIL: Funil = {
  profissionais_registados: 40,
  kyc_submetido: 30,
  kyc_aprovado: 20,
  com_pagamento_confirmado: 10,
  com_trabalho_concluido: 4,
}

afterEach(() => {
  cleanup()
  estado.filtrosDoFunil = []
  Object.values(estado).forEach((v) => typeof v === 'function' && 'mockReset' in v && v.mockReset())
})

function mostrar(funil: FonteFunil = { data: FUNIL, isLoading: false, isError: false }) {
  estado.funil = funil
  render(
    <MemoryRouter>
      <AdminReports />
    </MemoryRouter>,
  )
}

const ficheiro = (extra: Partial<FicheiroExportado> = {}): FicheiroExportado => ({
  conteudo: new Blob(['x']),
  nome: 'utilizadores.csv',
  linhas: 12,
  truncada: false,
  ...extra,
})

describe('AdminReports — funil', () => {
  it('mostra cada etapa com o número e a percentagem dos registados', () => {
    mostrar()
    expect(screen.getByText('Profissionais registados')).toBeTruthy()
    expect(screen.getByText('(75%)')).toBeTruthy() // 30 de 40
    expect(screen.getByText('(10%)')).toBeTruthy() // 4 de 40
  })

  it('distingue a carregar, erro e vazio', () => {
    mostrar({ data: undefined, isLoading: true, isError: false })
    expect(screen.getByRole('status', { name: /a carregar/i })).toBeTruthy()
    cleanup()

    mostrar({ data: undefined, isLoading: false, isError: true })
    expect(screen.getByText(/não foi possível carregar o funil/i)).toBeTruthy()
    cleanup()

    mostrar({ data: { ...FUNIL, profissionais_registados: 0 }, isLoading: false, isError: false })
    expect(screen.getByText('Ainda não há profissionais registados neste período.')).toBeTruthy()
  })

  it('as datas escolhidas seguem como início e fim do dia em Maputo', () => {
    mostrar()
    fireEvent.change(screen.getByLabelText('De'), { target: { value: '2026-10-01' } })
    fireEvent.change(screen.getByLabelText('Até'), { target: { value: '2026-10-07' } })

    const ultimo = estado.filtrosDoFunil.at(-1)
    expect(ultimo).toEqual({ from: '2026-10-01T00:00:00+02:00', to: '2026-10-07T23:59:59+02:00' })
  })
})

describe('AdminReports — exportar', () => {
  it('exporta, entrega o ficheiro ao browser e confirma o número de linhas', () => {
    estado.exportar.mockImplementation((_in, opcoes) => {
      opcoes.onSuccess(ficheiro())
      opcoes.onSettled()
    })
    mostrar()
    fireEvent.click(screen.getByRole('button', { name: 'Exportar Utilizadores' }))

    expect(estado.exportar.mock.calls[0][0]).toMatchObject({ tipo: 'users' })
    expect(estado.guardar).toHaveBeenCalledTimes(1)
    expect(estado.sucesso).toHaveBeenCalledWith('12 linhas exportadas.')
  })

  it('avisa quando o ficheiro foi cortado no tecto', () => {
    estado.exportar.mockImplementation((_in, opcoes) => opcoes.onSuccess(ficheiro({ linhas: 5000, truncada: true })))
    mostrar()
    fireEvent.click(screen.getByRole('button', { name: 'Exportar Pedidos de serviço' }))

    expect(estado.guardar).toHaveBeenCalledTimes(1)
    expect(estado.erro.mock.calls[0][0]).toContain('cortado nas primeiras 5000 linhas')
  })

  it('sem dados no período não descarrega um ficheiro vazio', () => {
    estado.exportar.mockImplementation((_in, opcoes) => opcoes.onSuccess(ficheiro({ linhas: 0 })))
    mostrar()
    fireEvent.click(screen.getByRole('button', { name: 'Exportar Pagamentos' }))

    expect(estado.guardar).not.toHaveBeenCalled()
    expect(estado.erro).toHaveBeenCalledWith('Não há dados neste período.')
  })

  it('mostra o erro do servidor', () => {
    estado.exportar.mockImplementation((_in, opcoes) => opcoes.onError(new Error('Filtros inválidos.')))
    mostrar()
    fireEvent.click(screen.getByRole('button', { name: 'Exportar Utilizadores' }))

    expect(estado.erro).toHaveBeenCalledWith('Filtros inválidos.')
  })
})
