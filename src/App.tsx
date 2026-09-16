import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Home } from './pages/Home'
import { Login } from './pages/Login'
import { AuthCallback } from './pages/AuthCallback'
import { Profile } from './pages/Profile'
import { CompletePhone } from './pages/onboarding/CompletePhone'
import { CompleteLocation } from './pages/onboarding/CompleteLocation'
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
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
