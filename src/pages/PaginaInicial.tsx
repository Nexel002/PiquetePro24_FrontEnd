import { lazy, Suspense } from 'react'
import { PaginaACarregar } from '../components/PaginaACarregar'
import { useAuth } from '../store/AuthContext'
import { Home } from './Home'

// A landing só é descarregada por quem a vai ver: quem já tem sessão (o caso comum, na PWA
// instalada) não paga o seu peso.
const Landing = lazy(() => import('./Landing').then((m) => ({ default: m.Landing })))

// «/» tem dois ecrãs: a landing para visitantes e a Home para quem entrou. Enquanto a sessão se lê
// (do armazenamento local, é rápido) mostra-se o esqueleto neutro — sem ele, quem tem sessão via a
// landing por um instante antes de a Home aparecer.
export function PaginaInicial() {
  const { session, isLoading } = useAuth()

  if (isLoading) return <PaginaACarregar />
  if (session) return <Home />

  return (
    <Suspense fallback={<PaginaACarregar />}>
      <Landing />
    </Suspense>
  )
}
