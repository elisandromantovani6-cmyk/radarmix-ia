import { z } from 'zod'

// === Weighing (Pesagem) ===
export const weighingSchema = z.object({
  herd_id: z.string().uuid('ID do lote deve ser um UUID válido'),
  weight_kg: z.union([z.string(), z.number()])
    .transform(val => typeof val === 'string' ? parseFloat(val) : val)
    .pipe(z.number().positive('Peso deve ser positivo').max(2000, 'Peso máximo é 2000 kg')),
  date: z.string().max(20).optional(),
  notes: z.string().max(500, 'Observações devem ter no máximo 500 caracteres').optional(),
})

// === Feedback ===
export const feedbackSchema = z.object({
  consultation_id: z.string().uuid().optional().nullable(),
  herd_id: z.string().uuid('ID do lote deve ser um UUID válido'),
  product_id: z.string().uuid('ID do produto deve ser um UUID válido'),
  rating: z.number().int().min(1, 'Rating mínimo é 1').max(5, 'Rating máximo é 5'),
  comment: z.string().max(1000, 'Comentário deve ter no máximo 1000 caracteres').optional().nullable(),
})

// === Inventory (Estoque) ===
export const inventorySchema = z.object({
  farm_id: z.string().uuid('ID da fazenda deve ser um UUID válido'),
  product_id: z.string().uuid().optional().nullable(),
  product_name: z.string().min(1, 'Nome do produto é obrigatório').max(200),
  quantity_kg: z.number().positive('Quantidade deve ser positiva').max(999999, 'Quantidade muito alta'),
  daily_consumption_kg: z.number().min(0).max(99999).optional(),
  unit_price: z.number().min(0).max(999999).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
})

// === Health Event (Evento Sanitário) ===
export const healthEventSchema = z.object({
  herd_id: z.string().uuid('ID do lote deve ser um UUID válido'),
  protocol_id: z.string().uuid().optional().nullable(),
  event_type: z.string().min(1, 'Tipo do evento é obrigatório').max(100),
  product_name: z.string().min(1, 'Nome do produto é obrigatório').max(200),
  dose: z.string().max(100).optional().nullable(),
  cost_per_head: z.union([z.string(), z.number()])
    .transform(val => typeof val === 'string' ? parseFloat(val) : val)
    .pipe(z.number().min(0).max(99999))
    .optional()
    .nullable(),
  head_count: z.union([z.string(), z.number()])
    .transform(val => typeof val === 'string' ? parseInt(String(val)) : val)
    .pipe(z.number().int().positive().max(99999))
    .optional()
    .nullable(),
  notes: z.string().max(500).optional().nullable(),
  event_date: z.string().max(20).optional().nullable(),
})

// === Marketplace Quote (Cotação) ===
const quoteItemSchema = z.object({
  product_name: z.string().min(1).max(200),
  quantity: z.number().positive().max(99999),
})

export const marketplaceQuoteSchema = z.object({
  supplier_id: z.string().uuid('ID do fornecedor deve ser um UUID válido'),
  items: z.array(quoteItemSchema).min(1, 'Informe pelo menos 1 item'),
})

// === Quote Respond (Resposta à Cotação) ===
export const quoteRespondSchema = z.object({
  quote_id: z.string().uuid('ID da cotação deve ser um UUID válido'),
  status: z.enum(['respondida', 'aceita', 'recusada'], {
    message: 'Status inválido. Use: respondida, aceita ou recusada',
  }),
  response_price: z.union([z.string(), z.number()])
    .transform(val => typeof val === 'string' ? parseFloat(val) : val)
    .pipe(z.number().min(0).max(9999999))
    .optional()
    .nullable(),
  response_notes: z.string().max(1000).optional().nullable(),
})

// === Order (Pedido de Compra) ===
const orderItemSchema = z.object({
  product_id: z.string().optional(),
  product_name: z.string().min(1).max(200),
  product_line: z.string().max(100).optional(),
  package_kg: z.number().optional(),
  total_consumption_kg: z.number().optional(),
  total_bags: z.number().int().min(0),
  herds: z.array(z.object({
    name: z.string(),
    head_count: z.number(),
    consumption_kg: z.number(),
  })).optional(),
})

export const orderSchema = z.object({
  items: z.array(orderItemSchema).min(1, 'Informe pelo menos 1 item'),
})

// === Simulate (Simulação Financeira) ===
const customCostsSchema = z.object({
  pasto: z.number().min(0).max(999).optional(),
  mao_obra: z.number().min(0).max(999).optional(),
  sanidade: z.number().min(0).max(999).optional(),
  outros: z.number().min(0).max(999).optional(),
})

export const simulateSchema = z.object({
  herd_id: z.string().uuid('ID do lote deve ser um UUID válido'),
  custom_arroba_price: z.number().positive().max(9999).optional().nullable(),
  custom_costs: customCostsSchema.optional().nullable(),
  custom_animal_price: z.number().positive().max(999999).optional().nullable(),
  cycle_months: z.number().int().min(1).max(60).optional().nullable(),
  mortality_rate: z.number().min(0).max(30).optional(), // % de mortalidade no ciclo
})

// === Compare (Comparar Produtos) ===
export const compareSchema = z.object({
  product_ids: z.array(z.string().uuid())
    .min(2, 'Selecione pelo menos 2 produtos')
    .max(5, 'Máximo de 5 produtos para comparar'),
  herd_id: z.string().uuid().optional().nullable(),
})

// === Cocho (Análise de Imagem) ===
export const cochoSchema = z.object({
  image_base64: z.string().min(100, 'Imagem inválida').max(10_000_000, 'Imagem muito grande (máximo ~7MB)'),
  herd_id: z.string().uuid().optional().nullable(),
})

// === Recommend (Recomendação) ===
export const recommendSchema = z.object({
  herd_id: z.string().uuid('ID do lote deve ser um UUID válido'),
})

// === Chat ===
const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(2000, 'Mensagem deve ter no máximo 2000 caracteres'),
})

export const chatSchema = z.object({
  messages: z.array(chatMessageSchema)
    .min(1, 'Envie pelo menos 1 mensagem')
    .max(50, 'Máximo de 50 mensagens por conversa'),
  herd_context: z.string().max(500).optional().nullable(),
})

// === Stocking Rate (Taxa de Lotação) ===
export const stockingRateSchema = z.object({
  area_ha: z.number().positive('Área deve ser positiva').max(999999),
  forage_type: z.string().max(100).optional().nullable(),
  pasture_condition: z.enum(['bom', 'regular', 'degradado']).optional().nullable(),
  head_count: z.number().int().min(0).max(999999).optional(),
  avg_weight_kg: z.number().positive().max(2000).optional(),
  herd_id: z.string().uuid().optional().nullable(),
})

// === Climate Predict (Previsão Climática) ===
const climateHistoryEntrySchema = z.object({
  month: z.string(),
  rain_mm: z.number(),
  ndvi: z.number(),
  ms_kg_ha: z.number(),
  pb_percent: z.number(),
  capacity_cab_ha: z.number(),
})

export const climatePredictSchema = z.object({
  history_data: z.object({
    total_area: z.number().positive(),
    total_heads: z.number().int().min(0),
    avg_weight: z.number().positive(),
    current_load: z.number().min(0),
    current_capacity: z.number().min(0),
    current_ndvi: z.number().min(0).max(1),
    current_ms: z.number().min(0),
    current_pb: z.number().min(0).max(100),
    overloaded: z.boolean(),
    history: z.array(climateHistoryEntrySchema).min(1),
  }),
})
