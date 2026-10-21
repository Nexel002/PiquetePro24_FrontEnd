import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SelosDeCredenciais } from '../catalogo/SelosDeCredenciais'
import { FilaDeCredenciais } from '../admin/kyc/FilaDeCredenciais'
import { FormularioDeCredencial } from './FormularioDeCredencial'

// Fase 41 (TRD Adendo v1.66, N5): formulário, selos e a fila do admin.
const mocks = vi.hoisted(() => ({
  enviar: vi.fn(),
  rever: vi.fn(),
  abrir: vi.fn(),
  documento: undefined as { url: string; expires_in: number } | undefined,
  fila: {} as Record<string, unknown>,
}))

vi.mock('../../hooks/useCredentials', () => ({ useSubmitCredential: () => ({ mutate: mocks.enviar, isPending: false }) }))
vi.mock('../../hooks/useAdminCredentials', () => ({
  useCredentialsForReview: () => mocks.fila,
  useCredentialDocument: () => ({ mutate: mocks.abrir, isPending: false, data: mocks.documento }),
  useReviewCredential: () => ({ mutate: mocks.rever, isPending: false }),
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

beforeEach(() => {
  mocks.enviar.mockReset()
  mocks.rever.mockReset()
  mocks.documento = undefined
})
afterEach(cleanup)

const enviarBotao = () => screen.getByRole('button', { name: 'Enviar para verificação' }) as HTMLButtonElement

describe('FormularioDeCredencial', () => {
  it('registo criminal sem data de emissão não se envia; com ela e o ficheiro, envia', () => {
    render(<FormularioDeCredencial aoTerminar={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'CRIMINAL_RECORD' } })
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Registo criminal' } })
    const ficheiro = new File(['x'], 'registo.jpg', { type: 'image/jpeg' })
    fireEvent.change(screen.getByLabelText('Fotografia do documento'), { target: { files: [ficheiro] } })
    expect(enviarBotao().disabled).toBe(true)

    fireEvent.change(screen.getByLabelText('Emissão'), { target: { value: '2026-09-01' } })
    fireEvent.click(enviarBotao())
    expect(mocks.enviar).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'CRIMINAL_RECORD', title: 'Registo criminal', issued_at: '2026-09-01', expires_at: null, file: ficheiro }),
      expect.anything(),
    )
  })

  it('validade anterior à emissão bloqueia o envio', () => {
    render(<FormularioDeCredencial aoTerminar={vi.fn()} />)
    fireEvent.change(screen.getByLabelText(/Emissão/), { target: { value: '2026-09-01' } })
    fireEvent.change(screen.getByLabelText(/Validade/), { target: { value: '2026-01-01' } })
    expect(screen.getByText('A validade não pode ser anterior à emissão.')).toBeTruthy()
  })
})

describe('SelosDeCredenciais', () => {
  it('mostra o selo em texto, com a validade', () => {
    render(<SelosDeCredenciais credenciais={[{ type: 'CRIMINAL_RECORD', title: 'Registo', issuer: null, expires_at: '2027-03-15' }]} />)
    expect(screen.getByText('Registo criminal verificado, válido até 03/2027')).toBeTruthy()
  })

  it('sem credenciais não mostra nada', () => {
    const { container } = render(<SelosDeCredenciais credenciais={[]} />)
    expect(container.textContent).toBe('')
  })
})

describe('FilaDeCredenciais', () => {
  const pendente = {
    id: 'c1',
    type: 'PROFESSIONAL_LICENSE',
    title: 'Carteira de electricista',
    issuer: null,
    issued_at: null,
    expires_at: null,
    status: 'PENDING',
    review_notes: null,
    submitted_at: '2026-10-01T10:00:00Z',
    user_id: 'p1',
    holder_name: 'Carlos',
    holder_role: 'PROFESSIONAL',
    holder_kyc_status: 'APPROVED',
  }

  it('o documento só se pede ao carregar em «Ver documento»; rejeitar exige motivo', () => {
    mocks.fila = { data: [pendente] }
    render(<FilaDeCredenciais />)

    expect(mocks.abrir).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Ver documento' }))
    expect(mocks.abrir).toHaveBeenCalledWith('c1', expect.anything())

    expect((screen.getByRole('button', { name: 'Rejeitar' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Motivo da rejeição'), { target: { value: 'Ilegível' } })
    fireEvent.click(screen.getByRole('button', { name: 'Rejeitar' }))
    expect(mocks.rever).toHaveBeenCalledWith({ id: 'c1', status: 'REJECTED', review_notes: 'Ilegível' }, expect.anything())
  })

  it('com o URL obtido, mostra a imagem; fila vazia diz que não há nada', () => {
    mocks.fila = { data: [pendente] }
    mocks.documento = { url: 'https://storage.test/doc.jpg', expires_in: 60 }
    render(<FilaDeCredenciais />)
    expect((screen.getByRole('img', { name: 'Documento: Carteira de electricista' }) as HTMLImageElement).src).toBe('https://storage.test/doc.jpg')
    cleanup()

    mocks.fila = { data: [] }
    render(<FilaDeCredenciais />)
    expect(screen.getByText('Não há credenciais por verificar')).toBeTruthy()
  })
})
