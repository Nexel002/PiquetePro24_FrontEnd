import { cleanup, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { EstadoDeSistema } from '../services/adminSystem'
import { AdminSystem } from './AdminSystem'

type Fonte = { data: EstadoDeSistema | undefined; isLoading: boolean; isError: boolean }

const estado = vi.hoisted(() => ({ fonte: {} as Fonte }))
vi.mock('../hooks/useAdminSystem', () => ({ useEstadoDeSistema: () => estado.fonte }))

const OK: EstadoDeSistema = {
  base_de_dados: { estado: 'OK', latencia_ms: 42 },
  redis: { estado: 'OK' },
  email: { estado: 'OK' },
  pagamentos: { modo: 'MANUAL' },
  seguranca: { verificacao_dois_passos_obrigatoria: false },
  pendentes: { comunicados_presos: 0, denuncias_abertas: 3, kyc_em_analise: 0 },
  verificado_em: '2026-10-14T12:00:00.000Z',
}

afterEach(cleanup)

function mostrar(fonte: Fonte) {
  estado.fonte = fonte
  render(
    <MemoryRouter>
      <AdminSystem />
    </MemoryRouter>,
  )
}

describe('AdminSystem', () => {
  it('distingue a carregar e erro', () => {
    mostrar({ data: undefined, isLoading: true, isError: false })
    expect(screen.getByRole('status', { name: /a carregar/i })).toBeTruthy()
    cleanup()

    mostrar({ data: undefined, isLoading: false, isError: true })
    expect(screen.getByText(/não foi possível ler o estado do sistema/i)).toBeTruthy()
  })

  it('mostra a latência da base de dados e o estado em texto', () => {
    mostrar({ data: OK, isLoading: false, isError: false })

    expect(screen.getByText('42 ms')).toBeTruthy()
    expect(screen.getAllByText('A funcionar')).toHaveLength(3)
  })

  it('uma falha aparece como «Com falha» com o detalhe', () => {
    mostrar({
      data: { ...OK, base_de_dados: { estado: 'FALHA', latencia_ms: null, detalhe: 'connection refused' } },
      isLoading: false,
      isError: false,
    })

    expect(screen.getByText('Com falha')).toBeTruthy()
    expect(screen.getByText('connection refused')).toBeTruthy()
  })

  it('cache e email desligados explicam o efeito, em vez de parecerem um erro', () => {
    mostrar({ data: { ...OK, redis: { estado: 'DESLIGADO' }, email: { estado: 'DESLIGADO' } }, isLoading: false, isError: false })

    expect(screen.getAllByText('Desligado')).toHaveLength(2)
    expect(screen.getByText(/sem cache: a app funciona/i)).toBeTruthy()
    expect(screen.getByText(/os emails ficam no log/i)).toBeTruthy()
  })

  it('configuração: modo de pagamentos e segundo factor obrigatório', () => {
    mostrar({
      data: { ...OK, pagamentos: { modo: 'SIMULADO' }, seguranca: { verificacao_dois_passos_obrigatoria: true } },
      isLoading: false,
      isError: false,
    })

    expect(screen.getByText('Simulados (teste)')).toBeTruthy()
    expect(screen.getByText('Sim')).toBeTruthy()
  })

  it('pendentes: zero diz «Nenhum» e cada linha leva ao seu ecrã', () => {
    mostrar({ data: OK, isLoading: false, isError: false })

    const denuncias = screen.getByRole('link', { name: /denúncias por tratar/i })
    expect(within(denuncias).getByText('3')).toBeTruthy()
    expect(denuncias.getAttribute('href')).toBe('/admin/moderacao')
    expect(within(screen.getByRole('link', { name: /comunicados presos/i })).getByText('Nenhum')).toBeTruthy()
  })
})
