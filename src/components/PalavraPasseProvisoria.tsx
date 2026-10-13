import { toast } from 'sonner'
import { Button } from './ui/Button'
import { Card } from './ui/Card'

interface PalavraPasseProvisoriaProps {
  // «Conta criada para ana@x.test.»
  titulo: string
  palavraPasse: string
  aoFechar: () => void
}

// Mostrada uma só vez, logo a seguir a criar uma conta: o backend não guarda a palavra-passe.
// Fica no ecrã até quem a criou a fechar; recarregar a página perde-a. Partilhado entre a criação de
// administradores e a de técnicos.
export function PalavraPasseProvisoria({ titulo, palavraPasse, aoFechar }: PalavraPasseProvisoriaProps) {
  async function copiar() {
    try {
      await navigator.clipboard.writeText(palavraPasse)
      toast.success('Palavra-passe copiada.')
    } catch {
      toast.error('Não foi possível copiar. Seleciona o texto e copia à mão.')
    }
  }

  return (
    <Card variant="solid" className="flex flex-col gap-2 border-amber-200 bg-amber-50 p-4" role="status">
      <p className="text-sm font-bold text-amber-900">{titulo}</p>
      <p className="text-sm text-amber-900">Palavra-passe provisória (só aparece agora):</p>
      <code className="select-all break-all rounded-lg bg-white px-3 py-2 font-mono text-sm text-gray-900">{palavraPasse}</code>
      <p className="text-xs text-amber-800">
        Entrega-a por um canal privado e pede para a mudar no primeiro acesso (ou usar «Esqueci a palavra-passe»). Depois de fechares isto,
        não há como voltar a vê-la.
      </p>
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={copiar}>
          Copiar
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={aoFechar}>
          Já guardei, fechar
        </Button>
      </div>
    </Card>
  )
}
