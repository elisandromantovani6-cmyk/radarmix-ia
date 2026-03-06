'use client'

import { useState } from 'react'

export default function DREPanel({ herdId, herdName }: { herdId: string, herdName: string }) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')

  const fetchDRE = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/dre?herd_id=' + herdId)
      const json = await res.json()
      if (res.ok) setData(json)
      else setError(json.error || 'Erro')
    } catch (err) { setError('Erro de conexão') }
    setLoading(false)
  }

  const openPDF = () => {
    window.open('/api/dre/pdf?herd_id=' + herdId, '_blank')
  }

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const fmtNum = (v: number, d: number = 1) => v.toFixed(d).replace('.', ',')

  return (
    <div className="mt-4 border-t border-gray-800 pt-4">
      {!data && !loading && (
        <div className="text-center">
          <p className="text-sm text-gray-400 mb-3">Raio-X financeiro completo do lote com DRE, cenários e evolução.</p>
          <button onClick={fetchDRE} className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-sm">
            📊 Gerar Raio-X Financeiro
          </button>
        </div>
      )}

      {loading && (
        <div className="text-center py-6">
          <div className="inline-block w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-sm text-gray-400">Gerando DRE de {herdName}...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {data && (
        <div className="space-y-4">
          {/* Header + botão PDF */}
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-purple-400 font-semibold uppercase">Raio-X Financeiro</p>
                <h4 className="text-lg font-extrabold text-white">{data.herd.name}</h4>
                <p className="text-xs text-gray-500">
                  {data.herd.head_count} cab. {data.herd.breed || ''} | {data.herd.phase} | {data.period.months} meses
                </p>
              </div>
              <button onClick={openPDF}
                className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg">
                📄 PDF
              </button>
            </div>
          </div>

          {/* DRE */}
          <div className="bg-gray-800/50 rounded-xl p-4">
            <p className="text-xs text-gray-400 font-semibold uppercase mb-3">DRE por cabeça</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-300">
                <span>(+) Receita ({fmtNum(data.weight.arroba_current)}@ × {fmt(data.revenue.arroba_price)})</span>
                <span className="text-green-400 font-bold">{fmt(data.revenue.projected)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-400">
                <span>(-) Custo animal</span>
                <span className="text-red-400">{fmt(data.costs.animal)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-400">
                <span>(-) Operacional ({data.period.days}d)
                  <span className={"ml-2 text-xs px-2 py-0.5 rounded-full " +
                    (data.costs.source === 'registrado'
                      ? "bg-green-500/20 text-green-400"
                      : "bg-yellow-500/20 text-yellow-400")}>
                    {data.costs.source === 'registrado' ? '\u2705 Registrado' : '\u26A0\uFE0F Estimado'}
                  </span>
                  {data.costs.health_costs_real && (
                    <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                      \u2705 Sanidade real
                    </span>
                  )}
                </span>
                <span className="text-red-400">{fmt(data.costs.total_operational)}</span>
              </div>
              <div className="border-t border-gray-700 my-1"></div>
              <div className="flex justify-between text-sm font-bold">
                <span className="text-gray-200">= Lucro bruto</span>
                <span className={data.result.gross_profit >= 0 ? "text-green-400 text-lg" : "text-red-400 text-lg"}>
                  {fmt(data.result.gross_profit)}
                </span>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>Margem: {fmtNum(data.result.gross_margin)}%</span>
                <span>ROI: {fmtNum(data.result.roi)}%</span>
              </div>
            </div>
          </div>

          {/* Lucro do lote */}
          <div className={data.result.profit_per_lot >= 0
            ? "bg-green-500/10 border border-green-500/20 rounded-xl p-4"
            : "bg-red-500/10 border border-red-500/20 rounded-xl p-4"
          }>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs text-gray-400">Lucro total do lote</p>
                <p className={"text-2xl font-extrabold " + (data.result.profit_per_lot >= 0 ? "text-green-400" : "text-red-400")}>
                  {fmt(data.result.profit_per_lot)}
                </p>
              </div>
              <p className="text-xs text-gray-500">{data.herd.head_count} cab. × {fmt(data.result.gross_profit)}</p>
            </div>
          </div>

          {/* Evolução de peso */}
          {data.weight.history.length > 0 && (
            <div className="bg-gray-800/50 rounded-xl p-4">
              <p className="text-xs text-gray-400 font-semibold uppercase mb-3">Evolução de peso</p>
              <div className="flex items-end gap-2 h-20">
                {data.weight.history.map((w: any, i: number) => {
                  const maxW = Math.max(...data.weight.history.map((h: any) => h.weight))
                  const minW = Math.min(...data.weight.history.map((h: any) => h.weight))
                  const range = maxW - minW || 1
                  const height = ((w.weight - minW) / range * 70) + 15
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs text-white font-bold">{w.weight}</span>
                      <div className="w-full bg-blue-500/60 rounded-t" style={{ height: height + '%' }}></div>
                      <span className="text-xs text-gray-600" style={{ fontSize: '8px' }}>{w.date}</span>
                    </div>
                  )
                })}
              </div>
              <div className="mt-2 flex justify-between text-xs text-gray-500">
                <span>GMD real: <strong className="text-white">{fmtNum(data.weight.gmd_real, 2)} kg/dia</strong></span>
                <span>Ganho: <strong className="text-white">{data.weight.gain} kg</strong></span>
              </div>
            </div>
          )}

          {/* Cenários */}
          <div className="bg-gray-800/50 rounded-xl p-4">
            <p className="text-xs text-gray-400 font-semibold uppercase mb-3">Cenários de preço da @</p>
            <div className="grid grid-cols-3 gap-2">
              {data.scenarios.map((s: any, i: number) => (
                <div key={i} className={"rounded-xl p-3 text-center border " +
                  (s.label === 'Atual' ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-800/50 border-gray-700/50')}>
                  <p className="text-xs text-gray-500">{s.label}</p>
                  <p className="text-sm font-bold text-white">{fmt(s.price)}/@</p>
                  <p className={"text-sm font-extrabold mt-1 " + (s.profit >= 0 ? "text-green-400" : "text-red-400")}>
                    {fmt(s.profit)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Botões */}
          <div className="flex gap-2">
            <button onClick={openPDF}
              className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold rounded-lg">
              📄 Exportar PDF
            </button>
            <button onClick={() => setData(null)}
              className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 text-sm rounded-lg">
              Atualizar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

