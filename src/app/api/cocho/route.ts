import { createServerSupabaseClient } from '@/lib/supabase-server'
import { cochoSchema } from '@/lib/schemas'
import { checkRateLimit } from '@/lib/rate-limiter'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Rate limiting: 20 requests por hora
    const rateCheck = checkRateLimit(user.id)
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Limite de requisições excedido. Tente novamente em breve.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rateCheck.resetIn / 1000)) } }
      )
    }

    const body = await request.json()
    const validatedInput = cochoSchema.safeParse(body)
    if (!validatedInput.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: validatedInput.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    const { image_base64, herd_id } = validatedInput.data

    // Contexto do lote (opcional)
    let herdContext = ''
    if (herd_id) {
      const { data: herd } = await supabase
        .from('herds')
        .select('*, farm:farms!inner(user_id), product:products(name), forage:forages(name), breed:breeds(name)')
        .eq('id', herd_id)
        .single()

      if (herd && herd.farm.user_id === user.id) {
        herdContext = `
CONTEXTO DO LOTE:
- Nome: ${herd.name}
- Espécie: ${herd.species || 'bovino'}
- Fase: ${herd.main_phase || 'não informada'}
- Cabeças: ${herd.head_count || 'não informado'}
- Peso médio: ${herd.avg_weight_kg ? herd.avg_weight_kg + ' kg' : 'não informado'}
- Raça: ${herd.breed?.name || 'não informada'}
- Forrageira: ${herd.forage?.name || 'não informada'}
- Produto atual: ${herd.product?.name || 'nenhum'}
- Condição do pasto: ${herd.pasture_condition || 'não informada'}

Use esses dados para contextualizar melhor a análise e a sugestão de ajuste.`
      }
    }

    // Detectar media type da imagem base64
    let mediaType = 'image/jpeg'
    if (image_base64.startsWith('/9j/')) {
      mediaType = 'image/jpeg'
    } else if (image_base64.startsWith('iVBOR')) {
      mediaType = 'image/png'
    } else if (image_base64.startsWith('R0lGOD')) {
      mediaType = 'image/gif'
    } else if (image_base64.startsWith('UklGR')) {
      mediaType = 'image/webp'
    }

    const systemPrompt = `Você é técnico de campo da Radarmix Nutrição Animal, especialista em avaliação de cochos de gado. Analise a foto do cocho enviada e forneça uma avaliação técnica detalhada.${herdContext}`

    const userPrompt = `Analise esta foto de cocho de gado e responda em JSON válido (sem markdown, sem backticks, apenas o JSON puro) com os seguintes campos:

{
  "sobra_percent": <número de 0 a 100 representando a porcentagem estimada de sobra no cocho>,
  "qualidade": "<uma das opções: homogênea | separada | úmida | seca | moída fina | moída grossa | bem misturada | mal misturada>",
  "diagnostico": "<texto curto: se está sobrando muito, pouco ou na medida, e o que isso indica>",
  "sugestao": "<sugestão prática de ajuste: aumentar/diminuir quantidade, melhorar moagem, ajustar mistura, etc. Inclua valores estimados quando possível (ex: reduza 0.5 kg/cab/dia)>",
  "tipo_alimento": "<identificação do tipo: mineral | proteinado | ração | silagem | concentrado | volumoso | mistura múltipla | não identificado>",
  "analysis": "<análise completa e detalhada em 2-3 parágrafos, como um técnico de campo explicaria ao produtor>"
}

IMPORTANTE:
- Seja preciso na estimativa de sobra
- Se a sobra estiver entre 5% e 15%, é considerado ideal
- Abaixo de 5% indica que os animais podem estar com fome (subdosagem)
- Acima de 15% indica desperdício (superdosagem)
- Considere a qualidade visual da mistura para sugerir ajustes na moagem ou mistura
- Responda APENAS o JSON, sem texto adicional`

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Chave da API não configurada' }, { status: 500 })
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: image_base64,
                },
              },
              {
                type: 'text',
                text: userPrompt,
              },
            ],
          },
        ],
      }),
    })

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}))
      console.error('Erro Claude Vision:', errData)
      return NextResponse.json(
        { error: 'Erro ao analisar imagem com IA' },
        { status: 500 }
      )
    }

    const data = await response.json()
    const rawText = data.content?.[0]?.text || ''

    // Extrair JSON da resposta (caso venha com texto extra)
    let parsed
    try {
      parsed = JSON.parse(rawText)
    } catch {
      // Tentar extrair JSON de dentro do texto
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0])
      } else {
        return NextResponse.json(
          { error: 'Não foi possível interpretar a resposta da IA' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      analysis: parsed.analysis || '',
      sobra_percent: parsed.sobra_percent ?? 0,
      qualidade: parsed.qualidade || 'não identificada',
      diagnostico: parsed.diagnostico || '',
      sugestao: parsed.sugestao || '',
      tipo_alimento: parsed.tipo_alimento || 'não identificado',
    })
  } catch (err: any) {
    console.error('Erro na rota /api/cocho:', err)
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}
