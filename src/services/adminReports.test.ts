import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('../lib/api', () => ({ api: { get: mocks.get } }))

import { exportar, fimDoDia, guardarFicheiro, inicioDoDia } from './adminReports'

beforeEach(() => mocks.get.mockReset())

describe('inicioDoDia / fimDoDia', () => {
  it('usam a hora de Maputo (UTC+2), não a UTC', () => {
    expect(inicioDoDia('2026-10-01')).toBe('2026-10-01T00:00:00+02:00')
    expect(fimDoDia('2026-10-01')).toBe('2026-10-01T23:59:59+02:00')
  })

  it('campo vazio não filtra', () => {
    expect(inicioDoDia('')).toBeUndefined()
    expect(fimDoDia('')).toBeUndefined()
  })
})

describe('exportar', () => {
  it('pede o ficheiro como blob e lê nome, linhas e truncagem dos cabeçalhos', async () => {
    const blob = new Blob(['x'])
    mocks.get.mockResolvedValue({
      data: blob,
      headers: { 'content-disposition': 'attachment; filename="pedidos-2026-10-13.csv"', 'x-linhas': '5000', 'x-truncada': 'true' },
    })

    const ficheiro = await exportar('service-requests', { status: 'OPEN' })

    expect(mocks.get).toHaveBeenCalledWith('/admin/exports/service-requests', { params: { status: 'OPEN' }, responseType: 'blob' })
    expect(ficheiro).toEqual({ conteudo: blob, nome: 'pedidos-2026-10-13.csv', linhas: 5000, truncada: true })
  })

  it('sem cabeçalhos úteis, cai num nome por omissão e não declara truncagem', async () => {
    mocks.get.mockResolvedValue({ data: new Blob(['x']), headers: {} })
    const ficheiro = await exportar('users', {})

    expect(ficheiro).toMatchObject({ nome: 'users.csv', linhas: 0, truncada: false })
  })
})

describe('guardarFicheiro', () => {
  it('cria a ligação de descarga com o nome certo e liberta o URL', () => {
    const criar = vi.fn(() => 'blob:fake')
    const libertar = vi.fn()
    Object.assign(URL, { createObjectURL: criar, revokeObjectURL: libertar })
    const clicar = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    guardarFicheiro({ conteudo: new Blob(['x']), nome: 'utilizadores-2026-10-13.csv', linhas: 1, truncada: false })

    expect(criar).toHaveBeenCalledTimes(1)
    expect(clicar).toHaveBeenCalledTimes(1)
    expect(libertar).toHaveBeenCalledWith('blob:fake')
    expect(document.querySelector('a[download]')).toBeNull() // a ligação temporária não fica no DOM
    clicar.mockRestore()
  })
})
