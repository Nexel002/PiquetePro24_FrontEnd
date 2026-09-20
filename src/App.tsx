import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import { Home } from './pages/Home'
import { Login } from './pages/Login'
import { AuthCallback } from './pages/AuthCallback'
import { Profile } from './pages/Profile'
import { CompletePhone } from './pages/onboarding/CompletePhone'
import { CompleteLocation } from './pages/onboarding/CompleteLocation'
import { FindProfessionals } from './pages/FindProfessionals'
import { MyServiceRequests } from './pages/MyServiceRequests'
import { NearbyServiceRequests } from './pages/NearbyServiceRequests'
import { Kyc } from './pages/Kyc'
import { AdminKyc } from './pages/AdminKyc'
import { AdminAuditLog } from './pages/AdminAuditLog'
import { AdminUsers } from './pages/AdminUsers'
import { AdminUserDetail } from './pages/AdminUserDetail'
import { AdminServiceRequests } from './pages/AdminServiceRequests'
import { AdminMetrics } from './pages/AdminMetrics'
import { DefinirNovaPassword } from './pages/DefinirNovaPassword'
import { ProtectedRoute } from './components/ProtectedRoute'
import { OnboardingGate } from './components/OnboardingGate'
import { AuthProvider } from './store/AuthContext'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-center" richColors closeButton />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/entrar" element={<Login />} />
            <Route path="/auth/callback" element={<AuthCallback />} />

            {/* TRD Adendo v1.7 (backend): destino do link de recuperação de
                password. Sem ProtectedRoute de propósito — ver comentário em
                DefinirNovaPassword.tsx. */}
            <Route path="/definir-nova-password" element={<DefinirNovaPassword />} />

            {/* Telas de onboarding: exigem sessão (ProtectedRoute) mas não podem
                exigir onboarding completo (OnboardingGate) — senão criam um ciclo de
                redirect entre si mesmas. */}
            <Route
              path="/completar-perfil/telefone"
              element={
                <ProtectedRoute>
                  <CompletePhone />
                </ProtectedRoute>
              }
            />
            <Route
              path="/completar-perfil/localizacao"
              element={
                <ProtectedRoute>
                  <CompleteLocation />
                </ProtectedRoute>
              }
            />

            <Route
              path="/perfil"
              element={
                <ProtectedRoute>
                  <OnboardingGate>
                    <Profile />
                  </OnboardingGate>
                </ProtectedRoute>
              }
            />

            {/* Fase 2/3 (Backend Fase 3): descoberta de profissionais e ciclo de vida
                de pedidos. Sem requireRole no backend, mas a navegação (Home.tsx) só
                mostra o link certo consoante profile.role — ver nota em
                NearbyServiceRequests.tsx. */}
            <Route
              path="/profissionais"
              element={
                <ProtectedRoute>
                  <OnboardingGate>
                    <FindProfessionals />
                  </OnboardingGate>
                </ProtectedRoute>
              }
            />
            <Route
              path="/os-meus-pedidos"
              element={
                <ProtectedRoute>
                  <OnboardingGate>
                    <MyServiceRequests />
                  </OnboardingGate>
                </ProtectedRoute>
              }
            />
            <Route
              path="/pedidos-proximos"
              element={
                <ProtectedRoute>
                  <OnboardingGate>
                    <NearbyServiceRequests />
                  </OnboardingGate>
                </ProtectedRoute>
              }
            />

            {/* Backend Fase 4: verificação de identidade. Sem requireRole no
                backend (qualquer utilizador autenticado pode submeter o próprio
                KYC) — mesma decisão de FindProfessionals/NearbyServiceRequests: o
                link em Home.tsx só aparece para profile.role === 'PROFESSIONAL'. */}
            <Route
              path="/verificacao-identidade"
              element={
                <ProtectedRoute>
                  <OnboardingGate>
                    <Kyc />
                  </OnboardingGate>
                </ProtectedRoute>
              }
            />

            {/* TRD Adendo v1.6: painel mínimo para ADMIN rever KYC. Sem
                OnboardingGate — um ADMIN não passa pelo onboarding de
                telefone/localização de CLIENT/PROFESSIONAL. O guard de role real
                está dentro do próprio componente (ver AdminKyc.tsx). */}
            <Route
              path="/admin/kyc"
              element={
                <ProtectedRoute>
                  <AdminKyc />
                </ProtectedRoute>
              }
            />

            {/* TRD Adendo v1.8: mesma convenção do painel de KYC acima — guard de
                role dentro do próprio componente (ver AdminAuditLog.tsx). */}
            <Route
              path="/admin/audit-log"
              element={
                <ProtectedRoute>
                  <AdminAuditLog />
                </ProtectedRoute>
              }
            />

            {/* TRD Adendo v1.9, item B — mesma convenção dos ecrãs de admin acima. */}
            <Route
              path="/admin/utilizadores"
              element={
                <ProtectedRoute>
                  <AdminUsers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/utilizadores/:id"
              element={
                <ProtectedRoute>
                  <AdminUserDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/pedidos-servico"
              element={
                <ProtectedRoute>
                  <AdminServiceRequests />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/metricas"
              element={
                <ProtectedRoute>
                  <AdminMetrics />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
