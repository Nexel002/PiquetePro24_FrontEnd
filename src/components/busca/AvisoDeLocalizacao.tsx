import { Button } from '../ui/Button'

interface AvisoDeLocalizacaoProps {
  falhou: boolean
  aLocalizar: boolean
  aoLocalizar: () => void
}

// Só se mostra sem coordenadas: a lista funciona na mesma, mas sem distâncias nem a secção
// «Perto de ti».
export function AvisoDeLocalizacao({ falhou, aLocalizar, aoLocalizar }: AvisoDeLocalizacaoProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200/80 bg-white p-4 shadow-card">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-piquete-blue/10 text-piquete-blue">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 21c-4.418-4.03-7-7.86-7-11a7 7 0 1114 0c0 3.14-2.582 6.97-7 11z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11.5a2 2 0 100-4 2 2 0 000 4z" />
          </svg>
        </div>
        <p className="text-xs text-piquete-gray-dark">
          {falhou
            ? 'Não foi possível obter a tua localização. A lista aparece sem distâncias.'
            : 'Ativa a localização para ver primeiro os profissionais mais próximos de ti.'}
        </p>
      </div>
      <Button type="button" size="sm" variant="outline" onClick={aoLocalizar} disabled={aLocalizar} isLoading={aLocalizar} className="shrink-0">
        Localizar
      </Button>
    </div>
  )
}
