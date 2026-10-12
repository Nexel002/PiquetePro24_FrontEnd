import { beforeEach, describe, expect, it, vi } from 'vitest'

const upload = vi.hoisted(() => vi.fn())

vi.mock('../lib/supabase', () => ({
  supabase: {
    storage: {
      from: () => ({
        upload,
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://cdn/${path}` } }),
      }),
    },
  },
}))
vi.mock('../lib/api', () => ({ api: {} }))
// A conversão usa Canvas, que o jsdom não tem; devolve o ficheiro tal como está.
vi.mock('../lib/imageConversion', () => ({ convertToWebp: async (file: File) => file }))

import { PortfolioUploadError, uploadPortfolioPhotos, validatePortfolioFile } from './portfolio'

const imagem = (nome: string) => new File(['x'], nome, { type: 'image/jpeg' })

beforeEach(() => {
  upload.mockReset()
  upload.mockResolvedValue({ error: null })
})

describe('validatePortfolioFile', () => {
  it('aceita imagens e recusa o resto e o que passa de 8 MB', () => {
    expect(validatePortfolioFile(imagem('a.jpg'))).toBeNull()
    expect(validatePortfolioFile(new File(['x'], 'a.pdf', { type: 'application/pdf' }))).toMatch(/imagem/)
    const grande = imagem('b.jpg')
    Object.defineProperty(grande, 'size', { value: 9 * 1024 * 1024 })
    expect(validatePortfolioFile(grande)).toMatch(/8 MB/)
  })
})

describe('uploadPortfolioPhotos', () => {
  it('devolve os URLs pela ordem dos ficheiros, mesmo que terminem fora de ordem', async () => {
    upload.mockImplementation(async (path: string) => {
      // A primeira foto demora mais: acaba depois das outras.
      await new Promise((resolve) => setTimeout(resolve, path.endsWith('.jpg') && upload.mock.calls.length === 1 ? 20 : 0))
      return { error: null }
    })

    const urls = await uploadPortfolioPhotos('u1', [imagem('a.jpg'), imagem('b.jpg'), imagem('c.jpg')])

    expect(urls).toHaveLength(3)
    expect(new Set(urls).size).toBe(3)
    expect(urls.every((url) => url.startsWith('https://cdn/u1/'))).toBe(true)
    const chamados = upload.mock.calls.map((call) => `https://cdn/${call[0]}`)
    expect(urls).toEqual(chamados)
  })

  it('nunca tem mais de 3 uploads em simultâneo', async () => {
    let activos = 0
    let maximo = 0
    upload.mockImplementation(async () => {
      maximo = Math.max(maximo, ++activos)
      await new Promise((resolve) => setTimeout(resolve, 5))
      activos--
      return { error: null }
    })

    await uploadPortfolioPhotos('u1', Array.from({ length: 8 }, (_, i) => imagem(`${i}.jpg`)))

    expect(maximo).toBe(3)
  })

  it('à primeira falha rejeita e deixa de arrancar novos uploads', async () => {
    upload.mockResolvedValueOnce({ error: { message: 'boom' } })

    await expect(uploadPortfolioPhotos('u1', Array.from({ length: 9 }, (_, i) => imagem(`${i}.jpg`)))).rejects.toBeInstanceOf(
      PortfolioUploadError,
    )
    expect(upload.mock.calls.length).toBeLessThan(9)
  })

  it('um ficheiro inválido rejeita sem chegar ao Storage', async () => {
    await expect(uploadPortfolioPhotos('u1', [new File(['x'], 'a.pdf', { type: 'application/pdf' })])).rejects.toThrow(/imagem/)
    expect(upload).not.toHaveBeenCalled()
  })

  it('reporta o progresso', async () => {
    const onProgress = vi.fn()

    await uploadPortfolioPhotos('u1', [imagem('a.jpg'), imagem('b.jpg')], onProgress)

    expect(onProgress).toHaveBeenLastCalledWith(2, 2)
  })
})
