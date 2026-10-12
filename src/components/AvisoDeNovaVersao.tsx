import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { carregarNovidades, formatarData, type Novidades } from '../lib/novidades'
import { dispensarNovaVersao, useNovaVersao } from '../lib/novaVersao'
import { Button } from './ui/Button'

// Aviso de nova versão ao centro do ecrã, com a data e um resumo do que mudou em linguagem
// simples (public/novidades.json). Substitui o pequeno aviso no canto: quem deixa a app aberta
// dias raramente o via, e sem dizer o que mudou ninguém tinha motivo para carregar nele.
//
// Não bloqueia: «Mais tarde» fecha-o. Actualizar recarrega a página, e é por isso que nunca
// acontece sozinho (ver lib/pwaUpdate.ts) — um formulário a meio perder-se-ia.
export function AvisoDeNovaVersao() {
  const { aoAceitar } = useNovaVersao()
  if (!aoAceitar) return null
  return <Cartao aoAceitar={aoAceitar} />
}

function Cartao({ aoAceitar }: { aoAceitar: () => void }) {
  const [novidades, setNovidades] = useState<Novidades | null>(null)
  const [aActualizar, setAActualizar] = useState(false)
  // O Button do projecto não encaminha refs (React 18, sem forwardRef): os botões são
  // procurados a partir do cartão.
  const cartao = useRef<HTMLDivElement>(null)
  const botoes = () => Array.from(cartao.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])

  useEffect(() => {
    let cancelado = false
    void carregarNovidades().then((resultado) => {
      if (!cancelado) setNovidades(resultado)
    })
    return () => {
      cancelado = true
    }
  }, [])

  // Foco no botão principal ao abrir, para o teclado e o leitor de ecrã começarem aqui.
  useEffect(() => {
    botoes()[0]?.focus()
  }, [])

  function aoPremirTecla(evento: KeyboardEvent) {
    if (evento.key === 'Escape') {
      dispensarNovaVersao()
      return
    }
    // Prende o Tab entre os dois botões enquanto o aviso está aberto (aria-modal).
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

  function actualizar() {
    setAActualizar(true)
    aoAceitar()
  }

  const temNovidades = novidades !== null && novidades.novidades.length > 0

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onClick={(evento) => {
        if (evento.target === evento.currentTarget) dispensarNovaVersao()
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
              Nova versão disponível
            </h2>
            {novidades && (
              <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-piquete-gray-dark">
                Actualização de {formatarData(novidades.atualizadoEm)}
              </p>
            )}
          </div>
        </div>

        <div id="descricao-nova-versao" className="mt-4">
          {temNovidades ? (
            <>
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
            </>
          ) : (
            <p className="text-center text-sm text-gray-700">Melhorámos a aplicação. Actualiza para teres a versão mais recente.</p>
          )}
          <p className="mt-3 text-center text-xs text-piquete-gray-dark">A página vai recarregar. Se estiveres a preencher algo, escolhe «Mais tarde» e termina primeiro.</p>
        </div>

        <div className="mt-5 flex flex-col gap-2">
          <Button type="button" size="lg" onClick={actualizar} disabled={aActualizar} isLoading={aActualizar} className="w-full">
            {aActualizar ? 'A actualizar…' : 'Actualizar agora'}
          </Button>
          <Button type="button" variant="ghost" onClick={dispensarNovaVersao} disabled={aActualizar} className="w-full">
            Mais tarde
          </Button>
        </div>
      </div>
    </div>
  )
}
