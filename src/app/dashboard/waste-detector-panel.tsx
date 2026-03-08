'use client'

import { useState } from 'react'

const severityColors: Record<string, string> = {
  info: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
  atencao: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
  critico: 'bg-red-500/10 border-red-500/20 text-red-400',
}

const severityIcons: Record<string, string> = {
  info: 'i',
  atencao: '!',
  critico: '!!',
}

export default function WasteDetectorPanel({ herdId }: { herdId: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const fetchReport = async () => {
    if (data) {
      setExpanded(!expanded)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/waste?herd_id=${herdId}`)
      const json = await res.json()
      if (res.ok) {
        setData(json)
        setExpanded(true)
      }
    } catch (err) {}
    setLoading(false)
  }

  const scoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400'
    if (score >= 60) return 'text-amber-400'
    return 'text-red-400'
  }

  return (
    <div className="card p-4">
      <button
        className="w-full flex items-center justify-between"
        onClick={fetchReport}
        disabled={loading}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">&#x1F4A1;</span>
          <div className="text-left">
            <p className="text-sm font-semibold text-white">Detector de Desperdicio</p>
            <p className="text-[12px] text-zinc-500">Analisa custos vs benchmarks regionais MT</p>
          </div>
        </div>
        <span className="text-[12px] text-orange-400">
          {loading ? 'Analisando...' : expanded ? '&#9650; Fechar' : '&#9660; Analisar'}
        </span>
      </button>

      {expanded && data && (
        <div className="mt-4 space-y-3">
          {/* Score de eficiência */}
          <div className="flex items-center justify-between bg-white/[0.03] rounded-lg p-3">
            <div>
              <p className="text-[12px] text-zinc-500 uppercase">Score de Eficiencia</p>
              <p className={"text-2xl font-extrabold " + scoreColor(data.report.efficiency_score)}>
                {data.report.efficiency_score}/100
              </p>
            </div>
            <div className="text-right">
              <p className="text-[12px] text-zinc-500">Custo diario/cab</p>
              <p className="text-sm text-white">
                R$ {data.report.cost_optimization.current_daily_cost.toFixed(2)}
              </p>
              <p className="text-[12px] text-zinc-500">
                Otimo: R$ {data.report.cost_optimization.optimal_daily_cost.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Resumo financeiro */}
          {data.report.total_monthly_waste > 0 && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-[12px] text-red-400 font-semibold uppercase mb-1">Desperdicio detectado</p>
              <div className="flex justify-between">
                <div>
                  <p className="text-sm text-zinc-300">Mensal:</p>
                  <p className="text-lg font-bold text-red-400">
                    R$ {data.report.total_monthly_waste.toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-zinc-300">Anual:</p>
                  <p className="text-lg font-bold text-red-400">
                    R$ {data.report.total_annual_waste.toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
              <p className="text-[12px] text-zinc-500 mt-1">
                {data.head_count} cabecas | {data.days_in_lot} dias no lote |
                {data.has_real_costs ? ' Custos reais' : ' Custos estimados'}
              </p>
            </div>
          )}

          {data.report.total_monthly_waste === 0 && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
              <p className="text-sm text-green-400 font-semibold">Nenhum desperdicio critico detectado!</p>
              <p className="text-[12px] text-zinc-400">Custos dentro da faixa regional para {data.phase}.</p>
            </div>
          )}

          {/* Itens de desperdício */}
          {data.report.items.length > 0 && (
            <div className="space-y-2">
              <p className="text-[12px] text-zinc-500 font-semibold uppercase">Detalhamento</p>
              {data.report.items.map((item: any, i: number) => (
                <div key={i} className={"border rounded-lg p-3 " + (severityColors[item.severity] || severityColors.info)}>
                  <div className="flex items-start justify-between mb-1">
                    <p className="text-sm font-semibold">
                      <span className="mr-1">{severityIcons[item.severity]}</span>
                      {item.title}
                    </p>
                    <span className="text-sm font-bold shrink-0 ml-2">
                      R$ {item.monthly_waste_rs.toLocaleString('pt-BR')}/mes
                    </span>
                  </div>
                  <p className="text-[12px] text-zinc-400">{item.description}</p>
                </div>
              ))}
            </div>
          )}

          {/* Dicas */}
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
            <p className="text-[12px] text-orange-400 font-semibold uppercase mb-2">Sugestoes para economizar</p>
            {data.report.best_practice_tips.map((tip: string, i: number) => (
              <p key={i} className="text-[12px] text-zinc-300 mb-1">&#8226; {tip}</p>
            ))}
          </div>

          {!data.has_real_costs && (
            <p className="text-[12px] text-zinc-600 text-center">
              Registre seus custos reais no DRE para uma analise mais precisa
            </p>
          )}
        </div>
      )}
    </div>
  )
}
