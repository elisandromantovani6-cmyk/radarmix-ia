'use client'
import { useState } from 'react'
import RecommendationPanel from './recommendation-panel'
import ProgressiveQuestion from './progressive-question'
import HerdActions from './herd-actions'
import ProfitSimulator from './profit-simulator'
import WeighingPanel from './weighing-panel'
import DREPanel from './dre-panel'
import ComparePanel from './compare-panel'
import StockingRatePanel from './stocking-rate-panel'
import HealthPanel from './health-panel'
import CochoPanel from './cocho-panel'

const PHASE_LABELS: Record<string, string> = {
  cria: 'Cria', recria: 'Recria', engorda: 'Engorda', lactacao: 'Lactação',
  reproducao: 'Reprodução', inicial: 'Inicial', crescimento: 'Crescimento', postura: 'Postura', todas: 'Todas',
}
const PHASE_BADGES: Record<string, string> = {
  cria: 'badge-blue', recria: 'badge-amber', engorda: 'badge-red',
  lactacao: 'badge-purple', reproducao: 'badge-pink',
}

export default function HerdCard({ herd, allHerds }: { herd: any, allHerds: any[] }) {
  const [activePanel, setActivePanel] = useState<string | null>(null)
  const [showActions, setShowActions] = useState(false)
  const toggle = (p: string) => setActivePanel(activePanel === p ? null : p)

  return (
    <div className="card p-4 sm:p-5 group">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h4 className="text-[15px] font-bold text-white">{herd.name}</h4>
          <span className={"badge " + (PHASE_BADGES[herd.main_phase] || 'badge-orange')}>
            {PHASE_LABELS[herd.main_phase] || herd.main_phase}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[18px] font-black text-gradient">{herd.head_count}</span>
            <span className="text-[11px] text-zinc-600 ml-1">cab.</span>
          </div>
          <button onClick={() => setShowActions(!showActions)}
            aria-expanded={showActions} aria-label="Ações do lote"
            className="w-8 h-8 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-zinc-800/50 text-zinc-600 transition-colors text-[14px]">⋮</button>
        </div>
      </div>

      {/* Meta tags */}
      <div className="flex gap-1.5 overflow-x-auto hide-scrollbar pb-1 -mx-5 px-5 sm:mx-0 sm:px-0 sm:flex-wrap mb-3">
        {herd.breed && <span className="text-[11px] text-zinc-500 bg-zinc-800/40 px-2 py-0.5 rounded-md whitespace-nowrap shrink-0">{herd.breed.name}</span>}
        {herd.avg_weight_kg && <span className="text-[11px] text-zinc-500 bg-zinc-800/40 px-2 py-0.5 rounded-md whitespace-nowrap shrink-0">{herd.avg_weight_kg}kg</span>}
        {herd.forage && <span className="text-[11px] text-zinc-500 bg-zinc-800/40 px-2 py-0.5 rounded-md whitespace-nowrap shrink-0">{herd.forage.name}</span>}
        {herd.sex && <span className="text-[11px] text-zinc-500 bg-zinc-800/40 px-2 py-0.5 rounded-md whitespace-nowrap shrink-0">{herd.sex === 'macho' ? '♂ Machos' : herd.sex === 'femea' ? '♀ Fêmeas' : '⚤ Misto'}</span>}
        {herd.pasture_condition && <span className="text-[11px] text-zinc-500 bg-zinc-800/40 px-2 py-0.5 rounded-md whitespace-nowrap shrink-0">Pasto: {herd.pasture_condition}</span>}
        {herd.product && <span className="text-[11px] text-orange-400/80 bg-orange-500/8 px-2 py-0.5 rounded-md font-medium whitespace-nowrap shrink-0">{herd.product.name}</span>}
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-2 mb-1">
        <div className="flex-1 h-[3px] bg-zinc-800/60 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: (herd.profile_completeness || 0) + '%', background: 'linear-gradient(90deg, #F97316, #FBBF24)' }} />
        </div>
        <span className="text-[10px] text-zinc-600 mono font-medium">{herd.profile_completeness || 0}%</span>
      </div>

      {showActions && <HerdActions herd={herd} allHerds={allHerds} onClose={() => setShowActions(false)} />}
      <ProgressiveQuestion herd={herd} />

      {/* Action buttons */}
      <div className="mt-4 flex gap-2 overflow-x-auto hide-scrollbar pb-1 -mx-5 px-5 sm:mx-0 sm:px-0 sm:flex-wrap">
        {[
          { key: 'rec', label: 'Recomendar', active: 'bg-orange-500 text-white', idle: 'badge-orange' },
          { key: 'compare', label: '🔄 Comparar', active: 'bg-teal-500 text-white', idle: 'badge-green' },
          { key: 'sim', label: '💰 Lucro', active: 'bg-amber-500 text-white', idle: 'badge-amber' },
          { key: 'weigh', label: '⚖️ Pesar', active: 'bg-blue-500 text-white', idle: 'badge-blue' },
          { key: 'dre', label: '📊 Raio-X', active: 'bg-purple-500 text-white', idle: 'badge-purple' },
          { key: 'pasture', label: '🌿 Lotação', active: 'bg-emerald-500 text-white', idle: 'badge-green' },
          { key: 'health', label: '💉 Sanitário', active: 'bg-pink-500 text-white', idle: 'badge-pink' },
          { key: 'cocho', label: '📸 Cocho', active: 'bg-cyan-500 text-white', idle: 'badge-blue' },
        ].map(btn => (
          <button key={btn.key} onClick={() => toggle(btn.key)}
            className={"badge cursor-pointer transition-all hover:scale-[1.02] whitespace-nowrap shrink-0 " + (activePanel === btn.key ? btn.active + ' border-transparent' : btn.idle)}>
            {activePanel === btn.key ? 'Fechar' : btn.label}
          </button>
        ))}
      </div>

      {activePanel === 'rec' && <div className="slide-up"><RecommendationPanel herdId={herd.id} herdName={herd.name} /></div>}
      {activePanel === 'compare' && <div className="slide-up"><ComparePanel herdId={herd.id} herdName={herd.name} /></div>}
      {activePanel === 'sim' && <div className="slide-up"><ProfitSimulator herdId={herd.id} herdName={herd.name} /></div>}
      {activePanel === 'weigh' && <div className="slide-up"><WeighingPanel herdId={herd.id} herdName={herd.name} currentWeight={herd.avg_weight_kg} /></div>}
      {activePanel === 'dre' && <div className="slide-up"><DREPanel herdId={herd.id} herdName={herd.name} /></div>}
      {activePanel === 'pasture' && <div className="slide-up"><StockingRatePanel herdId={herd.id} herdName={herd.name} headCount={herd.head_count} avgWeight={herd.avg_weight_kg} /></div>}
      {activePanel === 'health' && <div className="slide-up"><HealthPanel herdId={herd.id} herdName={herd.name} headCount={herd.head_count} /></div>}
      {activePanel === 'cocho' && <div className="slide-up"><CochoPanel herdId={herd.id} herdName={herd.name} /></div>}
    </div>
  )
}

