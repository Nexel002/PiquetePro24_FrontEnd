import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ServiceCategory } from '../../services/serviceCategories'
import { NewProjectForm } from './NewProjectForm'

// O hook é simulado: o que se testa é o que o formulário deixa enviar e o que passa ao
// hook, não o upload para o Storage (esse está em services/portfolio.test.ts).
const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  isPending: false,
  toastErro: vi.fn(),
  toastSucesso: vi.fn(),
}))

vi.mock('../../hooks/useCatalog', () => ({
  useCreateProject: () => ({ mutate: mocks.mutate, isPending: mocks.isPending }),
}))
vi.mock('sonner', () => ({ toast: { error: mocks.toastErro, success: mocks.toastSucesso } }))

const canalizacao: ServiceCategory = { id: 'c1', slug: 'canalizacao', name: 'Canalização' }
const pintura: ServiceCategory = { id: 'c2', slug: 'pintura', name: 'Pintura' }

function imagem(nome = 'foto.jpg', tipo = 'image/jpeg', tamanho = 1000): File {
  const ficheiro = new File(['x'], nome, { type: tipo })
  Object.defineProperty(ficheiro, 'size', { value: tamanho })
  return ficheiro
}

function escolherFotos(ficheiros: File[]) {
  const entrada = document.querySelector('input[type="file"]') as HTMLInputElement
  fireEvent.change(entrada, { target: { files: ficheiros } })
}

function mostrar(services: ServiceCategory[] = [canalizacao, pintura], onDone = vi.fn()) {
  render(<NewProjectForm professionalId="p1" services={services} onDone={onDone} />)
  return { onDone }
}

const botaoPublicar = () => screen.getByRole('button', { name: 'Publicar trabalho' }) as HTMLButtonElement

beforeEach(() => {
  mocks.isPending = false
  // jsdom não implementa object URLs.
  URL.createObjectURL = vi.fn(() => 'blob:previa')
  URL.revokeObjectURL = vi.fn()
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('NewProjectForm', () => {
  it('só deixa publicar com serviço escolhido e pelo menos uma foto', () => {
    mostrar()
    expect(botaoPublicar().disabled).toBe(true)

    escolherFotos([imagem()])
    expect(botaoPublicar().disabled).toBe(true) // há foto, falta o serviço

    fireEvent.click(screen.getByRole('button', { name: 'Pintura' }))
    expect(botaoPublicar().disabled).toBe(false)
  })

  it('com um só serviço guardado, escolhe-o logo', () => {
    mostrar([canalizacao])

    expect(screen.getByRole('button', { name: 'Canalização' }).getAttribute('aria-pressed')).toBe('true')
  })

  it('rejeita ficheiro que não é imagem, sem o juntar às fotos', () => {
    mostrar()

    escolherFotos([imagem('documento.pdf', 'application/pdf')])

    expect(mocks.toastErro).toHaveBeenCalledWith('documento.pdf: O ficheiro tem de ser uma imagem.')
    expect(screen.queryByAltText('Foto 1')).toBeNull()
  })

  it('aceita as boas e rejeita só a má num lote misto', () => {
    mostrar()

    escolherFotos([imagem('a.jpg'), imagem('b.pdf', 'application/pdf'), imagem('c.jpg')])

    expect(screen.getByAltText('Foto 1')).toBeTruthy()
    expect(screen.getByAltText('Foto 2')).toBeTruthy()
    expect(screen.queryByAltText('Foto 3')).toBeNull()
    expect(mocks.toastErro).toHaveBeenCalledTimes(1)
  })

  it('aos 10 fotos corta o excesso, avisa e esconde o botão de juntar mais', () => {
    mostrar()

    escolherFotos(Array.from({ length: 12 }, (_, i) => imagem(`f${i}.jpg`)))

    expect(screen.getByText(/Fotos \(10\/10\)/)).toBeTruthy()
    expect(screen.queryByAltText('Foto 11')).toBeNull()
    expect(mocks.toastErro).toHaveBeenCalledWith('Um trabalho tem no máximo 10 fotos.')
    expect(screen.queryByText('Adicionar mais fotos')).toBeNull()
  })

  it('só a primeira foto é a capa e os extremos não se movem para fora', () => {
    mostrar()
    escolherFotos([imagem('a.jpg'), imagem('b.jpg')])

    expect(screen.getAllByText('Capa')).toHaveLength(1)
    expect((screen.getByRole('button', { name: 'Mover foto 1 para trás' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Mover foto 2 para a frente' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('remover uma foto tira-a da lista e liberta a pré-visualização', () => {
    mostrar()
    escolherFotos([imagem('a.jpg'), imagem('b.jpg')])

    fireEvent.click(screen.getByRole('button', { name: 'Remover foto 1' }))

    expect(screen.queryByAltText('Foto 2')).toBeNull()
    expect(URL.revokeObjectURL).toHaveBeenCalled()
  })

  it('submeter entrega ao hook os ficheiros pela ordem escolhida, o serviço e a descrição', () => {
    mostrar()
    const a = imagem('a.jpg')
    const b = imagem('b.jpg')
    escolherFotos([a, b])
    fireEvent.click(screen.getByRole('button', { name: 'Pintura' }))
    fireEvent.change(screen.getByLabelText(/Descrição/), { target: { value: 'Sala pintada' } })
    // Trocar a ordem: a segunda foto passa para trás da primeira.
    fireEvent.click(screen.getByRole('button', { name: 'Mover foto 2 para trás' }))

    fireEvent.click(botaoPublicar())

    expect(mocks.mutate).toHaveBeenCalledTimes(1)
    const [variaveis] = mocks.mutate.mock.calls[0]
    expect(variaveis.files).toEqual([b, a])
    expect(variaveis.categoryId).toBe('c2')
    expect(variaveis.description).toBe('Sala pintada')
  })

  it('se o envio falhar, mostra a mensagem e mantém o que foi preenchido', () => {
    mocks.mutate.mockImplementation((_variaveis, opcoes) => opcoes.onError(new Error('Não foi possível enviar uma das fotos. Tenta novamente.')))
    const { onDone } = mostrar()
    escolherFotos([imagem()])
    fireEvent.click(screen.getByRole('button', { name: 'Pintura' }))

    fireEvent.click(botaoPublicar())

    expect(mocks.toastErro).toHaveBeenCalledWith('Não foi possível enviar uma das fotos. Tenta novamente.')
    expect(onDone).not.toHaveBeenCalled()
    expect(screen.getByAltText('Foto 1')).toBeTruthy()
    expect(botaoPublicar().disabled).toBe(false)
  })

  it('se correr bem, avisa e fecha o formulário', () => {
    mocks.mutate.mockImplementation((_variaveis, opcoes) => opcoes.onSuccess())
    const { onDone } = mostrar()
    escolherFotos([imagem()])
    fireEvent.click(screen.getByRole('button', { name: 'Pintura' }))

    fireEvent.click(botaoPublicar())

    expect(mocks.toastSucesso).toHaveBeenCalledWith('Trabalho adicionado.')
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('durante o envio bloqueia a edição e o cancelamento', () => {
    mocks.isPending = true
    mostrar()

    expect((screen.getByRole('button', { name: 'Cancelar' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Pintura' }) as HTMLButtonElement).disabled).toBe(true)
  })
})
