/**
 * API do Copiloto da Fazenda
 *
 * Endpoint GET que busca todos os dados necessarios do usuario
 * e gera o briefing diario com acoes prioritarias.
 *
 * Dados buscados:
 * - Perfil do produtor (nome da fazenda)
 * - Todos os lotes com dados de peso, produto, pesagem, vacinacao
 * - Dados climaticos do cache
 * - Ultima simulacao financeira
 */

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { generateDailyBriefing } from '@/lib/farm-copilot'
import type { HerdInput, ClimateInput, FinancialInput } from '@/lib/farm-copilot'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    // Buscar nome do produtor (da fazenda)
    const { data: farms } = await supabase
      .from('farms')
      .select('id, name, city')
      .eq('user_id', user.id)

    const farm = farms && farms.length > 0 ? farms[0] : null
    const farmerName = farm?.name || 'Produtor'

    // Buscar todos os lotes com dados relevantes
    const herdsInput: HerdInput[] = []

    if (farm) {
      const { data: herds } = await supabase
        .from('herds')
        .select('id, name, main_phase, head_count, avg_weight_kg, product:products(id, name)')
        .eq('farm_id', farm.id)

      if (herds) {
        for (const herd of herds) {
          // Buscar ultima pesagem para calcular dias desde a pesagem
          const { data: lastWeighing } = await supabase
            .from('herd_history')
            .select('created_at')
            .eq('herd_id', herd.id)
            .order('created_at', { ascending: false })
            .limit(1)

          let daysSinceWeighing: number | null = null
          if (lastWeighing && lastWeighing.length > 0) {
            const lastDate = new Date(lastWeighing[0].created_at)
            const now = new Date()
            daysSinceWeighing = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
          }

          // Buscar ultimo evento sanitario (vacinacao)
          const { data: lastVaccination } = await supabase
            .from('health_events')
            .select('event_date')
            .eq('herd_id', herd.id)
            .eq('event_type', 'vacinacao')
            .order('event_date', { ascending: false })
            .limit(1)

          let daysSinceVaccination: number | null = null
          if (lastVaccination && lastVaccination.length > 0) {
            const lastDate = new Date(lastVaccination[0].event_date)
            const now = new Date()
            daysSinceVaccination = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
          }

          // Calcular completude do perfil (campos preenchidos)
          let filledFields = 0
          const totalFields = 5
          if (herd.name) filledFields++
          if (herd.main_phase) filledFields++
          if (herd.head_count) filledFields++
          if (herd.avg_weight_kg) filledFields++
          if ((herd.product as any)?.id) filledFields++
          const profileCompleteness = Math.round((filledFields / totalFields) * 100)

          herdsInput.push({
            name: herd.name,
            phase: herd.main_phase,
            head_count: herd.head_count || 0,
            avg_weight_kg: herd.avg_weight_kg,
            current_product: (herd.product as any)?.name || null,
            days_since_weighing: daysSinceWeighing,
            days_since_vaccination: daysSinceVaccination,
            profile_completeness: profileCompleteness,
          })
        }
      }
    }

    // Buscar dados climaticos do cache
    let climateInput: ClimateInput | null = null
    if (farm?.city) {
      const today = new Date().toISOString().split('T')[0]
      const { data: climateCache } = await supabase
        .from('climate_cache')
        .select('*')
        .eq('city', farm.city)
        .eq('date', today)
        .limit(1)

      if (climateCache && climateCache.length > 0) {
        const cache = climateCache[0]
        const itu = cache.itu || 0
        let ituLevel = 'normal'
        if (itu >= 89) ituLevel = 'emergency'
        else if (itu >= 79) ituLevel = 'danger'
        else if (itu >= 72) ituLevel = 'alert'

        const month = new Date().getMonth() + 1
        const season = (month >= 5 && month <= 9) ? 'seca' : 'aguas'

        climateInput = {
          temp: cache.temperature || 0,
          humidity: cache.humidity || 0,
          itu,
          itu_level: ituLevel,
          season,
          rain_forecast: (cache.precipitation || 0) > 0,
          stress_days: 0, // dados simplificados do cache
        }
      }
    }

    // Buscar ultima simulacao para dados financeiros
    let financialInput: FinancialInput | null = null
    const { data: simulations } = await supabase
      .from('simulations')
      .select('result')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)

    if (simulations && simulations.length > 0) {
      const result = simulations[0].result as any
      if (result) {
        financialInput = {
          best_roi: result.total_roi || 0,
          worst_cost_category: null,
          waste_detected: (result.total_roi || 0) < 0,
        }
      }
    }

    // Gerar o briefing diario
    const briefing = generateDailyBriefing({
      farmer_name: farmerName,
      herds: herdsInput,
      climate: climateInput,
      financial: financialInput,
    })

    return NextResponse.json(briefing)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
