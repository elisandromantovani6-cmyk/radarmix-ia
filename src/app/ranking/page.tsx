'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function RankingPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'ranking' | 'badges' | 'notificacoes'>('ranking')

  useEffect(() => {
    const fetch_ = async () => {
      const res = await fetch('/api/ranking')
      const json = await res.json()
      if (res.ok) setData(json)
      setLoading(false)
    }
    fetch_()
  }, [])

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  if (loading) return (
    <div className="min-h-screen bg-[#050506] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  )
  if (!data) return null

  const rankColor = data.rank <= 3 ? 'text-gradient' : data.rank <= 5 ? 'text-orange-400' : 'text-zinc-300'
  const percentileLabel = data.percentile >= 90 ? 'Top 10%' : data.percentile >= 75 ? 'Top 25%' : data.percentile >= 50 ? 'Top 50%' : 'Top ' + (100 - data.percentile) + '%'

  // Notificações calculadas a partir dos dados
  const notifications: { icon: string, text: string, color: string }[] = []

  // Notificação de percentile
  if (data.percentile >= 90) {
    notifications.push({ icon: '🔥', text: 'Você está no Top 10%! Elite do MT!', color: 'border-orange-500/30 bg-orange-500/5' })
  } else if (data.percentile >= 75) {
    notifications.push({ icon: '⭐', text: 'Top 25%! Continue assim!', color: 'border-yellow-500/30 bg-yellow-500/5' })
  } else if (data.percentile >= 50) {
    notifications.push({ icon: '📈', text: 'Top 50%! Você está evoluindo!', color: 'border-blue-500/30 bg-blue-500/5' })
  }

  // Notificação de última conquista
  if (data.badges.earned.length > 0) {
    const lastBadge = data.badges.earned[data.badges.earned.length - 1]
    notifications.push({ icon: lastBadge.icon, text: `Nova conquista desbloqueada: ${lastBadge.name}`, color: 'border-emerald-500/30 bg-emerald-500/5' })
  }

  // Próximo nível: calcular pontos até o próximo no ranking
  const SCORE_THRESHOLDS = [200, 400, 600, 800, 1000, 1500, 2000, 3000]
  const nextThreshold = SCORE_THRESHOLDS.find(t => t > data.score) || (data.score + 100)
  const pointsToNext = nextThreshold - data.score
  notifications.push({ icon: '🎯', text: `Próximo nível: +${pointsToNext} pontos (meta: ${nextThreshold} pts)`, color: 'border-violet-500/30 bg-violet-500/5' })

  // Notificações de conquistas mockadas (cards detalhados)
  const achievementNotifications = [
    {
      id: 1,
      icon: '🏆',
      title: 'Você subiu para o Top 20%!',
      description: 'Sua fazenda ultrapassou 80% dos produtores da região. Continue otimizando a dieta dos seus lotes para subir ainda mais.',
      timestamp: 'Há 2 horas',
      type: 'conquista' as const,
      isNew: true,
    },
    {
      id: 2,
      icon: '🥇',
      title: 'Nova conquista desbloqueada: Arroba de Ouro',
      description: 'Você atingiu o menor custo por arroba da sua região neste mês. Parabéns pela eficiência!',
      timestamp: 'Há 5 horas',
      type: 'conquista' as const,
      isNew: true,
    },
    {
      id: 3,
      icon: '📈',
      title: 'Seu GMD melhorou 12% este mês',
      description: 'O ganho médio diário dos seus lotes subiu de 0,95 kg/dia para 1,06 kg/dia. A mudança na suplementação está funcionando.',
      timestamp: 'Há 1 dia',
      type: 'melhoria' as const,
      isNew: true,
    },
    {
      id: 4,
      icon: '💡',
      title: 'Dica: otimize o lote "Nelore Pasto 3"',
      description: 'Esse lote está com GMD abaixo da média regional. Considere ajustar a suplementação proteica.',
      timestamp: 'Há 3 dias',
      type: 'info' as const,
      isNew: false,
    },
    {
      id: 5,
      icon: '⚖️',
      title: 'Pesagem registrada com sucesso',
      description: 'A pesagem do lote "Angus Confinamento" foi processada. O peso médio subiu para 485 kg.',
      timestamp: 'Há 5 dias',
      type: 'info' as const,
      isNew: false,
    },
  ]

  const notifTypeStyles = {
    conquista: 'border-emerald-500/30 bg-emerald-500/[0.06]',
    melhoria: 'border-amber-500/30 bg-amber-500/[0.06]',
    info: 'border-blue-500/30 bg-blue-500/[0.06]',
  }

  const notifBadgeStyles = {
    conquista: 'bg-emerald-500/20 text-emerald-400',
    melhoria: 'bg-amber-500/20 text-amber-400',
    info: 'bg-blue-500/20 text-blue-400',
  }

  const notifTypeLabels = {
    conquista: 'Conquista',
    melhoria: 'Melhoria',
    info: 'Informação',
  }

  return (
    <div className="min-h-screen bg-[#050506] text-zinc-100 relative">
      <header className="border-b border-white/[0.04] bg-[#050506]/80 backdrop-blur-2xl sticky top-0 z-50 safe-top">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 sm:py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link href="/dashboard" className="text-zinc-700 hover:text-white text-[13px] transition-colors">←</Link>
            <div className="flex items-center gap-2">
              <img src="/logo-radarmix.jpg" alt="Radarmix" className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-contain" />
              <h1 className="text-[14px] sm:text-[15px] font-extrabold">RADAR<span className="text-gradient">MIX</span> <span className="text-[10px] sm:text-[11px] text-orange-500/80 font-semibold">RANKING</span></h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 relative z-10">
        {/* Hero card */}
        <div className="card-accent rounded-2xl p-6 sm:p-8 mb-6 sm:mb-8 text-center animate-in relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(ellipse, rgba(249,115,22,0.08) 0%, transparent 70%)' }}></div>

          <div className="relative z-10">
            <p className="text-[11px] text-zinc-500 uppercase tracking-[0.15em] font-semibold mb-3">Sua posição no MT</p>
            <p className={"text-[48px] sm:text-[64px] font-black leading-none mb-1 " + rankColor}>#{data.rank}</p>
            <p className="text-[13px] sm:text-[14px] text-zinc-400 mb-4">de {data.total_players} produtores · <span className="text-orange-400 font-bold">{percentileLabel}</span></p>

            <div className="flex justify-center gap-6 sm:gap-8 mt-4 sm:mt-6">
              <div>
                <p className="text-[22px] sm:text-[28px] font-black text-gradient">{data.score}</p>
                <p className="text-[10px] sm:text-[11px] text-zinc-600 uppercase tracking-wider mt-1">Pontos</p>
              </div>
              <div className="w-px bg-zinc-800"></div>
              <div>
                <p className="text-[22px] sm:text-[28px] font-black text-white">{data.badges.earned.length}</p>
                <p className="text-[10px] sm:text-[11px] text-zinc-600 uppercase tracking-wider mt-1">Conquistas</p>
              </div>
              <div className="w-px bg-zinc-800"></div>
              <div>
                <p className="text-[22px] sm:text-[28px] font-black text-white">{data.stats.total_heads}</p>
                <p className="text-[10px] sm:text-[11px] text-zinc-600 uppercase tracking-wider mt-1">Cabeças</p>
              </div>
            </div>
          </div>
        </div>

        {/* Notificações */}
        {notifications.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-2 mb-6 animate-in delay-1">
            {notifications.map((n, i) => (
              <div key={i} className={"flex items-center gap-2 px-4 py-2.5 rounded-xl border " + n.color + " flex-1 min-w-0"}>
                <span className="text-[16px] shrink-0">{n.icon}</span>
                <p className="text-[12px] text-zinc-300 font-medium truncate">{n.text}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 animate-in delay-1 overflow-x-auto hide-scrollbar pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
          <button onClick={() => setTab('ranking')}
            className={"badge cursor-pointer transition-all whitespace-nowrap shrink-0 " + (tab === 'ranking' ? 'bg-orange-500 text-white border-transparent' : 'badge-orange')}>
            🏆 Ranking Regional
          </button>
          <button onClick={() => setTab('badges')}
            className={"badge cursor-pointer transition-all whitespace-nowrap shrink-0 " + (tab === 'badges' ? 'bg-orange-500 text-white border-transparent' : 'badge-orange')}>
            🎖️ Conquistas ({data.badges.earned.length}/{data.badges.earned.length + data.badges.locked.length})
          </button>
          <button onClick={() => setTab('notificacoes')}
            className={"badge cursor-pointer transition-all whitespace-nowrap shrink-0 relative " + (tab === 'notificacoes' ? 'bg-orange-500 text-white border-transparent' : 'badge-orange')}>
            🔔 Notificações
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold flex items-center justify-center text-white">
              {achievementNotifications.filter(n => n.isNew).length}
            </span>
          </button>
        </div>

        {/* Ranking */}
        {tab === 'ranking' && (
          <div className="card overflow-hidden animate-in delay-2">
            <div className="grid grid-cols-6 gap-4 px-5 py-3 border-b border-white/[0.04] text-[11px] text-zinc-600 uppercase tracking-wider font-semibold">
              <span>#</span>
              <span className="col-span-2">Fazenda</span>
              <span className="text-right">Score</span>
              <span className="text-right">GMD</span>
              <span className="text-right">Custo/@</span>
            </div>
            {data.ranking.map((r: any) => (
              <div key={r.rank} className={"grid grid-cols-6 gap-4 px-5 py-3.5 border-b border-white/[0.02] items-center transition-colors " +
                (r.isMe ? 'bg-orange-500/5 border-l-2 border-l-orange-500' : 'hover:bg-white/[0.02]')}>
                <span className={"text-[14px] font-black " + (r.rank <= 3 ? 'text-gradient' : 'text-zinc-500')}>
                  {r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : r.rank}
                </span>
                <div className="col-span-2">
                  <p className={"text-[13px] font-bold " + (r.isMe ? 'text-orange-400' : 'text-white')}>
                    {r.isMe ? '⭐ ' + data.farm_name : r.name}
                  </p>
                  <p className="text-[11px] text-zinc-600">{r.city}</p>
                </div>
                <p className={"text-[14px] font-bold text-right " + (r.isMe ? 'text-gradient' : 'text-zinc-300')}>{r.score}</p>
                <p className="text-[13px] text-right text-zinc-400">{r.gmd.toFixed(2)} kg/d</p>
                <p className="text-[13px] text-right text-zinc-400">{fmt(r.cost_arroba)}</p>
              </div>
            ))}
          </div>
        )}

        {/* Badges */}
        {tab === 'badges' && (
          <div className="space-y-4">
            {/* Earned */}
            <div className="animate-in delay-2">
              <p className="text-[12px] text-zinc-500 uppercase tracking-wider font-semibold mb-3">Conquistas desbloqueadas</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {data.badges.earned.map((b: any) => (
                  <div key={b.id} className="card-accent p-4 text-center">
                    <span className="text-[32px] block mb-2">{b.icon}</span>
                    <p className="text-[13px] font-bold text-white">{b.name}</p>
                    <p className="text-[11px] text-zinc-500 mt-1">{b.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Locked */}
            {data.badges.locked.length > 0 && (
              <div className="animate-in delay-3">
                <p className="text-[12px] text-zinc-500 uppercase tracking-wider font-semibold mb-3">Para desbloquear</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {data.badges.locked.map((b: any) => (
                    <div key={b.id} className="card p-4 text-center opacity-50">
                      <span className="text-[32px] block mb-2">{b.icon}</span>
                      <p className="text-[13px] font-bold text-zinc-500">{b.name}</p>
                      <p className="text-[11px] text-zinc-700 mt-1">{b.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Notificações de conquistas */}
        {tab === 'notificacoes' && (
          <div className="space-y-3 animate-in delay-2">
            <p className="text-[12px] text-zinc-500 uppercase tracking-wider font-semibold mb-3">Suas notificações</p>
            {achievementNotifications.map((notif) => (
              <div key={notif.id} className={"rounded-xl border p-4 transition-all hover:border-white/10 " + notifTypeStyles[notif.type]}>
                <div className="flex items-start gap-3">
                  <span className="text-[24px] shrink-0 mt-0.5">{notif.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-[14px] font-bold text-white">{notif.title}</h3>
                      {notif.isNew && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/30">
                          Novo
                        </span>
                      )}
                      <span className={"px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider " + notifBadgeStyles[notif.type]}>
                        {notifTypeLabels[notif.type]}
                      </span>
                    </div>
                    <p className="text-[12px] text-zinc-400 leading-relaxed">{notif.description}</p>
                    <p className="text-[11px] text-zinc-600 mt-2">{notif.timestamp}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="card p-5 mt-8 animate-in delay-3">
          <p className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold mb-4">Suas estatísticas</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Lotes', value: data.stats.total_herds, icon: '🐂' },
              { label: 'Cabeças', value: data.stats.total_heads, icon: '🐄' },
              { label: 'Recomendações', value: data.stats.total_consultations, icon: '🧠' },
              { label: 'Pesagens', value: data.stats.total_weighings, icon: '⚖️' },
              { label: 'Feedbacks', value: data.stats.total_feedbacks, icon: '👍' },
              { label: 'Cotações', value: data.stats.total_quotes, icon: '🛒' },
              { label: 'Melhor GMD', value: data.stats.best_gmd.toFixed(2) + ' kg/d', icon: '📈' },
              { label: 'Melhor ROI', value: Math.round(data.stats.best_roi) + '%', icon: '💰' },
            ].map((s, i) => (
              <div key={i} className="bg-[#09090B] rounded-xl p-3 border border-white/[0.03]">
                <span className="text-[14px]">{s.icon}</span>
                <p className="text-[16px] font-bold text-white mt-1">{s.value}</p>
                <p className="text-[10px] text-zinc-600 uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
