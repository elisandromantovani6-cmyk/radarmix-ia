import { createServerSupabaseClient } from '@/lib/supabase-server'
import { orderSchema } from '@/lib/schemas'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Buscar todos os lotes do usuário que têm produto recomendado
    const { data: herds } = await supabase
      .from('herds')
      .select('id, name, head_count, main_phase, current_product_id, farm:farms!inner(user_id), product:products(id, name, line, package_kg)')
      .eq('farm.user_id', user.id)
      .not('current_product_id', 'is', null)

    if (!herds || herds.length === 0) {
      return NextResponse.json({ items: [], total_bags: 0, herds_count: 0 })
    }

    // Calcular consumo por produto
    const productMap: Record<string, {
      product_id: string
      product_name: string
      product_line: string
      package_kg: number
      total_consumption_kg: number
      total_bags: number
      herds: { name: string, head_count: number, consumption_kg: number }[]
    }> = {}

    for (const herd of herds) {
      if (!herd.product) continue

      const product = herd.product as any
      const productId = product.id

      // Estimar consumo baseado na linha
      let consumptionPerHead = 0.1 // kg/dia padrão mineral
      const line = (product.line || '').toLowerCase()
      if (line === 's' || line === 'sr' || line === 'especial') consumptionPerHead = 0.08
      if (line === 'proteico') consumptionPerHead = 0.5
      if (line === 'prot.energ') consumptionPerHead = 0.8
      if (line === 'fazcarne') consumptionPerHead = 1.0
      if (line === 'rk') consumptionPerHead = 1.5
      if (line === 'concentrado') consumptionPerHead = 3.0
      if (line.includes('leite')) consumptionPerHead = 0.1

      const monthlyConsumption = consumptionPerHead * herd.head_count * 30
      const packageKg = product.package_kg || 25
      const bags = Math.ceil(monthlyConsumption / packageKg)

      if (!productMap[productId]) {
        productMap[productId] = {
          product_id: productId,
          product_name: product.name,
          product_line: product.line,
          package_kg: packageKg,
          total_consumption_kg: 0,
          total_bags: 0,
          herds: [],
        }
      }

      productMap[productId].total_consumption_kg += monthlyConsumption
      productMap[productId].total_bags += bags
      productMap[productId].herds.push({
        name: herd.name,
        head_count: herd.head_count,
        consumption_kg: monthlyConsumption,
      })
    }

    const items = Object.values(productMap).sort((a, b) => b.total_bags - a.total_bags)
    const totalBags = items.reduce((sum, item) => sum + item.total_bags, 0)

    return NextResponse.json({
      items,
      total_bags: totalBags,
      herds_count: herds.length,
      month: new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = orderSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    const { items } = parsed.data

    const { error } = await supabase.from('purchase_orders').insert({
      user_id: user.id,
      status: 'pendente',
      items: items,
      total_items: items.reduce((sum: number, item: any) => sum + item.total_bags, 0),
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

