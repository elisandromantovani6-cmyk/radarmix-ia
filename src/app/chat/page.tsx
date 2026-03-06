'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'

interface Message { role: 'user' | 'assistant'; content: string }
const QUICK = ['Qual mineral usar na seca?', 'Pelo arrepiado, o que fazer?', 'Sal mineral por cabeça/dia?', 'Proteinado vs mineral?', 'Melhorar GMD na recria?']

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async (text?: string) => {
    const msg = text || input.trim(); if (!msg) return
    const msgs: Message[] = [...messages, { role: 'user', content: msg }]
    setMessages(msgs); setInput(''); setLoading(true)
    try { const r = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: msgs }) }); const d = await r.json(); setMessages([...msgs, { role: 'assistant', content: d.reply || 'Erro.' }]) }
    catch { setMessages([...msgs, { role: 'assistant', content: 'Erro de conexão.' }]) }
    setLoading(false); inputRef.current?.focus()
  }

  return (
    <div className="min-h-screen bg-[#050506] text-zinc-100 flex flex-col relative">
      <header className="border-b border-white/[0.04] bg-[#050506]/80 backdrop-blur-2xl shrink-0 z-10 safe-top">
        <div className="max-w-3xl mx-auto px-4 py-2.5 sm:py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-zinc-700 hover:text-white text-[13px] transition-colors">← Voltar</Link>
            <div className="h-4 w-px bg-zinc-800"></div>
            <img src="/logo-radarmix.jpg" alt="Radarmix" className="w-7 h-7 rounded-full object-contain" />
            <div>
              <h1 className="text-[13px] font-bold text-white">Radar IA</h1>
              <p className="text-[10px] text-orange-400 flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-orange-500 pulse-dot inline-block"></span> Online</p>
            </div>
          </div>
          <button onClick={() => setMessages([])} className="btn-ghost px-2.5 py-1 text-[11px] font-semibold">Limpar</button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6">
          {messages.length === 0 && (
            <div className="text-center py-20 animate-in">
              <div className="w-[72px] h-[72px] rounded-[22px] bg-orange-500/10 border border-orange-500/15 flex items-center justify-center mx-auto mb-6"
                style={{ boxShadow: '0 0 40px rgba(249,115,22,0.08)' }}>
                <span className="text-[36px]">🧠</span>
              </div>
              <h2 className="text-[22px] font-bold text-white mb-2">Olá! Sou o Radar IA</h2>
              <p className="text-zinc-500 text-[13px] mb-10 max-w-sm mx-auto">Nutricionista virtual da Radarmix. Pergunte qualquer coisa sobre nutrição animal.</p>
              <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap sm:justify-center">
                {QUICK.map((q, i) => (
                  <button key={i} onClick={() => send(q)} className={"card px-3.5 py-2.5 text-[12px] text-zinc-500 hover:text-orange-400 cursor-pointer whitespace-nowrap shrink-0 tap-feedback animate-in delay-" + Math.min(i+1, 5)}>{q}</button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={"mb-4 flex " + (m.role === 'user' ? 'justify-end' : 'justify-start')}>
              <div className={m.role === 'user'
                ? "px-4 py-3 max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-br-sm text-[14px] text-white"
                : "card px-4 py-3 max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-bl-sm text-[14px]"}
                style={m.role === 'user' ? { background: 'linear-gradient(135deg, #F97316, #EA580C)' } : {}}>
                {m.role === 'assistant' && <div className="flex items-center gap-1.5 mb-1.5"><span className="text-[11px]">🧠</span><span className="text-[11px] text-orange-400 font-semibold">Radar IA</span></div>}
                <p className="leading-relaxed whitespace-pre-line">{m.content}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="mb-4 flex justify-start">
              <div className="card px-4 py-3 rounded-2xl rounded-bl-sm">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {[0,150,300].map(d => <div key={d} className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce" style={{animationDelay:d+'ms'}}></div>)}
                  </div>
                  <span className="text-[11px] text-zinc-600">pensando...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      <div className="border-t border-white/[0.04] bg-[#050506]/80 backdrop-blur-2xl shrink-0 safe-bottom">
        <div className="max-w-3xl mx-auto px-4 py-3 pb-2">
          <div className="flex gap-2">
            <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); send() }}}
              placeholder="Pergunte sobre nutrição, suplementação..." disabled={loading}
              className="input-field flex-1 px-4 py-3 text-[14px] disabled:opacity-50" />
            <button onClick={() => send()} disabled={loading || !input.trim()}
              className="btn-primary px-5 py-3 text-[13px] disabled:opacity-50">Enviar</button>
          </div>
        </div>
      </div>
    </div>
  )
}

