'use client'

import { useState } from 'react'
import GeneticBadge from './genetic-badge'

export default function ProfitSimulator({ herdId, herdName }: { herdId: string, herdName: string }) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [customPrice, setCustomPrice] = useState('')
  const [animalPrice, setAnimalPrice] = useState('')
  const [cycleMonths, setCycleMonths] = useState('')
  const [showCosts, setShowCosts] = useState(false)
  const [customCosts, setCustomCosts] = useState<any>(null)
  const [suggestions, setSuggestions] = useState<string | null>(null)
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)

  const handleSimulate = async () => {
    setLoading(true)
    setError('')
    setSuggestions(null)
    try {
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          herd_id: herdId,
          custom_arroba_price: customPrice ? parseFloat(customPrice) : null,
          custom_animal_price: animalPrice ? parseFloat(animalPrice) : null,
          cycle_months: cycleMonths ? parseInt(cycleMonths) : null,
          custom_costs: customCosts,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Erro ao simular') } else { setResult(data); fetchSuggestions(data) }
    } catch (err) { setError('Erro de conexão') }
    setLoading(false)
  }

  const fetchSuggestions = async (simData: any) => {
    setLoadingSuggestions(true)
    try {
      const res = await fetch('/api/simulate/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ simulationData: simData }),
      })
      const data = await res.json()
      if (res.ok && data.suggestions) {
        setSuggestions(data.suggestions)
      }
    } catch (err) {
      console.error('Erro ao buscar sugestões')
    }
    setLoadingSuggestions(false)
  }

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const fmtNum = (v: number, d: number = 2) => v.toFixed(d).replace('.', ',')

  const updateCost = (field: string, value: string) => {
    const c = { ...(customCosts || {}) }
    if (value === '') { delete c[field] } else { c[field] = parseFloat(value) }
    setCustomCosts(Object.keys(c).length > 0 ? c : null)
  }

  const healthStyles: Record<string, { bg: string, border: string, text: string, icon: string }> = {
    excellent: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400', icon: '🟢' },
    good: { bg: 'bg-green-500/10', border: 'border-green-500/20', text: 'text-green-400', icon: '🟢' },
    moderate: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', text: 'text-yellow-400', icon: '🟡' },
    low: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', text: 'text-yellow-400', icon: '🟡' },
    danger: { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400', icon: '🔴' },
  }

  return (
    <div className="mt-4 border-t border-gray-800 pt-4">
      {!result && !loading && (
        <div>
          <p className="text-sm text-gray-400 mb-3 text-center">
            Simule o lucro do ciclo completo com sugestões da IA para melhorar seu resultado.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Preço @ (R$)</label>
              <input type="number" value={customPrice} onChange={(e) => setCustomPrice(e.target.value)}
                placeholder="320" className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded-lg text-white text-sm focus:border-orange-500 focus:outline-none text-center" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Custo animal (R$)</label>
              <input type="number" value={animalPrice} onChange={(e) => setAnimalPrice(e.target.value)}
                placeholder="Auto" className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded-lg text-white text-sm focus:border-orange-500 focus:outline-none text-center" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Ciclo (meses)</label>
              <input type="number" value={cycleMonths} onChange={(e) => setCycleMonths(e.target.value)}
                placeholder="Auto" className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded-lg text-white text-sm focus:border-orange-500 focus:outline-none text-center" />
            </div>
          </div>
          <button onClick={() => setShowCosts(!showCosts)}
            className="w-full text-center text-xs text-gray-500 hover:text-orange-400 mb-3">
            {showCosts ? '▲ Esconder custos' : '▼ Editar custos operacionais (R$/cab/dia)'}
          </button>
          {showCosts && (
            <div className="bg-gray-800/40 rounded-xl p-4 mb-3 space-y-2">
              <p className="text-xs text-gray-400 mb-2">R$/cabeça/dia. Vazio = padrão IMEA-MT.</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'pasto', label: 'Pasto / Arrendamento' },
                  { key: 'mao_obra', label: 'Mão de obra' },
                  { key: 'sanidade', label: 'Sanidade' },
                  { key: 'outros', label: 'Outros' },
                ].map(item => (
                  <div key={item.key}>
                    <label className="block text-xs text-gray-500 mb-1">{item.label}</label>
                    <input type="number" step="0.1" placeholder="Padrão" onChange={(e) => updateCost(item.key, e.target.value)}
                      className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded-lg text-white text-xs focus:border-orange-500 focus:outline-none" />
                  </div>
                ))}
              </div>
            </div>
          )}
          <button onClick={handleSimulate}
            className="w-full px-6 py-3 min-h-[44px] bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-sm">
            💰 Simular Lucro do Ciclo
          </button>
        </div>
      )}

      {loading && (
        <div className="text-center py-6">
          <div className="inline-block w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-sm text-gray-400">Calculando lucro de {herdName}...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <p className="text-red-400 text-sm">{error}</p>
          <button onClick={handleSimulate} className="mt-2 text-sm text-red-400 underline">Tentar novamente</button>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          {/* INDICADOR DE SAÚDE */}
          {(() => {
            const s = healthStyles[result.health_level] || healthStyles.danger
            return (
              <div className={s.bg + " border " + s.border + " rounded-xl p-4"}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span>{s.icon}</span>
                    <span className={"text-sm font-bold " + s.text}>{result.health_label}</span>
                  </div>
                  <span className="text-xs text-gray-500">Ciclo de {result.cycle_months} meses</span>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div>
                    <p className="text-xs text-gray-500">Lucro por cabeça</p>
                    <p className={"text-3xl font-extrabold " + s.text}>{fmt(result.total_profit)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">ROI do ciclo</p>
                    <p className={"text-2xl font-extrabold " + s.text}>{fmtNum(result.total_roi, 1)}%</p>
                  </div>
                </div>
                <div className="mt-3 bg-black/20 rounded-lg p-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400">ROI anualizado</span>
                    <span className={"font-bold " + (result.annualized_roi > result.selic_rate ? "text-green-400" : "text-red-400")}>
                      {fmtNum(result.annualized_roi, 1)}% ao ano
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Taxa Selic</span>
                    <span className="text-gray-300">{fmtNum(result.selic_rate, 2)}% ao ano</span>
                  </div>
                  <p className={"text-xs mt-2 font-semibold " + (result.annualized_roi > result.selic_rate ? "text-green-400" : "text-yellow-400")}>
                    {result.annualized_roi > result.selic_rate
                      ? '✅ Pecuária rendendo mais que a Selic'
                      : '⚠️ Atenção: rendimento abaixo da Selic'}
                  </p>
                </div>
              </div>
            )
          })()}

          {/* SUGESTÕES DA IA */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                <span className="text-xs">🧠</span>
              </div>
              <p className="text-xs text-blue-400 font-semibold uppercase">Radar IA — Sugestões para melhorar seu resultado</p>
            </div>
            {loadingSuggestions && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm text-gray-400">Analisando oportunidades...</p>
              </div>
            )}
            {suggestions && (
              <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">{suggestions}</p>
            )}
            {!loadingSuggestions && !suggestions && (
              <p className="text-sm text-gray-500">Não foi possível gerar sugestões.</p>
            )}
          </div>

          {/* SCORE GENETICO */}
          {result.genetic_score && (
            <div className="space-y-3">
              <GeneticBadge
                score={result.genetic_score.final}
                confidence={result.genetic_score.confidence}
                weighing_count={result.genetic_score.weighing_count}
                genetic_group={result.genetic_score.genetic_group}
                gmd_potential={result.genetic_score.gmd_potential || 'medio'}
                gmd_adjusted={result.genetic_score.gmd_adjusted}
                gmd_by_phase={result.genetic_score.gmd_by_phase}
              />
              <details className="bg-gray-800/30 rounded-xl p-4">
                <summary className="text-xs text-gray-500 font-semibold uppercase cursor-pointer">Detalhes do score genetico</summary>
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Score declarado</span>
                    <span className="text-white">{fmtNum(result.genetic_score.declared, 0)}/100</span>
                  </div>
                  {result.genetic_score.learned !== null && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Score aprendido</span>
                      <span className="text-white">{fmtNum(result.genetic_score.learned, 0)}/100</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold">
                    <span className="text-gray-300">Score final</span>
                    <span className="text-orange-400">{fmtNum(result.genetic_score.final, 0)}/100</span>
                  </div>
                  <div className="border-t border-gray-700 my-1"></div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">GMD referencia (raca)</span>
                    <span className="text-gray-300">{fmtNum(result.genetic_score.gmd_reference, 3)} kg/dia</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">GMD ajustado (genetico)</span>
                    <span className="text-green-400 font-bold">{fmtNum(result.genetic_score.gmd_adjusted, 3)} kg/dia</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Rendimento carcaca</span>
                    <span className="text-gray-300">{fmtNum(result.carcass_yield * 100, 0)}%</span>
                  </div>
                </div>
              </details>
            </div>
          )}

          {/* MORTALIDADE E IMPOSTOS */}
          <div className="bg-gray-800/50 rounded-xl p-4">
            <p className="text-xs text-gray-400 font-semibold uppercase mb-3">Mortalidade e Impostos</p>
            <div className="space-y-2">
              {result.mortality_rate != null && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Mortalidade estimada</span>
                    <span className="text-yellow-400 font-bold">{fmtNum(result.mortality_rate, 1)}% ({result.dead_heads} cab.)</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Cabecas efetivas</span>
                    <span className="text-white font-bold">{result.effective_heads} de {result.head_count}</span>
                  </div>
                  {result.mortality_loss > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Perda por mortalidade</span>
                      <span className="text-red-400">{fmt(result.mortality_loss)}</span>
                    </div>
                  )}
                </>
              )}
              {result.taxes && (
                <>
                  <div className="border-t border-gray-700 my-1"></div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Receita bruta</span>
                    <span className="text-green-400">{fmt(result.gross_revenue)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Impostos (FUNRURAL + SENAR + FETHAB)</span>
                    <span className="text-red-400">{fmt(result.taxes.total_per_head)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold">
                    <span className="text-gray-300">Receita liquida</span>
                    <span className="text-green-400">{fmt(result.net_revenue)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* LUCRO DO LOTE */}
          <div className="bg-gray-800/50 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase font-semibold">Lucro total do lote</p>
                <p className={"text-2xl font-extrabold " + (result.total_lot_profit >= 0 ? "text-green-400" : "text-red-400")}>
                  {fmt(result.total_lot_profit)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Investimento</p>
                <p className="text-sm text-gray-300">{fmt(result.total_lot_investment)}</p>
              </div>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {result.effective_heads || result.head_count} cab. efetivas × {fmt(result.total_profit)} em {result.cycle_months} meses
            </p>
          </div>

          {/* FLUXO DO CICLO */}
          <div className="bg-gray-800/50 rounded-xl p-4">
            <p className="text-xs text-gray-400 font-semibold uppercase mb-3">Fluxo por cabeça</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Compra do animal</span>
                <span className="text-red-400 font-bold">{fmt(result.animal_price)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Custo operacional ({result.cycle_months}m)</span>
                <span className="text-red-400">{fmt(result.total_operational_cost)}</span>
              </div>
              <div className="border-t border-gray-700 my-1"></div>
              <div className="flex justify-between text-sm font-bold">
                <span className="text-gray-300">Investimento total</span>
                <span className="text-red-400">{fmt(result.total_investment)}</span>
              </div>
              <div className="border-t border-gray-700 my-1"></div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Peso {result.initial_weight}kg → {result.final_weight}kg</span>
                <span className="text-white">{fmtNum(result.final_arroba)} @</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Venda bruta (@ {fmt(result.arroba_price)})</span>
                <span className="text-green-400">{fmt(result.gross_revenue || result.sale_revenue)}</span>
              </div>
              {result.taxes && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">(-) Impostos</span>
                  <span className="text-red-400">{fmt(result.taxes.total_per_head)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Receita liquida</span>
                <span className="text-green-400 font-bold">{fmt(result.net_revenue || result.sale_revenue)}</span>
              </div>
              <div className="border-t border-gray-700 my-1"></div>
              <div className="flex justify-between text-sm font-bold">
                <span className="text-gray-300">Lucro</span>
                <span className={result.total_profit >= 0 ? "text-green-400 text-lg" : "text-red-400 text-lg"}>
                  {fmt(result.total_profit)}
                </span>
              </div>
            </div>
          </div>

          {/* CUSTOS */}
          <details className="bg-gray-800/30 rounded-xl p-4">
            <summary className="text-xs text-gray-500 font-semibold uppercase cursor-pointer">Composição de custos (mensal)</summary>
            <div className="mt-3">
              {[
                { key: 'suplemento', label: 'Suplemento (' + result.product_name + ')', color: 'bg-green-500' },
                { key: 'pasto', label: 'Pasto / Arrendamento', color: 'bg-yellow-500' },
                { key: 'mao_obra', label: 'Mão de obra', color: 'bg-blue-500' },
                { key: 'sanidade', label: 'Sanidade', color: 'bg-purple-500' },
                { key: 'outros', label: 'Outros', color: 'bg-gray-500' },
              ].map(item => {
                const data = result.cost_breakdown[item.key]
                return (
                  <div key={item.key} className="mb-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-400">{item.label}</span>
                      <span className="text-white">{fmt(data.value)} ({fmtNum(data.pct, 0)}%)</span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div className={"h-full rounded-full " + item.color} style={{ width: data.pct + '%' }}></div>
                    </div>
                  </div>
                )
              })}
              <div className="border-t border-gray-700 mt-2 pt-2 flex justify-between text-sm font-bold">
                <span className="text-gray-300">Total/mês</span>
                <span className="text-red-400">{fmt(result.monthly_operational_cost)}</span>
              </div>
            </div>
          </details>

          {/* INDICADORES */}
          <details className="bg-gray-800/30 rounded-xl p-4">
            <summary className="text-xs text-gray-500 font-semibold uppercase cursor-pointer">Indicadores técnicos</summary>
            <div className="mt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">GMD</span>
                <span className="text-white font-bold">{fmtNum(result.gmd)} kg/dia</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Rendimento carcaça</span>
                <span className="text-gray-300">{fmtNum(result.carcass_yield * 100, 0)}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Custo por @ produzida</span>
                <span className="text-orange-400 font-bold">{fmt(result.cost_per_arroba)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Preço @ MT (30d / 90d)</span>
                <span className="text-gray-300">{fmt(result.arroba_avg_30d)} / {fmt(result.arroba_avg_90d)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Lucro/cab/mês</span>
                <span className="text-green-400">{fmt(result.profit_per_month)}</span>
              </div>
            </div>
          </details>

          {/* PROJEÇÃO */}
          {result.days_to_target && (
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4">
              <p className="text-xs text-orange-400 font-semibold uppercase mb-1">Projeção de abate</p>
              <p className="text-sm text-gray-300">
                Com GMD de {fmtNum(result.gmd)} kg/dia, animais de {result.avg_weight}kg
                atingem {result.projected_weight}kg em <strong className="text-orange-400">{result.days_to_target} dias</strong>.
              </p>
            </div>
          )}

          <button onClick={() => { setResult(null); setError(''); setSuggestions(null) }}
            className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 text-sm rounded-lg">
            Recalcular simulação
          </button>
        </div>
      )}
    </div>
  )
}

