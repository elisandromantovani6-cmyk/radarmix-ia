import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import LogoutButton from './logout-button'
import FarmSection from './farm-section'
import ClimateWidget from './climate-widget'
import CopilotPanel from './copilot-panel'
import PriceRadarPanel from './price-radar-panel'
import PastureScorePanel from './pasture-score-panel'
import InstallPrompt from './install-prompt'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: farms } = await supabase.from('farms').select('*').eq('user_id', user.id)
  const farm = farms && farms.length > 0 ? farms[0] : null
  let herds: any[] = []
  if (farm) {
    const { data } = await supabase.from('herds')
      .select('*, forage:forages(id, name, category), breed:breeds(id, name, category), product:products(id, name, line)')
      .eq('farm_id', farm.id).order('created_at', { ascending: false })
    herds = data || []
  }
  const totalHeads = herds.reduce((sum: number, h: any) => sum + (h.head_count || 0), 0)

  return (
    <div className="min-h-screen bg-[#050506] text-zinc-100 relative pb-20 sm:pb-0">
      {/* Header - clean for mobile */}
      <header className="border-b border-white/[0.04] bg-[#050506]/80 backdrop-blur-2xl sticky top-0 z-50 safe-top">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo-radarmix.jpg" alt="Radarmix" className="w-9 h-9 rounded-lg object-contain" />
            <h1 className="text-[17px] font-extrabold tracking-tight">RADAR<span className="text-gradient">MIX</span> <span className="text-orange-500/80 text-[11px] font-semibold ml-0.5">IA</span></h1>
          </div>
          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-4">
            <div className="h-4 w-px bg-zinc-800"></div>
            <Link href="/chat" className="flex items-center gap-1.5 text-[13px] text-zinc-400 hover:text-orange-400 transition-colors font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 pulse-dot"></span>Radar IA Chat
            </Link>
            <Link href="/marketplace" className="text-[13px] text-zinc-400 hover:text-orange-400 transition-colors font-medium">🛒 Connect</Link>
            <Link href="/ranking" className="text-[13px] text-zinc-400 hover:text-orange-400 transition-colors font-medium">🏆 Ranking</Link>
            <Link href="/checklist" className="text-[13px] text-zinc-400 hover:text-orange-400 transition-colors font-medium">📋 Checklist</Link>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-zinc-500 hidden sm:block mono truncate max-w-[140px]">{user.email}</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 relative z-10">
        <InstallPrompt />
        {farm && <CopilotPanel />}
        {farm && <ClimateWidget />}
        {farm && <PriceRadarPanel />}
        {farm && <PastureScorePanel />}
        <FarmSection farm={farm} herds={herds} totalHeads={totalHeads} userId={user.id} />
      </main>

      {/* Bottom Navigation - mobile only */}
      <nav className="bottom-nav sm:hidden safe-bottom">
        <div className="grid grid-cols-5 max-w-lg mx-auto">
          <Link href="/dashboard" className="bottom-nav-item active" aria-label="Início - Dashboard">
            <span className="nav-icon">🏠</span>
            <span>Início</span>
          </Link>
          <Link href="/chat" className="bottom-nav-item" aria-label="Chat com IA">
            <span className="nav-icon">💬</span>
            <span>Chat IA</span>
          </Link>
          <Link href="/marketplace" className="bottom-nav-item" aria-label="Marketplace Connect">
            <span className="nav-icon">🛒</span>
            <span>Connect</span>
          </Link>
          <Link href="/ranking" className="bottom-nav-item" aria-label="Ranking de fazendas">
            <span className="nav-icon">🏆</span>
            <span>Ranking</span>
          </Link>
          <Link href="/checklist" className="bottom-nav-item" aria-label="Checklist do projeto">
            <span className="nav-icon">📋</span>
            <span>Checklist</span>
          </Link>
        </div>
      </nav>
    </div>
  )
}
