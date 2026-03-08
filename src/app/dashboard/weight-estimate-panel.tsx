'use client'

import { useState } from 'react'

interface WeightEstimateResult {
  estimated_weight_kg: number
  confidence_percent: number
  method_used: string
  body_condition: {
    score: number
    label: string
    recommendation: string
  }
  carcass: {
    yield_percent: number
    carcass_weight_kg: number
    arrobas: number
    estimated_value: number
  }
  comparison?: {
    vs_last_real?: {
      diff_kg: number
      days_between: number
      gmd_estimated: number
    }
  }
}

export default function WeightEstimatePanel({ herdId }: { herdId: string }) {
  const [chestPerimeter, setChestPerimeter] = useState('')
  const [bodyLength, setBodyLength] = useState('')
  const [hipHeight, setHipHeight] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<WeightEstimateResult | null>(null)
  const [expanded, setExpanded] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const body: Record<string, any> = {
        herd_id: herdId,
        chest_perimeter_cm: Number(chestPerimeter),
      }
      if (bodyLength) body.body_length_cm = Number(bodyLength)
      if (hipHeight) body.hip_height_cm = Number(hipHeight)

      const res = await fetch('/api/weight-estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const json = await res.json()

      if (!res.ok || !json.success) {
        setError(json.error || 'Erro ao estimar peso')
        return
      }

      setData(json.data)
      setExpanded(true)
    } catch {
      setError('Erro de conexao. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const confidenceColor = (pct: number) => {
    if (pct >= 85) return 'bg-green-500/20 text-green-400'
    if (pct >= 70) return 'bg-amber-500/20 text-amber-400'
    return 'bg-red-500/20 text-red-400'
  }

  const bodyConditionColor = (score: number) => {
    if (score <= 3) return 'bg-red-500'
    if (score <= 5) return 'bg-amber-500'
    return 'bg-green-500'
  }

  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">&#x2696;</span>
        <div>
          <p className="text-sm font-semibold text-white">Estimativa de Peso</p>
          <p className="text-[12px] text-zinc-500">Calculo por biometria (cinta toracica)</p>
        </div>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <div>
          <label className="text-[11px] text-zinc-400 uppercase font-semibold">
            Perimetro Toracico (cm) *
          </label>
          <input
            type="number"
            required
            min={100}
            max={300}
            step={0.1}
            value={chestPerimeter}
            onChange={(e) => setChestPerimeter(e.target.value)}
            placeholder="Ex: 185"
            className="input-field w-full px-3 py-2 text-[13px] mt-1"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] text-zinc-400 uppercase font-semibold">
              Comprimento Corporal (cm)
            </label>
            <input
              type="number"
              min={80}
              max={250}
              step={0.1}
              value={bodyLength}
              onChange={(e) => setBodyLength(e.target.value)}
              placeholder="Opcional"
              className="input-field w-full px-3 py-2 text-[13px] mt-1"
            />
          </div>
          <div>
            <label className="text-[11px] text-zinc-400 uppercase font-semibold">
              Altura de Garupa (cm)
            </label>
            <input
              type="number"
              min={80}
              max={200}
              step={0.1}
              value={hipHeight}
              onChange={(e) => setHipHeight(e.target.value)}
              placeholder="Opcional"
              className="input-field w-full px-3 py-2 text-[13px] mt-1"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            <p className="text-[12px] text-red-400">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !chestPerimeter}
          className="w-full bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 font-semibold text-[13px] py-2.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? 'Calculando...' : 'Estimar Peso'}
        </button>
      </form>

      {/* Resultados */}
      {data && (
        <div className="mt-4">
          <button
            className="w-full flex items-center justify-between text-[12px] text-zinc-500 mb-2"
            onClick={() => setExpanded(!expanded)}
          >
            <span className="font-semibold uppercase">Resultado da Estimativa</span>
            <span className="text-orange-400">
              {expanded ? '\u25B2 Fechar' : '\u25BC Expandir'}
            </span>
          </button>

          {expanded && (
            <div className="space-y-3">
              {/* Peso estimado + confianca */}
              <div className="bg-white/[0.03] rounded-lg p-4 text-center">
                <p className="text-[12px] text-zinc-500 uppercase mb-1">Peso Estimado</p>
                <p className="text-4xl font-extrabold text-white">
                  {data.estimated_weight_kg}
                  <span className="text-lg font-normal text-zinc-400 ml-1">kg</span>
                </p>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <span className={"text-[11px] font-bold px-2 py-0.5 rounded-full " + confidenceColor(data.confidence_percent)}>
                    {data.confidence_percent}% confianca
                  </span>
                  <span className="text-[11px] text-zinc-600">
                    {data.method_used.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>

              {/* Condicao corporal */}
              <div className="bg-white/[0.03] rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[12px] text-zinc-500 uppercase font-semibold">Condicao Corporal</p>
                  <span className="text-sm font-bold text-white">
                    {data.body_condition.score}/9 — {data.body_condition.label}
                  </span>
                </div>
                {/* Barra visual 1-9 */}
                <div className="flex gap-0.5">
                  {Array.from({ length: 9 }, (_, i) => (
                    <div
                      key={i}
                      className={
                        "h-2.5 flex-1 rounded-sm transition-colors " +
                        (i < data.body_condition.score
                          ? bodyConditionColor(data.body_condition.score)
                          : 'bg-zinc-800')
                      }
                    />
                  ))}
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-zinc-600">1 Magro</span>
                  <span className="text-[10px] text-zinc-600">5 Medio</span>
                  <span className="text-[10px] text-zinc-600">9 Gordo</span>
                </div>
                {data.body_condition.recommendation && (
                  <p className="text-[11px] text-zinc-400 mt-2">
                    {data.body_condition.recommendation}
                  </p>
                )}
              </div>

              {/* Carcaca */}
              <div className="bg-white/[0.03] rounded-lg p-3">
                <p className="text-[12px] text-zinc-500 uppercase font-semibold mb-2">Carcaca</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-zinc-500 uppercase">Rendimento</p>
                    <p className="text-sm font-bold text-white">{data.carcass.yield_percent}%</p>
                  </div>
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-zinc-500 uppercase">Peso Carcaca</p>
                    <p className="text-sm font-bold text-white">{data.carcass.carcass_weight_kg} kg</p>
                  </div>
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-zinc-500 uppercase">Arrobas</p>
                    <p className="text-sm font-bold text-orange-400">{data.carcass.arrobas.toFixed(1)}@</p>
                  </div>
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-zinc-500 uppercase">Valor Estimado</p>
                    <p className="text-sm font-bold text-green-400">
                      R$ {data.carcass.estimated_value.toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Comparacao com ultimo peso real */}
              {data.comparison?.vs_last_real && (
                <div className="bg-white/[0.03] rounded-lg p-3">
                  <p className="text-[12px] text-zinc-500 uppercase font-semibold mb-2">
                    Comparacao com Ultimo Peso Real
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={
                        "text-sm font-bold " +
                        (data.comparison.vs_last_real.diff_kg >= 0 ? 'text-green-400' : 'text-red-400')
                      }>
                        {data.comparison.vs_last_real.diff_kg >= 0 ? '+' : ''}
                        {data.comparison.vs_last_real.diff_kg} kg
                      </span>
                      <span className="text-[11px] text-zinc-500">
                        em {data.comparison.vs_last_real.days_between} dias
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-zinc-500 uppercase">GMD Estimado</p>
                      <p className="text-sm font-bold text-white">
                        {data.comparison.vs_last_real.gmd_estimated.toFixed(2)} kg/dia
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
