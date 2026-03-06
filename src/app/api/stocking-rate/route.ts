import { createServerSupabaseClient } from '@/lib/supabase-server'
import { askClaude } from '@/lib/claude-api'
import { NextRequest, NextResponse } from 'next/server'

// Capacidade de suporte por forrageira (UA/ha) - fonte Embrapa
const FORAGE_CAPACITY: Record<string, { aguas: number, seca: number }> = {
  'braquiaria_brizantha': { aguas: 2.5, seca: 1.2 },
  'braquiaria_decumbens': { aguas: 2.0, seca: 1.0 },
  'braquiaria_humidicola': { aguas: 1.8, seca: 0.8 },
  'braquiaria_ruziziensis': { aguas: 2.2, seca: 1.0 },
  'panicum_mombaca': { aguas: 3.5, seca: 1.5 },
  'panicum_tanzania': { aguas: 3.0, seca: 1.3 },
  'panicum_zuri': { aguas: 3.5, seca: 1.5 },
  'panicum_massai': { aguas: 2.5, seca: 1.2 },
  'cynodon_tifton': { aguas: 4.0, seca: 2.0 },
  'cynodon_coastcross': { aguas: 3.5, seca: 1.8 },
  'cynodon_estrela': { aguas: 3.0, seca: 1.5 },
  'andropogon': { aguas: 1.5, seca: 0.7 },
  'default': { aguas: 2.0, seca: 1.0 },
}

// Ajuste por condição do pasto
const CONDITION_FACTOR: Record<string, number> = {
  'bom': 1.0,
  'regular': 0.75,
  'degradado': 0.5,
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { area_ha, forage_type, pasture_condition, head_count, avg_weight_kg, herd_id } = await request.json()

    if (!area_ha || area_ha <= 0) {
      return NextResponse.json({ error: 'Informe a área em hectares' }, { status: 400 })
    }

    // Determinar época
    const month = new Date().getMonth() + 1
    const season = (month >= 5 && month <= 9) ? 'seca' : 'aguas'

    // Buscar forrageira do lote se herd_id informado
    let forageName = forage_type || 'default'
    let condition = pasture_condition || 'regular'
    let heads = head_count || 0
    let weight = avg_weight_kg || 450

    if (herd_id) {
      const { data: herd } = await supabase
        .from('herds')
        .select('*, forage:forages(name, category)')
        .eq('id', herd_id)
        .single()
      if (herd) {
        heads = herd.head_count || heads
        weight = herd.avg_weight_kg || weight
        condition = herd.pasture_condition || condition
        if (herd.forage) {
          forageName = herd.forage.category || herd.forage.name || forageName
        }
      }
    }

    // Buscar capacidade da forrageira
    const forageKey = forageName.toLowerCase().replace(/\s+/g, '_').replace(/[áàã]/g, 'a').replace(/[éê]/g, 'e').replace(/[íî]/g, 'i').replace(/[óô]/g, 'o').replace(/[úû]/g, 'u')
    const capacity = FORAGE_CAPACITY[forageKey] || FORAGE_CAPACITY['default']
    const conditionFactor = CONDITION_FACTOR[condition] || 0.75

    // Calcular
    const capacityPerHa = season === 'seca' ? capacity.seca : capacity.aguas
    const adjustedCapacity = capacityPerHa * conditionFactor
    const totalCapacityUA = adjustedCapacity * area_ha

    // Converter cabeças para UA (1 UA = 450kg)
    const uaPerHead = weight / 450
    const currentUA = heads * uaPerHead
    const maxHeads = Math.floor(totalCapacityUA / uaPerHead)

    const utilizationPercent = heads > 0 ? Math.round((currentUA / totalCapacityUA) * 100) : 0

    let status: string
    let statusColor: string
    if (utilizationPercent <= 70) {
      status = 'SUBUTILIZADO'
      statusColor = 'blue'
    } else if (utilizationPercent <= 100) {
      status = 'IDEAL'
      statusColor = 'green'
    } else if (utilizationPercent <= 120) {
      status = 'ATENÇÃO'
      statusColor = 'amber'
    } else {
      status = 'SUPERLOTADO'
      statusColor = 'red'
    }

    // Pedir análise ao Claude
    const prompt = `Você é especialista em pastagens da Radarmix. Analise esta lotação:

DADOS:
- Área: ${area_ha} hectares
- Forrageira: ${forageName}
- Condição do pasto: ${condition}
- Época: ${season === 'seca' ? 'período seco' : 'período das águas'}
- Capacidade: ${adjustedCapacity.toFixed(1)} UA/ha
- Cabeças atuais: ${heads}
- Peso médio: ${weight}kg
- UA atual: ${currentUA.toFixed(1)} UA
- Capacidade total: ${totalCapacityUA.toFixed(1)} UA
- Máximo cabeças: ${maxHeads}
- Taxa de utilização: ${utilizationPercent}%
- Status: ${status}

REGRAS:
1. Dê uma análise prática em 4-5 frases
2. Se superlotado, sugira quantos animais tirar ou quantos hectares precisa
3. Se subutilizado, sugira quantos animais pode colocar
4. Sugira produto Radarmix adequado para a situação
5. Fale como técnico de campo`

    const analysis = await askClaude(prompt)

    return NextResponse.json({
      area_ha,
      forage_type: forageName,
      pasture_condition: condition,
      season,
      capacity_ua_ha: adjustedCapacity,
      total_capacity_ua: totalCapacityUA,
      current_heads: heads,
      avg_weight_kg: weight,
      current_ua: currentUA,
      max_heads: maxHeads,
      utilization_percent: utilizationPercent,
      status,
      statusColor,
      analysis,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
