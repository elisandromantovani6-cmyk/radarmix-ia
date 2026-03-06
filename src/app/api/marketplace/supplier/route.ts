import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

// GET - listar produtos do fornecedor logado
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { data: supplier } = await supabase
      .from('marketplace_suppliers')
      .select('*, products:marketplace_products(*)')
      .eq('user_id', user.id)
      .single()

    return NextResponse.json({ supplier })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST - cadastrar/atualizar dados do fornecedor
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const body = await request.json()
    const { action } = body

    if (action === 'update_supplier') {
      const { name, city, phone, description } = body
      if (!name || typeof name !== 'string' || name.length > 200) {
        return NextResponse.json({ error: 'Nome inválido' }, { status: 400 })
      }
      if (city && (typeof city !== 'string' || city.length > 100)) {
        return NextResponse.json({ error: 'Cidade inválida' }, { status: 400 })
      }
      if (phone && (typeof phone !== 'string' || phone.length > 20)) {
        return NextResponse.json({ error: 'Telefone inválido' }, { status: 400 })
      }
      const { data, error } = await supabase
        .from('marketplace_suppliers')
        .upsert({ user_id: user.id, name, city, phone, description }, { onConflict: 'user_id' })
        .select()
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ supplier: data })
    }

    if (action === 'add_product') {
      const { supplier_id, product_name, category, price, unit, stock_qty, description } = body
      const { data, error } = await supabase
        .from('marketplace_products')
        .insert({ supplier_id, product_name, category, price_per_unit: price, unit, stock_qty, description })
        .select()
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ product: data })
    }

    if (action === 'update_product') {
      const { product_id, product_name, price, stock_qty } = body
      const { data, error } = await supabase
        .from('marketplace_products')
        .update({ product_name, price_per_unit: price, stock_qty })
        .eq('id', product_id)
        .select()
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ product: data })
    }

    if (action === 'delete_product') {
      const { product_id } = body
      await supabase.from('marketplace_products').delete().eq('id', product_id)
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
