export function Estrela({ filled, className = 'h-4 w-4' }: { filled: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className={`${className} ${filled ? 'text-piquete-yellow' : 'text-gray-200'}`} fill="currentColor">
      <path d="M10 1.5l2.6 5.28 5.82.85-4.21 4.1.99 5.8L10 14.77 4.8 17.53l.99-5.8-4.21-4.1 5.82-.85L10 1.5z" />
    </svg>
  )
}

export function Stars({ rating, className }: { rating: number; className?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${rating} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <Estrela key={value} filled={value <= Math.round(rating)} className={className} />
      ))}
    </span>
  )
}
