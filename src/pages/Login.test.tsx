import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DESTINO_POS_LOGIN_KEY } from '../lib/postLoginRedirect'
import { INTENDED_ROLE_STORAGE_KEY } from '../lib/authIntent'
import { Login } from './Login'

const authState = vi.hoisted(() => ({ session: null as unknown, isLoading: false }))
const supabase = vi.hoisted(() => ({
  auth: {
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signInWithOAuth: vi.fn(),
  },
}))

vi.mock('../store/AuthContext', () => ({
  useAuth: () => ({ session: authState.session, isLoading: authState.isLoading }),
}))
vi.mock('../lib/supabase', () => ({ supabase }))
vi.mock('../services/notifications', () => ({
  sendWelcomeNotification: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('../services/passwordRecovery', () => ({
  requestPasswordRecovery: vi.fn().mockResolvedValue('Link de recuperação enviado com sucesso.'),
}))

function mostrar(url = '/entrar') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/entrar" element={<Login />} />
        <Route path="/" element={<p>Página inicial</p>} />
        <Route path="/profissionais" element={<p>Pesquisa de profissionais</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  authState.session = null
  authState.isLoading = false
  supabase.auth.signInWithPassword.mockReset().mockResolvedValue({ error: null })
  supabase.auth.signUp.mockReset().mockResolvedValue({ data: { session: null }, error: null })
  supabase.auth.signInWithOAuth.mockReset().mockResolvedValue({ error: null })
  localStorage.clear()
  sessionStorage.clear()
})

afterEach(cleanup)

describe('Login — texto e estrutura', () => {
  it('dá as boas-vindas só com "Bem-vindo" e está todo em português', () => {
    mostrar()

    expect(screen.getByRole('heading', { name: 'Bem-vindo' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeTruthy()
    expect(screen.getByText('Esqueceste a palavra-passe?')).toBeTruthy()
    expect(screen.getByText('Ainda não tens conta?')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Criar conta' })).toBeTruthy()
    expect(screen.getByRole('button', { name: /continuar com o google/i })).toBeTruthy()
    // Regressão: o ecrã chegou a vir com texto de outro produto ("Welcome back to Nucleus").
    for (const ingles of [/nucleus/i, /welcome/i, /log in/i, /forgot/i, /remember/i, /sign up/i, /don't have/i]) {
      expect(screen.queryByText(ingles)).toBeNull()
    }
  })

  it('alterna entre Email e Telefone', () => {
    mostrar()
    expect(screen.getByLabelText('Email')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Telefone' }))

    expect(screen.getByLabelText('Telefone')).toBeTruthy()
    expect(screen.queryByText('Esqueceste a palavra-passe?')).toBeNull()
  })

  it('mostra e oculta a palavra-passe', () => {
    mostrar()
    const campo = screen.getByLabelText('Palavra-passe') as HTMLInputElement
    expect(campo.type).toBe('password')

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar palavra-passe' }))

    expect(campo.type).toBe('text')
    expect(screen.getByRole('button', { name: 'Ocultar palavra-passe' })).toBeTruthy()
  })

  it('"Criar conta" abre o registo com a escolha de papel, e dá para voltar a "Entrar"', () => {
    mostrar()

    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }))

    expect(screen.getByRole('heading', { name: 'Cria a tua conta' })).toBeTruthy()
    expect(screen.getByText('Já tens conta?')).toBeTruthy()
    fireEvent.click(screen.getByLabelText('Sou profissional'))
    expect(screen.getByLabelText('Singular')).toBeTruthy()
    expect(screen.getByLabelText('Empresa')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(screen.getByRole('heading', { name: 'Bem-vindo' })).toBeTruthy()
  })

  it('liga aos termos de utilização numa nova aba, para não apagar o formulário', () => {
    mostrar()

    const ligacao = screen.getByRole('link', { name: 'Termos de utilização' })

    expect(ligacao.getAttribute('href')).toBe('/termos')
    expect(ligacao.getAttribute('target')).toBe('_blank')
    expect(ligacao.getAttribute('rel')).toContain('noopener')
  })

  it('abre a recuperação de palavra-passe e volta ao login', () => {
    mostrar()

    fireEvent.click(screen.getByRole('button', { name: 'Esqueceste a palavra-passe?' }))
    expect(screen.getByRole('heading', { name: 'Recuperar palavra-passe' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Enviar link' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /voltar a entrar/i }))
    expect(screen.getByRole('heading', { name: 'Bem-vindo' })).toBeTruthy()
  })
})

describe('Login — entrada a partir da Home', () => {
  it('?modo=criar-conta abre logo no registo (botão "Criar conta" da Home)', () => {
    mostrar('/entrar?modo=criar-conta')

    expect(screen.getByRole('heading', { name: 'Cria a tua conta' })).toBeTruthy()
  })

  it('quem já tem sessão vai para o destino pedido', () => {
    authState.session = { user: { id: 'u1' } }

    mostrar('/entrar?next=%2Fprofissionais%3Fcategory%3Dpintura')

    expect(screen.getByText('Pesquisa de profissionais')).toBeTruthy()
  })

  it('sem destino, ou com um destino de outro site, vai para a página inicial', () => {
    authState.session = { user: { id: 'u1' } }

    mostrar('/entrar?next=%2F%2Fsitio-falso.com')

    expect(screen.getByText('Página inicial')).toBeTruthy()
  })

  it('o Google guarda o destino, porque o ?next= perde-se na viagem', async () => {
    mostrar('/entrar?next=%2Fcatalogo')

    fireEvent.click(screen.getByRole('button', { name: /continuar com o google/i }))

    await waitFor(() => expect(supabase.auth.signInWithOAuth).toHaveBeenCalledTimes(1))
    expect(sessionStorage.getItem(DESTINO_POS_LOGIN_KEY)).toBe('/catalogo')
  })
})

describe('Login — envio', () => {
  it('entrar com email chama signInWithPassword com o email e a palavra-passe', async () => {
    mostrar()
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ana@exemplo.com' } })
    fireEvent.change(screen.getByLabelText('Palavra-passe'), { target: { value: 'segredo1' } })

    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    await waitFor(() =>
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'ana@exemplo.com', password: 'segredo1' }),
    )
  })

  it('criar conta envia o papel e o nome nos metadados', async () => {
    mostrar('/entrar?modo=criar-conta')
    fireEvent.click(screen.getByLabelText('Sou profissional'))
    fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: 'Carlos Macamo' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'carlos@exemplo.com' } })
    fireEvent.change(screen.getAllByLabelText('Telefone')[0], { target: { value: '+258841234567' } })
    fireEvent.change(screen.getByLabelText('Palavra-passe'), { target: { value: 'segredo1' } })

    fireEvent.submit(screen.getByLabelText('Nome completo').closest('form')!)

    await waitFor(() => expect(supabase.auth.signUp).toHaveBeenCalledTimes(1))
    const { options } = supabase.auth.signUp.mock.calls[0][0]
    expect(options.data).toMatchObject({ full_name: 'Carlos Macamo', role: 'PROFESSIONAL', professional_type: 'SINGULAR', phone: '+258841234567' })
    await waitFor(() => expect(screen.getByRole('status').textContent).toMatch(/verifica o teu email/i))
  })

  it('o Google, em registo, guarda o papel escolhido para o AuthCallback aplicar', async () => {
    mostrar('/entrar?modo=criar-conta')
    fireEvent.click(screen.getByLabelText('Sou profissional'))

    fireEvent.click(screen.getByRole('button', { name: /continuar com o google/i }))

    await waitFor(() => expect(supabase.auth.signInWithOAuth).toHaveBeenCalledTimes(1))
    expect(sessionStorage.getItem(INTENDED_ROLE_STORAGE_KEY)).toBe('PROFESSIONAL')
  })

  it('mostra o erro em português quando o login falha', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({ error: { message: 'Invalid login credentials', status: 400 } })
    mostrar()
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ana@exemplo.com' } })
    fireEvent.change(screen.getByLabelText('Palavra-passe'), { target: { value: 'errada1' } })

    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
  })

  it('"lembrar" guarda o email e o canal, e repõe-nos na visita seguinte', async () => {
    const primeira = mostrar()
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ana@exemplo.com' } })
    fireEvent.change(screen.getByLabelText('Palavra-passe'), { target: { value: 'segredo1' } })
    fireEvent.click(screen.getByRole('switch'))
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    await waitFor(() => expect(supabase.auth.signInWithPassword).toHaveBeenCalled())
    primeira.unmount()

    mostrar()

    expect((screen.getByLabelText('Email') as HTMLInputElement).value).toBe('ana@exemplo.com')
    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('true')
    // Nunca a palavra-passe.
    expect((screen.getByLabelText('Palavra-passe') as HTMLInputElement).value).toBe('')
  })
})
