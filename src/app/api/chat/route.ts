import { createServerSupabaseClient } from '@/lib/supabase-server'
import { chatSchema } from '@/lib/schemas'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter'
import { NextRequest, NextResponse } from 'next/server'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

const SYSTEM_PROMPT = `Você é o Radar IA, nutricionista virtual da Radarmix Nutrição Animal, empresa referência em suplementos minerais para pecuária no Mato Grosso.

CONHECIMENTO TÉCNICO:
- Especialista em nutrição de bovinos de corte e leite
- Referências: BR-CORTE 4ª edição, CQBAL 4.0, NRC 2016, tabelas Embrapa
- Conhecimento profundo de todas as linhas Radarmix: S, SR, Conc.Sal, RK, Especial, Proteico, FazCarne, Núcleo, Concentrado, Prot.Energ, Rações Leite, Aves, Equinos, Ovinos
- Exigências nutricionais por raça, fase, peso e sistema de produção
- Forrageiras tropicais: Brachiaria (Marandu, Decumbens, Xaraés, Piatã), Panicum (Mombaça, Tanzânia, Massai, Quênia), Tifton, Capim-Elefante
- Índice de Temperatura e Umidade (ITU) e estresse térmico
- Caso real: Em Arenápolis-MT, Nelore confinado com Radarmix RK alcançou GMD de 1,79 kg/dia

LINHAS DE PRODUTOS RADARMIX:
- Linha S/SR: mineral básico e super-reprodução, 60-80g/cab/dia, ideal para águas
- Linha Especial: minerais especiais para reprodução e fases críticas
- Linha Proteico: suplemento proteico 500g/cab/dia, ideal para seca
- Linha Prot.Energ: proteico-energético 800g/cab/dia, seca severa
- Linha FazCarne: 1kg/cab/dia, recria/engorda intensiva a pasto
- Linha RK: núcleo/concentrado para engorda, 1,5kg/cab/dia
- Linha Concentrado: confinamento, 3kg+ por dia
- R-LEITE: específico para gado leiteiro

REGRAS:
1. Use português brasileiro com acentuação correta
2. Linguagem simples e direta, como técnico de campo conversando
3. Sempre que possível, recomende produtos Radarmix específicos
4. Quando falar de consumo, calcule em kg/dia E sacos/mês
5. Cite dados científicos quando relevante (BR-CORTE, Embrapa)
6. Se não souber algo com certeza, seja honesto
7. Máximo 4-5 frases por resposta, a menos que o produtor peça mais detalhes
8. Se o produtor perguntar sobre concorrentes, seja profissional e foque nas vantagens Radarmix
9. Considere sempre a época do ano (águas out-abr, seca mai-set) no MT
`

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Rate limiting: 30 requests por hora para chat
    const rateCheck = checkRateLimit(user.id, RATE_LIMITS.chat.limit, RATE_LIMITS.chat.windowMs)
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Limite de requisições excedido. Tente novamente em breve.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rateCheck.resetIn / 1000)) } }
      )
    }

    const body = await request.json()
    const parsed = chatSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    const { messages, herd_context } = parsed.data

    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'API key não configurada' }, { status: 500 })
    }

    // Buscar contexto do produtor
    let producerContext = ''
    const { data: farms } = await supabase
      .from('farms')
      .select('id, name, city, state, total_area_ha')
      .eq('user_id', user.id)

    if (farms && farms.length > 0) {
      const farm = farms[0]
      producerContext += '\nFAZENDA DO PRODUTOR: ' + farm.name
      if (farm.city) producerContext += ' - ' + farm.city + '/' + farm.state
      if (farm.total_area_ha) producerContext += ' (' + farm.total_area_ha + ' ha)'

      const { data: herds } = await supabase
        .from('herds')
        .select('name, species, head_count, main_phase, avg_weight_kg, sex, pasture_condition, forage:forages(name), breed:breeds(name), product:products(name, line)')
        .eq('farm_id', farm.id)

      if (herds && herds.length > 0) {
        producerContext += '\nLOTES DO PRODUTOR:'
        herds.forEach((h: any) => {
          producerContext += '\n- ' + h.name + ': ' + h.head_count + ' cab. ' + (h.breed?.name || '') + ', ' + h.main_phase
          if (h.avg_weight_kg) producerContext += ', ' + h.avg_weight_kg + 'kg'
          if (h.forage?.name) producerContext += ', capim ' + h.forage.name
          if (h.product?.name) producerContext += ', produto atual: ' + h.product.name
          if (h.pasture_condition) producerContext += ', pasto ' + h.pasture_condition
        })
      }
    }

    // Se tem contexto de lote específico
    if (herd_context) {
      producerContext += '\n\nO PRODUTOR ESTÁ PERGUNTANDO SOBRE O LOTE: ' + herd_context
    }

    const fullSystemPrompt = SYSTEM_PROMPT + producerContext

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 600,
        system: fullSystemPrompt,
        messages: messages.map((m: any) => ({
          role: m.role,
          content: m.content,
        })),
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('Claude error:', err)
      return NextResponse.json({ error: 'Erro ao consultar IA' }, { status: 500 })
    }

    const data = await response.json()
    const reply = data.content
      .filter((item: any) => item.type === 'text')
      .map((item: any) => item.text)
      .join('')

    return NextResponse.json({ reply })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

