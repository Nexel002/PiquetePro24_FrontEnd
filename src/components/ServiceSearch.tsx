import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useServiceCategories } from '../hooks/useServiceCategories'
import { Button } from './ui/Button'
import { Input } from './ui/Input'

const HOME_CHIPS = 6

// Campo de pesquisa de serviços do ecrã inicial do cliente (TRD Adendo v1.18): é a
// porta de entrada do fluxo — o cliente escreve "canalizador" e cai na lista de
// profissionais já filtrada. O texto viaja no URL (?q=), que é o que
// FindProfessionals.tsx lê; os atalhos de categoria usam ?category=.
export function ServiceSearch() {
  const navigate = useNavigate()
  const categories = useServiceCategories()
  const [text, setText] = useState('')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = text.trim()
    navigate(trimmed ? `/profissionais?q=${encodeURIComponent(trimmed)}` : '/profissionais')
  }

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={handleSubmit} role="search" className="flex flex-col gap-2.5">
        <Input
          type="search"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Que serviço procuras? Ex: canalizador"
          aria-label="Pesquisar serviço ou profissional"
          leftIcon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
            </svg>
          }
        />
        <Button type="submit" variant="primary" className="w-full">
          Procurar profissionais
        </Button>
      </form>

      {categories.data && categories.data.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {categories.data.slice(0, HOME_CHIPS).map((service) => (
            <Link
              key={service.id}
              to={`/profissionais?category=${encodeURIComponent(service.slug)}`}
              className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-piquete-blue transition-colors hover:border-piquete-blue/40"
            >
              {service.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
