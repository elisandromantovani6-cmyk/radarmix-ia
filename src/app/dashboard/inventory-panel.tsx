'use client'
import { useState, useEffect } from 'react'

export default function InventoryPanel({ farmId }: { farmId: string }) {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newItem, setNewItem] = useState({ product_name: '', quantity_kg: '', daily_consumption_kg: '', unit_price: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadItems()
  }, [])

  async function loadItems() {
    try {
      const res = await fetch('/api/inventory')
      const data = await res.json()
      if (data.items) setItems(data.items)
    } catch {
      // tabela pode não existir ainda
    } finally {
      setLoading(false)
    }
  }

  async function addItem() {
    if (!newItem.product_name || !newItem.quantity_kg) return
    setSaving(true)
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farm_id: farmId,
          product_name: newItem.product_name,
          quantity_kg: parseFloat(newItem.quantity_kg),
          daily_consumption_kg: parseFloat(newItem.daily_consumption_kg) || 0,
          unit_price: parseFloat(newItem.unit_price) || null,
        }),
      })
      const data = await res.json()
      if (data.item) {
        setItems(prev => [...prev, data.item])
        setNewItem({ product_name: '', quantity_kg: '', daily_consumption_kg: '', unit_price: '' })
        setShowAdd(false)
      } else if (data.sql_needed) {
        alert('A tabela de estoque precisa ser criada no Supabase. Consulte o SQL de setup.')
      }
    } catch (err: any) {
      alert('Erro: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const statusIcon: Record<string, string> = {
    'critico': '🔴',
    'atencao': '🟡',
    'ok': '🟢',
  }

  const statusBadge: Record<string, string> = {
    'critico': 'badge-red',
    'atencao': 'badge-amber',
    'ok': 'badge-green',
  }

  const criticalItems = items.filter(i => i.status === 'critico')
  const attentionItems = items.filter(i => i.status === 'atencao')

  return (
    <div className="card-accent p-4 mt-4 animate-in">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold text-white">Estoque</span>
          <span className="badge badge-green">Novo</span>
          {criticalItems.length > 0 && (
            <span className="badge badge-red">{criticalItems.length} crítico</span>
          )}
          {attentionItems.length > 0 && (
            <span className="badge badge-amber">{attentionItems.length} atenção</span>
          )}
        </div>
        <button onClick={() => setShowAdd(!showAdd)}
          className="badge badge-orange cursor-pointer hover:scale-[1.02] transition-all">
          {showAdd ? 'Cancelar' : '+ Adicionar'}
        </button>
      </div>

      {/* Formulário adicionar */}
      {showAdd && (
        <div className="bg-zinc-900/50 rounded-xl p-3 mb-3 space-y-2 animate-in">
          <input type="text" placeholder="Nome do produto (ex: RADARMIX 88-S)"
            value={newItem.product_name} onChange={e => setNewItem({ ...newItem, product_name: e.target.value })}
            className="input-field w-full px-3 py-2 text-[12px]" />
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[9px] text-zinc-600 uppercase">Qtd (kg)</label>
              <input type="number" placeholder="500" value={newItem.quantity_kg}
                onChange={e => setNewItem({ ...newItem, quantity_kg: e.target.value })}
                className="input-field w-full px-2 py-1.5 text-[12px]" />
            </div>
            <div>
              <label className="text-[9px] text-zinc-600 uppercase">Consumo/dia (kg)</label>
              <input type="number" placeholder="27" value={newItem.daily_consumption_kg}
                onChange={e => setNewItem({ ...newItem, daily_consumption_kg: e.target.value })}
                className="input-field w-full px-2 py-1.5 text-[12px]" />
            </div>
            <div>
              <label className="text-[9px] text-zinc-600 uppercase">Preço/kg (R$)</label>
              <input type="number" placeholder="3.50" value={newItem.unit_price}
                onChange={e => setNewItem({ ...newItem, unit_price: e.target.value })}
                className="input-field w-full px-2 py-1.5 text-[12px]" />
            </div>
          </div>
          <button onClick={addItem} disabled={saving || !newItem.product_name || !newItem.quantity_kg}
            className="w-full py-2 rounded-xl text-[12px] font-bold btn-primary">
            {saving ? 'Salvando...' : 'Adicionar ao Estoque'}
          </button>
        </div>
      )}

      {/* Lista de itens */}
      {loading ? (
        <p className="text-[11px] text-zinc-600">Carregando estoque...</p>
      ) : items.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-[28px] mb-2">📦</p>
          <p className="text-[12px] text-zinc-500">Nenhum item no estoque</p>
          <p className="text-[11px] text-zinc-600">Clique em + Adicionar para começar</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {items.map((item: any) => (
            <div key={item.id} className="bg-zinc-900/40 rounded-lg px-3 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-[14px]">{statusIcon[item.status] || '⚪'}</span>
                <div className="min-w-0">
                  <p className="text-[12px] font-medium text-white truncate">{item.product_name}</p>
                  <p className="text-[10px] text-zinc-600">
                    {item.quantity_kg}kg | {item.daily_consumption_kg}kg/dia
                    {item.unit_price && ` | R$${item.unit_price}/kg`}
                  </p>
                </div>
              </div>
              <div className="text-right ml-2 flex-shrink-0">
                {item.days_remaining !== null ? (
                  <>
                    <p className={'text-[14px] font-black ' +
                      (item.status === 'critico' ? 'text-red-400' : item.status === 'atencao' ? 'text-amber-400' : 'text-green-400')}>
                      {item.days_remaining}d
                    </p>
                    <span className={'badge text-[9px] ' + (statusBadge[item.status] || 'badge-green')}>
                      {item.status === 'critico' ? 'COMPRAR' : item.status === 'atencao' ? 'ATENÇÃO' : 'OK'}
                    </span>
                  </>
                ) : (
                  <span className="text-[11px] text-zinc-600">--</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
