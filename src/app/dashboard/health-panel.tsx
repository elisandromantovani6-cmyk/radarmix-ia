'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Nomes dos meses em português
const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

// Ícones por tipo de evento
const TYPE_ICONS: Record<string, string> = {
  vacina: '💉',
  vermifugo: '🐛',
  tratamento: '💊',
  exame: '🔬',
}

// Cores das badges por tipo
const TYPE_BADGES: Record<string, string> = {
  vacina: 'badge-blue',
  vermifugo: 'badge-green',
  tratamento: 'badge-amber',
  exame: 'badge-purple',
}

interface Protocol {
  id: string
  name: string
  type: string
  description: string
  frequency_days: number | null
  recommended_months: number[]
  mandatory: boolean
}

interface HealthEvent {
  id: string
  event_type: string
  product_name: string
  dose: string | null
  cost_per_head: number | null
  head_count: number | null
  total_cost: number | null
  notes: string | null
  event_date: string
  next_due_date: string | null
  protocol_id: string | null
  protocol: { name: string; type: string; frequency_days: number | null } | null
}

interface AlertData {
  overdue: HealthEvent[]
  upcoming: HealthEvent[]
  suggested: Protocol[]
  current_month: number
  total_alerts: number
}

export default function HealthPanel({ herdId, herdName, headCount }: { herdId: string, herdName: string, headCount: number }) {
  const [tab, setTab] = useState<'events' | 'register' | 'calendar' | 'ia'>('calendar')
  const [aiSuggestions, setAiSuggestions] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [events, setEvents] = useState<HealthEvent[]>([])
  const [alerts, setAlerts] = useState<AlertData | null>(null)
  const [protocols, setProtocols] = useState<Protocol[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()

  // Campos do formulário
  const [eventType, setEventType] = useState('vacina')
  const [protocolId, setProtocolId] = useState('')
  const [productName, setProductName] = useState('')
  const [dose, setDose] = useState('')
  const [costPerHead, setCostPerHead] = useState('')
  const [eventHeadCount, setEventHeadCount] = useState(headCount?.toString() || '')
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')

  // Carregar dados ao montar o componente
  useEffect(() => {
    loadData()
  }, [herdId])

  const loadData = async () => {
    setLoading(true)
    try {
      const [eventsRes, alertsRes, protocolsRes] = await Promise.all([
        fetch(`/api/health?herd_id=${herdId}`),
        fetch(`/api/health/alerts?herd_id=${herdId}`),
        fetch('/api/health/protocols'),
      ])

      const eventsData = await eventsRes.json()
      const alertsData = await alertsRes.json()
      const protocolsData = await protocolsRes.json()

      setEvents(eventsData.events || [])
      setAlerts(alertsData)
      setProtocols(protocolsData.protocols || [])
    } catch {
      setError('Erro ao carregar dados sanitários')
    }
    setLoading(false)
  }

  // Quando seleciona um protocolo, preenche tipo e nome automaticamente
  const handleProtocolChange = (id: string) => {
    setProtocolId(id)
    const protocol = protocols.find(p => p.id === id)
    if (protocol) {
      setEventType(protocol.type)
      setProductName(protocol.name)
    }
  }

  // Registrar evento sanitário
  const handleSubmit = async () => {
    if (!productName) {
      setError('Informe o nome do produto')
      return
    }
    setSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          herd_id: herdId,
          protocol_id: protocolId || null,
          event_type: eventType,
          product_name: productName,
          dose,
          cost_per_head: costPerHead,
          head_count: eventHeadCount,
          notes,
          event_date: eventDate,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setSuccess('Evento sanitário registrado com sucesso!')
        // Limpar formulário
        setProtocolId('')
        setProductName('')
        setDose('')
        setCostPerHead('')
        setNotes('')
        // Recarregar dados
        await loadData()
        router.refresh()
        // Voltar para aba de eventos após 2 segundos
        setTimeout(() => {
          setSuccess('')
          setTab('events')
        }, 2000)
      } else {
        setError(data.error || 'Erro ao registrar evento')
      }
    } catch {
      setError('Erro de conexão')
    }
    setSubmitting(false)
  }

  // Formatar moeda
  const fmtCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  // Formatar data
  const fmtDate = (d: string) => {
    const parts = d.split('-')
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }

  // Contagem de alertas
  const overdueCount = alerts?.overdue?.length || 0
  const upcomingCount = alerts?.upcoming?.length || 0

  if (loading) {
    return (
      <div className="mt-4 border-t border-gray-800 pt-4">
        <div className="flex items-center justify-center py-8">
          <div className="w-5 h-5 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-zinc-500 text-[12px] ml-2">Carregando manejo sanitário...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-4 border-t border-gray-800 pt-4 animate-in">
      {/* Cabeçalho com alertas */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold text-white">💉 Manejo Sanitário</span>
          {overdueCount > 0 && (
            <span className="badge badge-red text-[10px]">
              {overdueCount} vencido{overdueCount > 1 ? 's' : ''}
            </span>
          )}
          {upcomingCount > 0 && (
            <span className="badge badge-amber text-[10px]">
              {upcomingCount} próximo{upcomingCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Abas de navegação */}
      <div className="flex gap-1.5 mb-3">
        {[
          { key: 'events' as const, label: 'Histórico' },
          { key: 'register' as const, label: '+ Registrar' },
          { key: 'calendar' as const, label: 'Calendário' },
          { key: 'ia' as const, label: '\uD83E\uDE7A IA' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={"text-[11px] px-3 py-1.5 rounded-lg transition-all " +
              (tab === t.key ? 'bg-pink-500/20 text-pink-400 font-semibold' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50')}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Alertas de protocolos vencidos */}
      {tab === 'events' && overdueCount > 0 && (
        <div className="bg-red-500/8 border border-red-500/20 rounded-xl p-3 mb-3">
          <p className="text-[11px] text-red-400 font-semibold mb-2">⚠️ Protocolos vencidos</p>
          {alerts!.overdue.map(ev => (
            <div key={ev.id} className="flex items-center justify-between text-[11px] py-1">
              <span className="text-zinc-300">{TYPE_ICONS[ev.event_type]} {ev.product_name}</span>
              <span className="text-red-400 font-medium">Venceu em {fmtDate(ev.next_due_date!)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Alertas de protocolos próximos */}
      {tab === 'events' && upcomingCount > 0 && (
        <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl p-3 mb-3">
          <p className="text-[11px] text-amber-400 font-semibold mb-2">📅 Próximos 15 dias</p>
          {alerts!.upcoming.map(ev => (
            <div key={ev.id} className="flex items-center justify-between text-[11px] py-1">
              <span className="text-zinc-300">{TYPE_ICONS[ev.event_type]} {ev.product_name}</span>
              <span className="text-amber-400 font-medium">{fmtDate(ev.next_due_date!)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Sugestões de protocolos para o mês */}
      {tab === 'events' && alerts?.suggested && alerts.suggested.length > 0 && (
        <div className="bg-blue-500/8 border border-blue-500/20 rounded-xl p-3 mb-3">
          <p className="text-[11px] text-blue-400 font-semibold mb-2">
            💡 Recomendados para {MONTH_NAMES[(alerts.current_month || 1) - 1]}
          </p>
          {alerts.suggested.slice(0, 4).map(p => (
            <div key={p.id} className="flex items-center justify-between text-[11px] py-1">
              <span className="text-zinc-300">
                {TYPE_ICONS[p.type]} {p.name}
                {p.mandatory && <span className="text-red-400 ml-1">(obrigatório)</span>}
              </span>
              <button onClick={() => { handleProtocolChange(p.id); setTab('register') }}
                className="text-blue-400 hover:text-blue-300 text-[10px] font-medium">
                Registrar →
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Histórico de eventos */}
      {tab === 'events' && (
        <div>
          {events.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-zinc-600 text-[12px]">Nenhum evento sanitário registrado</p>
              <button onClick={() => setTab('register')}
                className="text-pink-400 text-[12px] mt-2 hover:underline">
                Registrar primeiro evento →
              </button>
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {events.map(ev => (
                <div key={ev.id} className="bg-zinc-800/30 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px]">{TYPE_ICONS[ev.event_type]}</span>
                      <span className="text-[12px] font-semibold text-white">{ev.product_name}</span>
                      <span className={"badge text-[9px] " + (TYPE_BADGES[ev.event_type] || 'badge-orange')}>
                        {ev.event_type}
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-500">{fmtDate(ev.event_date)}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-zinc-500">
                    {ev.dose && <span>Dose: {ev.dose}</span>}
                    {ev.head_count && <span>{ev.head_count} cabeças</span>}
                    {ev.cost_per_head && <span>{fmtCurrency(ev.cost_per_head)}/cab</span>}
                    {ev.total_cost && <span className="text-zinc-400 font-medium">Total: {fmtCurrency(ev.total_cost)}</span>}
                  </div>
                  {ev.next_due_date && (
                    <div className="mt-1 text-[10px]">
                      <span className="text-zinc-600">Próxima: </span>
                      <span className={
                        new Date(ev.next_due_date) < new Date() ? 'text-red-400 font-medium' :
                        new Date(ev.next_due_date) <= new Date(Date.now() + 15 * 86400000) ? 'text-amber-400 font-medium' :
                        'text-zinc-400'
                      }>
                        {fmtDate(ev.next_due_date)}
                      </span>
                    </div>
                  )}
                  {ev.notes && <p className="text-[10px] text-zinc-600 mt-1 italic">{ev.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Formulário de registro */}
      {tab === 'register' && (
        <div>
          <p className="text-[11px] text-zinc-500 mb-3 text-center">
            Registre vacinas, vermífugos, tratamentos e exames do lote.
          </p>

          {/* Selecionar protocolo (opcional) */}
          <div className="mb-2">
            <label className="block text-[10px] text-zinc-600 mb-1">Protocolo (opcional)</label>
            <select value={protocolId} onChange={(e) => handleProtocolChange(e.target.value)}
              className="input-field w-full text-[12px]">
              <option value="">Selecionar protocolo...</option>
              {protocols.map(p => (
                <option key={p.id} value={p.id}>
                  {TYPE_ICONS[p.type]} {p.name} {p.mandatory ? '(obrigatório)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Tipo e Produto */}
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="block text-[10px] text-zinc-600 mb-1">Tipo *</label>
              <select value={eventType} onChange={(e) => setEventType(e.target.value)}
                className="input-field w-full text-[12px]">
                <option value="vacina">💉 Vacina</option>
                <option value="vermifugo">🐛 Vermífugo</option>
                <option value="tratamento">💊 Tratamento</option>
                <option value="exame">🔬 Exame</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-zinc-600 mb-1">Produto *</label>
              <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)}
                placeholder="Ex: Febre Aftosa"
                className="input-field w-full text-[12px]" />
            </div>
          </div>

          {/* Dose e Data */}
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="block text-[10px] text-zinc-600 mb-1">Dose</label>
              <input type="text" value={dose} onChange={(e) => setDose(e.target.value)}
                placeholder="Ex: 5ml"
                className="input-field w-full text-[12px]" />
            </div>
            <div>
              <label className="block text-[10px] text-zinc-600 mb-1">Data do evento</label>
              <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)}
                className="input-field w-full text-[12px]" />
            </div>
          </div>

          {/* Custo e Cabeças */}
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="block text-[10px] text-zinc-600 mb-1">Custo/cabeça (R$)</label>
              <input type="number" step="0.01" value={costPerHead} onChange={(e) => setCostPerHead(e.target.value)}
                placeholder="Ex: 3.50"
                className="input-field w-full text-[12px]" />
            </div>
            <div>
              <label className="block text-[10px] text-zinc-600 mb-1">Cabeças</label>
              <input type="number" value={eventHeadCount} onChange={(e) => setEventHeadCount(e.target.value)}
                placeholder={headCount?.toString()}
                className="input-field w-full text-[12px]" />
            </div>
          </div>

          {/* Custo total calculado */}
          {costPerHead && eventHeadCount && (
            <div className="bg-zinc-800/40 rounded-lg px-3 py-2 mb-2">
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-500">Custo total estimado</span>
                <span className="text-white font-bold">
                  {fmtCurrency(parseFloat(costPerHead) * parseInt(eventHeadCount))}
                </span>
              </div>
            </div>
          )}

          {/* Observações */}
          <div className="mb-3">
            <label className="block text-[10px] text-zinc-600 mb-1">Observações</label>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações (opcional)"
              className="input-field w-full text-[12px]" />
          </div>

          {/* Mensagens */}
          {error && <p className="text-red-400 text-[11px] mb-2">{error}</p>}
          {success && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2 mb-2">
              <p className="text-green-400 text-[11px] text-center font-medium">{success}</p>
            </div>
          )}

          {/* Botão de envio */}
          <button onClick={handleSubmit} disabled={submitting || !productName}
            className="btn-primary w-full py-3 min-h-[44px] text-[12px] font-bold rounded-xl disabled:opacity-50">
            {submitting ? 'Registrando...' : '💉 Registrar Evento Sanitário'}
          </button>
        </div>
      )}

      {/* Tab: Calendário visual */}
      {tab === 'calendar' && (() => {
        const currentMonth = new Date().getMonth() + 1
        const mandatoryProtocols = protocols.filter(p => p.mandatory)

        // Verificar quais obrigatórias já foram feitas este ano
        const currentYear = new Date().getFullYear()
        const doneThisYear = new Set(
          events
            .filter(ev => ev.event_date.startsWith(String(currentYear)))
            .map(ev => ev.protocol_id)
            .filter(Boolean)
        )

        return (
        <div>
          {/* Vacinas obrigatórias - destaque principal */}
          {mandatoryProtocols.length > 0 && (
            <div className="bg-red-500/8 border border-red-500/20 rounded-xl p-4 mb-4">
              <p className="text-[12px] text-red-400 font-bold mb-3">
                🚨 VACINAS OBRIGATÓRIAS — INDEA/MT
              </p>
              <div className="space-y-3">
                {mandatoryProtocols.map(p => {
                  const done = doneThisYear.has(p.id)
                  const months = (p.recommended_months || []) as number[]
                  const isMonthNow = months.includes(currentMonth)
                  const nextMonth = months.find(m => m >= currentMonth) || months[0]
                  const isOverdue = !done && months.some(m => m < currentMonth && !months.some(m2 => m2 >= currentMonth))

                  return (
                    <div key={p.id} className={"rounded-lg p-3 " +
                      (done ? 'bg-green-500/8 border border-green-500/15' :
                       isMonthNow ? 'bg-red-500/10 border border-red-500/25' :
                       'bg-zinc-800/40 border border-zinc-700/30')}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px]">{TYPE_ICONS[p.type]}</span>
                          <span className="text-[12px] font-bold text-white">{p.name}</span>
                          {done && <span className="badge badge-green text-[9px]">Feito</span>}
                          {!done && isMonthNow && <span className="badge badge-red text-[9px]">AGORA!</span>}
                          {!done && !isMonthNow && <span className="badge badge-amber text-[9px]">Pendente</span>}
                        </div>
                        {!done && (
                          <button onClick={() => { handleProtocolChange(p.id); setTab('register') }}
                            className="badge badge-pink text-[10px] cursor-pointer hover:scale-105 transition-transform min-h-[32px]">
                            Registrar
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-1">{p.description}</p>
                      <div className="flex items-center gap-1 mt-2 flex-wrap">
                        <span className="text-[10px] text-zinc-600">Meses:</span>
                        {MONTH_NAMES.map((mn, mi) => {
                          const mNum = mi + 1
                          const isRequired = months.includes(mNum)
                          const isCurrent = mNum === currentMonth
                          return (
                            <span key={mi} className={"text-[10px] px-1.5 py-0.5 rounded " +
                              (isRequired && isCurrent ? 'bg-red-500/30 text-red-300 font-bold' :
                               isRequired ? 'bg-red-500/15 text-red-400 font-medium' :
                               'text-zinc-700')}>
                              {mn}
                            </span>
                          )
                        })}
                      </div>
                      {p.frequency_days && (
                        <p className="text-[10px] text-zinc-600 mt-1">
                          Frequência: a cada {p.frequency_days} dias
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Calendário visual mensal */}
          <p className="text-[11px] text-zinc-500 mb-2 font-semibold uppercase">Calendário Anual</p>
          <div className="grid grid-cols-4 gap-2">
            {MONTH_NAMES.map((month, idx) => {
              const monthNum = idx + 1

              const monthProtocols = protocols.filter(p =>
                p.recommended_months && p.recommended_months.includes(monthNum)
              )
              const monthMandatory = monthProtocols.filter(p => p.mandatory)
              const monthOptional = monthProtocols.filter(p => !p.mandatory)

              const monthEvents = events.filter(ev => {
                const evMonth = parseInt(ev.event_date.split('-')[1])
                return evMonth === monthNum
              })

              const isCurrentMonth = monthNum === currentMonth
              const hasMandatory = monthMandatory.length > 0
              const isPast = monthNum < currentMonth
              const hasEvents = monthEvents.length > 0

              // Verificar se obrigatórias deste mês foram feitas
              const mandatoryDone = monthMandatory.every(p => doneThisYear.has(p.id))
              const mandatoryPending = hasMandatory && !mandatoryDone

              return (
                <div key={month}
                  className={
                    "rounded-lg p-2 text-center transition-all cursor-pointer " +
                    (isCurrentMonth && mandatoryPending
                      ? 'bg-red-500/15 border-2 border-red-500/40 ring-1 ring-red-500/20'
                      : isCurrentMonth
                        ? 'bg-pink-500/15 border-2 border-pink-500/30'
                        : isPast && mandatoryPending
                          ? 'bg-red-500/10 border border-red-500/20'
                          : hasMandatory
                            ? 'bg-red-500/5 border border-red-500/15'
                            : monthProtocols.length > 0
                              ? 'bg-zinc-800/40 border border-zinc-700/30'
                              : 'bg-zinc-900/30 border border-zinc-800/20')
                  }>
                  <p className={
                    "text-[11px] font-bold mb-1 " +
                    (isCurrentMonth ? 'text-pink-400' :
                     isPast && mandatoryPending ? 'text-red-400' :
                     'text-zinc-400')
                  }>
                    {month}
                  </p>

                  {/* Indicadores */}
                  <div className="flex justify-center gap-0.5 mb-1">
                    {hasMandatory && (
                      mandatoryDone
                        ? <span className="w-2 h-2 rounded-full bg-green-500" title="Obrigatório - Feito" />
                        : <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title="Obrigatório - Pendente" />
                    )}
                    {monthOptional.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" title="Recomendado" />}
                    {hasEvents && <span className="w-1.5 h-1.5 rounded-full bg-green-500" title="Realizado" />}
                  </div>

                  {/* Nomes das obrigatórias */}
                  {hasMandatory && (
                    <div className="mt-0.5">
                      {monthMandatory.slice(0, 2).map(p => (
                        <p key={p.id} className={"text-[9px] leading-tight truncate " +
                          (mandatoryDone ? 'text-green-500' : 'text-red-400 font-medium')}>
                          {p.name}
                        </p>
                      ))}
                      {monthMandatory.length > 2 && (
                        <p className="text-[9px] text-zinc-600">+{monthMandatory.length - 2}</p>
                      )}
                    </div>
                  )}

                  {/* Contagem opcionais */}
                  {monthOptional.length > 0 && (
                    <p className="text-[9px] text-zinc-600 mt-0.5">
                      +{monthOptional.length} rec.
                    </p>
                  )}
                </div>
              )
            })}
          </div>

          {/* Legenda */}
          <div className="flex justify-center gap-3 mt-3 flex-wrap">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[11px] text-zinc-600">Obrigatório pendente</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-[11px] text-zinc-600">Feito</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-[11px] text-zinc-600">Recomendado</span>
            </div>
          </div>

          {/* Protocolos recomendados para o mês atual (não obrigatórios) */}
          {(() => {
            const currentOptional = protocols.filter(p =>
              !p.mandatory && p.recommended_months && p.recommended_months.includes(currentMonth) && !doneThisYear.has(p.id)
            )
            if (currentOptional.length === 0) return null
            return (
              <div className="mt-3 bg-blue-500/8 border border-blue-500/15 rounded-xl p-3">
                <p className="text-[11px] text-blue-400 font-semibold mb-2">
                  💡 Recomendados para {MONTH_NAMES[currentMonth - 1]} (opcionais)
                </p>
                {currentOptional.map(p => (
                  <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-zinc-800/50 last:border-0">
                    <div>
                      <span className="text-[11px] text-zinc-300">
                        {TYPE_ICONS[p.type]} {p.name}
                      </span>
                      <p className="text-[10px] text-zinc-600 mt-0.5">{p.description}</p>
                    </div>
                    <button onClick={() => { handleProtocolChange(p.id); setTab('register') }}
                      className="badge badge-blue text-[10px] cursor-pointer hover:scale-105 transition-transform">
                      Registrar
                    </button>
                  </div>
                ))}
              </div>
            )
          })()}
        </div>
        )
      })()}

      {/* Tab: Sugestões IA */}
      {tab === 'ia' && (
        <div>
          <div className="flex gap-2 mb-3">
            <button
              onClick={async () => {
                setAiLoading(true)
                setAiSuggestions('')
                try {
                  const res = await fetch('/api/health/suggestions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ herd_id: herdId }),
                  })
                  const json = await res.json()
                  if (res.ok) setAiSuggestions(json.suggestions)
                  else setAiSuggestions('Erro: ' + (json.error || 'Falha ao gerar sugest\u00f5es'))
                } catch { setAiSuggestions('Erro de conex\u00e3o') }
                setAiLoading(false)
              }}
              disabled={aiLoading}
              className="flex-1 py-2.5 min-h-[44px] bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all">
              {aiLoading ? 'Consultando IA...' : '\uD83E\uDE7A Gerar Sugest\u00f5es Sanit\u00e1rias'}
            </button>
            <button
              onClick={() => window.open('/api/health/report?herd_id=' + herdId, '_blank')}
              className="py-2.5 px-4 min-h-[44px] bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-all">
              \uD83D\uDCCB Relat\u00f3rio GTA
            </button>
          </div>

          {aiLoading && (
            <div className="text-center py-6">
              <div className="inline-block w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-xs text-zinc-400">Analisando situa\u00e7\u00e3o sanit\u00e1ria de {herdName}...</p>
            </div>
          )}

          {aiSuggestions && !aiLoading && (
            <div className="bg-teal-500/8 border border-teal-500/20 rounded-xl p-4">
              <p className="text-[10px] text-teal-400 font-semibold uppercase mb-2">\uD83E\uDD16 Recomenda\u00e7\u00f5es do Veterin\u00e1rio IA</p>
              <p className="text-xs text-zinc-300 whitespace-pre-line leading-relaxed">{aiSuggestions}</p>
            </div>
          )}

          {!aiSuggestions && !aiLoading && (
            <div className="text-center py-6">
              <p className="text-xs text-zinc-500">Clique em "Gerar Sugest\u00f5es" para receber recomenda\u00e7\u00f5es do veterin\u00e1rio IA baseadas no hist\u00f3rico e regi\u00e3o do lote.</p>
              <p className="text-[10px] text-zinc-600 mt-2">Ou clique em "Relat\u00f3rio GTA" para exportar o hist\u00f3rico sanit\u00e1rio completo.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
