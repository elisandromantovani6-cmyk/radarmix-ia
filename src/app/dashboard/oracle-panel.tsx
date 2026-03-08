'use client'

import { useState } from 'react'

interface OracleData {
  herd_name: string
  gmd_used: number
  gmd_source: string
  prediction: {
    gmd_projected: { d30: number; d60: number; d90: number; factors: string[] }
    weight_projected: { d30: number; d60: number; d90: number; days_to_target: number }
    financial: {
      total_cost_at_target: number
      projected_revenue: number
      projected_profit_per_head: number
      risk_of_loss_percent: number
      breakeven_arroba: number
    }
    scenarios: { name: string; gmd: number; days_to_target: number; profit_per_head: number; description: string }[]
    oracle_says: string[]
    confidence_level: string
    data_quality_score: number
  }
}

export default function OraclePanel({ herdId }: { herdId: string }) {
  const [data, setData] = useState<OracleData | null>(null)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const fetchOracle = async () => {
    if (data) {
      setExpanded(!expanded)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/oracle?herd_id=${herdId}`)
      const json = await res.json()
      if (res.ok) {
        setData(json)
        setExpanded(true)
      }
    } catch (err) {}
    setLoading(false)
  }

  const confidenceBadge = (level: string) => {
    const map: Record<string, { bg: string; text: string; label: string }> = {
      alta: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Alta' },
      media: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Media' },
      baixa: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Baixa' },
    }
    return map[level] || map['media']
  }

  const profitColor = (value: number) => value > 0 ? 'text-green-400' : 'text-red-400'

  const riskColor = (pct: number) => {
    if (pct <= 20) return 'text-green-400'
    if (pct <= 50) return 'text-amber-400'
    return 'text-red-400'
  }

  const qualityBar = (score: number) => {
    let color = 'bg-green-500'
    if (score < 60) color = 'bg-red-500'
    else if (score < 80) color = 'bg-amber-500'
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
          <div className={color + ' h-full rounded-full'} style={{ width: `${score}%` }} />
        </div>
        <span className="text-[11px] text-zinc-500">{score}%</span>
      </div>
    )
  }

  return (
    <div className="card p-4">
      <button
        className="w-full flex items-center justify-between"
        onClick={fetchOracle}
        disabled={loading}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">&#x1F52E;</span>
          <div className="text-left">
            <p className="text-sm font-semibold text-white">Oraculo do Confinamento</p>
            <p className="text-[12px] text-zinc-500">Projecao GMD, peso, financeiro e cenarios</p>
          </div>
        </div>
        <span className="text-[12px] text-orange-400">
          {loading ? 'Consultando...' : expanded ? '&#9650; Fechar' : '&#9660; Consultar'}
        </span>
      </button>

      {expanded && data && (
        <div className="mt-4 space-y-3">
          {/* Header com confianca e qualidade */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-white font-semibold">{data.herd_name}</span>
              {(() => {
                const badge = confidenceBadge(data.prediction.confidence_level)
                return (
                  <span className={'text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ' + badge.bg + ' ' + badge.text}>
                    {badge.label}
                  </span>
                )
              })()}
            </div>
            <span className="text-[11px] text-zinc-500">
              GMD {data.gmd_used.toFixed(2)} ({data.gmd_source})
            </span>
          </div>

          <div className="px-1">
            <p className="text-[11px] text-zinc-500 mb-1">Qualidade dos dados</p>
            {qualityBar(data.prediction.data_quality_score)}
          </div>

          {/* GMD projetado 30/60/90 */}
          <div>
            <p className="text-[12px] text-zinc-500 font-semibold uppercase mb-2">GMD Projetado (kg/dia)</p>
            <div className="grid grid-cols-3 gap-2">
              {([
                { label: '30 dias', value: data.prediction.gmd_projected.d30 },
                { label: '60 dias', value: data.prediction.gmd_projected.d60 },
                { label: '90 dias', value: data.prediction.gmd_projected.d90 },
              ] as const).map(item => (
                <div key={item.label} className="bg-white/[0.03] rounded-lg p-3 text-center">
                  <p className="text-[12px] text-zinc-500">{item.label}</p>
                  <p className="text-lg font-bold text-orange-400">{item.value.toFixed(2)}</p>
                </div>
              ))}
            </div>
            {data.prediction.gmd_projected.factors.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {data.prediction.gmd_projected.factors.map((f, i) => (
                  <span key={i} className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">
                    {f}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Peso projetado timeline */}
          <div>
            <p className="text-[12px] text-zinc-500 font-semibold uppercase mb-2">Peso Projetado (kg)</p>
            <div className="grid grid-cols-3 gap-2">
              {([
                { label: '30 dias', value: data.prediction.weight_projected.d30 },
                { label: '60 dias', value: data.prediction.weight_projected.d60 },
                { label: '90 dias', value: data.prediction.weight_projected.d90 },
              ] as const).map(item => (
                <div key={item.label} className="bg-white/[0.03] rounded-lg p-3 text-center">
                  <p className="text-[12px] text-zinc-500">{item.label}</p>
                  <p className="text-lg font-bold text-white">{item.value}</p>
                </div>
              ))}
            </div>
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-2 mt-2 text-center">
              <p className="text-[12px] text-orange-400 font-semibold">
                Dias ate o peso alvo: {data.prediction.weight_projected.days_to_target}
              </p>
            </div>
          </div>

          {/* Resumo financeiro */}
          <div>
            <p className="text-[12px] text-zinc-500 font-semibold uppercase mb-2">Resumo Financeiro (/cab)</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/[0.03] rounded-lg p-3 text-center">
                <p className="text-[12px] text-zinc-500">Custo total</p>
                <p className="text-sm font-bold text-red-400">
                  R$ {data.prediction.financial.total_cost_at_target.toLocaleString('pt-BR')}
                </p>
              </div>
              <div className="bg-white/[0.03] rounded-lg p-3 text-center">
                <p className="text-[12px] text-zinc-500">Receita</p>
                <p className="text-sm font-bold text-green-400">
                  R$ {data.prediction.financial.projected_revenue.toLocaleString('pt-BR')}
                </p>
              </div>
              <div className="bg-white/[0.03] rounded-lg p-3 text-center">
                <p className="text-[12px] text-zinc-500">Lucro</p>
                <p className={'text-lg font-bold ' + profitColor(data.prediction.financial.projected_profit_per_head)}>
                  R$ {data.prediction.financial.projected_profit_per_head.toLocaleString('pt-BR')}
                </p>
              </div>
              <div className="bg-white/[0.03] rounded-lg p-3 text-center">
                <p className="text-[12px] text-zinc-500">Risco de prejuizo</p>
                <p className={'text-lg font-bold ' + riskColor(data.prediction.financial.risk_of_loss_percent)}>
                  {data.prediction.financial.risk_of_loss_percent}%
                </p>
              </div>
            </div>
          </div>

          {/* Breakeven */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-center">
            <p className="text-[12px] text-amber-400 font-semibold uppercase mb-1">Ponto de Equilibrio</p>
            <p className="text-2xl font-extrabold text-amber-400">
              R$ {data.prediction.financial.breakeven_arroba.toFixed(2)}
            </p>
            <p className="text-[11px] text-zinc-500">por arroba</p>
          </div>

          {/* Cenarios */}
          {data.prediction.scenarios.length > 0 && (
            <div className="space-y-2">
              <p className="text-[12px] text-zinc-500 font-semibold uppercase">Cenarios</p>
              {data.prediction.scenarios.map((s, i) => {
                const borderColors = [
                  'border-blue-500/20',
                  'border-green-500/20',
                  'border-purple-500/20',
                ]
                return (
                  <div key={i} className={'border rounded-lg p-3 bg-white/[0.02] ' + (borderColors[i % borderColors.length])}>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-semibold text-white">{s.name}</p>
                        <p className="text-[12px] text-zinc-500">
                          GMD {s.gmd.toFixed(2)} | {s.days_to_target} dias
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={'text-sm font-bold ' + profitColor(s.profit_per_head)}>
                          R$ {s.profit_per_head.toLocaleString('pt-BR')}/cab
                        </p>
                      </div>
                    </div>
                    {s.description && (
                      <p className="text-[11px] text-zinc-500 mt-1">{s.description}</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Oracle insights */}
          {data.prediction.oracle_says.length > 0 && (
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
              <p className="text-[12px] text-orange-400 font-semibold uppercase mb-2">&#x1F52E; O Oraculo diz</p>
              <div className="space-y-2">
                {data.prediction.oracle_says.map((msg, i) => (
                  <p key={i} className="text-sm text-zinc-300">{msg}</p>
                ))}
              </div>
            </div>
          )}

          <p className="text-[12px] text-zinc-600 text-center">
            GMD fonte: {data.gmd_source} ({data.gmd_used.toFixed(2)} kg/dia)
          </p>
        </div>
      )}
    </div>
  )
}
