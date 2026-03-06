'use client'

import { useState, useEffect } from 'react'

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true)
      return
    }

    const handler = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    window.addEventListener('appinstalled', () => {
      setInstalled(true)
      setShowPrompt(false)
    })

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setInstalled(true)
    }
    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  if (installed || !showPrompt) return null

  return (
    <div className="card-accent p-4 mb-6 animate-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📱</span>
          <div>
            <p className="text-[13px] font-bold text-white">Instalar RADARMIX IA</p>
            <p className="text-[11px] text-zinc-500">Acesse direto da tela inicial do celular</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowPrompt(false)} className="text-[11px] text-zinc-600 hover:text-zinc-400 px-2 py-1">Depois</button>
          <button onClick={handleInstall} className="btn-primary px-4 py-2 text-[12px]">Instalar</button>
        </div>
      </div>
    </div>
  )
}
