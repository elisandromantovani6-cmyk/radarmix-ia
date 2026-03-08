'use client'

import { useState, useEffect } from 'react'
import ClimateHistory from './climate-history'

const stressColors: Record<string, string> = {
  normal: 'bg-green-500/10 border-green-500/20 text-green-400',
  alert: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
  danger: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
  emergency: 'bg-red-500/10 border-red-500/20 text-red-400',
}

const stressIcons: Record<string, string> = {
  normal: '🟢',
  alert: '🟡',
  danger: '🟠',
  emergency: '🔴',
}

function ThermalStressPanel({ stress }: { stress: any }) {
  const [showDetails, setShowDetails] = useState(false)
  const currentStyle = stressColors[stress.current_stress.level] || stressColors.normal

  return (
    <div className="space-y-3">
      <div className={"border rounded-xl p-4 " + currentStyle}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span>🌡️</span>
            <p className="text-[12px] font-semibold uppercase">Previsão de Estresse Térmico</p>
          </div>
          <span className="text-[12px] opacity-75">{stress.breed_group} (tolerância: {stress.heat_tolerance})</span>
        </div>

        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl">{stressIcons[stress.current_stress.level]}</span>
          <div>
            <p className="text-sm font-bold">{stress.current_stress.label} — ITU ajustado {stress.current_stress.itu_adjusted}</p>
            {stress.current_stress.level !== 'normal' && (
              <p className="text-[12px]">
                Impacto no GMD: {stress.current_stress.gmd_impact_kg} kg/dia | CMS: -{stress.current_stress.cms_reduction_percent}%
              </p>
            )}
          </div>
        </div>

        {stress.stress_days_count > 0 && (
          <div className="bg-black/20 rounded-lg p-3 mb-3">
            <p className="text-[12px] font-semibold mb-1">Próximos 5 dias: {stress.stress_days_count} dia{stress.stress_days_count > 1 ? 's' : ''} com estresse</p>
            {stress.projected_gmd_loss_30d > 0 && (
              <p className="text-[12px]">Perda projetada em 30 dias: -{stress.projected_gmd_loss_30d.toFixed(1)} kg/animal se não agir</p>
            )}
          </div>
        )}

        {stress.advance_alerts.length > 0 && (
          <div className="space-y-1 mb-3">
            {stress.advance_alerts.map((alert: string, i: number) => (
              <p key={i} className="text-[12px] flex items-start gap-1">
                <span className="shrink-0">🔥</span>
                <span>{alert}</span>
              </p>
            ))}
          </div>
        )}

        {stress.management_summary.map((s: string, i: number) => (
          <p key={i} className="text-sm text-zinc-300">{s}</p>
        ))}

        <button
          className="text-[12px] text-orange-400 mt-2 hover:underline"
          onClick={() => setShowDetails(!showDetails)}
        >
          {showDetails ? '▲ Ocultar detalhes' : '▼ Ver previsão detalhada por dia'}
        </button>
      </div>

      {showDetails && stress.forecast.length > 0 && (
        <div className="card p-4 space-y-3">
          <p className="text-[12px] text-zinc-500 font-semibold uppercase">Estresse por dia — {stress.breed_group}</p>
          {stress.forecast.map((day: any, i: number) => {
            const dayStyle = stressColors[day.stress_risk.level] || stressColors.normal
            return (
              <div key={i} className={"border rounded-lg p-3 " + dayStyle}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold capitalize">
                    {stressIcons[day.stress_risk.level]} {day.day_label} — {day.temp}°C / {day.humidity}%
                  </p>
                  <p className="text-[12px]">ITU {day.itu_raw} → ajustado {day.itu_adjusted}</p>
                </div>
                {day.stress_risk.level !== 'normal' && (
                  <p className="text-[12px] mb-1">
                    GMD: {day.stress_risk.gmd_impact_kg} kg/dia | CMS: -{day.stress_risk.cms_reduction_percent}%
                  </p>
                )}
                {day.management_actions.length > 0 && (
                  <div className="mt-1">
                    {day.management_actions.map((action: string, j: number) => (
                      <p key={j} className="text-[12px] text-zinc-400">• {action}</p>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function ClimateWidget() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const fetchClimate = async () => {
      try {
        const res = await fetch('/api/climate')
        const json = await res.json()
        if (res.ok) setData(json)
      } catch (err) {}
      setLoading(false)
    }
    fetchClimate()
  }, [])

  if (loading) return (
    <div className="card p-4 mb-6 animate-pulse">
      <div className="h-4 bg-white/[0.06] rounded w-32 mb-2"></div>
      <div className="h-8 bg-white/[0.06] rounded w-20"></div>
    </div>
  )
  if (!data) return null

  const ituColors: Record<string, string> = {
    green: 'bg-green-500/10 border-green-500/20 text-green-400',
    yellow: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    orange: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
    red: 'bg-red-500/10 border-red-500/20 text-red-400',
  }
  const ituStyle = ituColors[data.itu.color] || ituColors.green

  return (
    <div className="mb-6">
      <div className="card p-4 cursor-pointer hover:border-orange-500/25 transition-colors"
        onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-3xl font-extrabold text-white">{data.current.temp}°C</p>
              <p className="text-[12px] text-zinc-500 capitalize">{data.current.description}</p>
            </div>
            <div className={"px-3 py-2 rounded-xl border " + ituStyle}>
              <div className="flex items-center gap-1">
                <span>{data.itu.icon}</span>
                <span className="text-sm font-bold">ITU {data.itu.value}</span>
              </div>
              <p className="text-[12px]">{data.itu.label}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[12px] text-zinc-500">{data.city}</p>
            <p className="text-[12px] text-zinc-600">{data.season.label}</p>
            <p className="text-[12px] text-orange-500 mt-1">{expanded ? '▲ Fechar' : '▼ Ver mais'}</p>
          </div>
        </div>
        {data.alerts.length > 0 && !expanded && (
          <div className="mt-3 pt-3 border-t border-white/[0.04]">
            <p className="text-[12px] text-amber-400">{data.alerts[0]}</p>
          </div>
        )}
      </div>

      {expanded && (
        <div className="mt-2 space-y-3">
          {data.alerts.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
              <p className="text-[12px] text-amber-400 font-semibold uppercase mb-2">Alertas</p>
              <div className="space-y-2">
                {data.alerts.map((alert: string, i: number) => (
                  <p key={i} className="text-sm text-zinc-300">{alert}</p>
                ))}
              </div>
            </div>
          )}
          <div className={"border rounded-xl p-4 " + ituStyle}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold">{data.itu.icon} ITU {data.itu.value} — {data.itu.label}</p>
              <div className="text-right text-[12px]">
                <span className="text-zinc-500">Umidade: {data.current.humidity}%</span>
                <span className="text-zinc-600 ml-2">Vento: {data.current.wind_speed.toFixed(1)} m/s</span>
              </div>
            </div>
            <p className="text-sm text-zinc-300">{data.itu.impact}</p>
          </div>
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[12px]">🧠</span>
              <p className="text-[12px] text-orange-400 font-semibold uppercase">Radar IA — Ajuste de dieta pelo clima</p>
            </div>
            <p className="text-sm text-zinc-300">{data.diet_suggestion}</p>
          </div>
          {data.forecast.length > 0 && (
            <div className="card p-4">
              <p className="text-[12px] text-zinc-500 font-semibold uppercase mb-3">Previsão</p>
              <div className="grid grid-cols-5 gap-2">
                {data.forecast.map((day: any, i: number) => (
                  <div key={i} className="text-center">
                    <p className="text-[12px] text-zinc-500 capitalize">{day.day_label}</p>
                    <p className="text-lg font-bold text-white">{day.temp}°</p>
                    <p className="text-[12px]">{day.itu_icon} {day.itu}</p>
                    {day.rain > 0 && <p className="text-[12px] text-blue-400">🌧️</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
          {data.thermal_stress && (
            <ThermalStressPanel stress={data.thermal_stress} />
          )}
          <ClimateHistory />
        </div>
      )}
    </div>
  )
}
