'use client'

import { useEffect } from 'react'

export default function PWARegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('Service Worker registrado:', reg.scope)
        })
        .catch((err) => {
          console.log('Erro ao registrar SW:', err)
        })
    }
  }, [])

  return null
}
