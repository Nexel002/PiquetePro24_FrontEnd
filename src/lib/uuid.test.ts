import { afterEach, describe, expect, it, vi } from 'vitest'
import { gerarUuid } from './uuid'

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('gerarUuid', () => {
  it('gera UUIDs v4 distintos', () => {
    const a = gerarUuid()
    expect(a).toMatch(UUID_V4)
    expect(gerarUuid()).not.toBe(a)
  })

  it('sem crypto.randomUUID (WebView antiga) continua a gerar um UUID v4 válido', () => {
    vi.stubGlobal('crypto', { getRandomValues: (a: Uint8Array) => a.fill(255) })
    expect(gerarUuid()).toMatch(UUID_V4)
  })
})
