import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

// Dados estimados de chuva mensal MT (mm) - Referência INMET/ANA histórico Tangará da Serra
const RAINFALL_HISTORY_MT: Record<string, { rain_mm: number, rainy_days: number }> = {
  '01': { rain_mm: 280, rainy_days: 20 },
  '02': { rain_mm: 250, rainy_days: 18 },
  '03': { rain_mm: 220, rainy_days: 16 },
  '04': { rain_mm: 90, rainy_days: 8 },
  '05': { rain_mm: 30, rainy_days: 3 },
  '06': { rain_mm: 10, rainy_days: 1 },
  '07': { rain_mm: 5, rainy_days: 0 },
  '08': { rain_mm: 15, rainy_days: 1 },
  '09': { rain_mm: 50, rainy_days: 4 },
  '10': { rain_mm: 120, rainy_days: 10 },
  '11': { rain_mm: 200, rainy_days: 15 },
  '12': { rain_mm: 270, rainy_days: 19 },
}

// NDVI estimado por mês para pastagem no MT (0-1, onde 1 = máximo verde)
const NDVI_ESTIMATES: Record<string, number> = {
  '01': 0.72, '02': 0.75, '03': 0.70, '04': 0.60,
  '05': 0.48, '06': 0.38, '07': 0.32, '08': 0.30,
  '09': 0.35, '10': 0.45, '11': 0.58, '12': 0.68,
}

// Matéria Seca disponível estimada (kg MS/ha) baseada em NDVI + chuva
function estimateMS(ndvi: number, rainMm: number): number {
  // Modelo simplificado: MS = NDVI * 4000 + (rain * 2)
  // Pastagem bem manejada no MT produz 2000-5000 kg MS/ha/mês nas águas
  const base = ndvi * 4500
  const rainBonus = Math.min(rainMm * 1.5, 400)
  return Math.round(base + rainBonus)
}

// Capacidade suporte (cab/ha) baseada em MS disponível
function estimateCapacity(msKgHa: number, avgWeightKg: number): number {
  // Consumo de MS = 2.5% do peso vivo/dia
  // Necessidade mensal = peso * 0.025 * 30
  const monthlyConsumption = (avgWeightKg || 400) * 0.025 * 30
  // Eficiência de utilização da pastagem = 60%
  const usableMS = msKgHa * 0.60
  return Math.round((usableMS / monthlyConsumption) * 10) / 10
}

// Qualidade estimada da forragem (PB%) baseada no mês
function estimatePB(month: string): number {
  const pbByMonth: Record<string, number> = {
    '01': 9.5, '02': 9.0, '03': 8.5, '04': 7.0,
    '05': 5.5, '06': 4.5, '07': 4.0, '08': 3.8,
    '09': 4.5, '10': 6.0, '11': 7.5, '12': 8.8,
  }
  return pbByMonth[month] || 6.0
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    // Buscar dados da fazenda
    const { data: farms } = await supabase
      .from('farms')
      .select('id, total_area_ha')
      .eq('user_id', user.id)

    const { data: herds } = await supabase
      .from('herds')
      .select('head_count, avg_weight_kg')
      .eq('farm_id', farms?.[0]?.id || '')

    const totalArea = farms?.[0]?.total_area_ha || 500
    const totalHeads = herds?.reduce((sum: number, h: any) => sum + (h.head_count || 0), 0) || 0
    const avgWeight = herds && herds.length > 0
      ? herds.reduce((sum: number, h: any) => sum + (h.avg_weight_kg || 350), 0) / herds.length
      : 350

    // Gerar histórico 12 meses
    const now = new Date()
    const history = []

    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = String(date.getMonth() + 1).padStart(2, '0')
      const monthLabel = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
      const rainfall = RAINFALL_HISTORY_MT[monthKey]
      const ndvi = NDVI_ESTIMATES[monthKey]
      const msKgHa = estimateMS(ndvi, rainfall.rain_mm)
      const capacity = estimateCapacity(msKgHa, avgWeight)
      const pb = estimatePB(monthKey)
      const currentLoad = totalArea > 0 ? totalHeads / totalArea : 0

      history.push({
        month: monthLabel,
        month_num: monthKey,
        rain_mm: rainfall.rain_mm,
        rainy_days: rainfall.rainy_days,
        ndvi: ndvi,
        ndvi_label: ndvi >= 0.6 ? 'Verde' : ndvi >= 0.4 ? 'Moderado' : 'Seco',
        ndvi_color: ndvi >= 0.6 ? 'green' : ndvi >= 0.4 ? 'yellow' : 'red',
        ms_kg_ha: msKgHa,
        capacity_cab_ha: capacity,
        current_load: Math.round(currentLoad * 10) / 10,
        overloaded: currentLoad > capacity,
        pb_percent: pb,
        pb_status: pb >= 7 ? 'Adequada' : pb >= 5 ? 'Baixa' : 'Crítica',
      })
    }

    // Mês atual
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0')
    const currentNDVI = NDVI_ESTIMATES[currentMonth]
    const currentRain = RAINFALL_HISTORY_MT[currentMonth]
    const currentMS = estimateMS(currentNDVI, currentRain.rain_mm)
    const currentCapacity = estimateCapacity(currentMS, avgWeight)
    const currentLoad = totalArea > 0 ? totalHeads / totalArea : 0

    return NextResponse.json({
      total_area: totalArea,
      total_heads: totalHeads,
      avg_weight: Math.round(avgWeight),
      current_load: Math.round(currentLoad * 10) / 10,
      current_capacity: currentCapacity,
      current_ndvi: currentNDVI,
      current_ms: currentMS,
      current_pb: estimatePB(currentMonth),
      overloaded: currentLoad > currentCapacity,
      history,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

