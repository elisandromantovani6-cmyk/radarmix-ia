'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const CATEGORIES = [
  { value: '', label: 'Todos' },
  { value: 'mineral', label: 'Mineral' },
  { value: 'sal', label: 'Sal / Proteinado' },
  { value: 'milho', label: 'Milho' },
  { value: 'soja', label: 'Soja / Farelo' },
  { value: 'ureia', label: 'Uréia' },
  { value: 'volumoso', label: 'Volumoso / Silagem' },
  { value: 'racao', label: 'Ração' },
  { value: 'outros', label: 'Outros' },
]

export default function MarketplacePage() {
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('')
  const [quoteModal, setQuoteModal] = useState<any>(null)
  const [quoteItems, setQuoteItems] = useState<any[]>([])
  const [quoteSent, setQuoteSent] = useState(false)
  const [myQuotes, setMyQuotes] = useState<any[]>([])
  const [showQuotes, setShowQuotes] = useState(false)

  const fetchSuppliers = async () => {
    setLoading(true)
    const url = '/api/marketplace' + (category ? '?category=' + category : '')
    const res = await fetch(url)
    const data = await res.json()
    if (res.ok) setSuppliers(data.suppliers || [])
    setLoading(false)
  }

  const fetchMyQuotes = async () => {
    const res = await fetch('/api/marketplace/quote')
    const data = await res.json()
    if (res.ok) setMyQuotes(data.quotes || [])
  }

  useEffect(() => { fetchSuppliers() }, [category])

  const openQuote = (supplier: any) => {
    setQuoteModal(supplier)
    setQuoteItems(supplier.products.map((p: any) => ({ product_name: p.product_name, price: p.price, unit: p.unit, quantity: 0 })))
    setQuoteSent(false)
  }

  const sendQuote = async () => {
    const items = quoteItems.filter(i => i.quantity > 0)
    if (items.length === 0) return
    try {
      const res = await fetch('/api/marketplace/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplier_id: quoteModal.id, items }),
      })
      if (res.ok) setQuoteSent(true)
    } catch { /* erro de rede */ }
  }

  const totalQuote = quoteItems.reduce((sum, i) => sum + (i.price * i.quantity), 0)
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const STATUS_LABELS: Record<string, { label: string, color: string }> = {
    pendente: { label: 'Pendente', color: 'badge-amber' },
    respondida: { label: 'Respondida', color: 'badge-blue' },
    aceita: { label: 'Aceita', color: 'badge-green' },
    recusada: { label: 'Recusada', color: 'badge-red' },
    concluida: { label: 'Concluída', color: 'badge-green' },
  }

  return (
    <div className="min-h-screen bg-[#050506] text-zinc-100 relative">
      <header className="border-b border-white/[0.04] bg-[#050506]/80 backdrop-blur-2xl sticky top-0 z-50 safe-top">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 sm:py-3.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <Link href="/dashboard" className="text-zinc-700 hover:text-white text-[13px] transition-colors shrink-0">←</Link>
            <div className="flex items-center gap-2 min-w-0">
              <img src="/logo-radarmix.jpg" alt="Radarmix" className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-contain shrink-0" />
              <h1 className="text-[14px] sm:text-[15px] font-extrabold truncate">RADAR<span className="text-gradient">MIX</span> <span className="text-[10px] sm:text-[11px] text-orange-500/80 font-semibold">CONNECT</span></h1>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => { fetchMyQuotes(); setShowQuotes(!showQuotes) }}
              className="btn-ghost px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-[12px] font-semibold">
              📋 <span className="hidden sm:inline">Minhas </span>Cotações
            </button>
            <Link href="/marketplace/fornecedor" className="btn-ghost px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-[12px] font-semibold">
              🏪 <span className="hidden sm:inline">Sou </span>Fornecedor
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 relative z-10">
        {/* Título */}
        <div className="mb-6 sm:mb-8 animate-in">
          <h2 className="text-[20px] sm:text-[24px] font-bold text-white mb-1.5 sm:mb-2">Marketplace de Insumos</h2>
          <p className="text-zinc-500 text-[13px] sm:text-[14px]">Encontre fornecedores próximos e peça cotação direto pelo app.</p>
        </div>

        {/* Filtro por categoria */}
        <div className="flex gap-2 mb-6 animate-in delay-1 overflow-x-auto hide-scrollbar pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
          {CATEGORIES.map(cat => (
            <button key={cat.value} onClick={() => setCategory(cat.value)}
              className={"badge cursor-pointer transition-all whitespace-nowrap shrink-0 " + (category === cat.value ? 'bg-orange-500 text-white border-transparent' : 'badge-orange')}>
              {cat.label}
            </button>
          ))}
        </div>

        {/* Minhas cotações */}
        {showQuotes && (
          <div className="card p-5 mb-6 animate-in">
            <h3 className="text-[14px] font-bold text-zinc-300 uppercase tracking-wider mb-4">Minhas Cotações</h3>
            {myQuotes.length === 0 ? (
              <p className="text-zinc-600 text-[13px]">Nenhuma cotação enviada ainda.</p>
            ) : (
              <div className="space-y-3">
                {myQuotes.map((q: any) => (
                  <div key={q.id} className="flex items-center justify-between p-3 bg-[#09090B] rounded-xl border border-white/[0.04]">
                    <div>
                      <p className="text-[13px] font-bold text-white">{q.supplier?.name}</p>
                      <p className="text-[11px] text-zinc-600">{q.supplier?.city} · {new Date(q.created_at).toLocaleDateString('pt-BR')}</p>
                      <p className="text-[11px] text-zinc-500 mt-1">{(q.items as any[]).map(i => i.product_name).join(', ')}</p>
                    </div>
                    <div className="text-right">
                      <span className={"badge " + (STATUS_LABELS[q.status]?.color || 'badge-orange')}>{STATUS_LABELS[q.status]?.label || q.status}</span>
                      {q.total_estimate && <p className="text-[13px] font-bold text-white mt-1">{fmt(q.total_estimate)}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Lista de fornecedores */}
        {loading ? (
          <div className="text-center py-12"><div className="inline-block w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div></div>
        ) : suppliers.length === 0 ? (
          <div className="card p-10 text-center"><p className="text-zinc-500">Nenhum fornecedor encontrado para esta categoria.</p></div>
        ) : (
          <div className="space-y-3">
            {suppliers.map((s: any, i: number) => (
              <div key={s.id} className={"card p-5 animate-in delay-" + Math.min(i + 2, 5)}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 mb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-[14px] sm:text-[15px] font-bold text-white truncate">{s.name}</h4>
                      {s.verified && <span className="badge badge-green shrink-0">✓ Verificado</span>}
                    </div>
                    <p className="text-[11px] sm:text-[12px] text-zinc-500 mt-0.5">{s.city} — MT · {s.distance_km}km</p>
                  </div>
                  <button onClick={() => openQuote(s)} className="btn-primary px-4 py-2.5 sm:py-2 text-[12px] w-full sm:w-auto shrink-0 tap-feedback">Pedir Cotação</button>
                </div>

                {s.description && <p className="text-[12px] text-zinc-600 mb-3">{s.description}</p>}

                {/* Produtos */}
                <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1 -mx-5 px-5 sm:mx-0 sm:px-0 sm:flex-wrap">
                  {s.products.slice(0, 6).map((p: any) => (
                    <div key={p.id} className="bg-[#09090B] border border-white/[0.04] rounded-lg px-3 py-2">
                      <p className="text-[11px] text-zinc-400">{p.product_name}</p>
                      <p className="text-[13px] font-bold text-white">{fmt(p.price)}<span className="text-zinc-600 font-normal">/{p.unit}</span></p>
                    </div>
                  ))}
                  {s.products.length > 6 && <span className="text-[11px] text-zinc-600 self-center">+{s.products.length - 6} produtos</span>}
                </div>

                {s.phone && <p className="text-[11px] text-zinc-700 mt-3">📞 {s.phone}</p>}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal de cotação */}
      {quoteModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center z-50 px-0 sm:px-4 modal-sheet">
          <div className="card p-5 sm:p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in rounded-t-3xl sm:rounded-2xl">
            <div className="pull-indicator sm:hidden"></div>
            {!quoteSent ? (
              <>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-[16px] font-bold text-white">Pedir Cotação</h3>
                    <p className="text-[12px] text-zinc-500">{quoteModal.name} — {quoteModal.city}</p>
                  </div>
                  <button onClick={() => setQuoteModal(null)} className="text-zinc-600 hover:text-white text-[14px]">✕</button>
                </div>

                <div className="space-y-3 mb-5">
                  {quoteItems.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-[#09090B] rounded-xl border border-white/[0.04]">
                      <div>
                        <p className="text-[13px] text-white">{item.product_name}</p>
                        <p className="text-[11px] text-zinc-600">{fmt(item.price)}/{item.unit}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="number" min={0} value={item.quantity || ''}
                          onChange={(e) => { const q = [...quoteItems]; q[idx].quantity = parseInt(e.target.value) || 0; setQuoteItems(q) }}
                          placeholder="Qtd" className="input-field w-20 px-3 py-2 text-[13px] text-center" />
                        <span className="text-[11px] text-zinc-600">{item.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {totalQuote > 0 && (
                  <div className="card-accent p-4 mb-5">
                    <div className="flex justify-between items-center">
                      <span className="text-[13px] text-zinc-400">Estimativa total</span>
                      <span className="text-[20px] font-black text-gradient">{fmt(totalQuote)}</span>
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button onClick={() => setQuoteModal(null)} className="btn-ghost flex-1 py-3 text-[13px] font-semibold">Cancelar</button>
                  <button onClick={sendQuote} disabled={totalQuote === 0}
                    className="btn-primary flex-1 py-3 text-[13px] disabled:opacity-50">Enviar Cotação</button>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="text-[48px] mb-4">✅</div>
                <h3 className="text-[18px] font-bold text-white mb-2">Cotação enviada!</h3>
                <p className="text-zinc-500 text-[13px] mb-6">O fornecedor {quoteModal.name} receberá sua solicitação e entrará em contato.</p>
                <button onClick={() => setQuoteModal(null)} className="btn-primary px-6 py-3 text-[13px]">Fechar</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
