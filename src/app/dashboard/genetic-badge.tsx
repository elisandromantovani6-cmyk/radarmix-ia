'use client'

interface GeneticBadgeProps {
  score: number         // 0-100
  confidence: number    // 0-100
  weighing_count: number
  genetic_group: string // 'zebuino' | 'taurino' | 'cruzamento' | 'leite'
}

export default function GeneticBadge({ score, confidence, weighing_count, genetic_group }: GeneticBadgeProps) {
  // Cor da barra baseada no score
  const getBarColor = (s: number) => {
    if (s >= 60) return 'bg-green-500'
    if (s >= 30) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getTextColor = (s: number) => {
    if (s >= 60) return 'text-green-400'
    if (s >= 30) return 'text-yellow-400'
    return 'text-red-400'
  }

  // Icone do grupo genetico
  const groupIcons: Record<string, string> = {
    zebuino: '\uD83D\uDC02',     // boi
    taurino: '\uD83D\uDC04',     // vaca
    cruzamento: '\uD83D\uDD00',  // shuffle
    leite: '\uD83E\uDD5B',       // copo de leite
  }

  const groupLabels: Record<string, string> = {
    zebuino: 'Zebuino',
    taurino: 'Taurino',
    cruzamento: 'Cruzamento',
    leite: 'Leite',
  }

  const icon = groupIcons[genetic_group] || groupIcons['zebuino']
  const label = groupLabels[genetic_group] || 'Desconhecido'
  const barColor = getBarColor(score)
  const textColor = getTextColor(score)

  return (
    <div className="bg-gray-800/50 rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <span className="text-xs text-gray-400 uppercase font-semibold">Score Genetico</span>
        </div>
        <span className="text-xs text-gray-500">{label}</span>
      </div>

      {/* Barra de progresso */}
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        ></div>
      </div>

      <div className="flex items-center justify-between">
        <span className={`text-sm font-bold ${textColor}`}>
          {Math.round(score)}/100
        </span>
        <span className="text-xs text-gray-500">
          Confianca: {Math.round(confidence)}%
        </span>
      </div>

      <p className="text-xs text-gray-600 mt-1">
        {weighing_count > 0
          ? `Baseado em ${weighing_count} pesagem${weighing_count > 1 ? 's' : ''}`
          : 'Baseado no cadastro'}
      </p>
    </div>
  )
}
