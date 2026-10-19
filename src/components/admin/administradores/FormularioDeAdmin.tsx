import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { useAddAdmin } from '../../../hooks/useAdminAccounts'
import type { AddAdminResult } from '../../../services/adminAccounts'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { CampoDeTexto } from '../estrutura/CamposDeFormulario'
import { IconeDeAdmin } from '../estrutura/IconeDeAdmin'

// O resultado sobe para a página porque a palavra-passe provisória se mostra fora do formulário,
// por cima de tudo, e uma só vez.
export function FormularioDeAdmin({ aoAdicionar }: { aoAdicionar: (resultado: AddAdminResult) => void }) {
  const adicionar = useAddAdmin()
  const [email, setEmail] = useState('')
  const [nome, setNome] = useState('')

  function submeter(event: FormEvent) {
    event.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email.trim()) || nome.trim().length < 2) {
      toast.error('Indica um email válido e o nome completo.')
      return
    }
    adicionar.mutate(
      { email: email.trim(), full_name: nome.trim() },
      {
        onSuccess: (resultado) => {
          aoAdicionar(resultado)
          setEmail('')
          setNome('')
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Não foi possível adicionar o administrador.'),
      },
    )
  }

  return (
    <Card variant="solid" className="p-5 border border-slate-200 shadow-none bg-slate-50/50">
      <form onSubmit={submeter} noValidate className="flex flex-col gap-3">
        <div className="flex items-center gap-2 mb-1">
          <IconeDeAdmin nome="adicionarPessoa" className="w-4 h-4 text-piquete-blue" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">Adicionar administrador</h3>
        </div>

        <CampoDeTexto
          rotulo="Nome completo"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          maxLength={100}
          placeholder="ex. Ana Maria Silveira"
        />
        <CampoDeTexto
          rotulo="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ex. admin@piquetepro.co.mz"
        />

        <p className="text-xs text-slate-500 leading-relaxed bg-white/60 p-2.5 rounded-lg border border-slate-100">
          Se o email já tem conta de cliente, essa conta passa a administrador. Se não tem, é criada com uma palavra-passe provisória.
          Contas de profissional não se promovem.
        </p>

        <Button type="submit" size="sm" className="self-start mt-1" isLoading={adicionar.isPending} disabled={adicionar.isPending}>
          Adicionar administrador
        </Button>
      </form>
    </Card>
  )
}
