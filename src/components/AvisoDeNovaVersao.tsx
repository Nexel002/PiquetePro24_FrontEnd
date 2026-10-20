import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { formatarData, marcarNovidadesVistas, novidadesPorMostrar, type Novidades } from '../lib/novidades'
import { Button } from './ui/Button'

// «A app foi actualizada», ao centro do ecrã, com a data e o que mudou em linguagem simples. Aparece
// DEPOIS de a app se actualizar sozinha (Fase 37, lib/pwaUpdate.ts e lib/novaVersao.ts) — antes era um
// pedido de autorização, e quem não carregava em «Actualizar» (ou nunca via o aviso, que demorava a
// aparecer) ficava na versão antiga. Só informa: um botão para continuar.
export function AvisoDeNovaVersao() {
  // Lido uma vez ao abrir a app: é ao abrir (depois do recarregamento) que a versão nova começa.
  const [novidades, setNovidades] = useState<Novidades | null>(() => novidadesPorMostrar())
  if (!novidades) return null
  return (
    <Cartao
      novidades={novidades}
      aoFechar={() => {
        marcarNovidadesVistas()
        setNovidades(null)
      }}
    />
  )
}

function Cartao({ novidades, aoFechar }: { novidades: Novidades; aoFechar: () => void }) {
  // O Button do projecto não encaminha refs (React 18, sem forwardRef): os botões são
  // procurados a partir do cartão.
  const cartao = useRef<HTMLDivElement>(null)
  const botoes = () => Array.from(cartao.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])

  // Foco no botão principal ao abrir, para o teclado e o leitor de ecrã começarem aqui.
  useEffect(() => {
    botoes()[0]?.focus()
  }, [])

  function aoPremirTecla(evento: KeyboardEvent) {
    if (evento.key === 'Escape') {
      aoFechar()
      return
    }
    // Prende o Tab dentro do aviso enquanto está aberto (aria-modal).
    if (evento.key === 'Tab') {
      const [primeiro, ultimo] = [botoes()[0], botoes().at(-1)]
      if (evento.shiftKey && document.activeElement === primeiro) {
        evento.preventDefault()
        ultimo?.focus()
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault()
        primeiro?.focus()
      }
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onClick={(evento) => {
        if (evento.target === evento.currentTarget) aoFechar()
      }}
      onKeyDown={aoPremirTecla}
    >
      <div
        ref={cartao}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-nova-versao"
        aria-describedby="descricao-nova-versao"
        className="w-full max-w-sm animate-fade-in rounded-3xl bg-white p-6 shadow-2xl motion-reduce:animate-none"
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-piquete-blue to-piquete-blue-light text-white shadow-lg">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h5M20 20v-5h-5M5.6 15A7 7 0 0018.4 9M18.4 9L20 9M5.6 15L4 15" />
            </svg>
          </span>
          <div>
            <h2 id="titulo-nova-versao" className="font-heading text-xl font-bold text-piquete-blue">
              A app foi actualizada
            </h2>
            <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-piquete-gray-dark">
              Actualização de {formatarData(novidades.atualizadoEm)}
            </p>
          </div>
        </div>

        <div id="descricao-nova-versao" className="mt-4">
          <p className="text-sm font-semibold text-gray-900">O que há de novo</p>
          <ul className="mt-2 flex flex-col gap-2">
            {novidades.novidades.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                </svg>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-5">
          <Button type="button" size="lg" onClick={aoFechar} className="w-full">
            Continuar
          </Button>
        </div>
      </div>
    </div>
  )
}
