import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { FeaturedWork } from '../../services/featuredWorks'
import { EstadoDaMontra } from './EstadoDaMontra'
import { WorkCard } from './WorkCard'

afterEach(cleanup)

function trabalho(extra: Partial<FeaturedWork> = {}): FeaturedWork {
  return {
    id: 'w1',
    title: 'Casa de banho completa',
    professional_name: 'Carlos M.',
    service_slug: 'canalizacao',
    service_name: 'Canalização',
    location: 'Maputo Cidade · KaMpfumo',
    rating_avg: 4.5,
    rating_count: 12,
    completed_jobs_count: 7,
    badge: 'Top Avaliado',
    image_url: 'https://x/w1.webp',
    ...extra,
  }
}

function cartao(work: FeaturedWork, onToggleFavorite = vi.fn()) {
  render(
    <MemoryRouter>
      <WorkCard work={work} isFavorite={false} onToggleFavorite={onToggleFavorite} />
    </MemoryRouter>,
  )
  return { onToggleFavorite }
}

describe('WorkCard', () => {
  it('mostra título, profissional, serviço, local, nota com vírgula decimal e nº de trabalhos', () => {
    cartao(trabalho())

    expect(screen.getByText('Casa de banho completa')).toBeTruthy()
    expect(screen.getByText('Carlos M.')).toBeTruthy()
    expect(screen.getByText('Canalização')).toBeTruthy()
    expect(screen.getByText('Maputo Cidade · KaMpfumo')).toBeTruthy()
    expect(screen.getByText('★ 4,5')).toBeTruthy()
    expect(screen.getByText('(12)')).toBeTruthy()
    expect(screen.getByText('7 trabalhos')).toBeTruthy()
    expect(screen.getByText('Top Avaliado')).toBeTruthy()
  })

  it('leva à pesquisa do serviço (a resposta pública não traz o id do profissional)', () => {
    cartao(trabalho())

    expect(screen.getByRole('link', { name: 'Casa de banho completa' }).getAttribute('href')).toBe('/profissionais?category=canalizacao')
  })

  it('sem avaliações não inventa nota: diz «Sem avaliações»', () => {
    cartao(trabalho({ rating_avg: null, rating_count: 0 }))

    expect(screen.getByText('Sem avaliações')).toBeTruthy()
    expect(screen.queryByText(/★/)).toBeNull()
  })

  it('mostra o selo «Verificado» e um trabalho diz «trabalho» no singular', () => {
    cartao(trabalho({ badge: 'Verificado', completed_jobs_count: 1 }))

    expect(screen.getByText('Verificado')).toBeTruthy()
    expect(screen.queryByText('Top Avaliado')).toBeNull()
    expect(screen.getByText('1 trabalho')).toBeTruthy()
  })

  it('o coração entrega o id do trabalho e o nome do profissional', () => {
    const { onToggleFavorite } = cartao(trabalho())

    fireEvent.click(screen.getByRole('button', { name: 'Adicionar aos favoritos' }))

    expect(onToggleFavorite).toHaveBeenCalledWith('w1', 'Carlos M.')
  })
})

describe('EstadoDaMontra', () => {
  function estado(valor: 'a-carregar' | 'erro' | 'vazio', aoTentarDeNovo = vi.fn()) {
    render(
      <MemoryRouter>
        <EstadoDaMontra estado={valor} aoTentarDeNovo={aoTentarDeNovo} />
      </MemoryRouter>,
    )
    return { aoTentarDeNovo }
  }

  it('a carregar: esqueleto marcado como ocupado', () => {
    estado('a-carregar')

    expect(screen.getByLabelText('A carregar trabalhos em destaque').getAttribute('aria-busy')).toBe('true')
  })

  it('erro: mensagem compreensível e «Tentar de novo» chama a repetição', () => {
    const { aoTentarDeNovo } = estado('erro')

    expect(screen.getByRole('alert').textContent).toMatch(/Não foi possível carregar os trabalhos em destaque/)
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))

    expect(aoTentarDeNovo).toHaveBeenCalledTimes(1)
  })

  it('vazio: diz que ainda não há trabalhos (e não que houve erro)', () => {
    estado('vazio')

    expect(screen.getByText('Ainda não há trabalhos publicados.')).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
