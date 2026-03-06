import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { supplier_id, items } = await request.json()

    // Buscar cidade da fazenda
    const { data: farms } = await supabase.from('farms').select('city').eq('user_id', user.id)
    const farmCity = farms?.[0]?.city || ''

    // Calcular estimativa de total
    const { data: products } = await supabase.from('supplier_products').select('*').eq('supplier_id', supplier_id)
    let totalEstimate = 0
    if (products) {
      for (const item of items) {
        const prod = products.find((p: any) => p.product_name === item.product_name)
        if (prod) totalEstimate += prod.price * item.quantity
      }
    }

    const { data, error } = await supabase.from('quotes').insert({
      producer_id: user.id,
      supplier_id,
      items,
      total_estimate: totalEstimate,
      farm_city: farmCity,
    }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ quote: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { data: quotes } = await supabase
      .from('quotes')
      .select('*, supplier:suppliers(name, city, phone)')
      .eq('producer_id', user.id)
      .order('created_at', { ascending: false })

    return NextResponse.json({ quotes: quotes || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
