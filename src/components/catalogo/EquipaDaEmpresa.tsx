import type { PublicTeamMember } from '../../services/catalog'
import { Stars } from './Estrelas'

// Secção «A equipa» do catálogo de uma empresa. O backend só envia técnicos ativos e com a
// identidade verificada, com o primeiro nome, o título, a foto e a nota: nunca telefone nem email.
// Uma empresa sem equipa (ou um profissional singular) não mostra a secção.
export function EquipaDaEmpresa({ team }: { team: PublicTeamMember[] }) {
  if (team.length === 0) return null

  return (
    <section aria-labelledby="equipa" className="flex flex-col gap-4 rounded-[2.5rem] border border-gray-100 bg-white p-6 shadow-card sm:p-7">
      <div>
        <h2 id="equipa" className="font-heading text-lg font-bold text-piquete-blue sm:text-xl">
          A equipa
        </h2>
        <p className="text-xs text-piquete-gray">Técnicos da empresa com a identidade verificada</p>
      </div>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {team.map((tecnico) => (
          <li key={tecnico.id} className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-3">
            {tecnico.avatar_url ? (
              <img src={tecnico.avatar_url} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
            ) : (
              <span aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-piquete-blue/10 text-lg font-bold text-piquete-blue">
                {tecnico.first_name.charAt(0).toUpperCase()}
              </span>
            )}
            <div className="flex min-w-0 flex-col">
              <p className="truncate text-sm font-bold text-gray-900">{tecnico.first_name}</p>
              <p className="truncate text-xs text-piquete-gray">{tecnico.title}</p>
              {tecnico.rating_avg !== null ? (
                <p className="flex items-center gap-1 text-xs text-piquete-gray">
                  <Stars rating={tecnico.rating_avg} className="h-3 w-3" />
                  <span>
                    {tecnico.rating_avg.toFixed(1)} ({tecnico.rating_count})
                  </span>
                </p>
              ) : (
                <p className="text-xs text-piquete-gray">Ainda sem avaliações</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
