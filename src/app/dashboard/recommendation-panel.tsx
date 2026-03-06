'use client'

import { useState } from 'react'

export default function RecommendationPanel({ herdId, herdName }: { herdId: string, herdName: string }) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [feedbackSent, setFeedbackSent] = useState(false)
  const [feedbackRating, setFeedbackRating] = useState<string | null>(null)
  const [showComment, setShowComment] = useState(false)
  const [comment, setComment] = useState('')

  const handleRecommend = async () => {
    setLoading(true)
    setError('')
    setResult(null)
    setFeedbackSent(false)
    setFeedbackRating(null)
    setShowComment(false)
    setComment('')

    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ herd_id: herdId }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Erro ao gerar recomendação')
      } else {
        setResult(data)
      }
    } catch (err: any) {
      setError('Erro de conexão')
    }

    setLoading(false)
  }

  const handleFeedback = async (rating: string) => {
    setFeedbackRating(rating)

    if (rating === 'negative') {
      setShowComment(true)
      return
    }

    await sendFeedback(rating, '')
  }

  const sendFeedback = async (rating: string, feedbackComment: string) => {
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          herd_id: herdId,
          product_id: result.product.id,
          rating,
          comment: feedbackComment,
        }),
      })
      setFeedbackSent(true)
      setShowComment(false)
    } catch (err) {
      console.error('Erro ao enviar feedback')
    }
  }

  return (
    <div className="mt-4 border-t border-gray-800 pt-4">
      {!result && !loading && (
        <div className="text-center">
          <p className="text-sm text-gray-400 mb-3">
            A IA vai analisar o capim, a época do ano e o perfil do lote para recomendar o melhor produto Radarmix.
          </p>
          <button
            onClick={handleRecommend}
            className="px-6 py-3 min-h-[44px] bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-sm"
          >
            Gerar Recomendação com IA
          </button>
        </div>
      )}

      {loading && (
        <div className="text-center py-6">
          <div className="inline-block w-8 h-8 border-3 border-green-500 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-sm text-gray-400">Analisando {herdName}...</p>
          <p className="text-xs text-gray-600 mt-1">Consultando nutricionista IA</p>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <p className="text-red-400 text-sm">{error}</p>
          <button onClick={handleRecommend} className="mt-2 text-sm text-red-400 underline">Tentar novamente</button>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          {/* Produto recomendado */}
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-xs text-green-400 font-semibold uppercase">Produto Recomendado</p>
                <h4 className="text-lg font-extrabold text-white">{result.product.name}</h4>
              </div>
              <div className="text-right">
                <p className="text-2xl font-extrabold text-green-500">{result.score}</p>
                <p className="text-xs text-gray-500">pontos</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-gray-400">
              <span>Linha: {result.product.line}</span>
              <span>Consumo: {result.consumption_kg_day.toFixed(1)} kg/cab/dia</span>
              {result.product.package_kg && <span>Saco: {result.product.package_kg}kg</span>}
            </div>
          </div>

          {/* Explicação do nutricionista IA */}
          {result.explanation && (
            <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                  <span className="text-xs">🧠</span>
                </div>
                <p className="text-xs text-green-400 font-semibold uppercase">Nutricionista IA Radarmix</p>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">{result.explanation}</p>
            </div>
          )}

          {/* Feedback 👍👎 */}
          <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-4">
            {!feedbackSent ? (
              <div>
                <p className="text-sm text-gray-400 mb-3">Essa recomendação foi útil?</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleFeedback('positive')}
                    className={"flex-1 py-2.5 rounded-xl text-sm font-bold transition-all " +
                      (feedbackRating === 'positive'
                        ? "bg-green-600 text-white"
                        : "bg-gray-800 hover:bg-gray-700 text-gray-300")}
                  >
                    👍 Boa recomendação
                  </button>
                  <button
                    onClick={() => handleFeedback('negative')}
                    className={"flex-1 py-2.5 rounded-xl text-sm font-bold transition-all " +
                      (feedbackRating === 'negative'
                        ? "bg-red-600 text-white"
                        : "bg-gray-800 hover:bg-gray-700 text-gray-300")}
                  >
                    👎 Pode melhorar
                  </button>
                </div>

                {/* Campo de comentário para feedback negativo */}
                {showComment && (
                  <div className="mt-3 space-y-2">
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="O que poderia ser melhor? Ex: Já usei esse produto e não funcionou, prefiro outro da linha..."
                      className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded-xl text-white text-sm focus:border-red-500 focus:outline-none resize-none"
                      rows={3}
                    />
                    <button
                      onClick={() => sendFeedback('negative', comment)}
                      className="w-full py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl"
                    >
                      Enviar feedback
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-2">
                <p className="text-sm text-green-400 font-semibold">
                  {feedbackRating === 'positive' ? '👍 Obrigado! Seu feedback melhora a IA.' : '📝 Feedback enviado! Vamos melhorar.'}
                </p>
              </div>
            )}
          </div>

          {/* Déficits */}
          {result.deficits && result.deficits.length > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
              <p className="text-xs text-yellow-400 font-semibold uppercase mb-2">Déficits identificados</p>
              <div className="space-y-1">
                {result.deficits.map((d: string, i: number) => (
                  <p key={i} className="text-sm text-gray-300">• {d}</p>
                ))}
              </div>
            </div>
          )}

          {/* Razões técnicas */}
          {result.reasons && result.reasons.length > 0 && (
            <details className="bg-gray-800/30 rounded-xl p-4">
              <summary className="text-xs text-gray-500 font-semibold uppercase cursor-pointer">Detalhes técnicos</summary>
              <div className="mt-2 space-y-1">
                {result.reasons.map((r: string, i: number) => (
                  <p key={i} className="text-sm text-gray-400">• {r}</p>
                ))}
              </div>
            </details>
          )}

          {/* Botão recalcular */}
          <button
            onClick={handleRecommend}
            className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 text-sm rounded-lg"
          >
            Recalcular recomendação
          </button>
        </div>
      )}
    </div>
  )
}

