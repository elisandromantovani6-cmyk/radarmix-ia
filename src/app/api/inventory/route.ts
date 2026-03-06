import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { data: farm } = await supabase
      .from('farms')
      .select('id')
      .eq('user_id', user.id)
      .single()
    if (!farm) return NextResponse.json({ error: 'Fazenda não encontrada' }, { status: 404 })

    // Buscar itens do estoque
    const { data: items } = await supabase
      .from('inventory')
      .select('*, product:products(name, line, package_kg)')
      .eq('farm_id', farm.id)
      .order('days_remaining', { ascending: true })

    return NextResponse.json({ items: items || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { farm_id, product_id, product_name, quantity_kg, daily_consumption_kg, unit_price, notes } = await request.json()

    if (!product_name || !quantity_kg) {
      return NextResponse.json({ error: 'Informe o produto e a quantidade' }, { status: 400 })
    }

    const dailyConsumption = daily_consumption_kg || 0
    const daysRemaining = dailyConsumption > 0 ? Math.floor(quantity_kg / dailyConsumption) : null

    let status = 'ok'
    if (daysRemaining !== null) {
      if (daysRemaining <= 7) status = 'critico'
      else if (daysRemaining <= 15) status = 'atencao'
    }

    const { data: item, error } = await supabase
      .from('inventory')
      .insert({
        farm_id,
        product_id: product_id || null,
        product_name,
        quantity_kg,
        daily_consumption_kg: dailyConsumption,
        days_remaining: daysRemaining,
        unit_price: unit_price || null,
        status,
        notes: notes || null,
        user_id: user.id,
      })
      .select()
      .single()

    if (error) {
      // Se a tabela não existe ainda, retornar instruções
      if (error.code === '42P01') {
        return NextResponse.json({
          error: 'Tabela inventory não existe. Execute o SQL de criação.',
          sql_needed: true,
        }, { status: 400 })
      }
      throw error
    }

    return NextResponse.json({ item })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { id, quantity_kg, daily_consumption_kg } = await request.json()

    const updates: any = {}
    if (quantity_kg !== undefined) updates.quantity_kg = quantity_kg
    if (daily_consumption_kg !== undefined) updates.daily_consumption_kg = daily_consumption_kg

    // Recalcular dias restantes
    const qty = quantity_kg
    const daily = daily_consumption_kg
    if (qty !== undefined && daily !== undefined && daily > 0) {
      updates.days_remaining = Math.floor(qty / daily)
      if (updates.days_remaining <= 7) updates.status = 'critico'
      else if (updates.days_remaining <= 15) updates.status = 'atencao'
      else updates.status = 'ok'
    }

    updates.updated_at = new Date().toISOString()

    const { data: item, error } = await supabase
      .from('inventory')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ item })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
