// =============================================================================
// API Route: Formulador de Dieta Automática
// POST /api/diet — Recebe dados do animal e retorna dieta otimizada
// Aceita herd_id (busca do banco) OU entrada manual
// =============================================================================

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { formulateDiet, DietInput } from '@/lib/diet-formulator'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Schema de validação para entrada manual
const dietManualSchema = z.object({
  weight_kg: z.number().positive('Peso deve ser positivo').max(2000, 'Peso máximo é 2000 kg'),
  gmd_target: z.number().positive('GMD deve ser positivo').max(3, 'GMD máximo é 3 kg/dia'),
  phase: z.string().min(1, 'Fase é obrigatória'),
  breed_type: z.string().min(1, 'Tipo racial é obrigatório'),
  season: z.enum(['seca', 'aguas'], { message: 'Estação deve ser seca ou aguas' }),
  available_ingredients: z.array(z.string()).optional(),
})

// Schema para entrada via lote (herd_id)
const dietHerdSchema = z.object({
  herd_id: z.string().uuid('ID do lote deve ser um UUID válido'),
  gmd_target: z.number().positive('GMD deve ser positivo').max(3).optional(),
  available_ingredients: z.array(z.string()).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await request.json()

    let dietInput: DietInput

    // Verificar se é entrada via herd_id ou manual
    if (body.herd_id) {
      // Validar entrada com herd_id
      const parsed = dietHerdSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors },
          { status: 400 }
        )
      }

      // Buscar dados do lote no banco
      const { data: herd, error: herdError } = await supabase
        .from('herds')
        .select('*, farm:farms!inner(user_id), breed:breeds(name)')
        .eq('id', parsed.data.herd_id)
        .single()

      if (herdError || !herd) {
        return NextResponse.json({ error: 'Lote não encontrado' }, { status: 404 })
      }

      // Verificar se o lote pertence ao usuário
      if (herd.farm.user_id !== user.id) {
        return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
      }

      // Determinar tipo racial a partir do nome da raça
      const breedName = herd.breed?.name?.toLowerCase() ?? ''
      let breedType = 'zebuino'
      if (['angus', 'hereford', 'charolês', 'limousin', 'simental'].some(t => breedName.includes(t))) {
        breedType = 'taurino'
      } else if (breedName.includes('f1') || breedName.includes('cruzamento')) {
        breedType = 'cruzamento'
      }

      // Determinar estação do ano atual
      const month = new Date().getMonth() + 1
      const season = (month >= 5 && month <= 9) ? 'seca' : 'aguas'

      // GMD padrão por fase se não informado
      const gmdDefaults: Record<string, number> = {
        cria: 0.4,
        recria: 0.6,
        engorda: 1.2,
        lactacao: 0.3,
        reproducao: 0.3,
      }

      dietInput = {
        weight_kg: herd.avg_weight_kg ?? 350,
        gmd_target: parsed.data.gmd_target ?? gmdDefaults[herd.main_phase] ?? 0.6,
        phase: herd.main_phase,
        breed_type: breedType,
        season,
        available_ingredients: parsed.data.available_ingredients,
      }
    } else {
      // Entrada manual — validar todos os campos
      const parsed = dietManualSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors },
          { status: 400 }
        )
      }

      dietInput = {
        weight_kg: parsed.data.weight_kg,
        gmd_target: parsed.data.gmd_target,
        phase: parsed.data.phase,
        breed_type: parsed.data.breed_type,
        season: parsed.data.season,
        available_ingredients: parsed.data.available_ingredients,
      }
    }

    // Formular dieta otimizada
    const result = formulateDiet(dietInput)

    return NextResponse.json({
      diet: result,
      input: {
        weight_kg: dietInput.weight_kg,
        gmd_target: dietInput.gmd_target,
        phase: dietInput.phase,
        breed_type: dietInput.breed_type,
        season: dietInput.season,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}
