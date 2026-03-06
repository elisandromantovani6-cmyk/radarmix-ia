import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const herdId = request.nextUrl.searchParams.get('herd_id')
    if (!herdId) return NextResponse.json({ error: 'herd_id obrigatório' }, { status: 400 })

    // Buscar lote com fazenda
    const { data: herd } = await supabase
      .from('herds')
      .select('*, farm:farms!inner(user_id, name, city, total_area_ha), breed:breeds(name)')
      .eq('id', herdId)
      .single()

    if (!herd || herd.farm.user_id !== user.id) {
      return NextResponse.json({ error: 'Lote não encontrado' }, { status: 404 })
    }

    // Filtro de datas (opcional)
    const dateFrom = request.nextUrl.searchParams.get('date_from')
    const dateTo = request.nextUrl.searchParams.get('date_to')

    // Buscar eventos sanitários
    let eventsQuery = supabase
      .from('health_events')
      .select('*, protocol:health_protocols(name, type, mandatory, frequency_days)')
      .eq('herd_id', herdId)
      .order('event_date', { ascending: false })

    if (dateFrom) eventsQuery = eventsQuery.gte('event_date', dateFrom)
    if (dateTo) eventsQuery = eventsQuery.lte('event_date', dateTo)

    const { data: events } = await eventsQuery

    // Buscar todos os protocolos obrigatórios
    const { data: mandatoryProtocols } = await supabase
      .from('health_protocols')
      .select('*')
      .eq('mandatory', true)
      .order('name')

    // Verificar status de cada protocolo obrigatório
    const today = new Date()
    const protocolStatus = (mandatoryProtocols || []).map(protocol => {
      const relatedEvents = (events || []).filter(e => e.protocol_id === protocol.id)
      const lastEvent = relatedEvents[0] // já ordenado desc

      let status: 'em_dia' | 'vencido' | 'pendente' = 'pendente'
      let lastDate: string | null = null
      let nextDate: string | null = null

      if (lastEvent) {
        lastDate = lastEvent.event_date
        if (lastEvent.next_due_date) {
          nextDate = lastEvent.next_due_date
          status = new Date(lastEvent.next_due_date) >= today ? 'em_dia' : 'vencido'
        } else {
          status = 'em_dia'
        }
      }

      return { name: protocol.name, type: protocol.type, status, lastDate, nextDate }
    })

    // Resumo de custos por tipo
    const costsByType: Record<string, number> = {}
    for (const event of (events || [])) {
      const type = event.event_type || 'outros'
      costsByType[type] = (costsByType[type] || 0) + (event.total_cost || 0)
    }
    const totalCost = Object.values(costsByType).reduce((s, v) => s + v, 0)

    const now = new Date()
    const dateStr = now.toLocaleDateString('pt-BR')
    const fmt = (v: number) => 'R$ ' + v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')

    const periodLabel = dateFrom || dateTo
      ? `${dateFrom ? new Date(dateFrom).toLocaleDateString('pt-BR') : 'in\u00edcio'} a ${dateTo ? new Date(dateTo).toLocaleDateString('pt-BR') : 'hoje'}`
      : 'Todo o per\u00edodo'

    // Status icons
    const statusIcon = (s: string) => s === 'em_dia' ? '\u2705' : s === 'vencido' ? '\u274C' : '\u26A0\uFE0F'
    const statusLabel = (s: string) => s === 'em_dia' ? 'Em dia' : s === 'vencido' ? 'Vencido' : 'Pendente'
    const statusColor = (s: string) => s === 'em_dia' ? '#22C55E' : s === 'vencido' ? '#EF4444' : '#F59E0B'

    const typeIcon = (t: string) => t === 'vacina' ? '\uD83D\uDC89' : t === 'vermifugo' ? '\uD83D\uDC1B' : t === 'tratamento' ? '\uD83D\uDC8A' : '\uD83D\uDD2C'
    const typeLabel = (t: string) => t === 'vacina' ? 'Vacina' : t === 'vermifugo' ? 'Verm\u00edfugo' : t === 'tratamento' ? 'Tratamento' : 'Exame'

    const protocolRows = protocolStatus.map(p => `
      <tr>
        <td>${p.name}</td>
        <td>${typeLabel(p.type)}</td>
        <td style="color:${statusColor(p.status)};font-weight:700">${statusIcon(p.status)} ${statusLabel(p.status)}</td>
        <td>${p.lastDate ? new Date(p.lastDate).toLocaleDateString('pt-BR') : '-'}</td>
        <td>${p.nextDate ? new Date(p.nextDate).toLocaleDateString('pt-BR') : '-'}</td>
      </tr>
    `).join('')

    const eventRows = (events || []).map((e: any) => `
      <tr>
        <td>${new Date(e.event_date).toLocaleDateString('pt-BR')}</td>
        <td>${typeIcon(e.event_type)} ${typeLabel(e.event_type)}</td>
        <td>${e.product_name}</td>
        <td>${e.dose || '-'}</td>
        <td>${e.head_count || '-'}</td>
        <td class="right">${e.cost_per_head ? fmt(e.cost_per_head) : '-'}</td>
        <td class="right">${e.total_cost ? fmt(e.total_cost) : '-'}</td>
        <td>${e.next_due_date ? new Date(e.next_due_date).toLocaleDateString('pt-BR') : '-'}</td>
      </tr>
    `).join('')

    const costRows = Object.entries(costsByType).map(([type, cost]) => `
      <tr>
        <td>${typeIcon(type)} ${typeLabel(type)}</td>
        <td>${(events || []).filter((e: any) => e.event_type === type).length} eventos</td>
        <td class="right bold">${fmt(cost)}</td>
      </tr>
    `).join('')

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Relat\u00f3rio Sanit\u00e1rio - ${herd.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; background: #fff; padding: 40px; max-width: 800px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #10B981; padding-bottom: 20px; margin-bottom: 30px; }
    .logo { font-size: 24px; font-weight: 900; }
    .logo span { color: #10B981; }
    .subtitle { font-size: 14px; color: #666; margin-top: 4px; }
    .date { color: #666; font-size: 12px; }
    .farm-info { background: #f8f9fa; border-radius: 8px; padding: 15px; margin-bottom: 20px; }
    .farm-info h2 { font-size: 18px; margin-bottom: 5px; }
    .farm-info p { color: #666; font-size: 13px; }
    .section { margin-bottom: 25px; }
    .section h3 { font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #10B981; margin-bottom: 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { padding: 7px 10px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f8f9fa; font-weight: 600; color: #374151; }
    .right { text-align: right; }
    .bold { font-weight: 700; }
    .green { color: #22C55E; }
    .note-box { background: #FEF3C7; border: 1px solid #F59E0B; border-radius: 8px; padding: 12px; margin: 20px 0; font-size: 12px; color: #92400E; }
    .total-box { background: #f0fdf4; border: 2px solid #10B981; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0; }
    .total-value { font-size: 28px; font-weight: 900; color: #10B981; }
    .total-label { font-size: 12px; color: #666; margin-top: 5px; }
    .footer { margin-top: 40px; padding-top: 15px; border-top: 1px solid #e5e7eb; text-align: center; color: #999; font-size: 11px; }
    @media print { body { padding: 20px; } .no-print { display: none; } }
    .print-btn { background: #10B981; color: white; border: none; padding: 10px 25px; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 14px; margin-bottom: 20px; }
    .print-btn:hover { background: #059669; }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">Imprimir / Salvar PDF</button>

  <div class="header">
    <div>
      <div class="logo"><img src="/logo-radarmix.jpg" alt="Radarmix" style="height:36px;display:inline;vertical-align:middle;margin-right:8px;border-radius:6px" /> RADARMIX <span>IA</span></div>
      <div class="subtitle">RELAT\u00d3RIO SANIT\u00c1RIO</div>
    </div>
    <div class="date">Gerado em ${dateStr}</div>
  </div>

  <div class="farm-info">
    <h2>${herd.farm.name}</h2>
    <p>${herd.farm.city || ''} - MT | ${herd.farm.total_area_ha || '-'} ha</p>
  </div>

  <div class="section">
    <h3>Dados do Lote</h3>
    <table>
      <tr><td>Lote</td><td class="right bold">${herd.name}</td></tr>
      <tr><td>Esp\u00e9cie</td><td class="right">${herd.species}</td></tr>
      <tr><td>Cabe\u00e7as</td><td class="right bold">${herd.head_count}</td></tr>
      <tr><td>Ra\u00e7a</td><td class="right">${herd.breed?.name || '-'}</td></tr>
      <tr><td>Fase</td><td class="right">${herd.main_phase}</td></tr>
      <tr><td>Per\u00edodo</td><td class="right">${periodLabel}</td></tr>
    </table>
  </div>

  <div class="section">
    <h3>\uD83D\uDEE1\uFE0F Situa\u00e7\u00e3o das Obrigatoriedades INDEA-MT</h3>
    <table>
      <tr><th>Protocolo</th><th>Tipo</th><th>Status</th><th>\u00daltima Aplica\u00e7\u00e3o</th><th>Pr\u00f3xima</th></tr>
      ${protocolRows || '<tr><td colspan="5" style="text-align:center;color:#999">Nenhum protocolo obrigat\u00f3rio encontrado</td></tr>'}
    </table>
  </div>

  <div class="section">
    <h3>\uD83D\uDCCB Hist\u00f3rico de Eventos Sanit\u00e1rios</h3>
    ${(events || []).length > 0 ? `
    <table>
      <tr><th>Data</th><th>Tipo</th><th>Produto</th><th>Dose</th><th>Cab.</th><th class="right">R$/cab</th><th class="right">Total</th><th>Pr\u00f3xima</th></tr>
      ${eventRows}
    </table>
    ` : '<p style="color:#999;font-size:13px;text-align:center;padding:20px">Nenhum evento sanit\u00e1rio registrado para este lote.</p>'}
  </div>

  <div class="total-box">
    <div class="total-label">CUSTO SANIT\u00c1RIO TOTAL</div>
    <div class="total-value">${fmt(totalCost)}</div>
    <div class="total-label">${fmt(totalCost / (herd.head_count || 1))}/cabe\u00e7a | ${(events || []).length} eventos</div>
  </div>

  ${Object.keys(costsByType).length > 0 ? `
  <div class="section">
    <h3>Resumo de Custos por Tipo</h3>
    <table>
      <tr><th>Tipo</th><th>Quantidade</th><th class="right">Custo Total</th></tr>
      ${costRows}
      <tr style="border-top:2px solid #1a1a1a"><td class="bold" colspan="2">Total Geral</td><td class="right bold green">${fmt(totalCost)}</td></tr>
    </table>
  </div>
  ` : ''}

  <div class="note-box">
    <strong>\u26A0\uFE0F Observa\u00e7\u00e3o:</strong> Este relat\u00f3rio \u00e9 informativo e n\u00e3o substitui documentos oficiais. Para emiss\u00e3o de GTA (Guia de Tr\u00e2nsito Animal), consulte o INDEA-MT. Exames de brucelose e tuberculose devem ser realizados por veterin\u00e1rio habilitado.
  </div>

  <div class="footer">
    <p>RADARMIX IA \u2014 Nutri\u00e7\u00e3o Inteligente para seu Rebanho</p>
    <p>Radarmix Nutri\u00e7\u00e3o Animal | Tangar\u00e1 da Serra - MT</p>
    <p style="margin-top:5px">Gerado automaticamente por Radarmix IA em ${dateStr}</p>
  </div>
</body>
</html>`

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
