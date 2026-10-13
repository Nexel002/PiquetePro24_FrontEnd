import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PortfolioProject } from '../../services/portfolio'
import type { ServiceCategory } from '../../services/serviceCategories'
import { ProjectEditor } from './ProjectEditor'

// Os hooks são simulados: o que se testa é o que o editor deixa fazer e o que pede a cada
// acção, não o pedido de rede (o backend impõe os limites; a UI só evita pedidos perdidos).
const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  addPhotos: vi.fn(),
  removePhoto: vi.fn(),
  removeProject: vi.fn(),
  toastErro: vi.fn(),
  toastSucesso: vi.fn(),
}))

vi.mock('../../hooks/useCatalog', () => ({
  useUpdateProject: () => ({ mutate: mocks.update, isPending: false }),
  useAddProjectPhotos: () => ({ mutate: mocks.addPhotos, isPending: false }),
  useRemoveProjectPhoto: () => ({ mutate: mocks.removePhoto, isPending: false }),
  useRemoveProject: () => ({ mutate: mocks.removeProject, isPending: false }),
}))
vi.mock('sonner', () => ({ toast: { error: mocks.toastErro, success: mocks.toastSucesso } }))

const canalizacao: ServiceCategory = { id: 'c1', slug: 'canalizacao', name: 'Canalização' }
const pintura: ServiceCategory = { id: 'c2', slug: 'pintura', name: 'Pintura' }

function trabalho(extra: Partial<PortfolioProject> = {}, nFotos = 2): PortfolioProject {
  return {
    id: 't1',
    category: { id: 'c1', name: 'Canalização' },
    description: 'Casa de banho',
    created_at: '2026-10-01T10:00:00.000Z',
    photos: Array.from({ length: nFotos }, (_, i) => ({ id: `f${i}`, photo_url: `https://x/${i}.webp`, position: i })),
    hidden: false,
    hidden_reason: null,
    ...extra,
  }
}

function mostrar(project: PortfolioProject = trabalho(), services: ServiceCategory[] = [canalizacao, pintura]) {
  render(<ProjectEditor professionalId="p1" project={project} services={services} />)
}

const botaoGuardar = () => screen.getByRole('button', { name: 'Guardar' }) as HTMLButtonElement

beforeEach(() => {
  // jsdom não implementa object URLs.
  URL.createObjectURL = vi.fn(() => 'blob:previa')
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('ProjectEditor', () => {
  it('"Guardar" só activa quando algo mudou', () => {
    mostrar()
    expect(botaoGuardar().disabled).toBe(true)

    fireEvent.change(screen.getByLabelText('Descrição do trabalho'), { target: { value: 'Casa de banho nova' } })

    expect(botaoGuardar().disabled).toBe(false)
  })

  it('voltar ao texto original desactiva outra vez o "Guardar"', () => {
    mostrar()
    const descricao = screen.getByLabelText('Descrição do trabalho')

    fireEvent.change(descricao, { target: { value: 'Outra' } })
    fireEvent.change(descricao, { target: { value: 'Casa de banho' } })

    expect(botaoGuardar().disabled).toBe(true)
  })

  it('guardar manda só o que mudeu: o serviço novo, sem repetir a descrição', () => {
    mostrar()

    fireEvent.click(screen.getByRole('button', { name: 'Pintura' }))
    fireEvent.click(botaoGuardar())

    expect(mocks.update.mock.calls[0][0]).toEqual({ projectId: 't1', categoryId: 'c2', description: undefined })
  })

  it('apagar a descrição manda null (e não string vazia)', () => {
    mostrar()

    fireEvent.change(screen.getByLabelText('Descrição do trabalho'), { target: { value: '   ' } })
    fireEvent.click(botaoGuardar())

    expect(mocks.update.mock.calls[0][0]).toEqual({ projectId: 't1', categoryId: undefined, description: null })
  })

  it('numa só foto, o botão de remover fica desactivado (um trabalho nunca fica sem fotos)', () => {
    mostrar(trabalho({}, 1))

    expect((screen.getByRole('button', { name: 'Remover foto 1' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('remover uma foto pede ao hook o trabalho e a foto certos', () => {
    mostrar()

    fireEvent.click(screen.getByRole('button', { name: 'Remover foto 2' }))

    expect(mocks.removePhoto.mock.calls[0][0]).toEqual({ projectId: 't1', photoId: 'f1' })
  })

  it('apagar o trabalho pede confirmação antes de enviar', () => {
    mostrar()

    fireEvent.click(screen.getByRole('button', { name: 'Apagar trabalho' }))
    expect(mocks.removeProject).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Apagar' }))
    expect(mocks.removeProject.mock.calls[0][0]).toBe('t1')
  })

  it('"Não" desiste de apagar e volta ao botão inicial', () => {
    mostrar()

    fireEvent.click(screen.getByRole('button', { name: 'Apagar trabalho' }))
    fireEvent.click(screen.getByRole('button', { name: 'Não' }))

    expect(screen.getByRole('button', { name: 'Apagar trabalho' })).toBeTruthy()
    expect(mocks.removeProject).not.toHaveBeenCalled()
  })

  it('se apagar falhar, volta ao botão inicial e mostra o erro', () => {
    mocks.removeProject.mockImplementation((_id, opcoes) => opcoes.onError(new Error('Sem ligação.')))
    mostrar()

    fireEvent.click(screen.getByRole('button', { name: 'Apagar trabalho' }))
    fireEvent.click(screen.getByRole('button', { name: 'Apagar' }))

    expect(mocks.toastErro).toHaveBeenCalledWith('Sem ligação.')
    expect(screen.getByRole('button', { name: 'Apagar trabalho' })).toBeTruthy()
  })

  it('acrescentar fotos para além de 10 é recusado sem pedido', () => {
    mostrar(trabalho({}, 9))
    const entrada = document.querySelector('input[type="file"]') as HTMLInputElement
    const duas = [new File(['x'], 'a.jpg', { type: 'image/jpeg' }), new File(['x'], 'b.jpg', { type: 'image/jpeg' })]

    fireEvent.change(entrada, { target: { files: duas } })

    expect(mocks.toastErro).toHaveBeenCalledWith('Um trabalho tem no máximo 10 fotos.')
    expect(mocks.addPhotos).not.toHaveBeenCalled()
  })

  it('um ficheiro que não é imagem recusa o lote inteiro', () => {
    mostrar()
    const entrada = document.querySelector('input[type="file"]') as HTMLInputElement
    const lote = [new File(['x'], 'a.jpg', { type: 'image/jpeg' }), new File(['x'], 'b.pdf', { type: 'application/pdf' })]

    fireEvent.change(entrada, { target: { files: lote } })

    expect(mocks.toastErro).toHaveBeenCalledWith('O ficheiro tem de ser uma imagem.')
    expect(mocks.addPhotos).not.toHaveBeenCalled()
  })

  it('fotos válidas seguem para o hook com o id do trabalho', () => {
    mostrar()
    const entrada = document.querySelector('input[type="file"]') as HTMLInputElement
    const ficheiro = new File(['x'], 'a.jpg', { type: 'image/jpeg' })

    fireEvent.change(entrada, { target: { files: [ficheiro] } })

    expect(mocks.addPhotos.mock.calls[0][0]).toEqual({ projectId: 't1', files: [ficheiro] })
  })

  it('trabalho antigo sem serviço mostra o aviso para escolher um', () => {
    mostrar(trabalho({ category: null }))

    expect(screen.getByText(/não tem serviço/)).toBeTruthy()
  })

  it('serviço que o profissional já não presta aparece como informação, não como escolha', () => {
    mostrar(trabalho({ category: { id: 'c9', name: 'Serralharia' } }))

    expect(screen.getByText(/Serviço atual: Serralharia/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Serralharia' })).toBeNull()
  })
})
