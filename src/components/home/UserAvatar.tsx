interface UserAvatarProps {
  nome: string
  avatarUrl?: string | null
  className?: string
}

// O tamanho vem de fora (`className`) para o mesmo avatar servir o cabeçalho compacto do
// telemóvel e a pílula com nome do desktop.
export function UserAvatar({ nome, avatarUrl, className = 'w-10 h-10 text-sm' }: UserAvatarProps) {
  return (
    <span className={`block rounded-full overflow-hidden shrink-0 bg-slate-200 ${className}`}>
      {avatarUrl ? (
        <img src={avatarUrl} alt={nome} className="w-full h-full object-cover" />
      ) : (
        <span
          aria-hidden="true"
          className="w-full h-full bg-gradient-to-br from-piquete-blue to-emerald-700 text-white font-bold flex items-center justify-center"
        >
          {nome.charAt(0).toUpperCase()}
        </span>
      )}
    </span>
  )
}
