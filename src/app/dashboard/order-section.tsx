'use client'

import { useState } from 'react'

export default function OrderSection() {
  const [loading, setLoading] = useState(false)
  const [order, setOrder] = useState<any>(null)
  const [error, setError] = useState('')
  const [orderSent, setOrderSent] = useState(false)

  const handleGenerateOrder = async () => {
    setLoading(true)
    setError('')
    setOrder(null)
    setOrderSent(false)

    try {
      const res = await fetch('/api/order')
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Erro ao gerar pedido')
      } else {
        setOrder(data)
      }
    } catch (err) {
      setError('Erro de conexão')
    }

    setLoading(false)
  }

  const handleSendOrder = async () => {
    if (!order) return
    setLoading(true)

    try {
      const res = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: order.items }),
      })

      if (res.ok) {
        setOrderSent(true)
      }
    } catch (err) {
      setError('Erro ao enviar pedido')
    }

    setLoading(false)
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-300">Pedido Mensal</h3>
        <button
          onClick={handleGenerateOrder}
          disabled={loading}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold rounded-lg disabled:opacity-50"
        >
          {loading ? 'Calculando...' : '📦 Gerar Pedido do Mês'}
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {order && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          {/* Header do pedido */}
          <div className="bg-orange-600/10 border-b border-orange-600/20 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-orange-400 font-semibold uppercase">Pedido Consolidado</p>
                <p className="text-lg font-extrabold text-white capitalize">{order.month}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-extrabold text-orange-400">{order.total_bags}</p>
                <p className="text-xs text-gray-500">sacos total</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">{order.herds_count} lotes com produto recomendado</p>
          </div>

          {/* Lista de produtos */}
          {order.items.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-gray-400 text-sm">Nenhum lote tem produto recomendado ainda.</p>
              <p className="text-gray-500 text-xs mt-1">Clique "Recomendar Produto" nos seus lotes primeiro.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {order.items.map((item: any, index: number) => (
                <div key={index} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="font-bold text-white text-sm">{item.product_name}</h4>
                      <p className="text-xs text-gray-500">Linha {item.product_line} | Saco {item.package_kg}kg</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-extrabold text-orange-400">{item.total_bags}</p>
                      <p className="text-xs text-gray-500">sacos</p>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    <p>Consumo total: {(item.total_consumption_kg / 1000).toFixed(1)} ton/mês</p>
                    <div className="mt-1 flex flex-wrap gap-x-3">
                      {item.herds.map((h: any, i: number) => (
                        <span key={i}>• {h.name} ({h.head_count} cab.)</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Rodapé com botão enviar */}
          {order.items.length > 0 && !orderSent && (
            <div className="border-t border-gray-800 p-4">
              <button
                onClick={handleSendOrder}
                disabled={loading}
                className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl disabled:opacity-50"
              >
                {loading ? 'Enviando...' : '✅ Confirmar Pedido'}
              </button>
              <p className="text-xs text-gray-600 text-center mt-2">O pedido será enviado para a equipe Radarmix</p>
            </div>
          )}

          {orderSent && (
            <div className="border-t border-gray-800 p-4 text-center">
              <p className="text-green-400 font-bold">✅ Pedido registrado com sucesso!</p>
              <p className="text-xs text-gray-500 mt-1">A equipe Radarmix entrará em contato para confirmar.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

