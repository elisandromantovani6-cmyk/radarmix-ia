// =============================================================================
// API de Estimativa de Peso por Medidas Biométricas — RadarMix IA
// POST /api/weight-estimate
// Recebe medidas do animal e retorna peso estimado com análise completa
// =============================================================================

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { estimateWeight, WeightEstimateInput } from '@/lib/weight-estimator'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Schema de validação para a requisição
const weightEstimateSchema = z.object({
  // Medidas biométricas (cm)
  chest_perimeter_cm: z
    .number()
    .min(50, 'Perímetro torácico mínimo é 50 cm')
    .max(300, 'Perímetro torácico máximo é 300 cm'),
  body_length_cm: z
    .number()
    .min(30, 'Comprimento corporal mínimo é 30 cm')
    .max(300, 'Comprimento corporal máximo é 300 cm')
    .optional(),
  hip_height_cm: z
    .number()
    .min(30, 'Altura de garupa mínima é 30 cm')
    .max(200, 'Altura de garupa máxima é 200 cm')
    .optional(),

  // Informações do animal
  breed_type: z.enum(['zebuino', 'taurino', 'cruzamento', 'leite']).default('zebuino'),
  sex: z.enum(['macho', 'femea']).default('macho'),
  age_months: z.number().min(0).max(240).optional(),
  phase: z
    .enum(['cria', 'recria', 'engorda', 'terminação', 'reprodução'])
    .default('engorda'),

  // Condição corporal (1-9)
  body_condition_score: z.number().min(1).max(9).optional(),

  // ID do lote para buscar dados complementares
  herd_id: z.string().uuid().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    // Verificar autenticação
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Validar corpo da requisição
    const body = await request.json()
    const parsed = weightEstimateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Dados inválidos',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const data = parsed.data

    // Se herd_id fornecido, buscar dados do lote para enriquecer a estimativa
    let lastRealWeight: number | undefined
    let lastRealWeightDate: string | undefined
    let herdBreedType = data.breed_type
    let herdPhase = data.phase

    if (data.herd_id) {
      // Buscar lote e verificar propriedade
      const { data: herd } = await supabase
        .from('herds')
        .select('*, farm:farms!inner(user_id)')
        .eq('id', data.herd_id)
        .single()

      if (herd && herd.farm.user_id === user.id) {
        // Usar dados do lote se não foram fornecidos explicitamente
        if (herd.breed_type) herdBreedType = herd.breed_type
        if (herd.phase) herdPhase = herd.phase

        // Buscar última pesagem real do lote
        if (herd.avg_weight_kg && herd.avg_weight_kg > 0) {
          lastRealWeight = herd.avg_weight_kg

          // Buscar data da última pesagem no histórico
          const { data: lastWeighing } = await supabase
            .from('herd_history')
            .select('created_at')
            .eq('herd_id', data.herd_id)
            .eq('event_type', 'pesagem')
            .order('created_at', { ascending: false })
            .limit(1)

          if (lastWeighing && lastWeighing.length > 0) {
            lastRealWeightDate = lastWeighing[0].created_at
          }
        }
      }
    }

    // Montar entrada para o estimador
    const estimateInput: WeightEstimateInput = {
      chest_perimeter_cm: data.chest_perimeter_cm,
      body_length_cm: data.body_length_cm,
      hip_height_cm: data.hip_height_cm,
      breed_type: herdBreedType,
      sex: data.sex,
      age_months: data.age_months,
      phase: herdPhase,
      body_condition_score: data.body_condition_score,
      last_real_weight_kg: lastRealWeight,
      last_real_weight_date: lastRealWeightDate,
    }

    // Calcular estimativa
    const result = estimateWeight(estimateInput)

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('Erro na estimativa de peso:', error)
    return NextResponse.json(
      { error: 'Erro interno ao estimar peso' },
      { status: 500 }
    )
  }
}
