'use client'

import { useState } from 'react'

interface Ingredient {
  name: string
  kg_per_day: number
  percent_of_diet: number
  cost_per_day: number
}

interface DietTotals {
  cms_kg_day: number
  pb_percent: number
  ndt_percent: number
  fdn_percent: number
  cost_per_day: number
  cost_per_month: number
  cost_per_kg_gain: number
}

interface DietEfficiency {
  feed_conversion: number
  cost_per_arroba_produced: number
}

interface DietResult {
  ingredients: Ingredient[]
  totals: DietTotals
  efficiency: DietEfficiency
}

export default function DietPanel({ herdId }: { herdId: string }) {
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<DietResult | null>(null)
  const [error, setError] = useState('')

  const handleLoad = async () => {
    if (result) {
      setExpanded(!expanded)
      return
    }

    setExpanded(true)
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/diet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ herd_id: herdId }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Erro ao formular dieta')
      } else {
        setResult(data)
      }
    } catch {
      setError('Erro de conexão. Verifique sua internet.')
    }

    setLoading(false)
  }

  return (
    <div className="mt-4 border-t border-zinc-800 pt-4 animate-in">
      {/* Cabeçalho compacto - clique para expandir */}
      <button
        onClick={handleLoad}
        className="w-full flex items-center justify-between group"
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center">
            <span className="text-[13px]">&#x1F33F;</span>
          </div>
          <span className="text-[13px] font-bold text-white">Formulador de Dieta</span>
        </div>
        <div className="flex items-center gap-2">
          {result && !expanded && (
            <span className="text-[10px] text-emerald-400 font-semibold">
              R$ {result.totals.cost_per_day.toFixed(2)}/dia
            </span>
          )}
          <svg
            className={"w-4 h-4 text-zinc-500 transition-transform duration-200 " + (expanded ? 'rotate-180' : '')}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Conteúdo expandido */}
      {expanded && (
        <div className="mt-3 space-y-3">
          {/* Loading */}
          {loading && (
            <div className="text-center py-8">
              <div className="inline-block w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-[12px] text-zinc-400">Formulando dieta otimizada...</p>
              <p className="text-[10px] text-zinc-600 mt-1">Calculando melhor custo-benefício nutricional</p>
            </div>
          )}

          {/* Erro */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
              <p className="text-red-400 text-[12px]">{error}</p>
              <button
                onClick={() => { setError(''); setResult(null); setExpanded(false) }}
                className="mt-2 text-[11px] text-red-400 underline"
              >
                Tentar novamente
              </button>
            </div>
          )}

          {/* Resultado */}
          {result && (
            <div className="space-y-3">
              {/* Tabela de ingredientes */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
                <div className="px-3 py-2 border-b border-zinc-800">
                  <span className="text-[10px] text-zinc-500 font-semibold uppercase">Ingredientes da dieta</span>
                </div>
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-zinc-800/50">
                      <th className="text-left px-3 py-2 text-zinc-500 font-semibold">Ingrediente</th>
                      <th className="text-right px-3 py-2 text-zinc-500 font-semibold">kg/dia</th>
                      <th className="text-right px-3 py-2 text-zinc-500 font-semibold">% dieta</th>
                      <th className="text-right px-3 py-2 text-zinc-500 font-semibold">R$/dia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.ingredients.map((ing, i) => (
                      <tr key={i} className="border-b border-zinc-800/30 last:border-0">
                        <td className="px-3 py-2 text-zinc-300 font-medium">{ing.name}</td>
                        <td className="text-right px-3 py-2 text-zinc-400">{ing.kg_per_day.toFixed(1)}</td>
                        <td className="text-right px-3 py-2 text-zinc-400">{ing.percent_of_diet.toFixed(1)}%</td>
                        <td className="text-right px-3 py-2 text-emerald-400 font-medium">
                          {ing.cost_per_day.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totais nutricionais */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-3">
                <span className="text-[10px] text-zinc-500 font-semibold uppercase block mb-2">
                  Totais nutricionais
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-zinc-800/40 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-zinc-500">CMS</p>
                    <p className="text-[14px] font-bold text-white">{result.totals.cms_kg_day.toFixed(1)}</p>
                    <p className="text-[9px] text-zinc-600">kg/dia</p>
                  </div>
                  <div className="bg-zinc-800/40 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-zinc-500">PB</p>
                    <p className="text-[14px] font-bold text-white">{result.totals.pb_percent.toFixed(1)}%</p>
                    <p className="text-[9px] text-zinc-600">proteína</p>
                  </div>
                  <div className="bg-zinc-800/40 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-zinc-500">NDT</p>
                    <p className="text-[14px] font-bold text-white">{result.totals.ndt_percent.toFixed(0)}%</p>
                    <p className="text-[9px] text-zinc-600">energia</p>
                  </div>
                  <div className="bg-zinc-800/40 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-zinc-500">FDN</p>
                    <p className="text-[14px] font-bold text-white">{result.totals.fdn_percent.toFixed(0)}%</p>
                    <p className="text-[9px] text-zinc-600">fibra</p>
                  </div>
                  <div className="bg-zinc-800/40 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-zinc-500">Custo/dia</p>
                    <p className="text-[14px] font-bold text-emerald-400">R$ {result.totals.cost_per_day.toFixed(2)}</p>
                    <p className="text-[9px] text-zinc-600">por cab</p>
                  </div>
                  <div className="bg-zinc-800/40 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-zinc-500">Custo/mês</p>
                    <p className="text-[14px] font-bold text-emerald-400">R$ {result.totals.cost_per_month.toFixed(0)}</p>
                    <p className="text-[9px] text-zinc-600">por cab</p>
                  </div>
                </div>
              </div>

              {/* Badges de eficiência */}
              <div className="flex gap-2">
                <div className="flex-1 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-center">
                  <p className="text-[9px] text-amber-400/70 font-semibold uppercase mb-1">Conversão alimentar</p>
                  <p className="text-[18px] font-black text-amber-400">
                    {result.efficiency.feed_conversion.toFixed(1)}
                  </p>
                  <p className="text-[9px] text-zinc-500">kg MS / kg ganho</p>
                </div>
                <div className="flex-1 bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-3 text-center">
                  <p className="text-[9px] text-cyan-400/70 font-semibold uppercase mb-1">Custo por @</p>
                  <p className="text-[18px] font-black text-cyan-400">
                    R$ {result.efficiency.cost_per_arroba_produced.toFixed(1)}
                  </p>
                  <p className="text-[9px] text-zinc-500">por @ produzida</p>
                </div>
              </div>

              {/* Botão recarregar */}
              <button
                onClick={() => { setResult(null); setExpanded(false); setTimeout(() => handleLoad(), 100) }}
                className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-[11px] rounded-lg transition-colors"
              >
                Recalcular dieta
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
