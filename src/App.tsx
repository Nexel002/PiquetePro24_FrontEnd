import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import { Home } from './pages/Home'
import { Login } from './pages/Login'
import { AuthCallback } from './pages/AuthCallback'
import { ProtectedRoute } from './components/ProtectedRoute'
import { RotaDeAdmin } from './components/admin/RotaDeAdmin'
import { RotaDeEmpresa, RotaDeTecnico } from './components/equipa/RotaDeEmpresa'
import { OnboardingGate } from './components/OnboardingGate'
import { ReencaminharParaSegundoFactor } from './components/admin/ReencaminharParaSegundoFactor'
import { ParaOSeparador } from './components/admin/layout/ParaOSeparador'
import { ROTAS_ANTIGAS } from './components/admin/layout/rotas'
import { AuthProvider } from './store/AuthContext'
import { IndicadorDeLigacao } from './components/IndicadorDeLigacao'
import { AquecerLocalizacao } from './components/AquecerLocalizacao'
import { ActualizarAoMudarDeEcra } from './components/ActualizarAoMudarDeEcra'
import { AvisoDeNovaVersao } from './components/AvisoDeNovaVersao'
import { PaginaACarregar } from './components/PaginaACarregar'
import { ErroDeEcraPorRota } from './components/ErroDeEcra'
import { ProcessadorDaFila } from './components/ProcessadorDaFila'
import { MetadadosDaPagina } from './components/MetadadosDaPagina'

// Code-splitting por rota (Fase 6): cada ecrã é descarregado ao entrar nele, em vez de o
// telemóvel receber os ~30 de uma vez — o painel de admin, por exemplo, só interessa a quem é admin.
const Terms = lazy(() => import('./pages/Terms').then((m) => ({ default: m.Terms })))
const Privacidade = lazy(() => import('./pages/Privacidade').then((m) => ({ default: m.Privacidade })))
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
const AdminKyc = lazy(() => import('./pages/AdminKyc').then((m) => ({ default: m.AdminKyc })))
const AdminUsers = lazy(() => import('./pages/AdminUsers').then((m) => ({ default: m.AdminUsers })))
const AdminUserDetail = lazy(() => import('./pages/AdminUserDetail').then((m) => ({ default: m.AdminUserDetail })))
const AdminServiceRequests = lazy(() => import('./pages/AdminServiceRequests').then((m) => ({ default: m.AdminServiceRequests })))
const AdminVisaoGeral = lazy(() => import('./pages/AdminVisaoGeral').then((m) => ({ default: m.AdminVisaoGeral })))
const AdminMais = lazy(() => import('./pages/AdminMais').then((m) => ({ default: m.AdminMais })))
const LayoutDeAdmin = lazy(() => import('./components/admin/layout/LayoutDeAdmin').then((m) => ({ default: m.LayoutDeAdmin })))
const SolicitarServico = lazy(() => import('./pages/SolicitarServico').then((m) => ({ default: m.SolicitarServico })))
const CompanyTeam = lazy(() => import('./pages/CompanyTeam').then((m) => ({ default: m.CompanyTeam })))
const TechnicianJobs = lazy(() => import('./pages/TechnicianJobs').then((m) => ({ default: m.TechnicianJobs })))
const Credentials = lazy(() => import('./pages/Credentials').then((m) => ({ default: m.Credentials })))
const RecurringRequests = lazy(() => import('./pages/RecurringRequests').then((m) => ({ default: m.RecurringRequests })))
const PaginaNaoEncontrada = lazy(() => import('./pages/PaginaNaoEncontrada').then((m) => ({ default: m.PaginaNaoEncontrada })))
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
        <AquecerLocalizacao />
        <BrowserRouter>
          <ReencaminharParaSegundoFactor />
          <ActualizarAoMudarDeEcra />
          <MetadadosDaPagina />
          <ErroDeEcraPorRota>
          <Suspense fallback={<PaginaACarregar />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/entrar" element={<Login />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/termos" element={<Terms />} />
            <Route path="/privacidade" element={<Privacidade />} />

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

            {/* Painel do Admin (Fase 34): uma só fronteira de acesso para todos os ecrãs e o layout com a
                barra lateral à volta deles. Cada secção tem separadores em `?tab=`; as rotas antigas de
                cada ferramenta redireccionam para o separador respectivo. `/admin` abre o KYC. */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <RotaDeAdmin>
                    <LayoutDeAdmin />
                  </RotaDeAdmin>
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="kyc" replace />} />
              <Route path="kyc" element={<AdminKyc />} />
              <Route path="utilizadores" element={<AdminUsers />} />
              <Route path="utilizadores/:id" element={<AdminUserDetail />} />
              <Route path="pedidos-servico" element={<AdminServiceRequests />} />
              <Route path="visao-geral" element={<AdminVisaoGeral />} />
              <Route path="mais" element={<AdminMais />} />
              {ROTAS_ANTIGAS.map((antiga) => (
                <Route
                  key={antiga.caminho}
                  path={antiga.caminho}
                  element={<ParaOSeparador seccao={antiga.seccao} separador={antiga.separador} />}
                />
              ))}
            </Route>
            {/* Fase 27: «Solicitar serviço» a um profissional. */}
            <Route
              path="/solicitar/:id"
              element={
                <ProtectedRoute>
                  <OnboardingGate>
                    <SolicitarServico />
                  </OnboardingGate>
                </ProtectedRoute>
              }
            />
            {/* Empresas e equipas (Fases 23 e 24). A equipa é só da empresa; «Os meus trabalhos» só do técnico
                (sem OnboardingGate de telefone/localização: ver OnboardingGate). */}
            <Route
              path="/equipa"
              element={
                <ProtectedRoute>
                  <OnboardingGate>
                    <RotaDeEmpresa>
                      <CompanyTeam />
                    </RotaDeEmpresa>
                  </OnboardingGate>
                </ProtectedRoute>
              }
            />
            <Route
              path="/tecnico/trabalhos"
              element={
                <ProtectedRoute>
                  <RotaDeTecnico>
                    <TechnicianJobs />
                  </RotaDeTecnico>
                </ProtectedRoute>
              }
            />

            {/* Fase 41 (N5): credenciais do profissional e do técnico. Sem OnboardingGate, como os trabalhos
                do técnico (o técnico não passa pelo onboarding de telefone/localização); o guard de papel
                está no ecrã. */}
            <Route
              path="/credenciais"
              element={
                <ProtectedRoute>
                  <Credentials />
                </ProtectedRoute>
              }
            />

            {/* Fase 42 (N3): serviços recorrentes do cliente (o endereço vem nos emails do backend). */}
            <Route
              path="/servicos-recorrentes"
              element={
                <ProtectedRoute>
                  <OnboardingGate>
                    <RecurringRequests />
                  </OnboardingGate>
                </ProtectedRoute>
              }
            />

            {/* Fase 46: endereço desconhecido mostra o 404 em vez de reencaminhar em silêncio para
                «/» — quem errou um link ficava sem saber que errou. */}
            <Route path="*" element={<PaginaNaoEncontrada />} />
          </Routes>
          </Suspense>
          </ErroDeEcraPorRota>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
