'use client'

import { useEffect, useState } from 'react'

interface PriceItem {
  name: string
  unit: string
  category: string
  current_price: number
  variation_7d_percent: number
  variation_30d_percent: number
  trend: string
}

interface PriceAlert {
  type: string
  message: string
  item: string
  savings_potential: number
}

interface PriceData {
  items: PriceItem[]
  alerts: PriceAlert[]
  last_update: string
  herd_summary: {
    head_count: number
    daily_consumption_kg: number
  }
}

const CATEGORY_LABELS: Record<string, string> = {
  arroba: 'Arroba',
  grao: 'Graos',
  proteico: 'Proteicos',
  mineral: 'Minerais',
}

const CATEGORY_ORDER = ['arroba', 'grao', 'proteico', 'mineral']

function variationArrow(value: number) {
  if (value > 0) return { symbol: '\u25B2', color: 'text-green-400' }
  if (value < 0) return { symbol: '\u25BC', color: 'text-red-400' }
  return { symbol: '\u25C6', color: 'text-zinc-500' }
}

function trendBadge(trend: string) {
  if (trend === 'alta') return { label: 'Alta', color: 'text-green-400', bg: 'bg-green-500/15' }
  if (trend === 'queda') return { label: 'Queda', color: 'text-red-400', bg: 'bg-red-500/15' }
  return { label: 'Estavel', color: 'text-amber-400', bg: 'bg-amber-500/15' }
}

export default function PriceRadarPanel() {
  const [data, setData] = useState<PriceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchPrices()
  }, [])

  const fetchPrices = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/prices')
      const json = await res.json()
      if (res.ok) {
        setData(json)
      } else {
        setError(json.error || 'Erro ao carregar precos')
      }
    } catch {
      setError('Erro de conexao')
    }
    setLoading(false)
  }

  const groupedItems = data
    ? CATEGORY_ORDER
        .map((cat) => ({
          category: cat,
          label: CATEGORY_LABELS[cat] || cat,
          items: data.items.filter((item) => item.category === cat),
        }))
        .filter((group) => group.items.length > 0)
    : []

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">&#x1F4CA;</span>
          <div>
            <p className="text-sm font-semibold text-white">Radar de Precos</p>
            <p className="text-[12px] text-zinc-500">Cotacoes e tendencias do mercado</p>
          </div>
        </div>
        <button
          onClick={fetchPrices}
          disabled={loading}
          className="text-[12px] text-orange-400 hover:text-orange-300 disabled:opacity-50"
        >
          {loading ? 'Atualizando...' : 'Atualizar'}
        </button>
      </div>

      {/* Loading */}
      {loading && !data && (
        <div className="text-center py-8">
          <div className="inline-block w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mb-2"></div>
          <p className="text-[12px] text-zinc-500">Carregando cotacoes...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          <p className="text-[12px] text-red-400">{error}</p>
          <button onClick={fetchPrices} className="text-[12px] text-red-400 underline mt-1">
            Tentar novamente
          </button>
        </div>
      )}

      {/* Data loaded */}
      {data && (
        <>
          {/* Alerts */}
          {data.alerts && data.alerts.length > 0 && (
            <div className="space-y-2">
              {data.alerts.map((alert, i) => (
                <div
                  key={i}
                  className="bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2 flex items-start gap-2"
                >
                  <span className="text-amber-400 text-sm mt-0.5">&#x26A0;</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-amber-300 font-semibold">{alert.message}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[11px] text-zinc-500 capitalize">{alert.type}</span>
                      {alert.savings_potential > 0 && (
                        <span className="text-[11px] text-green-400 font-semibold">
                          Economia potencial: R$ {alert.savings_potential.toLocaleString('pt-BR')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Herd summary */}
          {data.herd_summary && (
            <div className="flex gap-3">
              <div className="flex-1 bg-white/[0.03] rounded-lg px-3 py-2 text-center">
                <p className="text-[11px] text-zinc-500 uppercase">Cabecas</p>
                <p className="text-sm font-bold text-white">{data.herd_summary.head_count}</p>
              </div>
              <div className="flex-1 bg-white/[0.03] rounded-lg px-3 py-2 text-center">
                <p className="text-[11px] text-zinc-500 uppercase">Consumo/dia</p>
                <p className="text-sm font-bold text-white">{data.herd_summary.daily_consumption_kg} kg</p>
              </div>
            </div>
          )}

          {/* Price cards grouped by category */}
          <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
            {groupedItems.map((group) => (
              <div key={group.category}>
                <p className="text-[11px] text-zinc-500 font-semibold uppercase mb-1.5">{group.label}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {group.items.map((item, idx) => {
                    const v7 = variationArrow(item.variation_7d_percent)
                    const v30 = variationArrow(item.variation_30d_percent)
                    const trend = trendBadge(item.trend)

                    return (
                      <div
                        key={idx}
                        className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <p className="text-sm font-semibold text-white leading-tight">{item.name}</p>
                          <span
                            className={"text-[10px] px-1.5 py-0.5 rounded-full font-bold " + trend.bg + " " + trend.color}
                          >
                            {trend.label}
                          </span>
                        </div>

                        <p className="text-lg font-extrabold text-white">
                          R$ {item.current_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          <span className="text-[11px] text-zinc-500 font-normal ml-1">{item.unit}</span>
                        </p>

                        <div className="flex gap-3 mt-2 text-[11px]">
                          <span className={v7.color}>
                            {v7.symbol} {Math.abs(item.variation_7d_percent).toFixed(1)}% 7d
                          </span>
                          <span className={v30.color}>
                            {v30.symbol} {Math.abs(item.variation_30d_percent).toFixed(1)}% 30d
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Last update */}
          {data.last_update && (
            <p className="text-[11px] text-zinc-600 text-right">
              Atualizado: {new Date(data.last_update).toLocaleString('pt-BR')}
            </p>
          )}
        </>
      )}
    </div>
  )
}
