import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

// POST: fornecedor responde cotação (aceitar/recusar)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    // Verificar que o usuário é fornecedor
    const { data: supplier } = await supabase
      .from('suppliers')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!supplier) {
      return NextResponse.json({ error: 'Fornecedor não encontrado' }, { status: 404 })
    }

    const { quote_id, status, response_price, response_notes } = await request.json()

    if (!quote_id || !status) {
      return NextResponse.json({ error: 'ID da cotação e status são obrigatórios' }, { status: 400 })
    }

    const validStatuses = ['respondida', 'aceita', 'recusada']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Status inválido. Use: respondida, aceita ou recusada' }, { status: 400 })
    }

    // Verificar que a cotação pertence ao fornecedor
    const { data: quote } = await supabase
      .from('quotes')
      .select('id, supplier_id')
      .eq('id', quote_id)
      .eq('supplier_id', supplier.id)
      .single()

    if (!quote) {
      return NextResponse.json({ error: 'Cotação não encontrada' }, { status: 404 })
    }

    // Atualizar cotação com a resposta do fornecedor
    const updateData: Record<string, any> = {
      status,
      response_notes: response_notes || null,
      responded_at: new Date().toISOString(),
    }

    if (response_price !== undefined && response_price !== null) {
      updateData.response_price = parseFloat(response_price)
    }

    const { data, error } = await supabase
      .from('quotes')
      .update(updateData)
      .eq('id', quote_id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ quote: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
