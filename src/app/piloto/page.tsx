'use client'
import Link from 'next/link'

const DORES = [
  {
    icon: '💸',
    dor: 'Gasta com suplemento sem saber se é o certo',
    solucao: 'IA analisa pasto + raça + fase + clima e recomenda o produto exato da Radarmix',
    economia: 'Até 20% de economia por escolher o suplemento certo',
  },
  {
    icon: '📉',
    dor: 'Não sabe se está lucrando ou perdendo por cabeça',
    solucao: 'Raio-X Financeiro mostra DRE por lote: custo × arroba = lucro ou prejuízo na hora',
    economia: 'Decisão de vender ou segurar baseada em dados, não em achismo',
  },
  {
    icon: '⚖️',
    dor: 'Pesa o gado mas não acompanha o GMD real',
    solucao: 'Registra pesagens e compara GMD real vs esperado. Projeta data ideal de abate',
    economia: 'Evita abater cedo demais (perde @) ou tarde demais (perde dinheiro)',
  },
  {
    icon: '💉',
    dor: 'Esquece vacina e perde prazo do INDEA',
    solucao: 'Calendário sanitário do MT com alertas automáticos. Nunca mais perde prazo',
    economia: 'Evita multa de até R$ 5 mil + bloqueio de GTA',
  },
  {
    icon: '🌧️',
    dor: 'Não ajusta a dieta quando o tempo muda',
    solucao: 'Módulo climático cruza INMET + previsão e sugere ajuste de manejo antecipado',
    economia: 'Evita queda de GMD por estresse térmico ou falta de pasto na seca',
  },
  {
    icon: '📸',
    dor: 'Peão não sabe avaliar sobra de cocho',
    solucao: 'Tira foto do cocho, IA analisa % de sobra e fala: "reduza 0,5 kg/cab/dia"',
    economia: 'Até R$ 0,50/cab/dia de economia evitando desperdício',
  },
  {
    icon: '🛒',
    dor: 'Compra insumo caro sem pesquisar preço',
    solucao: 'Marketplace mostra fornecedores perto com preço em tempo real. Pede cotação pelo app',
    economia: 'Economia de 10-30% comparando fornecedores',
  },
  {
    icon: '📱',
    dor: 'No campo não tem internet, não consegue usar nada',
    solucao: 'App funciona offline. Registra tudo no campo e sincroniza quando volta pra cidade',
    economia: 'Vendedor coleta dados na fazenda sem depender de sinal',
  },
]

const NUMEROS = [
  { valor: '53', label: 'Produtos Radarmix cadastrados' },
  { valor: '28', label: 'Raças reconhecidas pela IA' },
  { valor: '26', label: 'Forrageiras mapeadas' },
  { valor: '11', label: 'Protocolos sanitários MT' },
  { valor: '24h', label: 'Nutricionista IA disponível' },
  { valor: '∞', label: 'Lotes por fazenda' },
]

const DEPOIMENTOS = [
  {
    texto: 'Imagina chegar na fazenda e em 2 minutos mostrar pro produtor exatamente qual produto ele precisa, quanto vai gastar e quanto vai lucrar. É isso que o Radarmix IA faz.',
    autor: 'Cenário real — Vendedor Radarmix',
  },
  {
    texto: 'O produtor gasta R$ 3.000/mês com suplemento errado. Com o app, a IA cruza pasto + raça + clima e acerta o produto. Isso fideliza cliente.',
    autor: 'Cenário real — Consultor técnico',
  },
  {
    texto: 'Hoje o produtor decide por achismo. Com o Raio-X Financeiro, ele vê que está lucrando R$ 280/cabeça ou perdendo R$ 50. Aí ele age.',
    autor: 'Cenário real — Gestor de fazenda',
  },
]

const PILOTO_ETAPAS = [
  {
    fase: '1',
    titulo: 'Semana 1-2: Onboarding',
    descricao: 'Cadastrar 10-20 fazendas piloto. Vendedor ou técnico ajuda o produtor a criar a conta, cadastrar a fazenda e os lotes.',
    acao: 'Produtor já recebe primeira recomendação de produto + Raio-X Financeiro',
  },
  {
    fase: '2',
    titulo: 'Semana 3-6: Uso no campo',
    descricao: 'Produtores usam o app no dia a dia. Registram pesagens, eventos sanitários, consultam o chat IA.',
    acao: 'Vendedor acompanha pelo app e visita com dados na mão',
  },
  {
    fase: '3',
    titulo: 'Semana 7-10: Resultados',
    descricao: 'Comparar GMD, custo por arroba e eficiência dos lotes que usaram o app vs os que não usaram.',
    acao: 'Montar case de sucesso com números reais',
  },
  {
    fase: '4',
    titulo: 'Semana 11-12: Decisão',
    descricao: 'Avaliar resultados, feedback dos produtores, volume de vendas gerado pelo app.',
    acao: 'Decidir: escalar para toda a carteira de clientes Radarmix',
  },
]

export default function PilotoPage() {
  return (
    <div className="min-h-screen bg-[#050506] text-zinc-100">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, rgba(249,115,22,0.12) 0%, transparent 70%)' }}></div>

        <div className="max-w-3xl mx-auto px-5 pt-12 pb-8 relative z-10 text-center">
          <img src="/logo-radarmix.jpg" alt="Radarmix" className="w-20 h-20 rounded-2xl mx-auto mb-6 object-contain shadow-lg shadow-orange-500/20" />
          <h1 className="text-[28px] sm:text-[36px] font-black tracking-tight leading-tight">
            RADAR<span className="text-gradient">MIX</span> <span className="text-orange-500">IA</span>
          </h1>
          <p className="text-[15px] sm:text-[17px] text-zinc-400 mt-3 font-medium">
            O primeiro app de nutrição animal com Inteligência Artificial do Brasil
          </p>
          <p className="text-[13px] text-zinc-600 mt-2">
            Feito pela Radarmix Nutrição Animal — Tangará da Serra, MT
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/login" className="btn-primary px-8 py-4 text-[15px] text-center">
              Acessar o App
            </Link>
            <a href="#dores" className="btn-ghost px-8 py-4 text-[15px] text-center font-semibold">
              Ver Benefícios
            </a>
          </div>
        </div>
      </div>

      {/* Números */}
      <div className="max-w-3xl mx-auto px-5 py-8">
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {NUMEROS.map((n, i) => (
            <div key={i} className="card p-3 text-center">
              <p className="text-[20px] sm:text-[24px] font-black text-gradient">{n.valor}</p>
              <p className="text-[9px] sm:text-[10px] text-zinc-600 uppercase tracking-wider mt-1 leading-tight">{n.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Proposta de valor */}
      <div className="max-w-3xl mx-auto px-5 py-8">
        <div className="card-accent p-6 sm:p-8 rounded-2xl text-center">
          <h2 className="text-[18px] sm:text-[22px] font-bold text-white mb-3">
            Por que o produtor precisa disso?
          </h2>
          <p className="text-[14px] sm:text-[15px] text-zinc-400 leading-relaxed max-w-xl mx-auto">
            O pecuarista brasileiro perde em média <span className="text-orange-400 font-bold">R$ 15-40 por cabeça/mês</span> por usar
            o suplemento errado, não acompanhar o GMD, não ajustar a dieta pelo clima e comprar insumo caro demais.
            O Radarmix IA resolve tudo isso <span className="text-white font-bold">no celular do produtor</span>,
            mesmo sem internet no campo.
          </p>
        </div>
      </div>

      {/* Dores e Soluções */}
      <div id="dores" className="max-w-3xl mx-auto px-5 py-8">
        <h2 className="text-[14px] font-bold text-zinc-500 uppercase tracking-[0.1em] mb-6 text-center">
          8 dores que resolvemos
        </h2>
        <div className="space-y-3">
          {DORES.map((d, i) => (
            <div key={i} className="card p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <span className="text-[28px] shrink-0 mt-1">{d.icon}</span>
                <div className="min-w-0">
                  <p className="text-[14px] font-bold text-red-400 mb-1">
                    Dor: {d.dor}
                  </p>
                  <p className="text-[13px] text-zinc-300 mb-2">
                    {d.solucao}
                  </p>
                  <p className="text-[12px] text-green-400 font-semibold">
                    {d.economia}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Como o vendedor usa */}
      <div className="max-w-3xl mx-auto px-5 py-8">
        <h2 className="text-[14px] font-bold text-zinc-500 uppercase tracking-[0.1em] mb-6 text-center">
          Como o vendedor usa no dia a dia
        </h2>
        <div className="card p-5 sm:p-6">
          <div className="space-y-4">
            {[
              { passo: '1', texto: 'Chega na fazenda e abre o app (funciona offline)' },
              { passo: '2', texto: 'Cadastra a fazenda e os lotes do produtor (2 minutos)' },
              { passo: '3', texto: 'IA analisa pasto + raça + fase + clima e recomenda o produto Radarmix ideal' },
              { passo: '4', texto: 'Mostra o Raio-X Financeiro: "Com esse produto, seu lucro por cabeça sobe R$ 80"' },
              { passo: '5', texto: 'Produtor compra convencido pelos dados, não pelo papo' },
              { passo: '6', texto: 'Na próxima visita, compara: "Seu GMD subiu 15% desde que trocou o suplemento"' },
              { passo: '7', texto: 'Produtor vira cliente fiel — tem os dados provando que funciona' },
            ].map((p) => (
              <div key={p.passo} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-orange-500/20 flex items-center justify-center shrink-0">
                  <span className="text-[12px] font-black text-orange-400">{p.passo}</span>
                </div>
                <p className="text-[13px] sm:text-[14px] text-zinc-300 pt-0.5">{p.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Depoimentos */}
      <div className="max-w-3xl mx-auto px-5 py-8">
        <h2 className="text-[14px] font-bold text-zinc-500 uppercase tracking-[0.1em] mb-6 text-center">
          Cenários reais
        </h2>
        <div className="space-y-3">
          {DEPOIMENTOS.map((d, i) => (
            <div key={i} className="card-accent p-5 sm:p-6 rounded-2xl">
              <p className="text-[14px] text-zinc-300 leading-relaxed italic mb-3">"{d.texto}"</p>
              <p className="text-[12px] text-orange-400 font-semibold">{d.autor}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Conta rápida */}
      <div className="max-w-3xl mx-auto px-5 py-8">
        <h2 className="text-[14px] font-bold text-zinc-500 uppercase tracking-[0.1em] mb-6 text-center">
          Conta rápida — Potencial de impacto
        </h2>
        <div className="card p-5 sm:p-6">
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-zinc-800">
              <span className="text-[13px] text-zinc-400">Fazendas piloto</span>
              <span className="text-[14px] font-bold text-white">20 fazendas</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-zinc-800">
              <span className="text-[13px] text-zinc-400">Média de cabeças por fazenda</span>
              <span className="text-[14px] font-bold text-white">500 cabeças</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-zinc-800">
              <span className="text-[13px] text-zinc-400">Total de cabeças no piloto</span>
              <span className="text-[14px] font-bold text-gradient">10.000 cabeças</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-zinc-800">
              <span className="text-[13px] text-zinc-400">Economia estimada por cabeça/mês</span>
              <span className="text-[14px] font-bold text-green-400">R$ 15-40</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-zinc-800">
              <span className="text-[13px] text-zinc-400">Economia mensal total do piloto</span>
              <span className="text-[18px] font-black text-green-400">R$ 150.000 — R$ 400.000</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-[13px] text-zinc-400">Economia anual projetada</span>
              <span className="text-[18px] font-black text-gradient">R$ 1,8M — R$ 4,8M</span>
            </div>
          </div>
          <p className="text-[11px] text-zinc-700 mt-4 text-center">
            * Estimativa conservadora baseada em redução de desperdício de suplemento + melhoria de GMD + compra otimizada de insumos
          </p>
        </div>
      </div>

      {/* Plano Piloto */}
      <div className="max-w-3xl mx-auto px-5 py-8">
        <h2 className="text-[14px] font-bold text-zinc-500 uppercase tracking-[0.1em] mb-6 text-center">
          Plano piloto — 12 semanas
        </h2>
        <div className="space-y-3">
          {PILOTO_ETAPAS.map((e) => (
            <div key={e.fase} className="card p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center shrink-0">
                  <span className="text-[16px] font-black text-orange-400">{e.fase}</span>
                </div>
                <div>
                  <h3 className="text-[14px] font-bold text-white mb-1">{e.titulo}</h3>
                  <p className="text-[13px] text-zinc-400 mb-2">{e.descricao}</p>
                  <p className="text-[12px] text-orange-400 font-semibold">{e.acao}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* O que a Radarmix ganha */}
      <div className="max-w-3xl mx-auto px-5 py-8">
        <h2 className="text-[14px] font-bold text-zinc-500 uppercase tracking-[0.1em] mb-6 text-center">
          O que a Radarmix ganha com isso
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { titulo: 'Vendedor mais forte', desc: 'Chega na fazenda com dados e IA, não só com tabela de preço. Vende mais.' },
            { titulo: 'Cliente fidelizado', desc: 'Produtor vê resultado comprovado por dados. Não troca de marca.' },
            { titulo: 'Inteligência de mercado', desc: 'Sabe quais produtos mais vendem, em qual região, em qual época.' },
            { titulo: 'Diferencial competitivo', desc: 'Nenhum concorrente tem IA de nutrição. Radarmix sai na frente.' },
            { titulo: 'Receita do marketplace', desc: 'Comissão de 3-5% sobre vendas de insumos pelo app.' },
            { titulo: 'Dados para inovação', desc: 'Milhares de lotes geram dados para criar produtos melhores.' },
          ].map((item, i) => (
            <div key={i} className="card p-4 sm:p-5">
              <h3 className="text-[13px] font-bold text-orange-400 mb-1">{item.titulo}</h3>
              <p className="text-[12px] text-zinc-400">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Final */}
      <div className="max-w-3xl mx-auto px-5 py-12">
        <div className="card-accent p-8 sm:p-10 rounded-2xl text-center relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(ellipse, rgba(249,115,22,0.1) 0%, transparent 70%)' }}></div>
          <div className="relative z-10">
            <h2 className="text-[20px] sm:text-[24px] font-black text-white mb-3">
              Pronto para começar o piloto?
            </h2>
            <p className="text-[14px] text-zinc-400 mb-6 max-w-md mx-auto">
              20 fazendas. 12 semanas. Zero custo para o produtor.
              O app já está pronto — só falta colocar na mão de quem precisa.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/login" className="btn-primary px-8 py-4 text-[15px] font-bold text-center">
                Começar Agora
              </Link>
            </div>
            <p className="text-[11px] text-zinc-700 mt-6">
              radarmix-ia.vercel.app — Funciona no celular, tablet e computador
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-white/[0.04] py-6 text-center">
        <p className="text-[12px] text-zinc-700">Radarmix Nutrição Animal — Tangará da Serra, MT</p>
        <p className="text-[11px] text-zinc-800 mt-1">Tecnologia desenvolvida com Inteligência Artificial</p>
      </div>
    </div>
  )
}
