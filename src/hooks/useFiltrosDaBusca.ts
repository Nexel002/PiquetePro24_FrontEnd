import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

const SEARCH_DEBOUNCE_MS = 350

// Os filtros vivem no URL (?q=&category=) para a pesquisa poder ser partilhada e para o
// «voltar» do browser a repor. O texto digitado fica à parte e só passa para o URL depois de
// uma pausa: sem isso cada tecla seria uma pesquisa à API.
export function useFiltrosDaBusca() {
  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get('q') ?? ''
  const category = searchParams.get('category') ?? ''
  const [text, setText] = useState(q)

  const applyText = useCallback(
    (value: string) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current)
          if (value.trim()) next.set('q', value.trim())
          else next.delete('q')
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  useEffect(() => {
    if (text.trim() === q) return
    const handle = setTimeout(() => applyText(text), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(handle)
  }, [text, q, applyText])

  // «Pesquisar» (botão ou Enter) aplica já o texto, sem esperar pela pausa.
  function search() {
    applyText(text)
  }

  // Tocar na categoria já escolhida desliga o filtro.
  function selectCategory(slug: string) {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        if (slug && slug !== category) next.set('category', slug)
        else next.delete('category')
        return next
      },
      { replace: true },
    )
  }

  return { q, category, text, setText, search, selectCategory }
}
