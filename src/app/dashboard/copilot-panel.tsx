'use client'

/**
 * Painel do Copiloto da Fazenda
 *
 * Componente que aparece no topo do dashboard mostrando:
 * - Saudacao personalizada com nome do produtor e data
 * - 3-5 acoes prioritarias com cores por urgencia
 * - Resumo do clima em uma linha
 * - Dica do dia colapsavel
 *
 * Cores de prioridade:
 *   1 = vermelho (urgente)
 *   2 = amarelo (importante)
 *   3 = azul (rotina)
 */

import { useState, useEffect } from 'react'

// Estilos de card por prioridade
const priorityStyles: Record<number, { border: string; bg: string; icon: string; label: string }> = {
  1: {
    border: 'border-red-500/30',
    bg: 'bg-red-500/10',
    icon: '🔴',
    label: 'Urgente',
  },
  2: {
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/10',
    icon: '🟡',
    label: 'Importante',
  },
  3: {
    border: 'border-blue-500/30',
    bg: 'bg-blue-500/10',
    icon: '🔵',
    label: 'Rotina',
  },
}

// Tipagem local para o briefing (mesma interface da API)
interface CopilotAction {
  priority: 1 | 2 | 3
  icon: string
  category: string
  title: string
  description: string
  herd_name?: string
}

interface DailyBriefing {
  greeting: string
  date: string
  actions: CopilotAction[]
  weather_summary: string
  financial_summary: string
  tip_of_day: string
}

export default function CopilotPanel() {
  const [briefing, setBriefing] = useState<DailyBriefing | null>(null)
  const [loading, setLoading] = useState(true)
  const [showTip, setShowTip] = useState(false)
  const [error, setError] = useState(false)

  // Buscar briefing da API ao montar o componente
  useEffect(() => {
    const fetchBriefing = async () => {
      try {
        const res = await fetch('/api/copilot')
        if (res.ok) {
          const data = await res.json()
          setBriefing(data)
        } else {
          setError(true)
        }
      } catch {
        setError(true)
      }
      setLoading(false)
    }
    fetchBriefing()
  }, [])

  // Skeleton de carregamento
  if (loading) {
    return (
      <div className="card p-4 mb-6 animate-pulse">
        <div className="h-5 bg-white/[0.06] rounded w-64 mb-3"></div>
        <div className="h-4 bg-white/[0.06] rounded w-40 mb-4"></div>
        <div className="space-y-2">
          <div className="h-16 bg-white/[0.06] rounded"></div>
          <div className="h-16 bg-white/[0.06] rounded"></div>
        </div>
      </div>
    )
  }

  // Nao mostrar nada se erro ou sem dados
  if (error || !briefing) return null

  return (
    <div className="mb-6">
      {/* Card principal do copiloto */}
      <div className="card p-4 sm:p-5 border border-orange-500/20 bg-gradient-to-br from-orange-500/[0.04] to-transparent">
        {/* Cabecalho: saudacao + data */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-[15px] sm:text-base font-bold text-white">
              {briefing.greeting}
            </h2>
            <p className="text-[12px] text-zinc-500 capitalize mt-0.5">
              {briefing.date}
            </p>
          </div>
          <span className="text-[11px] font-semibold text-orange-400 bg-orange-500/10 px-2 py-1 rounded-full">
            Copiloto IA
          </span>
        </div>

        {/* Resumo do clima em uma linha */}
        <div className="flex items-center gap-2 mb-4 text-[12px] text-zinc-400">
          <span>🌤️</span>
          <span>{briefing.weather_summary}</span>
        </div>

        {/* Lista de acoes prioritarias */}
        {briefing.actions.length > 0 ? (
          <div className="space-y-2 mb-4">
            {briefing.actions.map((action, i) => {
              const style = priorityStyles[action.priority] || priorityStyles[3]
              return (
                <div
                  key={i}
                  className={`border rounded-lg p-3 ${style.border} ${style.bg}`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-base shrink-0 mt-0.5">{action.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-[13px] font-semibold text-white truncate">
                          {action.title}
                        </p>
                        <span className="text-[10px] text-zinc-500 shrink-0">
                          {style.label}
                        </span>
                      </div>
                      <p className="text-[12px] text-zinc-400 leading-relaxed">
                        {action.description}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-4 mb-4">
            <p className="text-sm text-zinc-400">Tudo em dia! Nenhuma acao urgente.</p>
          </div>
        )}

        {/* Resumo financeiro */}
        {briefing.financial_summary && (
          <div className="flex items-center gap-2 mb-3 text-[12px] text-zinc-400">
            <span>💰</span>
            <span>{briefing.financial_summary}</span>
          </div>
        )}

        {/* Dica do dia colapsavel */}
        <div className="border-t border-white/[0.06] pt-3">
          <button
            className="flex items-center gap-2 text-[12px] text-orange-400 hover:text-orange-300 transition-colors w-full text-left"
            onClick={() => setShowTip(!showTip)}
          >
            <span>💡</span>
            <span className="font-medium">Dica do dia</span>
            <span className="text-[11px] text-zinc-600 ml-auto">
              {showTip ? '▲' : '▼'}
            </span>
          </button>
          {showTip && (
            <p className="text-[12px] text-zinc-400 mt-2 leading-relaxed pl-5">
              {briefing.tip_of_day}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
