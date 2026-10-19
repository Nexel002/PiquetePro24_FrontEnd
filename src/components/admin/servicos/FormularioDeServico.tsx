import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { palavrasChaveDe, type AdminCategory } from '../../../services/adminCategories'
import { Button } from '../../ui/Button'
import { CampoDeTexto } from '../estrutura/CamposDeFormulario'

interface FormularioDeServicoProps {
  inicial?: AdminCategory
  rotuloDoBotao: string
  aGuardar: boolean
  aoGuardar: (dados: { name: string; keywords: string[] }) => void
  aoCancelar?: () => void
}

// Serve para criar e para editar. O slug não está aqui de propósito: nunca muda depois de criado.
export function FormularioDeServico({ inicial, rotuloDoBotao, aGuardar, aoGuardar, aoCancelar }: FormularioDeServicoProps) {
  const [nome, setNome] = useState(inicial?.name ?? '')
  const [palavras, setPalavras] = useState(inicial?.keywords.join(', ') ?? '')

  function submeter(event: FormEvent) {
    event.preventDefault()
    if (nome.trim().length < 2) {
      toast.error('O nome do serviço precisa de pelo menos 2 caracteres.')
      return
    }
    aoGuardar({ name: nome.trim(), keywords: palavrasChaveDe(palavras) })
  }

  return (
    <form onSubmit={submeter} className="flex flex-col gap-3">
      <CampoDeTexto rotulo="Nome do serviço" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={60} />
      <CampoDeTexto
        rotulo="Palavras de pesquisa (separadas por vírgulas)"
        value={palavras}
        onChange={(e) => setPalavras(e.target.value)}
        placeholder="canalizador, encanador, torneira"
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" isLoading={aGuardar} disabled={aGuardar}>
          {rotuloDoBotao}
        </Button>
        {aoCancelar && (
          <Button type="button" variant="ghost" size="sm" onClick={aoCancelar}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  )
}
