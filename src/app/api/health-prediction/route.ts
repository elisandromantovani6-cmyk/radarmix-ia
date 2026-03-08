/**
 * API de Previsão de Problemas Sanitários
 *
 * GET /api/health-prediction?herd_id=UUID
 *
 * Busca dados do lote, fazenda, clima e histórico sanitário,
 * e retorna previsão de riscos de doenças com ações preventivas.
 */
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { predictHealthRisks } from '@/lib/health-predictor'
import { NextRequest, NextResponse } from 'next/server'

// Estação do ano no MT baseada no mês
// Outubro a Abril = águas (chuvoso), Maio a Setembro = seca
function getSeasonFromMonth(month: number): string {
  if (month >= 5 && month <= 9) return 'seca'
  return 'aguas'
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Parâmetro obrigatório: herd_id (ID do lote)
    const herdId = request.nextUrl.searchParams.get('herd_id')
    if (!herdId) {
      return NextResponse.json({ error: 'herd_id obrigatório' }, { status: 400 })
    }

    // Buscar dados do lote com fazenda associada
    const { data: herd } = await supabase
      .from('herds')
      .select('*, farm:farms!inner(id, user_id, city, area_hectares)')
      .eq('id', herdId)
      .single()

    if (!herd || herd.farm.user_id !== user.id) {
      return NextResponse.json({ error: 'Lote não encontrado' }, { status: 404 })
    }

    // Buscar dados climáticos do cache (mais recente para a cidade)
    const cityName = herd.farm.city || 'Tangará da Serra'
    const { data: climateData } = await supabase
      .from('climate_cache')
      .select('temperature, humidity, precipitation, season')
      .eq('city', cityName)
      .order('date', { ascending: false })
      .limit(1)
      .single()

    // Valores climáticos — do cache ou padrão razoável para MT
    const temp = climateData?.temperature ?? 30
    const humidity = climateData?.humidity ?? 65
    const rainMm = climateData?.precipitation ?? 0
    const month = new Date().getMonth() + 1
    const season = climateData?.season || getSeasonFromMonth(month)

    // Buscar último evento de vacinação do lote
    const { data: lastVaccination } = await supabase
      .from('health_events')
      .select('event_date')
      .eq('herd_id', herdId)
      .eq('event_type', 'vacinacao')
      .order('event_date', { ascending: false })
      .limit(1)
      .single()

    // Calcular dias desde última vacinação (null = nunca vacinado)
    let lastVaccinationDays: number | null = null
    if (lastVaccination?.event_date) {
      const diffMs = new Date().getTime() - new Date(lastVaccination.event_date).getTime()
      lastVaccinationDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
    }

    // Buscar último evento de vermifugação do lote
    const { data: lastDeworming } = await supabase
      .from('health_events')
      .select('event_date')
      .eq('herd_id', herdId)
      .eq('event_type', 'vermifugacao')
      .order('event_date', { ascending: false })
      .limit(1)
      .single()

    // Calcular dias desde último vermífugo (null = nunca vermifugado)
    let lastDewormingDays: number | null = null
    if (lastDeworming?.event_date) {
      const diffMs = new Date().getTime() - new Date(lastDeworming.event_date).getTime()
      lastDewormingDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
    }

    // Calcular taxa de lotação (UA/ha) se área da fazenda disponível
    let stockingRate: number | null = null
    const areaHa = herd.farm.area_hectares
    if (areaHa && areaHa > 0 && herd.head_count) {
      // UA simplificada: 1 UA = 450kg. Peso médio do lote / 450 * cabeças / área
      const avgWeight = herd.avg_weight_kg || 350
      stockingRate = Math.round(((avgWeight / 450) * herd.head_count / areaHa) * 100) / 100
    }

    // Executar previsão de riscos sanitários
    const prediction = predictHealthRisks({
      temp,
      humidity,
      rain_mm: rainMm,
      season,
      city: cityName,
      phase: herd.main_phase || 'recria',
      head_count: herd.head_count || 1,
      species: herd.species || 'bovino',
      last_vaccination_days: lastVaccinationDays,
      last_deworming_days: lastDewormingDays,
      stocking_rate: stockingRate,
    })

    return NextResponse.json({
      herd_id: herdId,
      herd_name: herd.name,
      city: cityName,
      climate: { temp, humidity, rain_mm: rainMm, season },
      stocking_rate: stockingRate,
      last_vaccination_days: lastVaccinationDays,
      last_deworming_days: lastDewormingDays,
      prediction,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
