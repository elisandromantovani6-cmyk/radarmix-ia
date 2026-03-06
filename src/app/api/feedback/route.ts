import { createServerSupabaseClient } from '@/lib/supabase-server'
import { feedbackSchema } from '@/lib/schemas'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = feedbackSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    const { consultation_id, herd_id, product_id, rating, comment } = parsed.data

    // Salvar feedback
    const { error } = await supabase.from('recommendation_feedback').insert({
      user_id: user.id,
      consultation_id: consultation_id || null,
      herd_id,
      product_id,
      rating,
      comment: comment || null,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

