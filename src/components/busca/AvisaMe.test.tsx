import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SearchedProfessional } from '../../services/professionalSearch'
import { AvisaMe } from './AvisaMe'
import { ResultadosDaBusca } from './ResultadosDaBusca'

// Fase 39 (TRD Adendo v1.66, N4).
const mocks = vi.hoisted(() => ({ mutate: vi.fn(), toastErro: vi.fn(), toastSucesso: vi.fn() }))

vi.mock('../../hooks/useSearchAlerts', () => ({
  useCreateSearchAlert: () => ({ mutate: mocks.mutate, isPending: false }),
}))
vi.mock('sonner', () => ({ toast: { error: mocks.toastErro, success: mocks.toastSucesso } }))

// Com chavetas: um beforeEach que devolve uma função tem-na como limpeza, e mockReset() devolve o
// próprio mock — o Vitest chamava-o sem argumentos no fim de cada teste.
beforeEach(() => {
  mocks.mutate.mockReset()
})
afterEach(cleanup)

const canalizacao = { id: 'c1', slug: 'canalizacao', name: 'Canalização' }

describe('AvisaMe', () => {
  it('pede o aviso com a província do perfil e confirma no ecrã', () => {
    mocks.mutate.mockImplementation((_v, opcoes: { onSuccess: () => void }) => opcoes.onSuccess())
    render(<AvisaMe servico={canalizacao} provinciaPadrao="Gaza" semNinguem />)

    fireEvent.click(screen.getByRole('button', { name: 'Avisa-me quando houver' }))

    expect(mocks.mutate).toHaveBeenCalledWith(
      { category_id: 'c1', province: 'Gaza' },
      expect.anything(),
    )
    expect(screen.getByRole('status').textContent).toContain('Canalização em Gaza')
  })

  it('a província pode mudar; uma província do perfil fora da lista começa pela primeira', () => {
    render(<AvisaMe servico={canalizacao} provinciaPadrao="Matola" semNinguem={false} />)
    const escolha = screen.getByRole('combobox') as HTMLSelectElement
    expect(escolha.value).toBe('Cidade de Maputo')

    fireEvent.change(escolha, { target: { value: 'Sofala' } })
    fireEvent.click(screen.getByRole('button', { name: 'Avisa-me quando houver' }))
    expect(mocks.mutate).toHaveBeenCalledWith(
      { category_id: 'c1', province: 'Sofala' },
      expect.anything(),
    )
  })

  it('aviso repetido (409): mostra a mensagem do servidor', () => {
    mocks.mutate.mockImplementation((_v, opcoes: { onError: (e: Error) => void }) =>
      opcoes.onError(new Error('Já tens um aviso pendente para este serviço nesta província.')),
    )
    render(<AvisaMe servico={canalizacao} provinciaPadrao="Gaza" semNinguem />)
    fireEvent.click(screen.getByRole('button', { name: 'Avisa-me quando houver' }))
    expect(mocks.toastErro).toHaveBeenCalledWith(
      'Já tens um aviso pendente para este serviço nesta província.',
    )
  })
})

function profissional(extra: Partial<SearchedProfessional>): SearchedProfessional {
  return {
    id: 'p1',
    full_name: 'Carlos',
    professional_type: 'SINGULAR',
    avatar_url: null,
    services: [],
    rating_avg: null,
    rating_count: 0,
    distance_m: 40000,
    is_nearby: false,
    serves_area: false,
    ...extra,
  }
}

function resultados(profissionais: SearchedProfessional[], comLocalizacao: boolean, aviso = true) {
  render(
    <MemoryRouter>
      <ResultadosDaBusca
        aCarregar={false}
        comErro={false}
        carregou
        profissionais={profissionais}
        comLocalizacao={comLocalizacao}
        comFiltros
        seleccionaveis={false}
        idsEscolhidos={[]}
        bloqueado={false}
        temMais={false}
        aCarregarMais={false}
        aoAlternar={vi.fn()}
        aoTentarDeNovo={vi.fn()}
        aoVerMais={vi.fn()}
        avisoDeOferta={aviso ? { servico: canalizacao, provinciaPadrao: 'Gaza' } : null}
      />
    </MemoryRouter>,
  )
}

describe('quando aparece o «Avisa-me»', () => {
  it('sem ninguém, e com localização mas ninguém perto', () => {
    resultados([], true)
    expect(screen.getByText(/Ainda não há Canalização disponível/)).toBeTruthy()
    cleanup()

    resultados([profissional({})], true)
    expect(screen.getByText(/Ainda não há Canalização perto de ti/)).toBeTruthy()
  })

  it('não aparece com alguém perto ou a atender a zona, sem localização com resultados, nem sem aviso (não cliente)', () => {
    resultados([profissional({ is_nearby: true })], true)
    resultados([profissional({ id: 'p2', serves_area: true })], true)
    resultados([profissional({ id: 'p3' })], false)
    resultados([], true, false)
    expect(screen.queryByRole('button', { name: 'Avisa-me quando houver' })).toBeNull()
  })
})
