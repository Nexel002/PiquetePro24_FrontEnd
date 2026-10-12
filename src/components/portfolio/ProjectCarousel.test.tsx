import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ProjectPhoto } from '../../services/portfolio'
import { PhotoLightbox } from './PhotoLightbox'
import { ProjectCarousel } from './ProjectCarousel'

function fotos(n: number): ProjectPhoto[] {
  return Array.from({ length: n }, (_, i) => ({ id: `f${i}`, photo_url: `https://x/${i}.webp`, position: i }))
}

afterEach(cleanup)

describe('ProjectCarousel', () => {
  it('com várias fotos mostra contador e uma imagem por foto', () => {
    const { container } = render(<ProjectCarousel photos={fotos(4)} />)

    expect(container.querySelectorAll('img')).toHaveLength(4)
    expect(screen.getByText('1/4')).toBeTruthy()
    expect(screen.getByRole('group', { name: /4 no total/ })).toBeTruthy()
  })

  it('com uma só foto não mostra contador, pontos nem setas', () => {
    render(<ProjectCarousel photos={fotos(1)} />)

    expect(screen.queryByText(/\/1/)).toBeNull()
    expect(screen.queryByLabelText('Foto seguinte')).toBeNull()
  })

  it('tocar numa foto chama onOpenPhoto com o índice dela', () => {
    const onOpenPhoto = vi.fn()
    render(<ProjectCarousel photos={fotos(3)} onOpenPhoto={onOpenPhoto} />)

    fireEvent.click(screen.getAllByLabelText('Ver foto em ecrã inteiro')[2])

    expect(onOpenPhoto).toHaveBeenCalledWith(2)
  })

  it('sem onOpenPhoto as fotos não são botões (editor do profissional)', () => {
    render(<ProjectCarousel photos={fotos(2)} />)

    expect(screen.queryAllByLabelText('Ver foto em ecrã inteiro')).toHaveLength(0)
  })
})

describe('PhotoLightbox', () => {
  it('abre na foto pedida e navega só pelas fotos do trabalho', () => {
    render(<PhotoLightbox photos={fotos(3)} startIndex={1} onClose={vi.fn()} />)

    expect(screen.getByText('2/3')).toBeTruthy()
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(screen.getByText('3/3')).toBeTruthy()
    // Fim do trabalho: não passa para fora dele.
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(screen.getByText('3/3')).toBeTruthy()
    expect(screen.queryByLabelText('Foto seguinte')).toBeNull()
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    expect(screen.getByText('2/3')).toBeTruthy()
  })

  it('Escape e o botão fechar chamam onClose', () => {
    const onClose = vi.fn()
    render(<PhotoLightbox photos={fotos(2)} startIndex={0} onClose={onClose} />)

    fireEvent.keyDown(window, { key: 'Escape' })
    fireEvent.click(screen.getByLabelText('Fechar'))

    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('deslizar para a esquerda avança; um toque curto não', () => {
    render(<PhotoLightbox photos={fotos(3)} startIndex={0} onClose={vi.fn()} />)
    const dialogo = screen.getByRole('dialog')

    fireEvent.touchStart(dialogo, { touches: [{ clientX: 200 }] })
    fireEvent.touchEnd(dialogo, { changedTouches: [{ clientX: 190 }] })
    expect(screen.getByText('1/3')).toBeTruthy()

    fireEvent.touchStart(dialogo, { touches: [{ clientX: 200 }] })
    fireEvent.touchEnd(dialogo, { changedTouches: [{ clientX: 100 }] })
    expect(screen.getByText('2/3')).toBeTruthy()
  })

  it('sem fotos não rebenta', () => {
    const { container } = render(<PhotoLightbox photos={[]} startIndex={0} onClose={vi.fn()} />)

    expect(container.innerHTML).toBe('')
  })
})
