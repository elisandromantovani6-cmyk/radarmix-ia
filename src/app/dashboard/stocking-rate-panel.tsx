'use client'
import { useState } from 'react'

export default function StockingRatePanel({ herdId, herdName, headCount, avgWeight }: {
  herdId: string, herdName: string, headCount: number, avgWeight: number | null
}) {
  const [area, setArea] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const calculate = async () => {
    if (!area || parseFloat(area) <= 0) return
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/stocking-rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          area_ha: parseFloat(area),
          herd_id: herdId,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResult(data)
    } catch (err: any) {
      setResult({ error: err.message })
    } finally {
      setLoading(false)
    }
  }

  const statusColors: Record<string, string> = {
    'SUBUTILIZADO': 'text-blue-400',
    'IDEAL': 'text-green-400',
    'ATENÇÃO': 'text-amber-400',
    'SUPERLOTADO': 'text-red-400',
  }

  const statusBadges: Record<string, string> = {
    'SUBUTILIZADO': 'badge-blue',
    'IDEAL': 'badge-green',
    'ATENÇÃO': 'badge-amber',
    'SUPERLOTADO': 'badge-red',
  }

  return (
    <div className="mt-4 animate-in">
      <div className="card-accent p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[13px] font-bold text-white">Lotação do Pasto</span>
          <span className="badge badge-green">Novo</span>
        </div>

        {/* Input area */}
        <div className="flex gap-2 mb-3">
          <div className="flex-1">
            <label className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1 block">Área (hectares)</label>
            <input type="number" value={area} onChange={e => setArea(e.target.value)}
              placeholder="Ex: 50" min="0.1" step="0.1"
              className="input-field w-full px-3 py-2 text-[13px]"
              onKeyDown={e => e.key === 'Enter' && calculate()} />
          </div>
          <div className="flex items-end">
            <button onClick={calculate} disabled={loading || !area}
              className={'px-4 py-2 rounded-xl text-[12px] font-bold transition-all ' +
                (area ? 'btn-primary' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed')}>
              {loading ? '...' : 'Calcular'}
            </button>
          </div>
        </div>

        <p className="text-[10px] text-zinc-600 mb-1">
          Lote: {headCount} cab. | Peso: {avgWeight || '?'}kg
        </p>

        {/* Resultado */}
        {result && !result.error && (
          <div className="mt-3 space-y-3 animate-in">
            <div className="divider"></div>

            {/* Status grande */}
            <div className="flex items-center justify-between">
              <div>
                <span className={'text-[22px] font-black ' + (statusColors[result.status] || 'text-white')}>
                  {result.utilization_percent}%
                </span>
                <span className="text-[11px] text-zinc-600 ml-1">de uso</span>
              </div>
              <span className={'badge ' + (statusBadges[result.status] || 'badge-orange')}>
                {result.status}
              </span>
            </div>

            {/* Barra de utilização */}
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all"
                style={{
                  width: Math.min(result.utilization_percent, 150) / 1.5 + '%',
                  background: result.utilization_percent <= 100
                    ? 'linear-gradient(90deg, #22C55E, #4ADE80)'
                    : result.utilization_percent <= 120
                    ? 'linear-gradient(90deg, #F59E0B, #FBBF24)'
                    : 'linear-gradient(90deg, #EF4444, #F87171)'
                }} />
            </div>

            {/* Detalhes */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-zinc-900/50 rounded-lg p-2.5">
                <p className="text-[10px] text-zinc-600 uppercase">Capacidade</p>
                <p className="text-[15px] font-bold text-white">{result.max_heads} <span className="text-[11px] text-zinc-500">cab.</span></p>
                <p className="text-[10px] text-zinc-600">{result.capacity_ua_ha.toFixed(1)} UA/ha</p>
              </div>
              <div className="bg-zinc-900/50 rounded-lg p-2.5">
                <p className="text-[10px] text-zinc-600 uppercase">Atual</p>
                <p className="text-[15px] font-bold text-white">{result.current_heads} <span className="text-[11px] text-zinc-500">cab.</span></p>
                <p className="text-[10px] text-zinc-600">{result.current_ua.toFixed(1)} UA total</p>
              </div>
              <div className="bg-zinc-900/50 rounded-lg p-2.5">
                <p className="text-[10px] text-zinc-600 uppercase">Época</p>
                <p className="text-[13px] font-bold text-white">{result.season === 'seca' ? 'Seca' : 'Águas'}</p>
              </div>
              <div className="bg-zinc-900/50 rounded-lg p-2.5">
                <p className="text-[10px] text-zinc-600 uppercase">Diferença</p>
                <p className={'text-[13px] font-bold ' + (result.max_heads >= result.current_heads ? 'text-green-400' : 'text-red-400')}>
                  {result.max_heads >= result.current_heads
                    ? '+' + (result.max_heads - result.current_heads) + ' cab.'
                    : (result.max_heads - result.current_heads) + ' cab.'}
                </p>
              </div>
            </div>

            {/* Análise Claude */}
            <div className="bg-zinc-900/50 rounded-xl p-3">
              <p className="text-[10px] text-orange-400 font-bold mb-1.5">ANÁLISE</p>
              <p className="text-[12px] text-zinc-300 leading-relaxed whitespace-pre-wrap">{result.analysis}</p>
            </div>
          </div>
        )}

        {result?.error && (
          <p className="mt-3 text-[12px] text-red-400">{result.error}</p>
        )}
      </div>
    </div>
  )
}
