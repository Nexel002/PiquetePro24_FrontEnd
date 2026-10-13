import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import { Home } from './pages/Home'
import { Login } from './pages/Login'
import { AuthCallback } from './pages/AuthCallback'
import { ProtectedRoute } from './components/ProtectedRoute'
import { RotaDeAdmin } from './components/admin/RotaDeAdmin'
import { OnboardingGate } from './components/OnboardingGate'
import { AuthProvider } from './store/AuthContext'
import { IndicadorDeLigacao } from './components/IndicadorDeLigacao'
import { AvisoDeNovaVersao } from './components/AvisoDeNovaVersao'
import { PaginaACarregar } from './components/PaginaACarregar'
import { ErroDeEcraPorRota } from './components/ErroDeEcra'
import { ProcessadorDaFila } from './components/ProcessadorDaFila'

// Code-splitting por rota (Fase 6): cada ecrã é descarregado ao entrar nele, em vez de o
// telemóvel receber os ~30 de uma vez — o painel de admin, por exemplo, só interessa a quem é admin.
const Terms = lazy(() => import('./pages/Terms').then((m) => ({ default: m.Terms })))
const Profile = lazy(() => import('./pages/Profile').then((m) => ({ default: m.Profile })))
const CompletePhone = lazy(() => import('./pages/onboarding/CompletePhone').then((m) => ({ default: m.CompletePhone })))
const CompleteLocation = lazy(() => import('./pages/onboarding/CompleteLocation').then((m) => ({ default: m.CompleteLocation })))
const FindProfessionals = lazy(() => import('./pages/FindProfessionals').then((m) => ({ default: m.FindProfessionals })))
const MyProfessionals = lazy(() => import('./pages/MyProfessionals').then((m) => ({ default: m.MyProfessionals })))
const MyServiceRequests = lazy(() => import('./pages/MyServiceRequests').then((m) => ({ default: m.MyServiceRequests })))
const NearbyServiceRequests = lazy(() => import('./pages/NearbyServiceRequests').then((m) => ({ default: m.NearbyServiceRequests })))
const Kyc = lazy(() => import('./pages/Kyc').then((m) => ({ default: m.Kyc })))
const Subscription = lazy(() => import('./pages/Subscription').then((m) => ({ default: m.Subscription })))
const AssignedServiceRequests = lazy(() => import('./pages/AssignedServiceRequests').then((m) => ({ default: m.AssignedServiceRequests })))
const MyCatalog = lazy(() => import('./pages/MyCatalog').then((m) => ({ default: m.MyCatalog })))
const NewServiceRequest = lazy(() => import('./pages/NewServiceRequest').then((m) => ({ default: m.NewServiceRequest })))
const ReceivedInvitations = lazy(() => import('./pages/ReceivedInvitations').then((m) => ({ default: m.ReceivedInvitations })))
const RequestProposals = lazy(() => import('./pages/RequestProposals').then((m) => ({ default: m.RequestProposals })))
const ProfessionalCatalog = lazy(() => import('./pages/ProfessionalCatalog').then((m) => ({ default: m.ProfessionalCatalog })))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then((m) => ({ default: m.AdminDashboard })))
const AdminKyc = lazy(() => import('./pages/AdminKyc').then((m) => ({ default: m.AdminKyc })))
const AdminAuditLog = lazy(() => import('./pages/AdminAuditLog').then((m) => ({ default: m.AdminAuditLog })))
const AdminUsers = lazy(() => import('./pages/AdminUsers').then((m) => ({ default: m.AdminUsers })))
const AdminUserDetail = lazy(() => import('./pages/AdminUserDetail').then((m) => ({ default: m.AdminUserDetail })))
const AdminServiceRequests = lazy(() => import('./pages/AdminServiceRequests').then((m) => ({ default: m.AdminServiceRequests })))
const AdminMetrics = lazy(() => import('./pages/AdminMetrics').then((m) => ({ default: m.AdminMetrics })))
const DefinirNovaPassword = lazy(() => import('./pages/DefinirNovaPassword').then((m) => ({ default: m.DefinirNovaPassword })))

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-center" richColors closeButton />
      <IndicadorDeLigacao />
      <AvisoDeNovaVersao />
      <AuthProvider>
        <ProcessadorDaFila />
        <BrowserRouter>
          <ErroDeEcraPorRota>
          <Suspense fallback={<PaginaACarregar />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/entrar" element={<Login />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/termos" element={<Terms />} />

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
            {/* Backend Fase 11, Bloco C: histórico de profissionais do cliente. */}
            <Route
              path="/os-meus-profissionais"
              element={
                <ProtectedRoute>
                  <OnboardingGate>
                    <MyProfessionals />
                  </OnboardingGate>
                </ProtectedRoute>
              }
            />
            {/* Backend Fase 11, Bloco B (TRD Adendo v1.18): pedido a vários profissionais e
                propostas. /novo-pedido depende do estado de navegação vindo da pesquisa
                (sem ele volta à pesquisa); /pedidos-recebidos tem o guard de role dentro
                do componente, como as outras rotas de profissional. */}
            <Route
              path="/novo-pedido"
              element={
                <ProtectedRoute>
                  <OnboardingGate>
                    <NewServiceRequest />
                  </OnboardingGate>
                </ProtectedRoute>
              }
            />
            <Route
              path="/os-meus-pedidos/:id/propostas"
              element={
                <ProtectedRoute>
                  <OnboardingGate>
                    <RequestProposals />
                  </OnboardingGate>
                </ProtectedRoute>
              }
            />
            <Route
              path="/pedidos-recebidos"
              element={
                <ProtectedRoute>
                  <OnboardingGate>
                    <ReceivedInvitations />
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

            {/* Backend Fase 5 (TRD Adendo v1.12): subscrição e trabalhos aceites. O
                backend exige role PROFESSIONAL em /subscriptions; o link em Home.tsx
                só aparece a profissionais, mesma convenção das rotas acima. */}
            <Route
              path="/subscricao"
              element={
                <ProtectedRoute>
                  <OnboardingGate>
                    <Subscription />
                  </OnboardingGate>
                </ProtectedRoute>
              }
            />
            <Route
              path="/trabalhos-aceites"
              element={
                <ProtectedRoute>
                  <OnboardingGate>
                    <AssignedServiceRequests />
                  </OnboardingGate>
                </ProtectedRoute>
              }
            />

            {/* Backend Fase 10 (TRD Adendo v1.17): catálogo do profissional. Guard de
                role dentro do próprio componente (MyCatalog.tsx), mesma convenção de
                Kyc.tsx/Subscription.tsx — o link em Home.tsx só aparece a
                profissionais. /profissionais/:id é visível a qualquer role
                autenticado (sem link público — ver Adendo v1.17, item B). */}
            <Route
              path="/catalogo"
              element={
                <ProtectedRoute>
                  <OnboardingGate>
                    <MyCatalog />
                  </OnboardingGate>
                </ProtectedRoute>
              }
            />
            <Route
              path="/profissionais/:id"
              element={
                <ProtectedRoute>
                  <OnboardingGate>
                    <ProfessionalCatalog />
                  </OnboardingGate>
                </ProtectedRoute>
              }
            />

            {/* TRD Adendo v1.39 / Fase 12: entrada única do admin. */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <RotaDeAdmin>
                    <AdminDashboard />
                  </RotaDeAdmin>
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
                  <RotaDeAdmin>
                    <AdminKyc />
                  </RotaDeAdmin>
                </ProtectedRoute>
              }
            />

            {/* TRD Adendo v1.8: mesma convenção do painel de KYC acima — guard de
                role dentro do próprio componente (ver AdminAuditLog.tsx). */}
            <Route
              path="/admin/audit-log"
              element={
                <ProtectedRoute>
                  <RotaDeAdmin>
                    <AdminAuditLog />
                  </RotaDeAdmin>
                </ProtectedRoute>
              }
            />

            {/* TRD Adendo v1.9, item B — mesma convenção dos ecrãs de admin acima. */}
            <Route
              path="/admin/utilizadores"
              element={
                <ProtectedRoute>
                  <RotaDeAdmin>
                    <AdminUsers />
                  </RotaDeAdmin>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/utilizadores/:id"
              element={
                <ProtectedRoute>
                  <RotaDeAdmin>
                    <AdminUserDetail />
                  </RotaDeAdmin>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/pedidos-servico"
              element={
                <ProtectedRoute>
                  <RotaDeAdmin>
                    <AdminServiceRequests />
                  </RotaDeAdmin>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/metricas"
              element={
                <ProtectedRoute>
                  <RotaDeAdmin>
                    <AdminMetrics />
                  </RotaDeAdmin>
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
          </ErroDeEcraPorRota>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
