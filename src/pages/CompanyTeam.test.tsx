import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MAX_TECNICOS_POR_EMPRESA, type AddMemberResult, type TeamMember } from '../services/companyTeam'
import { CompanyTeam } from './CompanyTeam'

type Fonte = { data: TeamMember[] | undefined; isLoading: boolean; isError: boolean }

const estado = vi.hoisted(() => ({
  equipa: {} as Fonte,
  servicos: [{ id: 'cat-1', name: 'Canalização' }, { id: 'cat-2', name: 'Eletricidade' }] as { id: string; name: string }[],
  adicionar: vi.fn(),
  atualizar: vi.fn(),
  estadoMembro: vi.fn(),
  erro: vi.fn(),
  sucesso: vi.fn(),
}))
vi.mock('../hooks/useCompanyTeam', () => ({
  useTeam: () => estado.equipa,
  useAddMember: () => ({ mutate: estado.adicionar, isPending: false }),
  useUpdateMember: () => ({ mutate: estado.atualizar, isPending: false }),
  useSetMemberStatus: () => ({ mutate: estado.estadoMembro, isPending: false }),
}))
vi.mock('../hooks/useProfile', () => ({ useProfile: () => ({ data: { id: 'emp-1' } }) }))
vi.mock('../hooks/useCatalog', () => ({ useProfessionalCatalog: () => ({ data: { services: estado.servicos } }) }))
vi.mock('sonner', () => ({ toast: { error: estado.erro, success: estado.sucesso } }))

function membro(extra: Partial<TeamMember> = {}): TeamMember {
  return {
    id: 'm1',
    user_id: 'u1',
    full_name: 'João Silva',
    email: 'joao@x.test',
    title: 'Canalizador',
    status: 'ACTIVE',
    active_jobs: 0,
    kyc_status: 'APPROVED',
    services: [{ id: 'cat-1', name: 'Canalização' }],
    created_at: '2026-10-01T10:00:00Z',
    ...extra,
  }
}

afterEach(() => {
  cleanup()
  for (const f of [estado.adicionar, estado.atualizar, estado.estadoMembro, estado.erro, estado.sucesso]) f.mockReset()
  estado.servicos = [{ id: 'cat-1', name: 'Canalização' }, { id: 'cat-2', name: 'Eletricidade' }]
})

function mostrar(equipa: Fonte = { data: [], isLoading: false, isError: false }) {
  estado.equipa = equipa
  render(
    <MemoryRouter>
      <CompanyTeam />
    </MemoryRouter>,
  )
}

describe('CompanyTeam — lista', () => {
  it('distingue a carregar, erro e vazio (com o que fazer)', () => {
    mostrar({ data: undefined, isLoading: true, isError: false })
    expect(screen.getByRole('status', { name: /a carregar/i })).toBeTruthy()
    cleanup()

    mostrar({ data: undefined, isLoading: false, isError: true })
    expect(screen.getByText(/não foi possível carregar a equipa/i)).toBeTruthy()
    cleanup()

    mostrar()
    expect(screen.getByText('Ainda não tens técnicos')).toBeTruthy()
  })

  it('mostra cada técnico com o estado do KYC, os serviços e os ativos de 15', () => {
    mostrar({
      data: [membro(), membro({ id: 'm2', full_name: 'Rui', kyc_status: 'NONE', services: [] })],
      isLoading: false,
      isError: false,
    })

    expect(screen.getByText('2 de 15 ativos')).toBeTruthy()
    expect(screen.getByText('Identidade verificada')).toBeTruthy()
    expect(screen.getByText('Ainda sem documentos')).toBeTruthy()
    expect(screen.getByText('Canalização')).toBeTruthy()
    expect(screen.getByText(/só recebe trabalhos depois de a identidade estar verificada/i)).toBeTruthy()
  })

  it('um técnico com trabalhos em curso não se pode desativar', () => {
    mostrar({ data: [membro({ active_jobs: 2 })], isLoading: false, isError: false })

    expect(screen.getByText('2 trabalhos em curso')).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Desativar' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('desativar e reativar chamam o backend; o erro do servidor aparece', () => {
    estado.estadoMembro.mockImplementation((_in, opcoes) => opcoes.onError(new Error('A equipa já tem 15 técnicos ativos.')))
    mostrar({ data: [membro({ status: 'INACTIVE' })], isLoading: false, isError: false })

    expect(screen.getByText('Desativado')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Reativar' }))

    expect(estado.estadoMembro.mock.calls[0][0]).toEqual({ id: 'm1', status: 'ACTIVE' })
    expect(estado.erro).toHaveBeenCalledWith('A equipa já tem 15 técnicos ativos.')
  })
})

describe('CompanyTeam — limite de 15', () => {
  it('com 15 ativos o botão de adicionar fica desativado e explica porquê', () => {
    const ativos = Array.from({ length: MAX_TECNICOS_POR_EMPRESA }, (_, i) => membro({ id: `m${i}`, full_name: `Técnico ${i}` }))
    mostrar({ data: ativos, isLoading: false, isError: false })

    expect((screen.getByRole('button', { name: 'Adicionar técnico' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText(/chegaste ao máximo de 15 técnicos ativos/i)).toBeTruthy()
  })

  it('técnicos desativados não contam para o limite', () => {
    const lista = [...Array.from({ length: MAX_TECNICOS_POR_EMPRESA - 1 }, (_, i) => membro({ id: `m${i}` })), membro({ id: 'x', status: 'INACTIVE' }), membro({ id: 'y', status: 'INACTIVE' })]
    mostrar({ data: lista, isLoading: false, isError: false })

    expect(screen.getByText('14 de 15 ativos')).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Adicionar técnico' }) as HTMLButtonElement).disabled).toBe(false)
  })
})

describe('CompanyTeam — adicionar', () => {
  function preencher(nome = 'Novo Técnico', email = 'novo@x.test', titulo = 'Eletricista') {
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar técnico' }))
    fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: nome } })
    fireEvent.change(screen.getByLabelText(/^Email/), { target: { value: email } })
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: titulo } })
  }

  it('recusa dados em falta sem chamar o backend', () => {
    mostrar()
    preencher('X', 'isto-nao-e-email')
    fireEvent.click(screen.getByRole('button', { name: 'Criar técnico' }))

    expect(estado.adicionar).not.toHaveBeenCalled()
    expect(estado.erro).toHaveBeenCalledWith('Indica o nome completo e um email válido.')
  })

  it('exige pelo menos um serviço', () => {
    mostrar()
    preencher()
    fireEvent.click(screen.getByRole('button', { name: 'Criar técnico' }))

    expect(estado.adicionar).not.toHaveBeenCalled()
    expect(estado.erro).toHaveBeenCalledWith('Escolhe pelo menos um serviço.')
  })

  it('envia o técnico e mostra a palavra-passe provisória uma só vez', () => {
    const resultado: AddMemberResult = { member: membro({ email: 'novo@x.test' }), temporary_password: 'ProvisoriaAbc123XyZ' }
    estado.adicionar.mockImplementation((_in, opcoes) => opcoes.onSuccess(resultado))
    mostrar()
    preencher(' Novo Técnico ', ' novo@x.test ', ' Eletricista ')
    fireEvent.click(screen.getByLabelText('Eletricidade'))
    fireEvent.click(screen.getByRole('button', { name: 'Criar técnico' }))

    expect(estado.adicionar.mock.calls[0][0]).toEqual({ full_name: 'Novo Técnico', email: 'novo@x.test', title: 'Eletricista', category_ids: ['cat-2'] })
    expect(screen.getByText('ProvisoriaAbc123XyZ')).toBeTruthy()
    expect(screen.getByText(/só aparece agora/i)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Já guardei, fechar' }))
    expect(screen.queryByText('ProvisoriaAbc123XyZ')).toBeNull()
  })

  it('o erro do servidor (email já registado, limite) aparece', () => {
    estado.adicionar.mockImplementation((_in, opcoes) => opcoes.onError(new Error('Já existe uma conta com este email.')))
    mostrar()
    preencher()
    fireEvent.click(screen.getByLabelText('Canalização'))
    fireEvent.click(screen.getByRole('button', { name: 'Criar técnico' }))

    expect(estado.erro).toHaveBeenCalledWith('Já existe uma conta com este email.')
  })

  it('uma empresa sem serviços escolhidos é avisada e não pode criar técnicos', () => {
    estado.servicos = []
    mostrar()
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar técnico' }))

    expect(screen.getByText(/ainda não escolheu os serviços/i)).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Criar técnico' }) as HTMLButtonElement).disabled).toBe(true)
  })
})

describe('CompanyTeam — editar', () => {
  it('editar envia só o título e os serviços (o email não se altera)', () => {
    mostrar({ data: [membro()], isLoading: false, isError: false })
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }))

    expect(screen.queryByLabelText('Nome completo')).toBeNull()
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Canalizador sénior' } })
    fireEvent.click(within(screen.getByRole('group', { name: 'Serviços que faz' })).getByLabelText('Eletricidade'))
    fireEvent.click(screen.getByRole('button', { name: 'Guardar alterações' }))

    expect(estado.atualizar.mock.calls[0][0]).toEqual({ id: 'm1', changes: { title: 'Canalizador sénior', category_ids: ['cat-1', 'cat-2'] } })
  })
})
