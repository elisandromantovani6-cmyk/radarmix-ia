import { createServerSupabaseClient } from '@/lib/supabase-server'
import { predictThermalStress } from '@/lib/thermal-stress'
import { NextRequest, NextResponse } from 'next/server'

const OPENWEATHER_KEY = process.env.OPENWEATHER_API_KEY

// Coordenadas padrão por cidade do MT
const CITY_COORDS: Record<string, { lat: number, lon: number }> = {
  'tangara da serra': { lat: -14.6229, lon: -57.4983 },
  'cuiaba': { lat: -15.6014, lon: -56.0979 },
  'rondonopolis': { lat: -16.4673, lon: -54.6372 },
  'sinop': { lat: -11.8608, lon: -55.5094 },
  'sorriso': { lat: -12.5425, lon: -55.7114 },
  'lucas do rio verde': { lat: -13.0498, lon: -55.9040 },
  'nova mutum': { lat: -13.8344, lon: -56.0800 },
  'campo novo do parecis': { lat: -13.6584, lon: -57.8892 },
  'barra do garcas': { lat: -15.8897, lon: -52.2567 },
  'arenapolis': { lat: -14.4458, lon: -56.8434 },
  'diamantino': { lat: -14.4086, lon: -56.4461 },
  'primavera do leste': { lat: -15.5600, lon: -54.2961 },
  'alta floresta': { lat: -9.8756, lon: -56.0861 },
  'canarana': { lat: -13.5516, lon: -52.2706 },
  'nova olimpia': { lat: -14.7919, lon: -57.2883 },
}

function calculateITU(temp: number, humidity: number): number {
  // ITU = 0.8 × T + (UR/100) × (T - 14.4) + 46.4
  // Referência: Thom (1959), adaptado por Hahn (1999) para bovinos
  return 0.8 * temp + (humidity / 100) * (temp - 14.4) + 46.4
}

function getITULevel(itu: number): { level: string, label: string, color: string, icon: string, impact: string } {
  if (itu < 72) return { level: 'normal', label: 'Conforto térmico', color: 'green', icon: '🟢', impact: 'Sem estresse. Animais em condição ideal de produção.' }
  if (itu < 79) return { level: 'alert', label: 'Alerta', color: 'yellow', icon: '🟡', impact: 'Estresse leve. Redução de 3-5% no consumo. Garanta sombra e água fresca.' }
  if (itu < 89) return { level: 'danger', label: 'Perigo', color: 'orange', icon: '🟠', impact: 'Estresse moderado. Redução de 5-15% no consumo e queda no GMD. Evite manejo nas horas quentes.' }
  return { level: 'emergency', label: 'Emergência', color: 'red', icon: '🔴', impact: 'Estresse severo. Risco de morte. Pare todo manejo, forneça sombra, ventilação e água à vontade.' }
}

function getSeason(month: number): { name: string, label: string } {
  if (month >= 5 && month <= 9) return { name: 'seca', label: 'Período Seco' }
  if (month >= 10 || month <= 4) return { name: 'aguas', label: 'Período das Águas' }
  return { name: 'transicao', label: 'Transição' }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
// Dados temporários enquanto API key não ativa
    const USE_MOCK = false
    if (USE_MOCK) {
      const month = new Date().getMonth() + 1
      const season = (month >= 5 && month <= 9) ? { name: 'seca', label: 'Período Seco' } : { name: 'aguas', label: 'Período das Águas' }
      return NextResponse.json({
        city: 'Tangará da Serra',
        current: { temp: 31, feels_like: 34, humidity: 72, description: 'nublado', wind_speed: 2.1, clouds: 65, rain: 0 },
        itu: { value: 78, level: 'alert', label: 'Alerta', color: 'yellow', icon: '🟡', impact: 'Estresse leve. Redução de 3-5% no consumo. Garanta sombra e água fresca.' },
        season,
        forecast: [
          { date: '2026-03-06', day_label: 'sex. 6', temp: 32, humidity: 70, itu: 79, itu_level: 'alert', itu_icon: '🟡', rain: 0, description: 'parcialmente nublado' },
          { date: '2026-03-07', day_label: 'sáb. 7', temp: 29, humidity: 85, itu: 76, itu_level: 'alert', itu_icon: '🟡', rain: 12, description: 'chuva moderada' },
          { date: '2026-03-08', day_label: 'dom. 8', temp: 27, humidity: 90, itu: 74, itu_level: 'alert', itu_icon: '🟡', rain: 25, description: 'chuva forte' },
          { date: '2026-03-09', day_label: 'seg. 9', temp: 30, humidity: 75, itu: 77, itu_level: 'alert', itu_icon: '🟡', rain: 0, description: 'nublado' },
          { date: '2026-03-10', day_label: 'ter. 10', temp: 33, humidity: 65, itu: 79, itu_level: 'alert', itu_icon: '🟡', rain: 0, description: 'ensolarado' },
        ],
        alerts: [
          '🌡️ Atenção: ITU 78 — animais podem reduzir consumo. Aumente disponibilidade de água.',
          '🌧️ Chuva prevista para sáb. 7, dom. 8 — planeje manejo e pesagens para dias secos.',
        ],
        diet_suggestion: 'Período das águas com boa forragem. Suplementação mineral garante que os animais aproveitem ao máximo o capim verde. Foque em fósforo e microelementos.',
      })
    }
    if (!OPENWEATHER_KEY) {
      return NextResponse.json({ error: 'API key de clima não configurada' }, { status: 500 })
    }

    // Buscar cidade da fazenda
    const { data: farms } = await supabase
      .from('farms')
      .select('city, latitude, longitude')
      .eq('user_id', user.id)

    let lat = -14.6229 // Tangará da Serra padrão
    let lon = -57.4983
    let cityName = 'Tangará da Serra'

    if (farms && farms.length > 0) {
      const farm = farms[0]
      if (farm.latitude && farm.longitude) {
        lat = farm.latitude
        lon = farm.longitude
      } else if (farm.city) {
        cityName = farm.city
        const normalized = farm.city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        const coords = CITY_COORDS[normalized]
        if (coords) { lat = coords.lat; lon = coords.lon }
      }
    }

    // Buscar clima atual
    const currentRes = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=pt_br&appid=${OPENWEATHER_KEY}`
    )
    const currentData = await currentRes.json()

    // Buscar previsão 7 dias
    const forecastRes = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&lang=pt_br&appid=${OPENWEATHER_KEY}`
    )
    const forecastData = await forecastRes.json()

    if (!currentData.main) {
      return NextResponse.json({ error: 'Erro ao buscar dados de clima' }, { status: 500 })
    }

    // Dados atuais
    const temp = currentData.main.temp
    const humidity = currentData.main.humidity
    const feelsLike = currentData.main.feels_like
    const description = currentData.weather?.[0]?.description || ''
    const windSpeed = currentData.wind?.speed || 0
    const clouds = currentData.clouds?.all || 0
    const rain = currentData.rain?.['1h'] || 0

    // Calcular ITU
    const itu = calculateITU(temp, humidity)
    const ituLevel = getITULevel(itu)

    // Época do ano
    const month = new Date().getMonth() + 1
    const season = getSeason(month)

    // Processar previsão (próximos 5 dias, dados a cada 3h)
    const dailyForecast: any[] = []
    const processedDates = new Set<string>()

    if (forecastData.list) {
      for (const item of forecastData.list) {
        const date = item.dt_txt.split(' ')[0]
        if (processedDates.has(date) || processedDates.size >= 5) continue

        const fTemp = item.main.temp
        const fHumidity = item.main.humidity
        const fItu = calculateITU(fTemp, fHumidity)
        const fItuLevel = getITULevel(fItu)
        const fRain = item.rain?.['3h'] || 0
        const fDesc = item.weather?.[0]?.description || ''

        dailyForecast.push({
          date,
          day_label: new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' }),
          temp: Math.round(fTemp),
          humidity: fHumidity,
          itu: Math.round(fItu),
          itu_level: fItuLevel.level,
          itu_icon: fItuLevel.icon,
          rain: fRain,
          description: fDesc,
        })
        processedDates.add(date)
      }
    }

    // Previsão de estresse térmico por lote (breed_group)
    let breedGroup = 'zebuino' // default para MT
    const { data: herds } = await supabase
      .from('herds')
      .select('breed_id, farm:farms!inner(user_id)')
      .eq('farms.user_id', user.id)
      .limit(1)

    if (herds && herds.length > 0 && herds[0].breed_id) {
      const { data: breed } = await supabase
        .from('breeds')
        .select('name, category')
        .eq('id', herds[0].breed_id)
        .single()
      if (breed) {
        const name = (breed.name || '').toLowerCase()
        if (breed.category === 'leite' || ['girolando', 'jersey', 'gir leiteiro'].some(t => name.includes(t))) {
          breedGroup = 'leite'
        } else if (['angus', 'hereford', 'charolês', 'limousin', 'simental'].some(t => name.includes(t))) {
          breedGroup = 'taurino'
        } else if (name.includes('senepol')) {
          breedGroup = 'senepol'
        } else if (name.includes('f1') || name.includes('cruzamento') || name.includes('composto')) {
          breedGroup = 'cruzamento'
        } else {
          breedGroup = 'zebuino'
        }
      }
    }

    const forecastForStress = dailyForecast.map(d => ({
      date: d.date,
      day_label: d.day_label,
      temp: d.temp,
      humidity: d.humidity,
    }))

    const thermalStress = predictThermalStress(
      temp,
      humidity,
      forecastForStress,
      breedGroup,
    )

    // Alertas inteligentes
    const alerts: string[] = []

    if (itu >= 79) {
      alerts.push('⚠️ ESTRESSE TÉRMICO: ITU ' + Math.round(itu) + ' — evite manejo entre 10h e 16h. Forneça sombra e água fresca.')
    }
    if (itu >= 72 && itu < 79) {
      alerts.push('🌡️ Atenção: ITU ' + Math.round(itu) + ' — animais podem reduzir consumo. Aumente disponibilidade de água.')
    }

    // Verificar chuva na previsão
    const rainDays = dailyForecast.filter(d => d.rain > 0)
    if (rainDays.length > 0) {
      alerts.push('🌧️ Chuva prevista para ' + rainDays.map(d => d.day_label).join(', ') + ' — planeje manejo e pesagens para dias secos.')
    }

    // Alertas antecipados de estresse térmico (22d)
    for (const stressAlert of thermalStress.advance_alerts) {
      alerts.push('🔥 ' + stressAlert)
    }

    // Impacto no GMD (22b)
    if (thermalStress.current_stress.level !== 'normal') {
      alerts.push('📉 Estresse térmico atual → impacto de ' + thermalStress.current_stress.gmd_impact_kg.toFixed(2) + ' kg/dia no GMD (' + breedGroup + ')')
    }

    // Alerta de seca
    if (season.name === 'seca') {
      alerts.push('☀️ Período seco: qualidade da forragem em declínio. Considere suplementação proteica para manter o GMD.')
    }

    // Sugestão de dieta baseada no clima
    let dietSuggestion = ''
    if (itu >= 79) {
      dietSuggestion = 'Com ITU ' + Math.round(itu) + ', aumente a densidade energética da dieta em 10-15%. Animais comem menos quando estressados, então cada kg precisa render mais. Considere trocar para linha Prot.Energ ou RK.'
    } else if (season.name === 'seca') {
      dietSuggestion = 'No período seco, a forragem perde proteína e energia. Suplementação proteica (mínimo 40% PB) é essencial para manter a microbiota ruminal e o aproveitamento da fibra.'
    } else {
      dietSuggestion = 'Período das águas com boa forragem. Suplementação mineral garante que os animais aproveitem ao máximo o capim verde. Foque em fósforo e microelementos.'
    }

    // Cache no Supabase
    await supabase.from('climate_cache').upsert({
      city: cityName,
      date: new Date().toISOString().split('T')[0],
      temperature: temp,
      humidity: humidity,
      itu: Math.round(itu),
      precipitation: rain,
      season: season.name,
    }, { onConflict: 'city,date' }).select()

    return NextResponse.json({
      city: cityName,
      current: {
        temp: Math.round(temp),
        feels_like: Math.round(feelsLike),
        humidity,
        description,
        wind_speed: windSpeed,
        clouds,
        rain,
      },
      itu: {
        value: Math.round(itu),
        level: ituLevel.level,
        label: ituLevel.label,
        color: ituLevel.color,
        icon: ituLevel.icon,
        impact: ituLevel.impact,
      },
      season,
      forecast: dailyForecast,
      alerts,
      diet_suggestion: dietSuggestion,
      thermal_stress: {
        breed_group: thermalStress.breed_group,
        heat_tolerance: thermalStress.heat_tolerance,
        current_stress: thermalStress.current_stress,
        forecast: thermalStress.forecast,
        advance_alerts: thermalStress.advance_alerts,
        stress_days_count: thermalStress.stress_days_count,
        projected_gmd_loss_30d: thermalStress.projected_gmd_loss_30d,
        management_summary: thermalStress.management_summary,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

