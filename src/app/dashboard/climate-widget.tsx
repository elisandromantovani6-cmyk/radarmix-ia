'use client'

import { useState, useEffect } from 'react'
import ClimateHistory from './climate-history'

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
    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 animate-pulse shadow-sm">
      <div className="h-4 bg-gray-100 rounded w-32 mb-2"></div>
      <div className="h-8 bg-gray-100 rounded w-20"></div>
    </div>
  )
  if (!data) return null

  const ituColors: Record<string, string> = {
    green: 'bg-green-50 border-green-200 text-green-700',
    yellow: 'bg-amber-50 border-amber-200 text-amber-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    red: 'bg-red-50 border-red-200 text-red-700',
  }
  const ituStyle = ituColors[data.itu.color] || ituColors.green

  return (
    <div className="mb-6">
      <div className="bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:border-orange-300 transition-colors shadow-sm"
        onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-3xl font-extrabold text-gray-900">{data.current.temp}°C</p>
              <p className="text-xs text-gray-500 capitalize">{data.current.description}</p>
            </div>
            <div className={"px-3 py-2 rounded-xl border " + ituStyle}>
              <div className="flex items-center gap-1">
                <span>{data.itu.icon}</span>
                <span className="text-sm font-bold">ITU {data.itu.value}</span>
              </div>
              <p className="text-xs">{data.itu.label}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">{data.city}</p>
            <p className="text-xs text-gray-400">{data.season.label}</p>
            <p className="text-xs text-orange-500 mt-1">{expanded ? '▲ Fechar' : '▼ Ver mais'}</p>
          </div>
        </div>
        {data.alerts.length > 0 && !expanded && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-amber-600">{data.alerts[0]}</p>
          </div>
        )}
      </div>

      {expanded && (
        <div className="mt-2 space-y-3">
          {data.alerts.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-xs text-amber-700 font-semibold uppercase mb-2">Alertas</p>
              <div className="space-y-2">
                {data.alerts.map((alert: string, i: number) => (
                  <p key={i} className="text-sm text-gray-700">{alert}</p>
                ))}
              </div>
            </div>
          )}
          <div className={"border rounded-xl p-4 " + ituStyle}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold">{data.itu.icon} ITU {data.itu.value} — {data.itu.label}</p>
              <div className="text-right text-xs">
                <span className="text-gray-500">Umidade: {data.current.humidity}%</span>
                <span className="text-gray-400 ml-2">Vento: {data.current.wind_speed.toFixed(1)} m/s</span>
              </div>
            </div>
            <p className="text-sm text-gray-700">{data.itu.impact}</p>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs">🧠</span>
              <p className="text-xs text-orange-700 font-semibold uppercase">Radar IA — Ajuste de dieta pelo clima</p>
            </div>
            <p className="text-sm text-gray-700">{data.diet_suggestion}</p>
          </div>
          {data.forecast.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <p className="text-xs text-gray-500 font-semibold uppercase mb-3">Previsão</p>
              <div className="grid grid-cols-5 gap-2">
                {data.forecast.map((day: any, i: number) => (
                  <div key={i} className="text-center">
                    <p className="text-xs text-gray-500 capitalize">{day.day_label}</p>
                    <p className="text-lg font-bold text-gray-900">{day.temp}°</p>
                    <p className="text-xs">{day.itu_icon} {day.itu}</p>
                    {day.rain > 0 && <p className="text-xs text-blue-500">🌧️</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
          <ClimateHistory />
        </div>
      )}
    </div>
  )
}

