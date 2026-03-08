/**
 * API Route: Oráculo do Confinamento
 *
 * GET /api/oracle?herd_id=<uuid>
 *
 * Busca dados do lote, clima, custos e pesagens,
 * monta o input para o oráculo e retorna a predição completa.
 */

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { consultOracle, type OracleInput } from '@/lib/confinement-oracle'
import { calculateGeneticScore, type GeneticInput, type WeighingHistory } from '@/lib/genetic-score'
import { NextRequest, NextResponse } from 'next/server'

// Preço padrão da @ caso não haja simulação salva
const ARROBA_PRICE_DEFAULT = 320.00

// Custos diários padrão por fase (R$/cab/dia) — referência IMEA-MT 2025
const DEFAULT_COSTS: Record<string, number> = {
  cria: 4.15,
  recria: 4.90,
  engorda: 6.35,
  engorda_confinamento: 7.50,
  lactacao: 6.30,
  reproducao: 5.00,
}

// Peso alvo por fase (kg)
const TARGET_WEIGHTS: Record<string, number> = {
  cria: 280,
  recria: 420,
  engorda: 540,
  engorda_confinamento: 540,
  lactacao: 450,
  reproducao: 500,
}

// GMD padrão por fase (kg/dia) — usado como fallback
const GMD_DEFAULTS: Record<string, number> = {
  cria: 0.55,
  recria: 0.60,
  engorda: 0.70,
  engorda_confinamento: 1.50,
  lactacao: 0.35,
  reproducao: 0.25,
}

// Preço de compra padrão por fase (R$/cabeça)
const ANIMAL_PRICES: Record<string, number> = {
  cria: 2200,
  recria: 3200,
  engorda: 4200,
  engorda_confinamento: 4200,
  lactacao: 5500,
  reproducao: 6000,
}

/**
 * Determina o tipo genético para consulta.
 * Reutiliza a mesma lógica do recommendation-engine.
 */
function getBreedType(breedName: string | null): string {
  if (!breedName) return 'zebuino'
  const name = breedName.toLowerCase()

  if (name.startsWith('f1') || name.includes('cruzamento') || name.includes('composto')) return 'cruzado_f1'
  if (['angus', 'hereford', 'charolês', 'charolais', 'limousin', 'simental', 'simmental'].some(t => name.includes(t))) return 'taurino'
  if (['girolando', 'gir leiteiro', 'jersey'].some(t => name.includes(t))) return 'leiteiro_cruzado'

  return 'zebuino'
}

/**
 * Determina a estação do ano com base no mês atual.
 * Seca: maio a setembro | Águas: outubro a abril
 */
function getCurrentSeason(): string {
  const month = new Date().getMonth() + 1
  return (month >= 5 && month <= 9) ? 'seca' : 'aguas'
}

/**
 * Determina a qualidade da forragem com base na condição do pasto e estação.
 */
function getForageQuality(pastureCondition: string | null, season: string): 'boa' | 'media' | 'ruim' {
  if (pastureCondition === 'degradado') return 'ruim'
  if (season === 'seca') return 'media'
  if (pastureCondition === 'bom') return 'boa'
  return 'media'
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    // Verificar autenticação
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Validar parâmetro herd_id
    const herdId = request.nextUrl.searchParams.get('herd_id')
    if (!herdId) {
      return NextResponse.json({ error: 'herd_id obrigatório' }, { status: 400 })
    }

    // Buscar dados do lote com fazenda e raça
    const { data: herd } = await supabase
      .from('herds')
      .select('*, farm:farms!inner(user_id, latitude, longitude), breed:breeds(name)')
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
    let daysSinceLastWeighing = 999
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

      // Calcular dias desde última pesagem
      const lastWeighingDate = new Date(weighings[weighings.length - 1].created_at)
      daysSinceLastWeighing = Math.round((new Date().getTime() - lastWeighingDate.getTime()) / (1000 * 60 * 60 * 24))
    } else if (weighings && weighings.length === 1) {
      const lastWeighingDate = new Date(weighings[0].created_at)
      daysSinceLastWeighing = Math.round((new Date().getTime() - lastWeighingDate.getTime()) / (1000 * 60 * 60 * 24))
    }

    // Score genético para rendimento de carcaça e GMD ajustado
    const breedName = (herd.breed as any)?.name || null
    const geneticInput: GeneticInput = {
      breed_name: breedName,
      genetic_info: (herd as any).genetic_info || null,
      phase: herd.main_phase,
    }
    const geneticScore = calculateGeneticScore(geneticInput, weighingHistory)

    // Buscar dados de clima do cache
    let ituCurrent = 0
    let stressDaysForecast = 0
    if (herd.farm.latitude && herd.farm.longitude) {
      const { data: climate } = await supabase
        .from('climate_cache')
        .select('itu, forecast_data')
        .eq('latitude', herd.farm.latitude)
        .eq('longitude', herd.farm.longitude)
        .order('fetched_at', { ascending: false })
        .limit(1)

      if (climate && climate.length > 0) {
        ituCurrent = climate[0].itu || 0

        // Contar dias de estresse na previsão
        const forecast = climate[0].forecast_data as any
        if (forecast && Array.isArray(forecast)) {
          stressDaysForecast = forecast.filter((d: any) => {
            const dayItu = d.itu || 0
            return dayItu >= 72 // alerta ou acima
          }).length
        }
      }
    }

    // Buscar custos reais ou usar padrão
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

    const arrobaPrice = sims?.[0]?.result?.arroba_price || ARROBA_PRICE_DEFAULT

    // Determinar estação e qualidade da forragem
    const season = getCurrentSeason()
    const forageQuality = getForageQuality(herd.pasture_condition, season)

    // Determinar GMD a usar (prioridade: pesagem real > genético > padrão)
    const gmdUsed = gmdReal || geneticScore.gmd_adjusted || GMD_DEFAULTS[herd.main_phase] || 0.60

    // Determinar linha de suplementação
    // Tenta buscar da última simulação ou usa null (mineral básico)
    let supplementLine: string | null = null
    if (sims?.[0]?.result?.supplement_line) {
      supplementLine = sims[0].result.supplement_line
    }

    // Montar input do oráculo
    const oracleInput: OracleInput = {
      current_weight_kg: herd.avg_weight_kg || 350,
      target_weight_kg: TARGET_WEIGHTS[herd.main_phase] || 540,
      breed_type: getBreedType(breedName),
      gmd_current: gmdUsed,
      phase: herd.main_phase,
      supplement_line: supplementLine,
      forage_quality: forageQuality,
      itu_current: ituCurrent,
      season,
      stress_days_forecast: stressDaysForecast,
      head_count: herd.head_count || 1,
      stocking_rate: (herd as any).stocking_rate || null,
      days_since_last_weighing: daysSinceLastWeighing,
      arroba_price: arrobaPrice,
      daily_cost: dailyCost,
      animal_purchase_price: ANIMAL_PRICES[herd.main_phase] || 3200,
      carcass_yield: geneticScore.carcass_yield || 0.52,
    }

    // Consultar o oráculo
    const prediction = consultOracle(oracleInput)

    // Retornar resultado
    return NextResponse.json({
      herd_id: herdId,
      herd_name: herd.name,
      phase: herd.main_phase,
      head_count: herd.head_count,
      current_weight: herd.avg_weight_kg,
      gmd_source: gmdReal ? 'pesagem' : (geneticScore.gmd_adjusted > 0 ? 'genetico' : 'padrao'),
      gmd_used: gmdUsed,
      season,
      forage_quality: forageQuality,
      prediction,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
