import { createServerSupabaseClient } from '@/lib/supabase-server'
import { askClaude } from '@/lib/claude-api'
import { compareSchema } from '@/lib/schemas'
import { checkRateLimit } from '@/lib/rate-limiter'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    // Rate limiting: 20 requests por hora
    const rateCheck = checkRateLimit(user.id)
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Limite de requisições excedido. Tente novamente em breve.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rateCheck.resetIn / 1000)) } }
      )
    }

    const body = await request.json()
    const parsed = compareSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    const { product_ids, herd_id } = parsed.data

    // Buscar produtos
    const { data: products, error: prodErr } = await supabase
      .from('products')
      .select('*')
      .in('id', product_ids)
    if (prodErr || !products) return NextResponse.json({ error: 'Produtos não encontrados' }, { status: 404 })

    // Buscar dados do lote se informado
    let herdContext = ''
    if (herd_id) {
      const { data: herd } = await supabase
        .from('herds')
        .select('*, forage:forages(name), breed:breeds(name)')
        .eq('id', herd_id)
        .single()
      if (herd) {
        herdContext = `
Contexto do lote: ${herd.name}
- Espécie: ${herd.species}
- Fase: ${herd.main_phase}
- Cabeças: ${herd.head_count}
- Peso médio: ${herd.avg_weight_kg || 'não informado'}kg
- Raça: ${herd.breed?.name || 'não informada'}
- Forrageira: ${herd.forage?.name || 'não informada'}
- Condição pasto: ${herd.pasture_condition || 'não informada'}
`
      }
    }

    // Montar tabela comparativa
    const tableRows = products.map((p: any) => ({
      nome: p.name,
      linha: p.line,
      especie: p.species,
      pb_percent: p.pb_percent || '-',
      p_g_kg: p.p_g_kg || '-',
      ca_g_kg: p.ca_g_kg || '-',
      na_g_kg: p.na_g_kg || '-',
      zn_mg_kg: p.zn_mg_kg || '-',
      ndt_percent: p.ndt_percent || '-',
      package_kg: p.package_kg || '-',
    }))

    // Pedir veredito ao Claude
    const prompt = `Você é o nutricionista da Radarmix. Compare estes produtos Radarmix lado a lado e dê um veredito técnico claro.

PRODUTOS PARA COMPARAR:
${JSON.stringify(tableRows, null, 2)}

${herdContext}

REGRAS:
1. Compare em formato de tabela markdown
2. Destaque diferenciais de cada produto
3. Dê um VEREDITO TÉCNICO claro: qual é melhor e por quê
4. ${herdContext ? 'Considere o contexto do lote para recomendar o mais adequado' : 'Dê recomendação geral'}
5. Máximo 8 frases no veredito
6. Nunca invente preços
7. Fale como técnico de campo`

    const analysis = await askClaude(prompt)

    return NextResponse.json({
      products: tableRows,
      analysis,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
