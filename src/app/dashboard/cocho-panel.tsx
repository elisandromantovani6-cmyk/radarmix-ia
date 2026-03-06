'use client'

import { useState, useRef } from 'react'

// Redimensionar imagem se muito grande (max ~1MB em base64)
async function resizeImage(file: File, maxSizeBytes: number = 1_000_000): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      // Extrair base64 sem o prefixo data:image/...;base64,
      const base64 = dataUrl.split(',')[1]

      // Se já está dentro do limite, retornar direto
      if (base64.length * 0.75 <= maxSizeBytes) {
        resolve(base64)
        return
      }

      // Redimensionar usando canvas
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let { width, height } = img

        // Calcular fator de redução
        const ratio = Math.sqrt(maxSizeBytes / (base64.length * 0.75))
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Não foi possível processar a imagem'))
          return
        }
        ctx.drawImage(img, 0, 0, width, height)

        const resized = canvas.toDataURL('image/jpeg', 0.8)
        resolve(resized.split(',')[1])
      }
      img.onerror = () => reject(new Error('Erro ao carregar imagem'))
      img.src = dataUrl
    }
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'))
    reader.readAsDataURL(file)
  })
}

// Cor da barra de sobra
function getSobraColor(percent: number): string {
  if (percent >= 5 && percent <= 15) return 'bg-green-500'
  if (percent > 15 && percent <= 30) return 'bg-amber-500'
  if (percent > 30) return 'bg-red-500'
  if (percent < 5 && percent >= 0) return 'bg-red-500'
  return 'bg-zinc-500'
}

function getSobraLabel(percent: number): { text: string; color: string } {
  if (percent >= 5 && percent <= 15) return { text: 'Ideal', color: 'text-green-400' }
  if (percent > 15 && percent <= 30) return { text: 'Atenção - Sobrando', color: 'text-amber-400' }
  if (percent > 30) return { text: 'Excesso de sobra', color: 'text-red-400' }
  if (percent < 5) return { text: 'Pouca sobra', color: 'text-red-400' }
  return { text: '', color: 'text-zinc-400' }
}

function getQualidadeBadge(qualidade: string): string {
  const q = qualidade.toLowerCase()
  if (q.includes('homogênea') || q.includes('bem misturada')) return 'badge-green'
  if (q.includes('separada') || q.includes('mal misturada')) return 'badge-red'
  if (q.includes('úmida')) return 'badge-blue'
  if (q.includes('seca')) return 'badge-amber'
  if (q.includes('fina')) return 'badge-green'
  if (q.includes('grossa')) return 'badge-orange'
  return 'badge-blue'
}

function getTipoAlimentoBadge(tipo: string): string {
  const t = tipo.toLowerCase()
  if (t.includes('mineral')) return 'badge-blue'
  if (t.includes('proteinado')) return 'badge-amber'
  if (t.includes('ração') || t.includes('concentrado')) return 'badge-orange'
  if (t.includes('silagem') || t.includes('volumoso')) return 'badge-green'
  return 'badge-blue'
}

interface CochoResult {
  analysis: string
  sobra_percent: number
  qualidade: string
  diagnostico: string
  sugestao: string
  tipo_alimento: string
}

export default function CochoPanel({ herdId, herdName }: { herdId: string, herdName: string }) {
  const [mode, setMode] = useState<'foto' | 'manual'>('foto')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CochoResult | null>(null)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Modo manual
  const [manualSobra, setManualSobra] = useState('')
  const [consumoAtual, setConsumoAtual] = useState('')

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError('')
    setResult(null)

    // Verificar tipo
    if (!file.type.startsWith('image/')) {
      setError('Selecione um arquivo de imagem')
      return
    }

    try {
      // Preview
      const previewUrl = URL.createObjectURL(file)
      setPreview(previewUrl)

      // Converter e redimensionar
      const base64 = await resizeImage(file)
      setImageBase64(base64)
    } catch (err: any) {
      setError(err.message || 'Erro ao processar imagem')
    }
  }

  const handleAnalyze = async () => {
    if (!imageBase64) {
      setError('Tire uma foto ou selecione uma imagem primeiro')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const res = await fetch('/api/cocho', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_base64: imageBase64,
          herd_id: herdId,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Erro ao analisar cocho')
      } else {
        setResult(data)
      }
    } catch {
      setError('Erro de conexão. Verifique sua internet.')
    }

    setLoading(false)
  }

  // Cálculo do modo manual
  const calcularAjusteManual = () => {
    const sobra = parseFloat(manualSobra)
    const consumo = parseFloat(consumoAtual)

    if (isNaN(sobra) || sobra < 0 || sobra > 100) return null

    const sobraInfo = getSobraLabel(sobra)

    if (sobra > 15) {
      const reducao = consumo && !isNaN(consumo)
        ? (consumo * (sobra - 10) / 100).toFixed(1)
        : null
      return {
        sobra_percent: sobra,
        diagnostico: `Sobra de ${sobra}% está acima do ideal (5-15%).`,
        sugestao: reducao
          ? `Reduza aproximadamente ${reducao} kg/cab/dia (de ${consumo} para ${(consumo - parseFloat(reducao)).toFixed(1)} kg/cab/dia)`
          : `Reduza a quantidade fornecida. A sobra ideal é entre 5% e 15%.`,
        label: sobraInfo,
      }
    }

    if (sobra < 5) {
      const aumento = consumo && !isNaN(consumo)
        ? (consumo * (10 - sobra) / 100).toFixed(1)
        : null
      return {
        sobra_percent: sobra,
        diagnostico: `Sobra de ${sobra}% está abaixo do ideal (5-15%). Os animais podem estar com fome.`,
        sugestao: aumento
          ? `Aumente aproximadamente ${aumento} kg/cab/dia (de ${consumo} para ${(consumo + parseFloat(aumento)).toFixed(1)} kg/cab/dia)`
          : `Aumente a quantidade fornecida. A sobra ideal é entre 5% e 15%.`,
        label: sobraInfo,
      }
    }

    return {
      sobra_percent: sobra,
      diagnostico: `Sobra de ${sobra}% está dentro da faixa ideal (5-15%). Mantenha a quantidade atual.`,
      sugestao: 'Quantidade adequada. Continue monitorando diariamente.',
      label: sobraInfo,
    }
  }

  const manualResult = calcularAjusteManual()

  return (
    <div className="mt-4 border-t border-gray-800 pt-4 animate-in">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[13px] font-bold text-white">Leitura de Cocho</span>
        <div className="flex gap-1">
          <button
            onClick={() => setMode('foto')}
            className={"text-[11px] px-3 py-1.5 rounded-lg transition-all " +
              (mode === 'foto' ? 'bg-cyan-500/20 text-cyan-400 font-semibold' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50')}
          >
            Por foto
          </button>
          <button
            onClick={() => setMode('manual')}
            className={"text-[11px] px-3 py-1.5 rounded-lg transition-all " +
              (mode === 'manual' ? 'bg-cyan-500/20 text-cyan-400 font-semibold' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50')}
          >
            Manual
          </button>
        </div>
      </div>

      {/* === MODO FOTO === */}
      {mode === 'foto' && (
        <div>
          {!result && !loading && (
            <div>
              <p className="text-[11px] text-zinc-500 mb-3 text-center">
                Tire uma foto do cocho e a IA vai analisar a sobra, qualidade da mistura e sugerir ajustes.
              </p>

              {/* Input de câmera/arquivo */}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />

              {/* Preview da imagem */}
              {preview ? (
                <div className="mb-3">
                  <div className="relative rounded-xl overflow-hidden border border-zinc-700/50">
                    <img
                      src={preview}
                      alt="Foto do cocho"
                      className="w-full max-h-[250px] object-cover"
                    />
                    <button
                      onClick={() => { setPreview(null); setImageBase64(null); if (fileRef.current) fileRef.current.value = '' }}
                      className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center text-white text-[14px] hover:bg-black/80"
                    >
                      x
                    </button>
                  </div>

                  <button
                    onClick={handleAnalyze}
                    className="btn-primary w-full py-3 mt-3 text-[12px] font-bold rounded-xl"
                  >
                    Analisar Cocho com IA
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full py-8 border-2 border-dashed border-zinc-700 rounded-xl text-center hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all cursor-pointer"
                >
                  <div className="text-[28px] mb-2">📸</div>
                  <p className="text-[12px] text-zinc-400 font-medium">Tirar foto do cocho</p>
                  <p className="text-[10px] text-zinc-600 mt-1">Toque para abrir a câmera ou selecionar uma foto</p>
                </button>
              )}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="text-center py-8">
              <div className="inline-block w-8 h-8 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-[12px] text-zinc-400">Analisando foto do cocho...</p>
              <p className="text-[10px] text-zinc-600 mt-1">O técnico IA está avaliando a sobra e qualidade</p>
            </div>
          )}

          {/* Erro */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-3">
              <p className="text-red-400 text-[12px]">{error}</p>
              <button onClick={() => { setError(''); setResult(null) }}
                className="mt-2 text-[11px] text-red-400 underline">
                Tentar novamente
              </button>
            </div>
          )}

          {/* Resultado da análise */}
          {result && (
            <div className="space-y-3">
              {/* Barra de sobra */}
              <div className="bg-zinc-800/40 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] text-zinc-500 font-semibold uppercase">Sobra estimada</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[20px] font-black text-white">{result.sobra_percent}%</span>
                    <span className={"text-[10px] font-semibold " + getSobraLabel(result.sobra_percent).color}>
                      {getSobraLabel(result.sobra_percent).text}
                    </span>
                  </div>
                </div>
                <div className="w-full h-3 bg-zinc-700/50 rounded-full overflow-hidden">
                  <div
                    className={"h-full rounded-full transition-all duration-700 " + getSobraColor(result.sobra_percent)}
                    style={{ width: Math.min(result.sobra_percent, 100) + '%' }}
                  />
                </div>
                {/* Marcadores de referência */}
                <div className="flex justify-between mt-1 text-[11px] text-zinc-600">
                  <span>0%</span>
                  <span className="text-green-600">5%</span>
                  <span className="text-green-600">15%</span>
                  <span>50%+</span>
                </div>
              </div>

              {/* Badges: qualidade + tipo */}
              <div className="flex flex-wrap gap-2">
                <div>
                  <span className="text-[11px] text-zinc-600 block mb-1">Qualidade da mistura</span>
                  <span className={"badge " + getQualidadeBadge(result.qualidade)}>
                    {result.qualidade}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-zinc-600 block mb-1">Tipo de alimento</span>
                  <span className={"badge " + getTipoAlimentoBadge(result.tipo_alimento)}>
                    {result.tipo_alimento}
                  </span>
                </div>
              </div>

              {/* Diagnóstico */}
              <div className="bg-zinc-800/30 rounded-xl p-3">
                <p className="text-[10px] text-zinc-500 font-semibold uppercase mb-1">Diagnóstico</p>
                <p className="text-[12px] text-zinc-300 leading-relaxed">{result.diagnostico}</p>
              </div>

              {/* Sugestão prática - destaque */}
              <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center">
                    <span className="text-[11px]">💡</span>
                  </div>
                  <p className="text-[10px] text-cyan-400 font-semibold uppercase">Sugestão de ajuste</p>
                </div>
                <p className="text-[12px] text-zinc-200 leading-relaxed font-medium">{result.sugestao}</p>
              </div>

              {/* Análise completa */}
              <details className="bg-zinc-800/30 rounded-xl p-4">
                <summary className="text-[10px] text-zinc-500 font-semibold uppercase cursor-pointer">
                  Análise completa do técnico IA
                </summary>
                <p className="text-[12px] text-zinc-400 leading-relaxed mt-2 whitespace-pre-line">
                  {result.analysis}
                </p>
              </details>

              {/* Botão nova análise */}
              <button
                onClick={() => {
                  setResult(null)
                  setPreview(null)
                  setImageBase64(null)
                  setError('')
                  if (fileRef.current) fileRef.current.value = ''
                }}
                className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-[11px] rounded-lg transition-colors"
              >
                Nova análise de cocho
              </button>
            </div>
          )}
        </div>
      )}

      {/* === MODO MANUAL === */}
      {mode === 'manual' && (
        <div>
          <p className="text-[11px] text-zinc-500 mb-3 text-center">
            Informe a porcentagem de sobra observada no cocho para receber sugestão de ajuste.
          </p>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <label className="block text-[10px] text-zinc-600 mb-1">Sobra estimada (%)*</label>
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={manualSobra}
                onChange={(e) => setManualSobra(e.target.value)}
                placeholder="Ex: 20"
                className="input-field w-full text-[12px]"
              />
            </div>
            <div>
              <label className="block text-[10px] text-zinc-600 mb-1">Consumo atual (kg/cab/dia)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={consumoAtual}
                onChange={(e) => setConsumoAtual(e.target.value)}
                placeholder="Ex: 3.5"
                className="input-field w-full text-[12px]"
              />
            </div>
          </div>

          {/* Resultado manual */}
          {manualResult && (
            <div className="space-y-3">
              {/* Barra de sobra */}
              <div className="bg-zinc-800/40 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] text-zinc-500 font-semibold uppercase">Sobra informada</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[20px] font-black text-white">{manualResult.sobra_percent}%</span>
                    <span className={"text-[10px] font-semibold " + manualResult.label.color}>
                      {manualResult.label.text}
                    </span>
                  </div>
                </div>
                <div className="w-full h-3 bg-zinc-700/50 rounded-full overflow-hidden">
                  <div
                    className={"h-full rounded-full transition-all duration-700 " + getSobraColor(manualResult.sobra_percent)}
                    style={{ width: Math.min(manualResult.sobra_percent, 100) + '%' }}
                  />
                </div>
                <div className="flex justify-between mt-1 text-[9px] text-zinc-600">
                  <span>0%</span>
                  <span className="text-green-600">5%</span>
                  <span className="text-green-600">15%</span>
                  <span>50%+</span>
                </div>
              </div>

              {/* Diagnóstico */}
              <div className="bg-zinc-800/30 rounded-xl p-3">
                <p className="text-[10px] text-zinc-500 font-semibold uppercase mb-1">Diagnóstico</p>
                <p className="text-[12px] text-zinc-300 leading-relaxed">{manualResult.diagnostico}</p>
              </div>

              {/* Sugestão */}
              <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center">
                    <span className="text-[11px]">💡</span>
                  </div>
                  <p className="text-[10px] text-cyan-400 font-semibold uppercase">Sugestão de ajuste</p>
                </div>
                <p className="text-[12px] text-zinc-200 leading-relaxed font-medium">{manualResult.sugestao}</p>
              </div>
            </div>
          )}

          {!manualSobra && (
            <div className="text-center py-4">
              <p className="text-[10px] text-zinc-600">
                Digite a porcentagem de sobra para ver o diagnóstico e a sugestão de ajuste.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
