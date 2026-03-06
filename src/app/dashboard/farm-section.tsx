'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import HerdCard from './herd-card'
import CreateHerdModal from './create-herd-modal'
import OrderSection from './order-section'
import InventoryPanel from './inventory-panel'
import OfflineIndicator from './offline-indicator'

export default function FarmSection({ farm, herds, totalHeads, userId }: any) {
  const [showCreateFarm, setShowCreateFarm] = useState(false)
  const [showCreateHerd, setShowCreateHerd] = useState(false)
  const [farmName, setFarmName] = useState('')
  const [farmCity, setFarmCity] = useState('')
  const [farmArea, setFarmArea] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient(); const router = useRouter()

  const handleCreateFarm = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true)
    const { error } = await supabase.from('farms').insert({ user_id: userId, name: farmName, city: farmCity || null, state: 'MT', total_area_ha: farmArea ? parseFloat(farmArea) : null })
    if (!error) { router.refresh(); setShowCreateFarm(false) }; setLoading(false)
  }

  if (!farm) {
    return (
      <div>
        <div className="card-accent rounded-2xl p-8 sm:p-12 text-center animate-in">
          <div className="text-[56px] mb-6">🏡</div>
          <h2 className="text-[24px] font-bold text-white mb-3">Cadastre sua fazenda</h2>
          <p className="text-zinc-500 mb-8 text-[14px]">Para começar, registre os dados da sua propriedade.</p>
          <button onClick={() => setShowCreateFarm(true)} className="btn-primary px-8 py-3.5 text-[14px]">Cadastrar Fazenda</button>
        </div>
        {showCreateFarm && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center z-50 px-0 sm:px-4 modal-sheet">
            <div className="card p-6 sm:p-7 w-full max-w-md animate-in rounded-t-3xl sm:rounded-2xl">
              <div className="pull-indicator sm:hidden"></div>
              <h3 className="text-[18px] font-bold text-white mb-5">Nova Fazenda</h3>
              <form onSubmit={handleCreateFarm} className="space-y-4">
                <div><label className="block text-[11px] font-semibold text-zinc-500 mb-2 uppercase tracking-[0.1em]">Nome *</label><input value={farmName} onChange={(e) => setFarmName(e.target.value)} placeholder="Ex: Fazenda Boa Esperança" required className="input-field w-full px-4 py-3 text-[14px]" /></div>
                <div><label className="block text-[11px] font-semibold text-zinc-500 mb-2 uppercase tracking-[0.1em]">Cidade</label><input value={farmCity} onChange={(e) => setFarmCity(e.target.value)} placeholder="Ex: Tangará da Serra" className="input-field w-full px-4 py-3 text-[14px]" /></div>
                <div><label className="block text-[11px] font-semibold text-zinc-500 mb-2 uppercase tracking-[0.1em]">Área (ha)</label><input type="number" value={farmArea} onChange={(e) => setFarmArea(e.target.value)} placeholder="Ex: 500" className="input-field w-full px-4 py-3 text-[14px]" /></div>
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setShowCreateFarm(false)} className="btn-ghost flex-1 py-3 text-[13px] font-semibold">Cancelar</button>
                  <button type="submit" disabled={loading} className="btn-primary flex-1 py-3 text-[13px] disabled:opacity-50">{loading ? 'Salvando...' : 'Salvar'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <OfflineIndicator />
      {/* Farm header */}
      <div className="card p-4 sm:p-5 mb-4 sm:mb-6 animate-in">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-[16px] sm:text-[18px] font-bold text-white truncate">{farm.name}</h2>
            <p className="text-[12px] sm:text-[13px] text-zinc-500 mt-0.5 truncate">{farm.city ? farm.city + ' — ' : ''}MT{farm.total_area_ha ? ' · ' + farm.total_area_ha + ' ha' : ''}</p>
          </div>
          <div className="flex items-center gap-4 sm:gap-6 shrink-0">
            <div className="text-right">
              <p className="text-[22px] sm:text-[28px] font-black text-gradient leading-none">{herds.length}</p>
              <p className="text-[10px] sm:text-[11px] text-zinc-600 mt-1 uppercase tracking-wider font-medium">lotes</p>
            </div>
            <div className="h-6 sm:h-8 w-px bg-zinc-800/50"></div>
            <div className="text-right">
              <p className="text-[22px] sm:text-[28px] font-black text-white leading-none">{totalHeads}</p>
              <p className="text-[10px] sm:text-[11px] text-zinc-600 mt-1 uppercase tracking-wider font-medium">cabeças</p>
            </div>
          </div>
        </div>
      </div>

      {/* Lotes header */}
      <div className="flex items-center justify-between mb-3 sm:mb-4 animate-in delay-1">
        <h3 className="text-[13px] sm:text-[14px] font-bold text-zinc-400 uppercase tracking-[0.08em]">Seus Lotes</h3>
        <button onClick={() => setShowCreateHerd(true)} className="btn-primary px-4 py-2 text-[12px]">+ Novo Lote</button>
      </div>

      {herds.length === 0 ? (
        <div className="card border-dashed p-6 sm:p-10 text-center animate-in delay-2">
          <div className="text-[40px] mb-4">🐂</div>
          <p className="text-zinc-500 mb-5 text-[14px]">Nenhum lote cadastrado ainda.</p>
          <button onClick={() => setShowCreateHerd(true)} className="btn-primary px-5 py-2.5 text-[13px]">Criar primeiro lote</button>
        </div>
      ) : (
        <div className="space-y-3">
          {herds.map((herd: any, i: number) => (
            <div key={herd.id} className={"animate-in delay-" + Math.min(i + 2, 5)}>
              <HerdCard herd={herd} allHerds={herds} />
            </div>
          ))}
        </div>
      )}

      {herds.length > 0 && <div className="animate-in delay-4"><InventoryPanel farmId={farm.id} /></div>}
      {herds.length > 0 && <div className="animate-in delay-5"><OrderSection /></div>}
      {showCreateHerd && <CreateHerdModal farmId={farm.id} onClose={() => setShowCreateHerd(false)} />}
    </div>
  )
}

