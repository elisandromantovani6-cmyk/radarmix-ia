'use client'

import { useState } from 'react'

export default function SellTimingPanel({ herdId }: { herdId: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const fetchData = async () => {
    if (data) {
      setExpanded(!expanded)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/sell-timing?herd_id=${herdId}`)
      const json = await res.json()
      if (res.ok) {
        setData(json)
        setExpanded(true)
      }
    } catch (err) {}
    setLoading(false)
  }

  const profitColor = (value: number) => value > 0 ? 'text-green-400' : 'text-red-400'

  const trendIcon = (trend: string) => {
    if (trend === 'alta') return { symbol: '\u25B2', color: 'text-green-400', label: 'Alta' }
    if (trend === 'queda') return { symbol: '\u25BC', color: 'text-red-400', label: 'Queda' }
    return { symbol: '\u25C6', color: 'text-amber-400', label: 'Estavel' }
  }

  return (
    <div className="card p-4">
      <button
        className="w-full flex items-center justify-between"
        onClick={fetchData}
        disabled={loading}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">&#x1F4C5;</span>
          <div className="text-left">
            <p className="text-sm font-semibold text-white">Melhor Momento de Venda</p>
            <p className="text-[12px] text-zinc-500">Comparacao de cenarios e janela ideal</p>
          </div>
        </div>
        <span className="text-[12px] text-orange-400">
          {loading ? 'Calculando...' : expanded ? '&#9650; Fechar' : '&#9660; Analisar'}
        </span>
      </button>

      {expanded && data && (
        <div className="mt-4 space-y-3">
          {/* Tendencia de mercado */}
          <div className="bg-white/[0.03] rounded-lg p-4 text-center">
            <p className="text-[12px] text-zinc-500 uppercase mb-1">Tendencia de Mercado</p>
            <p className={"text-3xl font-extrabold " + trendIcon(data.market_trend).color}>
              {trendIcon(data.market_trend).symbol} {trendIcon(data.market_trend).label}
            </p>
          </div>

          {/* Cenarios */}
          <div className="space-y-2">
            <p className="text-[12px] text-zinc-500 font-semibold uppercase">Cenarios de Venda</p>
            {data.scenarios.map((s: any, i: number) => {
              const isOptimal = data.optimal.scenario_index === i
              const borderClass = isOptimal
                ? 'border-orange-500/60 shadow-[0_0_12px_rgba(249,115,22,0.15)]'
                : 'border-white/[0.06]'
              return (
                <div key={i} className={"border rounded-lg p-3 bg-white/[0.02] " + borderClass}>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-semibold text-white flex items-center gap-2">
                        {s.label}
                        {isOptimal && (
                          <span className="text-[10px] bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full font-bold uppercase">
                            Ideal
                          </span>
                        )}
                      </p>
                      <p className="text-[12px] text-zinc-500">
                        {s.weight_kg} kg | {s.arrobas.toFixed(1)}@ | @ R$ {s.arroba_price.toFixed(0)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={"text-sm font-bold " + profitColor(s.profit)}>
                        R$ {s.profit.toLocaleString('pt-BR')}
                      </p>
                      <p className="text-[12px] text-zinc-500">ROI {s.roi_percent}%</p>
                    </div>
                  </div>
                  <div className="flex justify-between mt-2 text-[11px] text-zinc-600">
                    <span>Bruto: R$ {s.revenue_gross.toLocaleString('pt-BR')}</span>
                    <span>Liquido: R$ {s.revenue_net.toLocaleString('pt-BR')}</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Recomendacao */}
          {data.optimal && (
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
              <p className="text-[12px] text-orange-400 font-semibold uppercase mb-1">Recomendacao</p>
              <p className="text-sm text-white font-semibold">{data.optimal.label}</p>
              <p className="text-[12px] text-zinc-400 mt-1">{data.optimal.reason}</p>
            </div>
          )}

          {/* Alertas */}
          {data.alerts && data.alerts.length > 0 && (
            <div className="space-y-1">
              <p className="text-[12px] text-zinc-500 font-semibold uppercase">Alertas</p>
              {data.alerts.map((alert: string, i: number) => (
                <div key={i} className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  <p className="text-[12px] text-red-400">{alert}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
