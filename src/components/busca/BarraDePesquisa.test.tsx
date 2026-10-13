import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BarraDePesquisa } from './BarraDePesquisa'

afterEach(cleanup)

describe('BarraDePesquisa', () => {
  it('o botão da lupa submete a pesquisa (antes não fazia nada)', () => {
    const aoPesquisar = vi.fn()
    render(<BarraDePesquisa texto="canal" aoMudar={vi.fn()} aoPesquisar={aoPesquisar} focarAoMontar={false} />)

    fireEvent.click(screen.getByRole('button', { name: 'Pesquisar' }))

    expect(aoPesquisar).toHaveBeenCalledTimes(1)
  })

  it('Enter no campo também submete', () => {
    const aoPesquisar = vi.fn()
    render(<BarraDePesquisa texto="canal" aoMudar={vi.fn()} aoPesquisar={aoPesquisar} focarAoMontar={false} />)

    fireEvent.submit(screen.getByRole('search'))

    expect(aoPesquisar).toHaveBeenCalledTimes(1)
  })

  it('avisa o que se escreve', () => {
    const aoMudar = vi.fn()
    render(<BarraDePesquisa texto="" aoMudar={aoMudar} aoPesquisar={vi.fn()} focarAoMontar={false} />)

    fireEvent.change(screen.getByLabelText('Pesquisar serviço ou profissional'), { target: { value: 'eletr' } })

    expect(aoMudar).toHaveBeenCalledWith('eletr')
  })

  it('só foca o campo quando lho pedem', () => {
    render(<BarraDePesquisa texto="" aoMudar={vi.fn()} aoPesquisar={vi.fn()} focarAoMontar />)
    expect(document.activeElement).toBe(screen.getByLabelText('Pesquisar serviço ou profissional'))
    cleanup()

    render(<BarraDePesquisa texto="" aoMudar={vi.fn()} aoPesquisar={vi.fn()} focarAoMontar={false} />)
    expect(document.activeElement).not.toBe(screen.getByLabelText('Pesquisar serviço ou profissional'))
  })
})
