'use client'

import { useState, useEffect } from 'react'

export default function ClimateHistory() {
  const [data, setData] = useState<any>(null)
  const [prediction, setPrediction] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingPred, setLoadingPred] = useState(false)

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch('/api/climate/history')
        const json = await res.json()
        if (res.ok) setData(json)
      } catch (err) {}
      setLoading(false)
    }
    fetchHistory()
  }, [])

  const fetchPrediction = async () => {
    if (!data) return
    setLoadingPred(true)
    try {
      const res = await fetch('/api/climate/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history_data: data }),
      })
      const json = await res.json()
      if (res.ok) setPrediction(json.prediction)
    } catch (err) {}
    setLoadingPred(false)
  }

  if (loading || !data) return null

  const maxRain = Math.max(...data.history.map((h: any) => h.rain_mm))

  return (
    <div className="space-y-3">
      {/* Status atual do pasto */}
      <div className={"rounded-xl p-4 border " + (data.overloaded ? "bg-red-500/10 border-red-500/20" : "bg-green-500/10 border-green-500/20")}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase text-gray-400">Status da pastagem</p>
          <span className={"text-xs font-bold px-2 py-1 rounded-lg " + (data.overloaded ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400")}>
            {data.overloaded ? '⚠️ Superlotado' : '✅ Adequado'}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-3 text-center">
          <div>
            <p className="text-lg font-extrabold text-white">{data.current_load}</p>
            <p className="text-xs text-gray-500">cab/ha atual</p>
          </div>
          <div>
            <p className="text-lg font-extrabold text-green-400">{data.current_capacity}</p>
            <p className="text-xs text-gray-500">cap. suporte</p>
          </div>
          <div>
            <p className="text-lg font-extrabold text-white">{data.current_ms}</p>
            <p className="text-xs text-gray-500">kg MS/ha</p>
          </div>
          <div>
            <p className={"text-lg font-extrabold " + (data.current_pb >= 7 ? "text-green-400" : data.current_pb >= 5 ? "text-yellow-400" : "text-red-400")}>{data.current_pb}%</p>
            <p className="text-xs text-gray-500">PB forragem</p>
          </div>
        </div>
      </div>

      {/* Gráfico de chuva + NDVI */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <p className="text-xs text-gray-400 font-semibold uppercase mb-3">Chuva e qualidade do pasto — 12 meses</p>
        <div className="flex items-end gap-1 h-24">
          {data.history.map((h: any, i: number) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full relative" style={{ height: '80px' }}>
                {/* Barra de chuva */}
                <div
                  className="absolute bottom-0 w-full bg-blue-500/40 rounded-t"
                  style={{ height: maxRain > 0 ? (h.rain_mm / maxRain * 100) + '%' : '0%' }}
                />
                {/* Indicador NDVI */}
                <div
                  className={"absolute w-2 h-2 rounded-full left-1/2 -translate-x-1/2 " +
                    (h.ndvi >= 0.6 ? 'bg-green-500' : h.ndvi >= 0.4 ? 'bg-yellow-500' : 'bg-red-500')}
                  style={{ bottom: (h.ndvi * 100) + '%' }}
                />
              </div>
              <p className="text-xs text-gray-600 truncate w-full text-center" style={{ fontSize: '9px' }}>{h.month}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-2 text-xs text-gray-600">
          <span className="flex items-center gap-1"><span className="w-3 h-2 bg-blue-500/40 rounded"></span> Chuva (mm)</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full"></span> NDVI bom</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-yellow-500 rounded-full"></span> Moderado</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500 rounded-full"></span> Seco</span>
        </div>
      </div>

      {/* Previsão IA */}
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs">🔮</span>
          <p className="text-xs text-blue-400 font-semibold uppercase">Radar IA — Previsão próximos 3 meses</p>
        </div>

        {!prediction && !loadingPred && (
          <button
            onClick={fetchPrediction}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg"
          >
            Gerar previsão com IA
          </button>
        )}

        {loadingPred && (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-gray-400">Analisando padrões climáticos...</p>
          </div>
        )}

        {prediction && (
          <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">{prediction}</p>
        )}
      </div>
    </div>
  )
}

