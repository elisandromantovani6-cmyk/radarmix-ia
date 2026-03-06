import type { Metadata, Viewport } from 'next'
import './globals.css'
import PWARegister from './pwa-register'

export const metadata: Metadata = {
  title: 'RADARMIX IA',
  description: 'Nutrição inteligente para seu rebanho — IA que recomenda o melhor suplemento mineral para cada lote',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'RadarMix IA',
  },
  openGraph: {
    title: 'RADARMIX IA',
    description: 'Nutrição inteligente para seu rebanho com Inteligência Artificial',
    siteName: 'RadarMix IA',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'RADARMIX IA',
    description: 'Nutrição inteligente para seu rebanho com Inteligência Artificial',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#F97316',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="antialiased">
        {children}
        <PWARegister />
      </body>
    </html>
  )
}
