import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

// Badges do sistema
const BADGE_DEFINITIONS = [
  { id: 'first_lot', icon: '🐂', name: 'Primeiro Lote', description: 'Cadastrou o primeiro lote', condition: (stats: any) => stats.total_herds >= 1 },
  { id: 'five_lots', icon: '🏆', name: 'Pecuarista Dedicado', description: 'Cadastrou 5 lotes', condition: (stats: any) => stats.total_herds >= 5 },
  { id: 'first_rec', icon: '🧠', name: 'Amigo da IA', description: 'Gerou primeira recomendação', condition: (stats: any) => stats.total_consultations >= 1 },
  { id: 'ten_recs', icon: '⚡', name: 'Mestre do Radar', description: '10 recomendações geradas', condition: (stats: any) => stats.total_consultations >= 10 },
  { id: 'first_weigh', icon: '⚖️', name: 'Na Balança', description: 'Registrou primeira pesagem', condition: (stats: any) => stats.total_weighings >= 1 },
  { id: 'gmd_champion', icon: '🥇', name: 'Campeão do GMD', description: 'GMD acima de 1kg/dia em algum lote', condition: (stats: any) => stats.best_gmd >= 1.0 },
  { id: 'hundred_heads', icon: '🐄', name: 'Centenário', description: '100+ cabeças no rebanho', condition: (stats: any) => stats.total_heads >= 100 },
  { id: 'five_hundred', icon: '👑', name: 'Rei do Rebanho', description: '500+ cabeças', condition: (stats: any) => stats.total_heads >= 500 },
  { id: 'profit_positive', icon: '💰', name: 'No Lucro', description: 'Simulou e está com ROI positivo', condition: (stats: any) => stats.best_roi > 0 },
  { id: 'profit_king', icon: '💎', name: 'Arroba de Ouro', description: 'ROI acima de 20%', condition: (stats: any) => stats.best_roi >= 20 },
  { id: 'chat_user', icon: '💬', name: 'Perguntador', description: 'Usou o chat com Radar IA', condition: (stats: any) => stats.chat_used },
  { id: 'marketplace', icon: '🛒', name: 'Conectado', description: 'Fez cotação no Marketplace', condition: (stats: any) => stats.total_quotes >= 1 },
  { id: 'complete_profile', icon: '✅', name: 'Perfil Completo', description: 'Todos os lotes com 100% de perfil', condition: (stats: any) => stats.all_profiles_complete },
  { id: 'climate_watcher', icon: '🌡️', name: 'De Olho no Tempo', description: 'Consultou previsão climática', condition: (stats: any) => stats.climate_checked },
  { id: 'feedback_giver', icon: '👍', name: 'Opinião que Vale', description: 'Deu feedback em recomendação', condition: (stats: any) => stats.total_feedbacks >= 1 },
]

// Ranking simulado regional (dados anonimizados)
const REGIONAL_RANKING = [
  { rank: 1, name: 'Fazenda ***ra', city: 'Tangará da Serra', score: 950, gmd: 1.45, cost_arroba: 195, badges: 12 },
  { rank: 2, name: 'Fazenda ***ol', city: 'Diamantino', score: 880, gmd: 1.32, cost_arroba: 210, badges: 10 },
  { rank: 3, name: 'Fazenda ***to', city: 'Nova Mutum', score: 820, gmd: 1.18, cost_arroba: 225, badges: 9 },
  { rank: 4, name: 'Fazenda ***na', city: 'Campo Novo', score: 780, gmd: 1.05, cost_arroba: 240, badges: 8 },
  { rank: 5, name: 'Fazenda ***es', city: 'Sorriso', score: 740, gmd: 0.95, cost_arroba: 255, badges: 7 },
  { rank: 6, name: 'Fazenda ***ao', city: 'Sinop', score: 700, gmd: 0.88, cost_arroba: 268, badges: 6 },
  { rank: 7, name: 'Fazenda ***ta', city: 'Cuiabá', score: 660, gmd: 0.82, cost_arroba: 280, badges: 5 },
  { rank: 8, name: 'Fazenda ***io', city: 'Rondonópolis', score: 620, gmd: 0.75, cost_arroba: 295, badges: 4 },
  { rank: 9, name: 'Fazenda ***us', city: 'Arenápolis', score: 580, gmd: 0.70, cost_arroba: 310, badges: 3 },
  { rank: 10, name: 'Fazenda ***er', city: 'Lucas do Rio Verde', score: 540, gmd: 0.65, cost_arroba: 320, badges: 2 },
]

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    // Buscar dados do produtor
    const { data: farms } = await supabase.from('farms').select('id, name, city').eq('user_id', user.id)
    const farm = farms?.[0]

    const { data: herds } = await supabase.from('herds')
      .select('id, head_count, profile_completeness, avg_weight_kg')
      .eq('farm_id', farm?.id || '')

    const { data: consultations } = await supabase.from('consultations')
      .select('id').eq('user_id', user.id)

    const { data: feedbacks } = await supabase.from('recommendation_feedback')
      .select('id').eq('user_id', user.id)

    const { data: weighings } = await supabase.from('herd_history')
      .select('details')
      .in('herd_id', (herds || []).map(h => h.id))
      .eq('event_type', 'pesagem')

    const { data: simulations } = await supabase.from('simulations')
      .select('result').eq('user_id', user.id)

    const { data: quotes } = await supabase.from('quotes')
      .select('id').eq('producer_id', user.id)

    // Calcular stats
    const totalHerds = herds?.length || 0
    const totalHeads = herds?.reduce((s: number, h: any) => s + (h.head_count || 0), 0) || 0
    const totalConsultations = consultations?.length || 0
    const totalFeedbacks = feedbacks?.length || 0
    const totalWeighings = weighings?.length || 0
    const totalQuotes = quotes?.length || 0
    const allProfilesComplete = herds ? herds.every((h: any) => h.profile_completeness >= 100) && herds.length > 0 : false

    // Melhor GMD real
    let bestGMD = 0
    if (weighings) {
      weighings.forEach((w: any) => {
        const gmd = (w.details as any)?.gmd_real || 0
        if (gmd > bestGMD) bestGMD = gmd
      })
    }

    // Melhor ROI
    let bestROI = -999
    if (simulations) {
      simulations.forEach((s: any) => {
        const roi = s.result?.total_roi || s.result?.roi || 0
        if (roi > bestROI) bestROI = roi
      })
    }
    if (bestROI === -999) bestROI = 0

    const stats = {
      total_herds: totalHerds,
      total_heads: totalHeads,
      total_consultations: totalConsultations,
      total_feedbacks: totalFeedbacks,
      total_weighings: totalWeighings,
      total_quotes: totalQuotes,
      best_gmd: bestGMD,
      best_roi: bestROI,
      all_profiles_complete: allProfilesComplete,
      chat_used: totalConsultations > 0,
      climate_checked: true,
    }

    // Calcular badges
    const earnedBadges = BADGE_DEFINITIONS.filter(b => b.condition(stats)).map(b => ({
      id: b.id, icon: b.icon, name: b.name, description: b.description, earned: true,
    }))
    const lockedBadges = BADGE_DEFINITIONS.filter(b => !b.condition(stats)).map(b => ({
      id: b.id, icon: '🔒', name: b.name, description: b.description, earned: false,
    }))

    // Score do produtor
    let score = 0
    score += totalHerds * 50
    score += totalHeads * 2
    score += totalConsultations * 30
    score += totalWeighings * 40
    score += totalFeedbacks * 20
    score += totalQuotes * 25
    score += earnedBadges.length * 50
    score += allProfilesComplete ? 100 : 0
    if (bestGMD >= 1.0) score += 200
    if (bestROI >= 20) score += 150

    // Posição no ranking regional
    const ranking = [...REGIONAL_RANKING]
    const myEntry = {
      rank: 0,
      name: farm?.name ? farm.name.substring(0, 3) + '***' + farm.name.slice(-2) : 'Você',
      city: farm?.city || 'MT',
      score,
      gmd: bestGMD || 0.50,
      cost_arroba: bestROI > 0 ? Math.round(320 - bestROI * 2) : 300,
      badges: earnedBadges.length,
      isMe: true,
    }

    // Inserir na posição correta
    let inserted = false
    for (let i = 0; i < ranking.length; i++) {
      if (score > ranking[i].score) {
        ranking.splice(i, 0, myEntry)
        inserted = true
        break
      }
    }
    if (!inserted) ranking.push(myEntry)

    // Recalcular ranks
    ranking.forEach((r, i) => { r.rank = i + 1 })
    const myRank = ranking.findIndex(r => (r as any).isMe) + 1
    const percentile = Math.round((1 - myRank / ranking.length) * 100)

    // Notificações de ranking (9f)
    const notifications: string[] = []

    // Buscar posição anterior salva
    const { data: prevRanking } = await supabase
      .from('ranking_history')
      .select('rank, percentile, score, badges_count')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)

    const prev = prevRanking?.[0]

    if (prev) {
      if (myRank < prev.rank) {
        notifications.push(`Você subiu ${prev.rank - myRank} posição${prev.rank - myRank > 1 ? 'ões' : ''} no ranking! Agora está em ${myRank}º lugar.`)
      }
      if (percentile > prev.percentile && percentile >= 80) {
        notifications.push(`Parabéns! Você entrou pro Top ${100 - percentile}% dos produtores!`)
      }
      if (earnedBadges.length > prev.badges_count) {
        const newBadges = earnedBadges.length - prev.badges_count
        const latestBadge = earnedBadges[earnedBadges.length - 1]
        notifications.push(`Nova conquista desbloqueada: ${latestBadge.icon} ${latestBadge.name}!`)
      }
      if (score > prev.score * 1.2) {
        notifications.push('Seu score cresceu mais de 20%! Continue assim!')
      }
    } else if (earnedBadges.length > 0) {
      notifications.push(`Bem-vindo ao ranking! Você já tem ${earnedBadges.length} conquista${earnedBadges.length > 1 ? 's' : ''}!`)
    }

    // Salvar posição atual para comparação futura
    await supabase.from('ranking_history').upsert({
      user_id: user.id,
      rank: myRank,
      percentile,
      score,
      badges_count: earnedBadges.length,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' }).select()

    return NextResponse.json({
      score,
      rank: myRank,
      total_players: ranking.length,
      percentile,
      stats,
      badges: { earned: earnedBadges, locked: lockedBadges },
      ranking: ranking.slice(0, 10),
      farm_name: farm?.name || '',
      notifications,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
