'use client'
import { useEffect, useState } from 'react'

interface PastureQuality {
  pb_percent: number
  ndt_percent: number
  fdn_percent: number
  label: string
}

interface CarryingCapacity {
  ua_per_ha: number
  current_stocking: number
  status: string
  max_heads: number
}

interface NextMonth {
  ndvi_projected: number
  trend: string
  action: string
}

interface PastureScoreData {
  ndvi: number
  ndvi_label: string
  ms_kg_ha_day: number
  ms_total_kg_day: number
  ms_kg_animal_day: number
  quality: PastureQuality
  carrying_capacity: CarryingCapacity
  overall_score: number
  score_label: string
  suggestions: string[]
  next_month: NextMonth
}

function scoreColor(score: number): string {
  if (score >= 70) return '#22C55E'
  if (score >= 40) return '#F59E0B'
  return '#EF4444'
}

function scoreBorderClass(score: number): string {
  if (score >= 70) return 'border-green-500'
  if (score >= 40) return 'border-amber-500'
  return 'border-red-500'
}

function scoreTextClass(score: number): string {
  if (score >= 70) return 'text-green-400'
  if (score >= 40) return 'text-amber-400'
  return 'text-red-400'
}

function ndviColor(ndvi: number): string {
  if (ndvi >= 0.6) return 'text-green-400'
  if (ndvi >= 0.4) return 'text-amber-400'
  return 'text-red-400'
}

function statusBadge(status: string): { text: string; cls: string } {
  switch (status) {
    case 'sublotado':
      return { text: 'Sublotado', cls: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' }
    case 'adequado':
      return { text: 'Adequado', cls: 'bg-green-500/20 text-green-400 border border-green-500/30' }
    case 'superlotado':
      return { text: 'Superlotado', cls: 'bg-red-500/20 text-red-400 border border-red-500/30' }
    default:
      return { text: status, cls: 'bg-zinc-700 text-zinc-300' }
  }
}

function trendIcon(trend: string): { arrow: string; cls: string; label: string } {
  switch (trend) {
    case 'melhorando':
      return { arrow: '\u2191', cls: 'text-green-400', label: 'Melhorando' }
    case 'piorando':
      return { arrow: '\u2193', cls: 'text-red-400', label: 'Piorando' }
    default:
      return { arrow: '\u2192', cls: 'text-zinc-400', label: 'Estavel' }
  }
}

export default function PastureScorePanel() {
  const [data, setData] = useState<PastureScoreData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/pasture-score')
        const json = await res.json()
        if (json.error) throw new Error(json.error)
        setData(json)
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar dados de pastagem')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="mt-4 animate-in">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[13px] font-bold text-white">Score da Pastagem</span>
          </div>
          <div className="flex justify-center py-8">
            <span className="spinner"></span>
          </div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="mt-4 animate-in">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[13px] font-bold text-white">Score da Pastagem</span>
          </div>
          <p className="text-[12px] text-red-400">{error || 'Dados indisponiveis'}</p>
        </div>
      </div>
    )
  }

  const badge = statusBadge(data.carrying_capacity.status)
  const trend = trendIcon(data.next_month.trend)
  const circumference = 2 * Math.PI * 54
  const offset = circumference - (data.overall_score / 100) * circumference

  return (
    <div className="mt-4 animate-in">
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
        {/* Header */}
        <div className="flex items-center gap-2 mb-5">
          <span className="text-[13px] font-bold text-white">Score da Pastagem</span>
          <span className="badge badge-green">Global</span>
        </div>

        {/* Score circle + NDVI */}
        <div className="flex items-center justify-center gap-8 mb-5">
          {/* Big score circle */}
          <div className="relative flex items-center justify-center">
            <svg width="130" height="130" viewBox="0 0 130 130">
              <circle cx="65" cy="65" r="54" fill="none" stroke="#27272a" strokeWidth="8" />
              <circle
                cx="65" cy="65" r="54" fill="none"
                stroke={scoreColor(data.overall_score)}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                transform="rotate(-90 65 65)"
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className={`text-[28px] font-black ${scoreTextClass(data.overall_score)}`}>
                {data.overall_score}
              </span>
              <span className="text-[11px] text-zinc-500">{data.score_label}</span>
            </div>
          </div>

          {/* NDVI */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] text-zinc-600 uppercase tracking-wider">NDVI</span>
            <span className={`text-[24px] font-black ${ndviColor(data.ndvi)}`}>
              {data.ndvi.toFixed(2)}
            </span>
            <span className="text-[11px] text-zinc-500">{data.ndvi_label}</span>
          </div>
        </div>

        <div className="divider"></div>

        {/* Quality metrics */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-zinc-600 uppercase tracking-wider">Qualidade da Pastagem</span>
            <span className="text-[11px] text-zinc-400 font-medium">{data.quality.label}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-zinc-800/50 rounded-lg p-2.5 text-center">
              <p className="text-[10px] text-zinc-600 uppercase">PB%</p>
              <p className="text-[15px] font-bold text-white">{data.quality.pb_percent}</p>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-2.5 text-center">
              <p className="text-[10px] text-zinc-600 uppercase">NDT%</p>
              <p className="text-[15px] font-bold text-white">{data.quality.ndt_percent}</p>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-2.5 text-center">
              <p className="text-[10px] text-zinc-600 uppercase">FDN%</p>
              <p className="text-[15px] font-bold text-white">{data.quality.fdn_percent}</p>
            </div>
          </div>
        </div>

        <div className="divider"></div>

        {/* Carrying capacity */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-zinc-600 uppercase tracking-wider">Capacidade de Suporte</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${badge.cls}`}>
              {badge.text}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-zinc-800/50 rounded-lg p-2.5">
              <p className="text-[10px] text-zinc-600 uppercase">Atual</p>
              <p className="text-[15px] font-bold text-white">
                {data.carrying_capacity.current_stocking.toFixed(1)} <span className="text-[11px] text-zinc-500">UA/ha</span>
              </p>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-2.5">
              <p className="text-[10px] text-zinc-600 uppercase">Suportado</p>
              <p className="text-[15px] font-bold text-white">
                {data.carrying_capacity.ua_per_ha.toFixed(1)} <span className="text-[11px] text-zinc-500">UA/ha</span>
              </p>
            </div>
          </div>
          <div className="mt-2 bg-zinc-800/50 rounded-lg p-2.5">
            <p className="text-[10px] text-zinc-600 uppercase">Max. Cabecas</p>
            <p className="text-[15px] font-bold text-white">
              {data.carrying_capacity.max_heads.toLocaleString('pt-BR')} <span className="text-[11px] text-zinc-500">cab.</span>
            </p>
          </div>
        </div>

        <div className="divider"></div>

        {/* MS production */}
        <div className="mb-4">
          <span className="text-[10px] text-zinc-600 uppercase tracking-wider block mb-2">Producao de MS</span>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-zinc-800/50 rounded-lg p-2.5">
              <p className="text-[10px] text-zinc-600 uppercase">kg/ha/dia</p>
              <p className="text-[15px] font-bold text-white">{data.ms_kg_ha_day}</p>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-2.5">
              <p className="text-[10px] text-zinc-600 uppercase">kg/animal/dia</p>
              <p className="text-[15px] font-bold text-white">{data.ms_kg_animal_day}</p>
            </div>
          </div>
          <div className="mt-2 bg-zinc-800/50 rounded-lg p-2.5">
            <p className="text-[10px] text-zinc-600 uppercase">Total kg/dia</p>
            <p className="text-[15px] font-bold text-white">
              {data.ms_total_kg_day.toLocaleString('pt-BR')} <span className="text-[11px] text-zinc-500">kg</span>
            </p>
          </div>
        </div>

        <div className="divider"></div>

        {/* Next month trend */}
        <div className="mb-4">
          <span className="text-[10px] text-zinc-600 uppercase tracking-wider block mb-2">Projecao Proximo Mes</span>
          <div className="bg-zinc-800/50 rounded-xl p-3 flex items-center gap-3">
            <span className={`text-[28px] font-black ${trend.cls}`}>{trend.arrow}</span>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className={`text-[14px] font-bold ${trend.cls}`}>{trend.label}</span>
                <span className="text-[12px] text-zinc-500">
                  NDVI {data.next_month.ndvi_projected.toFixed(2)}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">{data.next_month.action}</p>
            </div>
          </div>
        </div>

        {/* Suggestions */}
        {data.suggestions.length > 0 && (
          <>
            <div className="divider"></div>
            <div>
              <span className="text-[10px] text-orange-400 font-bold uppercase block mb-2">Sugestoes</span>
              <ul className="space-y-1.5">
                {data.suggestions.map((s, i) => (
                  <li key={i} className="text-[12px] text-zinc-300 leading-relaxed flex gap-2">
                    <span className="text-orange-400 mt-0.5 shrink-0">&#8226;</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
