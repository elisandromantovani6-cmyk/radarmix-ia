/**
 * API: Melhor Momento de Vender o Boi
 *
 * GET /api/sell-timing?herd_id=UUID
 *
 * Busca dados do lote, pesagens (para GMD), custos e preço da @.
 * Retorna cenários de venda (agora, +30d, +60d, +90d) com recomendação.
 */

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { predictSellTiming } from '@/lib/sell-timing'
import { calculateGeneticScore, type GeneticInput, type WeighingHistory } from '@/lib/genetic-score'
import { NextRequest, NextResponse } from 'next/server'

// Preço de referência da @ em MT (CEPEA/IMEA)
const ARROBA_PRICE = 320.00

// Preço de compra do animal por fase (R$/cabeça) — IMEA-MT 2025/2026
const ANIMAL_PRICES: Record<string, number> = {
  cria: 2200, recria: 3200, engorda: 4200,
  engorda_confinamento: 4200, lactacao: 5500, reproducao: 6000,
}

// Custo diário padrão por fase (R$/cab/dia) — IMEA + Embrapa
const DEFAULT_COSTS: Record<string, number> = {
  cria: 4.15, recria: 4.90, engorda: 6.35,
  engorda_confinamento: 7.50, lactacao: 6.30, reproducao: 5.00,
}

// GMD padrão por fase (kg/dia) — referência regional
const GMD_DEFAULTS: Record<string, number> = {
  cria: 0.55, recria: 0.60, engorda: 0.70,
  engorda_confinamento: 1.50, lactacao: 0.35, reproducao: 0.25,
}

// Rendimento de carcaça padrão
const DEFAULT_CARCASS_YIELD = 0.52

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const herdId = request.nextUrl.searchParams.get('herd_id')
    if (!herdId) return NextResponse.json({ error: 'herd_id obrigatório' }, { status: 400 })

    // Buscar dados do lote com fazenda e raça
    const { data: herd } = await supabase
      .from('herds')
      .select('*, farm:farms!inner(user_id), breed:breeds(name)')
      .eq('id', herdId)
      .single()

    if (!herd || herd.farm.user_id !== user.id) {
      return NextResponse.json({ error: 'Lote não encontrado' }, { status: 404 })
    }

    // Buscar pesagens para calcular GMD real
    const { data: weighings } = await supabase
      .from('herd_history')
      .select('created_at, details')
      .eq('herd_id', herdId)
      .eq('event_type', 'pesagem')
      .order('created_at', { ascending: true })

    let gmdReal: number | null = null
    const weighingHistory: WeighingHistory[] = []
    if (weighings && weighings.length >= 2) {
      for (let i = 1; i < weighings.length; i++) {
        const prev = weighings[i - 1]
        const curr = weighings[i]
        const prevWeight = (prev.details as any)?.peso_novo
        const currWeight = (curr.details as any)?.peso_novo
        if (prevWeight && currWeight) {
          const daysDiff = (new Date(curr.created_at).getTime() - new Date(prev.created_at).getTime()) / (1000 * 60 * 60 * 24)
          if (daysDiff > 0) {
            gmdReal = (currWeight - prevWeight) / daysDiff
            weighingHistory.push({ gmd_real: gmdReal, date: curr.created_at })
          }
        }
      }
    }

    // Score genético para ajustar GMD e rendimento de carcaça
    const geneticInput: GeneticInput = {
      breed_name: (herd.breed as any)?.name || null,
      genetic_info: (herd as any).genetic_info || null,
      phase: herd.main_phase,
    }
    const geneticScore = calculateGeneticScore(geneticInput, weighingHistory)

    // Buscar custos reais do lote (tabela custos_lote) ou usar padrão
    const { data: custosLote } = await supabase
      .from('custos_lote')
      .select('category, value, period')
      .eq('herd_id', herdId)
      .eq('user_id', user.id)

    const createdDate = new Date(herd.created_at)
    const daysInLot = Math.max(1, Math.round((new Date().getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)))

    let dailyCost = DEFAULT_COSTS[herd.main_phase] || 5.00
    if (custosLote && custosLote.length > 0) {
      dailyCost = 0
      for (const custo of custosLote) {
        let v = Number(custo.value) || 0
        if (custo.period === 'mensal') v = v / 30
        else if (custo.period === 'unico') v = v / daysInLot
        dailyCost += v
      }
    }

    // Buscar última simulação para preço da @
    const { data: sims } = await supabase
      .from('simulations')
      .select('result')
      .eq('herd_id', herdId)
      .order('created_at', { ascending: false })
      .limit(1)

    const arrobaPrice = sims?.[0]?.result?.arroba_price || ARROBA_PRICE

    // Determinar GMD: pesagem real > genético > padrão
    const gmdUsed = gmdReal || geneticScore.gmd_adjusted || GMD_DEFAULTS[herd.main_phase] || 0.60
    const carcassYield = geneticScore.carcass_yield || DEFAULT_CARCASS_YIELD

    // Chamar o previsor de timing de venda
    const result = predictSellTiming({
      current_weight_kg: herd.avg_weight_kg || 350,
      gmd: gmdUsed,
      daily_cost: dailyCost,
      head_count: herd.head_count || 1,
      carcass_yield: carcassYield,
      arroba_price: arrobaPrice,
      animal_purchase_price: ANIMAL_PRICES[herd.main_phase] || 3200,
      phase: herd.main_phase,
    })

    return NextResponse.json({
      herd_id: herdId,
      herd_name: herd.name,
      phase: herd.main_phase,
      head_count: herd.head_count,
      current_weight: herd.avg_weight_kg,
      gmd_source: gmdReal ? 'pesagem' : (geneticScore.gmd_adjusted > 0 ? 'genetico' : 'padrao'),
      gmd_used: gmdUsed,
      carcass_yield: carcassYield,
      arroba_price: arrobaPrice,
      ...result,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
