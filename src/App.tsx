import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Home } from './pages/Home'
import { Login } from './pages/Login'
import { AuthCallback } from './pages/AuthCallback'
import { Profile } from './pages/Profile'
import { CompletePhone } from './pages/onboarding/CompletePhone'
import { CompleteLocation } from './pages/onboarding/CompleteLocation'
import { FindProfessionals } from './pages/FindProfessionals'
import { MyServiceRequests } from './pages/MyServiceRequests'
import { NearbyServiceRequests } from './pages/NearbyServiceRequests'
import { ProtectedRoute } from './components/ProtectedRoute'
import { OnboardingGate } from './components/OnboardingGate'
import { AuthProvider } from './store/AuthContext'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/entrar" element={<Login />} />
            <Route path="/auth/callback" element={<AuthCallback />} />

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

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
