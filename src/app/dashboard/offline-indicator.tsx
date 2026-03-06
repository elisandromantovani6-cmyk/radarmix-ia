'use client'
import { useState, useEffect } from 'react'
import { getPendingQueue, syncQueue, isOnline, getAllQueue } from '@/lib/offline-store'

export default function OfflineIndicator() {
  const [online, setOnline] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [queue, setQueue] = useState<any[]>([])

  const refreshQueue = async () => {
    try {
      const pending = await getPendingQueue()
      setPendingCount(pending.length)
      if (showDetail) {
        const all = await getAllQueue()
        setQueue(all)
      }
    } catch {}
  }

  useEffect(() => {
    setOnline(isOnline())
    refreshQueue()

    const handleOnline = () => {
      setOnline(true)
      // Auto-sync quando volta online
      handleSync()
    }
    const handleOffline = () => setOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Verificar fila a cada 30 segundos
    const interval = setInterval(refreshQueue, 30000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    if (showDetail) refreshQueue()
  }, [showDetail])

  const handleSync = async () => {
    if (syncing) return
    setSyncing(true)
    const result = await syncQueue()
    setSyncing(false)
    setLastSync(new Date().toLocaleTimeString('pt-BR'))
    await refreshQueue()
    if (result.synced > 0) {
      // Poderia mostrar toast, mas vamos manter simples
    }
  }

  // Não mostra nada se está online e não tem nada pendente
  if (online && pendingCount === 0 && !showDetail) return null

  return (
    <>
      {/* Barra de status */}
      <div
        onClick={() => setShowDetail(!showDetail)}
        className={
          "mb-4 rounded-xl px-4 py-3 flex items-center justify-between cursor-pointer transition-all tap-feedback " +
          (online
            ? pendingCount > 0
              ? "bg-amber-500/10 border border-amber-500/20"
              : "bg-green-500/10 border border-green-500/20"
            : "bg-red-500/10 border border-red-500/20")
        }
      >
        <div className="flex items-center gap-3">
          <div className={"w-2.5 h-2.5 rounded-full shrink-0 " +
            (online ? "bg-green-500" : "bg-red-500 animate-pulse")} />
          <div>
            <p className={"text-[13px] font-semibold " + (online ? "text-white" : "text-red-300")}>
              {online ? 'Online' : 'Sem conexão — modo offline'}
            </p>
            {pendingCount > 0 && (
              <p className="text-[11px] text-amber-400">
                {pendingCount} {pendingCount === 1 ? 'operação pendente' : 'operações pendentes'}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {online && pendingCount > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); handleSync() }}
              disabled={syncing}
              className="badge badge-green cursor-pointer whitespace-nowrap"
            >
              {syncing ? 'Sincronizando...' : 'Sincronizar'}
            </button>
          )}
          <span className="text-zinc-600 text-[12px]">{showDetail ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Detalhe da fila */}
      {showDetail && (
        <div className="card p-4 mb-4 slide-up">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-[13px] font-bold text-zinc-300 uppercase tracking-wider">Fila de sincronização</h4>
            {lastSync && <span className="text-[10px] text-zinc-600">Último sync: {lastSync}</span>}
          </div>
          {queue.length === 0 ? (
            <p className="text-[12px] text-zinc-600 text-center py-4">Nenhuma operação na fila.</p>
          ) : (
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {queue.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-2.5 bg-[#09090B] rounded-lg border border-white/[0.04]">
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] text-white truncate">{item.description}</p>
                    <p className="text-[10px] text-zinc-600">{new Date(item.timestamp).toLocaleString('pt-BR')}</p>
                  </div>
                  <span className={"badge shrink-0 ml-2 " +
                    (item.status === 'pending' ? 'badge-amber' :
                     item.status === 'synced' ? 'badge-green' : 'badge-red')}>
                    {item.status === 'pending' ? 'Pendente' :
                     item.status === 'synced' ? 'Enviado' : 'Erro'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}
