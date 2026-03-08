'use client'

import type { GmdPotential } from '@/lib/genetic-score'

interface GeneticBadgeProps {
  score: number
  confidence: number
  weighing_count: number
  genetic_group: string
  gmd_potential: GmdPotential
  gmd_adjusted: number
  gmd_by_phase?: { recria: number; engorda: number; confinamento: number }
}

export default function GeneticBadge({
  score, confidence, weighing_count, genetic_group,
  gmd_potential, gmd_adjusted, gmd_by_phase,
}: GeneticBadgeProps) {
  const potentialConfig: Record<GmdPotential, { label: string; color: string; bg: string; border: string }> = {
    baixo: { label: 'Baixo', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
    medio: { label: 'Medio', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
    alto: { label: 'Alto', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
    elite: { label: 'Elite', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  }

  const pot = potentialConfig[gmd_potential] || potentialConfig.medio

  const groupIcons: Record<string, string> = {
    zebuino: '\uD83D\uDC02',
    taurino: '\uD83D\uDC04',
    cruzamento: '\uD83D\uDD00',
    leite: '\uD83E\uDD5B',
  }

  const groupLabels: Record<string, string> = {
    zebuino: 'Zebuino',
    taurino: 'Taurino',
    cruzamento: 'Cruzamento',
    leite: 'Leite',
  }

  const icon = groupIcons[genetic_group] || groupIcons['zebuino']
  const label = groupLabels[genetic_group] || 'Desconhecido'

  const getBarColor = (s: number) => {
    if (s >= 81) return 'bg-orange-500'
    if (s >= 56) return 'bg-green-500'
    if (s >= 31) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const fmtGmd = (v: number) => v.toFixed(3).replace('.', ',')

  return (
    <div className="bg-gray-800/50 rounded-xl p-4 space-y-3">
      {/* Header: Score + Potencial */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <div>
            <span className="text-xs text-gray-400 uppercase font-semibold">Score Genetico</span>
            <span className="text-xs text-gray-600 ml-2">{label}</span>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-bold ${pot.bg} ${pot.border} border ${pot.color}`}>
          {pot.label}
        </div>
      </div>

      {/* Barra de progresso */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className={`text-2xl font-extrabold ${pot.color}`}>
            {Math.round(score)}
          </span>
          <span className="text-xs text-gray-500">
            Confianca: {Math.round(confidence)}%
          </span>
        </div>
        <div className="h-2.5 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${getBarColor(score)}`}
            style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
          ></div>
        </div>
      </div>

      {/* GMD ajustado */}
      <div className="flex items-center justify-between bg-black/20 rounded-lg p-3">
        <div>
          <p className="text-xs text-gray-500">GMD ajustado</p>
          <p className={`text-lg font-bold ${pot.color}`}>{fmtGmd(gmd_adjusted)} kg/dia</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Potencial GMD</p>
          <p className={`text-sm font-bold ${pot.color}`}>{pot.label}</p>
        </div>
      </div>

      {/* GMD por fase */}
      {gmd_by_phase && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Recria', value: gmd_by_phase.recria },
            { label: 'Engorda', value: gmd_by_phase.engorda },
            { label: 'Confin.', value: gmd_by_phase.confinamento },
          ].map(item => (
            <div key={item.label} className="bg-black/20 rounded-lg p-2 text-center">
              <p className="text-xs text-gray-500">{item.label}</p>
              <p className="text-sm font-bold text-white">{fmtGmd(item.value)}</p>
              <p className="text-xs text-gray-600">kg/dia</p>
            </div>
          ))}
        </div>
      )}

      {/* Fonte dos dados */}
      <p className="text-xs text-gray-600">
        {weighing_count > 0
          ? `Baseado em ${weighing_count} pesagem${weighing_count > 1 ? 's' : ''} reais`
          : 'Baseado no cadastro — pese para aumentar a precisao'}
      </p>
    </div>
  )
}
