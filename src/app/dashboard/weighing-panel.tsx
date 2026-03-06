'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function WeighingPanel({ herdId, herdName, currentWeight }: { herdId: string, herdName: string, currentWeight: number | null }) {
  const [weight, setWeight] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async () => {
    if (!weight) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/weighing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ herd_id: herdId, weight_kg: weight, date, notes }),
      })
      const data = await res.json()
      if (res.ok) {
        setResult(data)
        router.refresh()
      } else {
        setError(data.error || 'Erro ao registrar pesagem')
      }
    } catch (err) { setError('Erro de conexão') }
    setLoading(false)
  }

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <div className="mt-4 border-t border-gray-800 pt-4">
      {!result && (
        <div>
          <p className="text-sm text-gray-400 mb-3 text-center">
            Registre o peso médio atual do lote. A IA recalcula GMD real e projeção de abate.
          </p>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Peso médio atual (kg)</label>
              <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)}
                placeholder={currentWeight ? 'Anterior: ' + currentWeight + 'kg' : 'Ex: 380'}
                className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Data da pesagem</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none" />
            </div>
          </div>

          <input value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Observação (opcional)"
            className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none mb-3" />

          {error && <p className="text-red-400 text-xs mb-2">{error}</p>}

          <button onClick={handleSubmit} disabled={loading || !weight}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm disabled:opacity-50">
            {loading ? 'Registrando...' : '⚖️ Registrar Pesagem'}
          </button>
        </div>
      )}

      {result && (
        <div className="space-y-3">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-center">
            <p className="text-xs text-blue-400 font-semibold uppercase mb-1">Pesagem registrada!</p>
            <p className="text-2xl font-extrabold text-white">{result.new_weight} kg</p>
            {result.gain !== null && (
              <p className={"text-sm font-bold mt-1 " + (result.gain >= 0 ? "text-green-400" : "text-red-400")}>
                {result.gain >= 0 ? '+' : ''}{result.gain} kg desde última pesagem
              </p>
            )}
          </div>

          {result.gmd_real !== null && (
            <div className="bg-gray-800/50 rounded-xl p-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">GMD Real</span>
                <span className={"font-bold " + (result.gmd_real >= 0.5 ? "text-green-400" : result.gmd_real >= 0.3 ? "text-yellow-400" : "text-red-400")}>
                  {result.gmd_real.toFixed(2)} kg/dia
                </span>
              </div>
              {result.days_to_target && (
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-gray-400">Previsão abate ({result.target_weight}kg)</span>
                  <span className="text-orange-400 font-bold">{result.days_to_target} dias</span>
                </div>
              )}
            </div>
          )}

          <button onClick={() => setResult(null)}
            className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 text-sm rounded-lg">
            Nova pesagem
          </button>
        </div>
      )}
    </div>
  )
}

