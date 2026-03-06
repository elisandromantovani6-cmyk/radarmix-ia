import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

// Taxa de mortalidade padrão por fase (%) - Embrapa / IMEA-MT / Assocon
const DEFAULT_MORTALITY: Record<string, number> = {
  cria: 5.0,
  recria: 2.0,
  engorda: 1.5,
  engorda_confinamento: 2.0,
  lactacao: 2.0,
  reproducao: 1.5,
}

// Impostos na venda de gado - MT
const TAXES = {
  funrural: 0.015,
  senar: 0.002,
  fethab_per_head: 14.46,
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const herdId = request.nextUrl.searchParams.get('herd_id')
    if (!herdId) return NextResponse.json({ error: 'herd_id obrigatório' }, { status: 400 })

    // Buscar dados do lote
    const { data: herd } = await supabase
      .from('herds')
      .select('*, farm:farms!inner(user_id, name, city, total_area_ha), product:products(name, line), breed:breeds(name), forage:forages(name)')
      .eq('id', herdId)
      .single()

    if (!herd || herd.farm.user_id !== user.id) {
      return NextResponse.json({ error: 'Lote não encontrado' }, { status: 404 })
    }

    // Buscar pesagens
    const { data: weighings } = await supabase
      .from('herd_history')
      .select('created_at, details')
      .eq('herd_id', herdId)
      .eq('event_type', 'pesagem')
      .order('created_at', { ascending: true })

    // Buscar última simulação
    const { data: simulations } = await supabase
      .from('simulations')
      .select('result')
      .eq('herd_id', herdId)
      .order('created_at', { ascending: false })
      .limit(1)

    const lastSim = simulations?.[0]?.result || null

    // Buscar custos registrados
    const { data: custosLote } = await supabase
      .from('custos_lote')
      .select('category, value, period')
      .eq('herd_id', herdId)
      .eq('user_id', user.id)

    // Buscar custos sanitários reais
    const { data: healthEvents } = await supabase
      .from('health_events')
      .select('total_cost')
      .eq('herd_id', herdId)

    // Calcular dados
    const createdDate = new Date(herd.created_at)
    const now = new Date()
    const daysInLot = Math.max(1, Math.round((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)))

    const categoryMap: Record<string, string> = {
      nutricao: 'suplemento', pasto: 'pasto', mao_obra: 'mao_obra', sanitario: 'sanidade', outros: 'outros',
    }
    let dailyCosts: Record<string, number>
    let costSource: 'registrado' | 'estimado'

    if (custosLote && custosLote.length > 0) {
      dailyCosts = { suplemento: 0, pasto: 0, mao_obra: 0, sanidade: 0, outros: 0 }
      for (const custo of custosLote) {
        const mapped = categoryMap[custo.category] || 'outros'
        let dailyValue = Number(custo.value) || 0
        if (custo.period === 'mensal') dailyValue = dailyValue / 30
        else if (custo.period === 'unico') dailyValue = dailyValue / daysInLot
        dailyCosts[mapped] = (dailyCosts[mapped] || 0) + dailyValue
      }
      costSource = 'registrado'
    } else {
      dailyCosts = lastSim?.costs || { suplemento: 0.32, pasto: 2.20, mao_obra: 1.40, sanidade: 0.50, outros: 0.80 }
      costSource = 'estimado'
    }

    // Sobrescrever sanidade com custo real dos health_events
    if (healthEvents && healthEvents.length > 0) {
      const totalHealthCost = healthEvents.reduce((sum: number, e: any) => sum + (Number(e.total_cost) || 0), 0)
      const headCount = herd.head_count || 1
      if (totalHealthCost > 0) {
        dailyCosts.sanidade = totalHealthCost / headCount / daysInLot
      }
    }
    const dailyTotal = Object.values(dailyCosts).reduce((sum: number, v: any) => sum + v, 0)
    const totalOperational = dailyTotal * daysInLot
    const animalCost = lastSim?.animal_price || 3200
    const arrobaPrice = lastSim?.arroba_price || 320
    const currentWeight = herd.avg_weight_kg || 350
    const currentArroba = (currentWeight * 0.52) / 15
    const projectedRevenue = currentArroba * arrobaPrice
    // Impostos por cabeça
    const taxFunrural = projectedRevenue * TAXES.funrural
    const taxSenar = projectedRevenue * TAXES.senar
    const taxFethab = TAXES.fethab_per_head
    const totalTaxesPerHead = taxFunrural + taxSenar + taxFethab
    const netRevenue = projectedRevenue - totalTaxesPerHead

    // Mortalidade
    const mortalityRate = DEFAULT_MORTALITY[herd.main_phase] ?? 2.0
    const mortalityFraction = mortalityRate / 100
    const effectiveHeads = Math.round((herd.head_count || 1) * (1 - mortalityFraction))
    const deadHeads = (herd.head_count || 1) - effectiveHeads
    const avgInvestmentPerDead = animalCost + (dailyTotal * daysInLot / 2)
    const mortalityLoss = deadHeads * avgInvestmentPerDead

    const totalInvestment = animalCost + totalOperational
    const grossProfit = netRevenue - totalInvestment
    const roi = totalInvestment > 0 ? (grossProfit / totalInvestment) * 100 : 0

    // Gerar HTML do relatório
    const html = generateReportHTML({
      farm: herd.farm,
      herd,
      daysInLot,
      dailyCosts,
      dailyTotal,
      totalOperational,
      animalCost,
      arrobaPrice,
      currentWeight,
      currentArroba,
      projectedRevenue,
      netRevenue,
      totalInvestment,
      grossProfit,
      roi,
      taxFunrural,
      taxSenar,
      taxFethab,
      totalTaxesPerHead,
      mortalityRate,
      effectiveHeads,
      deadHeads,
      mortalityLoss,
      weighings: weighings || [],
      date: now.toLocaleDateString('pt-BR'),
      costSource,
    })

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

function generateReportHTML(data: any): string {
  const fmt = (v: number) => 'R$ ' + v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const fmtNum = (v: number, d: number = 1) => v.toFixed(d).replace('.', ',')

  const weighingRows = data.weighings.map((w: any) => {
    const d = w.details as any
    return `<tr>
      <td>${new Date(w.created_at).toLocaleDateString('pt-BR')}</td>
      <td>${d?.peso_novo || '-'} kg</td>
      <td>${d?.ganho ? d.ganho + ' kg' : '-'}</td>
      <td>${d?.gmd_real ? d.gmd_real.toFixed(2) + ' kg/dia' : '-'}</td>
    </tr>`
  }).join('')

  const profitColor = data.grossProfit >= 0 ? '#22C55E' : '#EF4444'

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Raio-X Financeiro - ${data.herd.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; background: #fff; padding: 40px; max-width: 800px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #22C55E; padding-bottom: 20px; margin-bottom: 30px; }
    .logo { font-size: 24px; font-weight: 900; }
    .logo span { color: #22C55E; }
    .date { color: #666; font-size: 12px; }
    .farm-info { background: #f8f9fa; border-radius: 8px; padding: 15px; margin-bottom: 20px; }
    .farm-info h2 { font-size: 18px; margin-bottom: 5px; }
    .farm-info p { color: #666; font-size: 13px; }
    .section { margin-bottom: 25px; }
    .section h3 { font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #22C55E; margin-bottom: 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f8f9fa; font-weight: 600; color: #374151; }
    .right { text-align: right; }
    .bold { font-weight: 700; }
    .green { color: #22C55E; }
    .red { color: #EF4444; }
    .result-box { background: #f0fdf4; border: 2px solid #22C55E; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0; }
    .result-box.negative { background: #fef2f2; border-color: #EF4444; }
    .result-value { font-size: 36px; font-weight: 900; color: ${profitColor}; }
    .result-label { font-size: 12px; color: #666; margin-top: 5px; }
    .scenarios { display: flex; gap: 10px; margin-top: 15px; }
    .scenario { flex: 1; background: #f8f9fa; border-radius: 8px; padding: 12px; text-align: center; }
    .scenario .price { font-size: 14px; font-weight: 700; }
    .scenario .profit { font-size: 16px; font-weight: 900; margin-top: 5px; }
    .footer { margin-top: 40px; padding-top: 15px; border-top: 1px solid #e5e7eb; text-align: center; color: #999; font-size: 11px; }
    @media print { body { padding: 20px; } .no-print { display: none; } }
    .print-btn { background: #22C55E; color: white; border: none; padding: 10px 25px; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 14px; margin-bottom: 20px; }
    .print-btn:hover { background: #16A34A; }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">Imprimir / Salvar PDF</button>

  <div class="header">
    <div class="logo"><img src="/logo-radarmix.jpg" alt="Radarmix" style="height:36px;display:inline;vertical-align:middle;margin-right:8px;border-radius:6px" /> RADARMIX <span>IA</span></div>
    <div class="date">Relatório gerado em ${data.date}</div>
  </div>

  <div class="farm-info">
    <h2>${data.farm.name}</h2>
    <p>${data.farm.city || ''} - MT | ${data.farm.total_area_ha || '-'} ha</p>
  </div>

  <div class="section">
    <h3>Dados do Lote</h3>
    <table>
      <tr><td>Lote</td><td class="right bold">${data.herd.name}</td></tr>
      <tr><td>Cabeças</td><td class="right bold">${data.herd.head_count}</td></tr>
      <tr><td>Cabeças efetivas (mortalidade ${fmtNum(data.mortalityRate)}%)</td><td class="right bold">${data.effectiveHeads} de ${data.herd.head_count}</td></tr>
      <tr><td>Raça</td><td class="right">${data.herd.breed?.name || '-'}</td></tr>
      <tr><td>Fase</td><td class="right">${data.herd.main_phase}</td></tr>
      <tr><td>Capim</td><td class="right">${data.herd.forage?.name || '-'}</td></tr>
      <tr><td>Produto Radarmix</td><td class="right green bold">${data.herd.product?.name || '-'}</td></tr>
      <tr><td>Peso médio atual</td><td class="right bold">${data.currentWeight} kg</td></tr>
      <tr><td>Dias no lote</td><td class="right">${data.daysInLot} dias</td></tr>
    </table>
  </div>

  <div class="result-box ${data.grossProfit < 0 ? 'negative' : ''}">
    <div class="result-label">LUCRO BRUTO POR CABEÇA</div>
    <div class="result-value">${fmt(data.grossProfit)}</div>
    <div class="result-label">ROI: ${fmtNum(data.roi)}% | Margem: ${fmtNum(data.projectedRevenue > 0 ? (data.grossProfit / data.projectedRevenue) * 100 : 0)}%</div>
    <div class="result-label" style="margin-top:10px; font-size:16px; font-weight:700; color:${profitColor}">
      Lucro total do lote (${data.effectiveHeads} cab. efetivas): ${fmt(data.grossProfit * data.effectiveHeads)}
    </div>
  </div>

  <div class="section">
    <h3>DRE - Demonstrativo de Resultado por Cabeça</h3>
    <table>
      <tr><td class="bold">(+) Receita bruta (${fmtNum(data.currentArroba)}@ × ${fmt(data.arrobaPrice)})</td><td class="right bold green">${fmt(data.projectedRevenue)}</td></tr>
      <tr><td>(-) FUNRURAL (1,5%)</td><td class="right red">${fmt(data.taxFunrural)}</td></tr>
      <tr><td>(-) SENAR (0,2%)</td><td class="right red">${fmt(data.taxSenar)}</td></tr>
      <tr><td>(-) FETHAB</td><td class="right red">${fmt(data.taxFethab)}</td></tr>
      <tr><td class="bold">(=) Receita líquida</td><td class="right bold green">${fmt(data.netRevenue)}</td></tr>
      <tr><td>(-) Custo do animal</td><td class="right red">${fmt(data.animalCost)}</td></tr>
      <tr><td>(-) Custo operacional (${data.daysInLot} dias)</td><td class="right red">${fmt(data.totalOperational)}</td></tr>
      <tr><td>(-) Perda por mortalidade (${fmtNum(data.mortalityRate)}%: ${data.deadHeads} cab.)</td><td class="right red">${fmt(data.mortalityLoss)}</td></tr>
      <tr style="border-top:2px solid #1a1a1a"><td class="bold">(=) Lucro bruto por cabeça</td><td class="right bold" style="color:${profitColor}; font-size:16px">${fmt(data.grossProfit)}</td></tr>
    </table>
  </div>

  <div class="section">
    <h3>Custos Operacionais (R$/cabe\u00e7a/dia) <span style="font-size:11px;padding:2px 8px;border-radius:4px;margin-left:8px;background:${data.costSource === 'registrado' ? '#DCFCE7' : '#FEF3C7'};color:${data.costSource === 'registrado' ? '#166534' : '#92400E'}">${data.costSource === 'registrado' ? '\u{1F4CA} Custos registrados' : '\u26A0\uFE0F Custos estimados'}</span></h3>
    <table>
      <tr><td>Suplemento</td><td class="right">${fmt(data.dailyCosts.suplemento)}</td></tr>
      <tr><td>Pasto / Arrendamento</td><td class="right">${fmt(data.dailyCosts.pasto)}</td></tr>
      <tr><td>Mão de obra</td><td class="right">${fmt(data.dailyCosts.mao_obra)}</td></tr>
      <tr><td>Sanidade</td><td class="right">${fmt(data.dailyCosts.sanidade)}</td></tr>
      <tr><td>Outros</td><td class="right">${fmt(data.dailyCosts.outros)}</td></tr>
      <tr style="border-top:2px solid #1a1a1a"><td class="bold">Total/dia</td><td class="right bold">${fmt(data.dailyTotal)}</td></tr>
      <tr><td class="bold">Total/mês</td><td class="right bold">${fmt(data.dailyTotal * 30)}</td></tr>
    </table>
  </div>

  <div class="section">
    <h3>Cenários de Preço da Arroba</h3>
    <div class="scenarios">
      ${[
        { label: 'Pessimista', price: data.arrobaPrice - 30 },
        { label: 'Atual', price: data.arrobaPrice },
        { label: 'Otimista', price: data.arrobaPrice + 30 },
      ].map(s => {
        const rev = data.currentArroba * s.price
        const taxTotal = rev * 0.015 + rev * 0.002 + 14.46
        const net = rev - taxTotal
        const profit = net - data.totalInvestment
        return '<div class="scenario"><div style="font-size:11px;color:#666">' + s.label + '</div><div class="price">' + fmt(s.price) + '/@</div><div class="profit" style="color:' + (profit >= 0 ? '#22C55E' : '#EF4444') + '">' + fmt(profit) + '</div></div>'
      }).join('')}
    </div>
  </div>

  ${data.weighings.length > 0 ? '<div class="section"><h3>Histórico de Pesagens</h3><table><tr><th>Data</th><th>Peso</th><th>Ganho</th><th>GMD</th></tr>' + weighingRows + '</table></div>' : ''}

  <div class="footer">
    <p>RADARMIX IA — Nutrição Inteligente para seu Rebanho</p>
    <p>Radarmix Nutrição Animal | Tangará da Serra - MT</p>
    <p style="margin-top:5px">Este relatório foi gerado automaticamente. Valores estimados sujeitos a variação.</p>
  </div>
</body>
</html>`
}

