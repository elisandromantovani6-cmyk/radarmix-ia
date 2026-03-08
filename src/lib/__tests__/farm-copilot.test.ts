import { generateDailyBriefing, getTipOfDay } from '../farm-copilot'
import type { BriefingInput, ClimateInput, FinancialInput, HerdInput } from '../farm-copilot'

// Dados base para os testes
const baseHerd: HerdInput = {
  name: 'Lote Nelore',
  phase: 'engorda',
  head_count: 100,
  avg_weight_kg: 400,
  current_product: 'Radarmix RK',
  days_since_weighing: 20,
  days_since_vaccination: 60,
  profile_completeness: 100,
}

const baseClimate: ClimateInput = {
  temp: 28,
  humidity: 60,
  itu: 70,
  itu_level: 'normal',
  season: 'aguas',
  rain_forecast: false,
  stress_days: 0,
}

const baseFinancial: FinancialInput = {
  best_roi: 15.5,
  worst_cost_category: null,
  waste_detected: false,
}

function makeInput(overrides?: Partial<BriefingInput>): BriefingInput {
  return {
    farmer_name: 'Elisandro',
    herds: [{ ...baseHerd }],
    climate: { ...baseClimate },
    financial: { ...baseFinancial },
    ...overrides,
  }
}

describe('farm-copilot', () => {
  describe('generateDailyBriefing', () => {
    it('gera acao climatica quando ITU esta alto (>=79)', () => {
      const input = makeInput({
        climate: { ...baseClimate, itu: 82, itu_level: 'danger' },
      })
      const briefing = generateDailyBriefing(input)
      const climateAction = briefing.actions.find(
        a => a.category === 'clima' && a.title.includes('ITU 82')
      )
      expect(climateAction).toBeDefined()
      expect(climateAction!.priority).toBe(1)
    })

    it('gera acao de vacinacao quando mais de 180 dias sem vacinar', () => {
      const input = makeInput({
        herds: [{ ...baseHerd, days_since_vaccination: 200 }],
      })
      const briefing = generateDailyBriefing(input)
      const vacAction = briefing.actions.find(
        a => a.category === 'sanitario' && a.title.includes('Vacinar')
      )
      expect(vacAction).toBeDefined()
      expect(vacAction!.priority).toBe(1)
      expect(vacAction!.herd_name).toBe('Lote Nelore')
    })

    it('gera acao de programar vacinacao entre 120-180 dias', () => {
      const input = makeInput({
        herds: [{ ...baseHerd, days_since_vaccination: 150 }],
      })
      const briefing = generateDailyBriefing(input)
      const vacAction = briefing.actions.find(
        a => a.category === 'sanitario' && a.title.includes('Programar vacinacao')
      )
      expect(vacAction).toBeDefined()
      expect(vacAction!.priority).toBe(2)
    })

    it('gera acao de pesagem quando mais de 35 dias sem pesar', () => {
      const input = makeInput({
        herds: [{ ...baseHerd, days_since_weighing: 45 }],
      })
      const briefing = generateDailyBriefing(input)
      const weighAction = briefing.actions.find(
        a => a.category === 'manejo' && a.title.includes('Pesar')
      )
      expect(weighAction).toBeDefined()
      expect(weighAction!.priority).toBe(2)
    })

    it('ordena acoes por prioridade (urgente primeiro)', () => {
      const input = makeInput({
        climate: { ...baseClimate, itu: 82, itu_level: 'danger' },
        herds: [
          { ...baseHerd, days_since_weighing: 50, profile_completeness: 50 },
        ],
      })
      const briefing = generateDailyBriefing(input)
      // Verifica que as acoes estao ordenadas
      for (let i = 1; i < briefing.actions.length; i++) {
        expect(briefing.actions[i].priority).toBeGreaterThanOrEqual(
          briefing.actions[i - 1].priority
        )
      }
    })

    it('inclui nome do produtor na saudacao', () => {
      const input = makeInput({ farmer_name: 'Elisandro' })
      const briefing = generateDailyBriefing(input)
      expect(briefing.greeting).toContain('Elisandro')
    })

    it('gera briefing mesmo sem lotes (lista vazia)', () => {
      const input = makeInput({ herds: [] })
      const briefing = generateDailyBriefing(input)
      expect(briefing).toBeDefined()
      expect(briefing.greeting).toContain('Elisandro')
      expect(briefing.date).toBeDefined()
      expect(Array.isArray(briefing.actions)).toBe(true)
    })

    it('gera acao de desperdicio quando waste_detected = true', () => {
      const input = makeInput({
        financial: { ...baseFinancial, waste_detected: true },
      })
      const briefing = generateDailyBriefing(input)
      const wasteAction = briefing.actions.find(
        a => a.category === 'financeiro' && a.title.includes('Desperdicio')
      )
      expect(wasteAction).toBeDefined()
      expect(wasteAction!.priority).toBe(1)
    })

    it('gera acao quando lote esta sem suplemento definido', () => {
      const input = makeInput({
        herds: [{ ...baseHerd, current_product: null }],
      })
      const briefing = generateDailyBriefing(input)
      const nutAction = briefing.actions.find(
        a => a.category === 'nutricao' && a.title.includes('sem suplemento')
      )
      expect(nutAction).toBeDefined()
      expect(nutAction!.priority).toBe(1)
    })

    it('gera acao de chuva prevista', () => {
      const input = makeInput({
        climate: { ...baseClimate, rain_forecast: true },
      })
      const briefing = generateDailyBriefing(input)
      const rainAction = briefing.actions.find(
        a => a.title.includes('Chuva prevista')
      )
      expect(rainAction).toBeDefined()
    })

    it('gera acao de perfil incompleto quando completeness < 80', () => {
      const input = makeInput({
        herds: [{ ...baseHerd, profile_completeness: 60 }],
      })
      const briefing = generateDailyBriefing(input)
      const profileAction = briefing.actions.find(
        a => a.title.includes('Complete perfil')
      )
      expect(profileAction).toBeDefined()
      expect(profileAction!.priority).toBe(3)
    })

    it('limita acoes a no maximo 5', () => {
      // Criar cenario com muitas acoes possiveis
      const input = makeInput({
        climate: { ...baseClimate, itu: 85, itu_level: 'danger', rain_forecast: true, stress_days: 4 },
        herds: [
          { ...baseHerd, current_product: null, days_since_weighing: 50, days_since_vaccination: 200, profile_completeness: 40 },
          { ...baseHerd, name: 'Lote 2', current_product: null, days_since_weighing: 50, days_since_vaccination: 200, profile_completeness: 30 },
        ],
        financial: { ...baseFinancial, waste_detected: true, worst_cost_category: 'suplemento' },
      })
      const briefing = generateDailyBriefing(input)
      expect(briefing.actions.length).toBeLessThanOrEqual(5)
    })

    it('gera resumo climatico quando dados disponiveis', () => {
      const input = makeInput()
      const briefing = generateDailyBriefing(input)
      expect(briefing.weather_summary).toContain('28')
      expect(briefing.weather_summary).toContain('ITU 70')
    })

    it('gera resumo climatico de fallback quando sem dados', () => {
      const input = makeInput({ climate: null })
      const briefing = generateDailyBriefing(input)
      expect(briefing.weather_summary).toContain('indisponiveis')
    })

    it('gera resumo financeiro com ROI', () => {
      const input = makeInput()
      const briefing = generateDailyBriefing(input)
      expect(briefing.financial_summary).toContain('15.5%')
    })

    it('gera dica sazonal para periodo seco', () => {
      const input = makeInput({
        climate: { ...baseClimate, season: 'seca' },
      })
      const briefing = generateDailyBriefing(input)
      const seasonAction = briefing.actions.find(
        a => a.title.includes('seco') || a.title.includes('seca')
      )
      expect(seasonAction).toBeDefined()
    })
  })

  describe('getTipOfDay', () => {
    it('retorna uma dica valida (string nao vazia)', () => {
      const tip = getTipOfDay()
      expect(typeof tip).toBe('string')
      expect(tip.length).toBeGreaterThan(0)
    })

    it('retorna dicas diferentes para datas diferentes', () => {
      const tip1 = getTipOfDay(new Date(2026, 0, 1))  // 1 janeiro
      const tip2 = getTipOfDay(new Date(2026, 0, 2))  // 2 janeiro
      expect(tip1).not.toBe(tip2)
    })

    it('rotaciona de volta ao inicio apos completar o ciclo', () => {
      // Dia 1 e dia 1 + 20 (numero de dicas) devem dar a mesma dica
      const tip1 = getTipOfDay(new Date(2026, 0, 1))
      const tip2 = getTipOfDay(new Date(2026, 0, 21)) // 20 dias depois
      expect(tip1).toBe(tip2)
    })
  })
})
