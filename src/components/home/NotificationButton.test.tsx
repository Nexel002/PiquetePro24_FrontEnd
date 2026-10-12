import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { NotificationButton } from './NotificationButton'

afterEach(cleanup)

describe('NotificationButton', () => {
  it('sem contagem não mostra ponto e o nome é só «Notificações»', () => {
    render(<NotificationButton onClick={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Notificações' })).toBeTruthy()
    expect(document.querySelector('span')).toBeNull()
  })

  it('com zero também não mostra ponto', () => {
    render(<NotificationButton onClick={vi.fn()} porLer={0} />)

    expect(document.querySelector('span')).toBeNull()
  })

  it('com convites mostra o número e diz quantos no nome acessível (singular e plural)', () => {
    const { rerender } = render(<NotificationButton onClick={vi.fn()} porLer={1} />)
    expect(screen.getByRole('button', { name: 'Notificações, 1 convite por responder' })).toBeTruthy()
    expect(screen.getByText('1')).toBeTruthy()

    rerender(<NotificationButton onClick={vi.fn()} porLer={3} />)
    expect(screen.getByRole('button', { name: 'Notificações, 3 convites por responder' })).toBeTruthy()
  })

  it('acima de 9 mostra «9+»', () => {
    render(<NotificationButton onClick={vi.fn()} porLer={14} />)

    expect(screen.getByText('9+')).toBeTruthy()
  })

  it('clicar chama onClick', () => {
    const onClick = vi.fn()
    render(<NotificationButton onClick={onClick} porLer={2} />)

    fireEvent.click(screen.getByRole('button'))

    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
