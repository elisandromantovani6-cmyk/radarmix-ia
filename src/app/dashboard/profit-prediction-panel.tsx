'use client'

import { useState } from 'react'

export default function ProfitPredictionPanel({ herdId }: { herdId: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [showSystems, setShowSystems] = useState(false)

  const fetchPrediction = async () => {
    if (data) {
      setExpanded(!expanded)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/profit-prediction?herd_id=${herdId}`)
      const json = await res.json()
      if (res.ok) {
        setData(json)
        setExpanded(true)
      }
    } catch (err) {}
    setLoading(false)
  }

  const profitColor = (value: number) => value > 0 ? 'text-green-400' : 'text-red-400'
  const probColor = (prob: number) => {
    if (prob >= 80) return 'text-green-400'
    if (prob >= 50) return 'text-amber-400'
    return 'text-red-400'
  }

  return (
    <div className="card p-4">
      <button
        className="w-full flex items-center justify-between"
        onClick={fetchPrediction}
        disabled={loading}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">&#x1F4C8;</span>
          <div className="text-left">
            <p className="text-sm font-semibold text-white">Previsao de Lucro IA</p>
            <p className="text-[12px] text-zinc-500">Monte Carlo com cenarios e ponto de equilibrio</p>
          </div>
        </div>
        <span className="text-[12px] text-orange-400">
          {loading ? 'Calculando...' : expanded ? '&#9650; Fechar' : '&#9660; Prever'}
        </span>
      </button>

      {expanded && data && (
        <div className="mt-4 space-y-3">
          {/* Probabilidade de lucro */}
          <div className="bg-white/[0.03] rounded-lg p-4 text-center">
            <p className="text-[12px] text-zinc-500 uppercase mb-1">Probabilidade de Lucro</p>
            <p className={"text-4xl font-extrabold " + probColor(data.prediction.probability_of_profit)}>
              {data.prediction.probability_of_profit}%
            </p>
            <p className="text-[12px] text-zinc-500 mt-1">
              Intervalo: R$ {data.prediction.confidence_interval.p10.toLocaleString('pt-BR')} a R$ {data.prediction.confidence_interval.p90.toLocaleString('pt-BR')} /cab
            </p>
            <p className="text-[12px] text-zinc-600">
              Mediana: R$ {data.prediction.confidence_interval.p50.toLocaleString('pt-BR')} /cab
            </p>
          </div>

          {/* Projeção */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white/[0.03] rounded-lg p-3 text-center">
              <p className="text-[12px] text-zinc-500">Dias ate abate</p>
              <p className="text-lg font-bold text-white">{data.prediction.days_to_target}</p>
            </div>
            <div className="bg-white/[0.03] rounded-lg p-3 text-center">
              <p className="text-[12px] text-zinc-500">Lucro total</p>
              <p className={"text-lg font-bold " + profitColor(data.prediction.expected_profit_total)}>
                R$ {data.prediction.expected_profit_total.toLocaleString('pt-BR')}
              </p>
            </div>
            <div className="bg-white/[0.03] rounded-lg p-3 text-center">
              <p className="text-[12px] text-zinc-500">ROI</p>
              <p className={"text-lg font-bold " + profitColor(data.prediction.expected_roi)}>
                {data.prediction.expected_roi}%
              </p>
            </div>
          </div>

          {/* Ponto de equilíbrio */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
            <p className="text-[12px] text-amber-400 font-semibold uppercase mb-2">Ponto de Equilibrio</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[12px] text-zinc-500">@ minima</p>
                <p className="text-sm font-bold text-amber-400">
                  R$ {data.prediction.breakeven.min_arroba_price.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-[12px] text-zinc-500">GMD minimo</p>
                <p className="text-sm font-bold text-amber-400">
                  {data.prediction.breakeven.min_gmd} kg/dia
                </p>
              </div>
              <div>
                <p className="text-[12px] text-zinc-500">Max dias</p>
                <p className="text-sm font-bold text-amber-400">
                  {data.prediction.breakeven.max_days}
                </p>
              </div>
            </div>
          </div>

          {/* Cenários */}
          <div className="space-y-2">
            <p className="text-[12px] text-zinc-500 font-semibold uppercase">Cenarios</p>
            {(['pessimista', 'provavel', 'otimista'] as const).map(key => {
              const s = data.prediction.scenarios[key]
              const colors: Record<string, string> = {
                pessimista: 'border-red-500/20',
                provavel: 'border-blue-500/20',
                otimista: 'border-green-500/20',
              }
              return (
                <div key={key} className={"border rounded-lg p-3 bg-white/[0.02] " + colors[key]}>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-semibold text-white">{s.label}</p>
                      <p className="text-[12px] text-zinc-500">
                        @ R$ {s.arroba_price.toFixed(0)} | GMD {s.gmd.toFixed(2)} | {s.days_to_target} dias
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={"text-sm font-bold " + profitColor(s.profit_per_head)}>
                        R$ {s.profit_per_head.toLocaleString('pt-BR')}/cab
                      </p>
                      <p className="text-[12px] text-zinc-500">ROI {s.roi_percent}%</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Comparação de sistemas */}
          <button
            className="text-[12px] text-orange-400 hover:underline"
            onClick={() => setShowSystems(!showSystems)}
          >
            {showSystems ? '&#9650; Ocultar' : '&#9660; Comparar'}: Pasto vs Semi vs Confinamento
          </button>

          {showSystems && (
            <div className="space-y-2">
              {data.prediction.system_comparison.map((sys: any, i: number) => (
                <div key={i} className="border border-white/[0.06] rounded-lg p-3 bg-white/[0.02]">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-semibold text-white">{sys.label}</p>
                      <p className="text-[12px] text-zinc-500">
                        GMD {sys.gmd} | R$ {sys.daily_cost}/dia | {sys.days_to_target} dias
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={"text-sm font-bold " + profitColor(sys.profit_per_head)}>
                        R$ {sys.profit_per_head.toLocaleString('pt-BR')}/cab
                      </p>
                      <p className="text-[12px] text-zinc-500">ROI {sys.roi_percent}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="text-[12px] text-zinc-600 text-center">
            GMD fonte: {data.gmd_source} ({data.gmd_used.toFixed(2)} kg/dia) | {data.head_count} cab | {data.phase}
          </p>
        </div>
      )}
    </div>
  )
}
