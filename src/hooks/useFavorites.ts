import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'

const FAVORITES_STORAGE_KEY = 'piquetepro_favorites'

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites))
    } catch {
      // ignore storage quota errors
    }
  }, [favorites])

  const isFavorite = useCallback(
    (id: string) => favorites.includes(id),
    [favorites]
  )

  const toggleFavorite = useCallback(
    (id: string, name?: string) => {
      // O toast fica fora do updater: o React pode executá-lo duas vezes (StrictMode) e o
      // utilizador via duas notificações por cada toque no coração.
      const exists = favorites.includes(id)
      setFavorites(exists ? favorites.filter((item) => item !== id) : [...favorites, id])
      if (exists) {
        toast.info(name ? `${name} removido dos favoritos.` : 'Removido dos favoritos.')
      } else {
        toast.success(name ? `${name} adicionado aos teus favoritos!` : 'Adicionado aos favoritos!')
      }
    },
    [favorites]
  )

  return { favorites, toggleFavorite, isFavorite }
}
