'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState('login')
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('')
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError('Email ou senha incorretos'); else { router.push('/dashboard'); router.refresh() }
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message); else { await supabase.auth.signInWithPassword({ email, password }); router.push('/dashboard'); router.refresh() }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#050506] flex items-center justify-center px-5 relative overflow-hidden safe-top safe-bottom">
      {/* Ambient light */}
      <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(249,115,22,0.08) 0%, transparent 70%)' }}></div>
      <div className="absolute bottom-[-100px] right-[-200px] w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(249,115,22,0.04) 0%, transparent 70%)' }}></div>

      <div className="w-full max-w-[400px] sm:max-w-[420px] relative z-10">
        <div className="text-center mb-8 sm:mb-10 animate-in">
          <img src="/logo-radarmix.jpg" alt="Radarmix" className="w-[64px] h-[64px] sm:w-[80px] sm:h-[80px] rounded-[18px] sm:rounded-[22px] mx-auto mb-5 sm:mb-6 object-contain shadow-lg shadow-orange-500/10" />
          <h1 className="text-[32px] sm:text-[38px] font-black tracking-tight leading-none">
            RADAR<span className="text-gradient">MIX</span>
          </h1>
          <p className="text-[13px] text-zinc-600 mt-3 tracking-[0.15em] uppercase font-medium">Nutrição Inteligente</p>
        </div>

        <div className="card p-6 sm:p-8 animate-in delay-1">
          <h2 className="text-[17px] font-bold text-white mb-6">{mode === 'login' ? 'Bem-vindo de volta' : 'Criar sua conta'}</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-500 mb-2 uppercase tracking-[0.1em]">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required
                className="input-field w-full px-4 py-3.5 text-[14px]" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-500 mb-2 uppercase tracking-[0.1em]">Senha</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6}
                className="input-field w-full px-4 py-3.5 text-[14px]" />
            </div>
            {error && <div className="bg-red-500/8 border border-red-500/15 rounded-xl px-4 py-3"><p className="text-red-400 text-[13px]">{error}</p></div>}
            <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 text-[14px] disabled:opacity-50">
              {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}
              className="text-zinc-600 hover:text-orange-400 text-[13px] transition-colors">
              {mode === 'login' ? 'Não tem conta? Criar conta' : 'Já tem conta? Entrar'}
            </button>
          </div>
        </div>

        <p className="text-center text-zinc-800 text-[11px] mt-8 tracking-[0.1em] uppercase animate-in delay-2">Radarmix Nutrição Animal © 2026</p>
      </div>
    </div>
  )
}

