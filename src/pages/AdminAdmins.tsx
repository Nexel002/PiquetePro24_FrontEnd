import { useState } from 'react'
import { ConteudoDoSeparador } from '../components/admin/estrutura/ConteudoDoSeparador'
import { ACarregar, ErroAoCarregar } from '../components/admin/estrutura/EstadosDaLista'
import { CredenciaisNovas } from '../components/admin/administradores/CredenciaisNovas'
import { FormularioDeAdmin } from '../components/admin/administradores/FormularioDeAdmin'
import { LinhaDeAdmin } from '../components/admin/administradores/LinhaDeAdmin'
import { useAdmins } from '../hooks/useAdminAccounts'
import { useProfile } from '../hooks/useProfile'
import type { AddAdminResult } from '../services/adminAccounts'

export function AdminAdmins() {
  const { data: admins, isLoading, isError } = useAdmins()
  const { data: perfil } = useProfile()
  const [resultado, setResultado] = useState<AddAdminResult | null>(null)

  return (
    <ConteudoDoSeparador
      icone="grupo"
      titulo="Administradores"
      subtitulo={
        admins
          ? `${admins.length} ${admins.length === 1 ? 'membro' : 'membros'} com privilégios totais de gestão`
          : 'Utilizadores com privilégios totais de gestão e supervisão do sistema'
      }
      selo="Acesso crítico"
      iconeDoSelo="cadeado"
    >
      <div className="border-t border-slate-100 p-4 sm:p-6 flex flex-col gap-6">
        {resultado && <CredenciaisNovas resultado={resultado} aoFechar={() => setResultado(null)} />}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5">
            <FormularioDeAdmin aoAdicionar={setResultado} />
          </div>

          <section className="lg:col-span-7 flex flex-col gap-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Administradores atuais</h3>

            {isLoading && <ACarregar blocos={1} bloco="h-28" />}

            {isError && <ErroAoCarregar>Não foi possível carregar os administradores. Verifica a tua ligação e tenta novamente.</ErroAoCarregar>}

            {admins && (
              <ul className="flex flex-col gap-3">
                {admins.map((conta) => (
                  <li key={conta.id}>
                    <LinhaDeAdmin conta={conta} ehEu={conta.id === perfil?.id} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </ConteudoDoSeparador>
  )
}
