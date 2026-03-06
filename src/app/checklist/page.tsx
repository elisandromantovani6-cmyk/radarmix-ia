'use client'
import { useState } from "react";

const FEATURES: any[] = [
  {
    id: 0,
    icon: "\u{1F4E6}",
    title: "Infraestrutura + Banco de Dados",
    difficulty: "easy",
    phase: 1,
    weeks: "1-2",
    description: "Setup completo: Supabase, Next.js, 15 tabelas, 53 produtos, 28 ra\u00e7as, 26 forrageiras, sistema de lotes.",
    agent: "Setup Inicial",
    tasks: [
      { id: "0a", text: "Criar conta Supabase (regi\u00e3o S\u00e3o Paulo)", done: true },
      { id: "0b", text: "Criar projeto radarmix-ia no Supabase", done: true },
      { id: "0c", text: "Executar radarmix_database_master.sql (15 tabelas)", done: true },
      { id: "0d", text: "Verificar 53 produtos + 28 ra\u00e7as + 26 forrageiras + 21 manejos + 39 fatores + 11 perguntas", done: true },
      { id: "0e", text: "Salvar credenciais API (URL + Publishable + Secret)", done: true },
      { id: "0f", text: "Criar projeto Next.js 16 + Supabase SDK", done: true },
      { id: "0g", text: "Configurar .env.local com credenciais Supabase", done: true },
      { id: "0h", text: "Configurar Auth Supabase (login/cadastro)", done: true },
      { id: "0i", text: "Testar conex\u00e3o frontend \u2194 Supabase + RLS", done: true },
    ],
  },
  {
    id: 12,
    icon: "\u{1F4E1}",
    title: "Radar \u2014 Formulador IA por Lotes",
    difficulty: "easy",
    phase: 1,
    weeks: "1-3",
    description: "Cora\u00e7\u00e3o do app. Produtor cadastra fazenda e lotes (4 perguntas por lote). IA recomenda produto ideal. Aprendizado progressivo.",
    agent: "Agente Radar",
    tasks: [
      { id: "12a", text: "Tela de cadastro de fazenda (nome + GPS autom\u00e1tico)", done: true },
      { id: "12b", text: "Tela de criar lote (5 campos: nome, esp\u00e9cie, cabe\u00e7as, fase, capim)", done: true },
      { id: "12c", text: "Dashboard com cards de lotes (vis\u00e3o geral da fazenda)", done: true },
      { id: "12d", text: "Motor de recomenda\u00e7\u00e3o: pasto + \u00e9poca + ra\u00e7a \u2192 d\u00e9ficit \u2192 produto", done: true },
      { id: "12e", text: "Integrar Claude API para gerar explica\u00e7\u00e3o em linguagem simples", done: true },
      { id: "12f", text: "Sistema de perguntas progressivas (1 por visita por lote)", done: true },
      { id: "12g", text: "Movimenta\u00e7\u00e3o entre lotes (mover, encerrar, dividir)", done: true },
      { id: "12h", text: "Pedido consolidado mensal (soma todos os lotes)", done: true },
      { id: "12i", text: "Feedback por recomenda\u00e7\u00e3o (\uD83D\uDC4D\uD83D\uDC4E)", done: true },
      { id: "12j", text: "Testar fluxo completo com 3 lotes diferentes", done: true },
    ],
  },
  {
    id: 1,
    icon: "\u{1F4B0}",
    title: "Simulador de Lucro por Arroba",
    difficulty: "easy",
    phase: 1,
    weeks: "3-4",
    description: "Cruza custo da dieta \u00d7 convers\u00e3o alimentar \u00d7 pre\u00e7o da arroba no mercado em tempo real. Agora por lote.",
    agent: "Agente Financeiro",
    tasks: [
      { id: "1a", text: "Estruturar f\u00f3rmula: custo dieta \u00d7 convers\u00e3o \u00f7 rendimento carca\u00e7a", done: true },
      { id: "1b", text: "Integrar API do CEPEA/Esalq para pre\u00e7o da arroba", done: true },
      { id: "1c", text: "Criar endpoint /api/lucro-arroba no backend", done: true },
      { id: "1d", text: "Construir tela de resultado visual (lucro/preju\u00edzo) por lote", done: true },
      { id: "1e", text: "Adicionar compara\u00e7\u00e3o: pre\u00e7o atual vs. m\u00e9dia 30 dias", done: true },
      { id: "1f", text: "Testar com dados reais de 3 lotes", done: true },
    ],
  },
  {
    id: 2,
    icon: "\u{1F4E1}",
    title: "Radar Nutricional \u2014 Mapa de Calor Regional",
    difficulty: "medium",
    phase: 3,
    weeks: "9-12",
    description: "Mapa interativo com pre\u00e7os m\u00e9dios de ingredientes, custo por arroba e ranking de efici\u00eancia por regi\u00e3o.",
    agent: "Agente Radar Regional",
    tasks: [
      { id: "2a", text: "Definir estrutura de dados agregados (por munic\u00edpio)" },
      { id: "2b", text: "Criar l\u00f3gica de anonimiza\u00e7\u00e3o dos dados dos produtores" },
      { id: "2c", text: "Integrar mapa interativo (Mapbox ou Google Maps)" },
      { id: "2d", text: "Construir heatmap de custo por arroba por regi\u00e3o" },
      { id: "2e", text: "Adicionar compara\u00e7\u00e3o: 'Voc\u00ea vs. sua regi\u00e3o'" },
      { id: "2f", text: "Criar alertas de oportunidade (ingrediente barato perto)" },
      { id: "2g", text: "Precisa de massa cr\u00edtica: m\u00ednimo 50 usu\u00e1rios/regi\u00e3o" },
    ],
  },
  {
    id: 3,
    icon: "\u{1F52E}",
    title: "IA Preditiva \u2014 Or\u00e1culo do Confinamento",
    difficulty: "hard",
    phase: 3,
    weeks: "10-14",
    description: "Prev\u00ea desempenho futuro com base no hist\u00f3rico de milhares de lotes. Sugere ajustes antes do problema.",
    agent: "Agente Preditivo",
    tasks: [
      { id: "3a", text: "Acumular dados: m\u00ednimo 500 lotes com resultado real" },
      { id: "3b", text: "Treinar modelo de predi\u00e7\u00e3o (XGBoost ou similar via Claude Code)" },
      { id: "3c", text: "Criar endpoint /api/predicao com entrada de dados do lote" },
      { id: "3d", text: "Tela de 'simula\u00e7\u00e3o futura': mostrar cen\u00e1rios com gr\u00e1ficos" },
      { id: "3e", text: "Integrar com clima preditivo (impacto do tempo no GMD)" },
      { id: "3f", text: "Validar predi\u00e7\u00f5es com produtores reais por 60 dias" },
      { id: "3g", text: "Ajustar modelo com feedback loop cont\u00ednuo" },
    ],
  },
  {
    id: 4,
    icon: "\u{1F4F8}",
    title: "Leitura de Cocho por Foto (Computer Vision)",
    difficulty: "hard",
    phase: 4,
    weeks: "15-18",
    description: "Pe\u00e3o tira foto do cocho. IA analisa sobra, qualidade da moagem e sugere ajustes.",
    agent: "Agente Visual",
    tasks: [
      { id: "4a", text: "Coletar 500+ fotos de cochos (cheio, parcial, vazio)" },
      { id: "4b", text: "Rotular fotos: % de sobra, qualidade visível" },
      { id: "4c", text: "Treinar modelo de visão (pode usar API Claude Vision)", done: true },
      { id: "4d", text: "Criar fluxo: tirar foto → upload → análise → resultado", done: true },
      { id: "4e", text: "MVP alternativo: produtor informa sobra manualmente (mais simples)", done: true },
      { id: "4f", text: "Tela de resultado: '12% sobra — reduza 0.8kg/cab/dia'", done: true },
      { id: "4g", text: "Treinar modelo continuamente com novas fotos dos usuários" },
    ],
  },
  {
    id: 5,
    icon: "\u{1F33F}",
    title: "Score de Pastagem por Sat\u00e9lite + Foto",
    difficulty: "hard",
    phase: 4,
    weeks: "15-18",
    description: "Cruza imagem de sat\u00e9lite (NDVI) + foto do campo + \u00e9poca do ano para estimar disponibilidade e qualidade do pasto.",
    agent: "Agente Pastagem",
    tasks: [
      { id: "5a", text: "Integrar API Sentinel-2 (imagens de sat\u00e9lite gratuitas)" },
      { id: "5b", text: "Calcular NDVI por coordenada GPS da fazenda" },
      { id: "5c", text: "Criar modelo: NDVI + \u00e9poca + regi\u00e3o \u2192 kg MS/ha estimado" },
      { id: "5d", text: "Fluxo de foto do pasto com an\u00e1lise por IA" },
      { id: "5e", text: "Cruzar com dados de chuva (INMET) dos \u00faltimos 30 dias" },
      { id: "5f", text: "Resultado: disponibilidade MS, PB estimada, capacidade suporte" },
      { id: "5g", text: "Sugest\u00e3o autom\u00e1tica de suplementa\u00e7\u00e3o baseada no score" },
    ],
  },
  {
    id: 6,
    icon: "\u{1F4AC}",
    title: "Nutricionista IA 24h \u2014 Chat Inteligente",
    difficulty: "easy",
    phase: 1,
    weeks: "3-6",
    description: "Chat com IA treinada nas formula\u00e7\u00f5es Radarmix + CQBAL + NRC. Responde em linguagem natural.",
    agent: "Agente Nutricionista",
    tasks: [
      { id: "6a", text: "Estruturar base de conhecimento Radarmix em formato RAG", done: true },
      { id: "6b", text: "Configurar Claude API com system prompt especializado", done: true },
      { id: "6c", text: "Incluir dados CQBAL, BR-Corte e NRC como contexto", done: true },
      { id: "6d", text: "Criar interface de chat no app (tela de conversa)", done: true },
      { id: "6e", text: "Contextualizar respostas com dados do lote do produtor", done: true },
      { id: "6f", text: "Adicionar respostas com links para a formula\u00e7\u00e3o sugerida", done: true },
      { id: "6g", text: "Testar com 20 perguntas reais de produtores", done: true },
    ],
  },
  {
    id: 7,
    icon: "\u2696\uFE0F",
    title: "Integra\u00e7\u00e3o com Balan\u00e7a \u2014 Pesagem Inteligente",
    difficulty: "medium",
    phase: 2,
    weeks: "7-10",
    description: "Conecta via Bluetooth \u00e0s balan\u00e7as de campo. Pesagem entra no app e a IA recalcula tudo automaticamente.",
    agent: "Agente de Campo",
    tasks: [
      { id: "7a", text: "Mapear balan\u00e7as mais usadas (Coimma, Tru-Test, Gallagher)" },
      { id: "7b", text: "Pesquisar protocolos Bluetooth de cada fabricante" },
      { id: "7c", text: "Criar m\u00f3dulo de conex\u00e3o Bluetooth no React Native" },
      { id: "7d", text: "Fluxo: pesagem \u2192 dados no app \u2192 recalcular GMD", done: true },
      { id: "7e", text: "Comparar GMD real vs. esperado pela dieta", done: true },
      { id: "7f", text: "Projetar data de abate atualizada com peso real", done: true },
      { id: "7g", text: "MVP alternativo: input manual de peso (mais simples)", done: true },
    ],
  },
  {
    id: 8,
    icon: "\u{1F4CA}",
    title: "Raio-X Financeiro do Lote \u2014 DRE Pecu\u00e1rio",
    difficulty: "medium",
    phase: 2,
    weeks: "7-10",
    description: "DRE simplificado por lote: custo aquisi\u00e7\u00e3o, nutri\u00e7\u00e3o, sanidade, m\u00e3o de obra, margem projetada.",
    agent: "Agente Financeiro",
    tasks: [
      { id: "8a", text: "Definir modelo financeiro: categorias de custo por lote", done: true },
      { id: "8b", text: "Criar tabela 'custos_lote' no Supabase", done: true },
      { id: "8c", text: "Tela de input: custo aquisi\u00e7\u00e3o, sanit\u00e1rio, MDO, outros", done: true },
      { id: "8d", text: "C\u00e1lculo autom\u00e1tico: custo acumulado + proje\u00e7\u00e3o de receita", done: true },
      { id: "8e", text: "Simula\u00e7\u00e3o: 'Se arroba cair pra R$290, sua margem vira X%'", done: true },
      { id: "8f", text: "Dashboard visual com gr\u00e1fico de evolu\u00e7\u00e3o de custo", done: true },
      { id: "8g", text: "Exportar relatório em PDF por lote", done: true },
    ],
  },
  {
    id: 9,
    icon: "\u{1F3C6}",
    title: "Ranking Radarmix \u2014 Gamifica\u00e7\u00e3o entre Produtores",
    difficulty: "medium",
    phase: 3,
    weeks: "9-12",
    description: "Ranking an\u00f4nimo por regi\u00e3o e sistema. Badges e conquistas. Incentiva registro de dados.",
    agent: "Agente Engajamento",
    tasks: [
      { id: "9a", text: "Definir m\u00e9tricas do ranking: custo/@, GMD, efici\u00eancia", done: true },
      { id: "9b", text: "Criar sistema de percentis (top 10%, 25%, 50%)", done: true },
      { id: "9c", text: "Segmentar por regi\u00e3o, tamanho e sistema (pasto/confin.)", done: true },
      { id: "9d", text: "Criar badges: 'Mestre do Confinamento', 'Arroba de Ouro'", done: true },
      { id: "9e", text: "Tela de ranking com posi\u00e7\u00e3o do produtor", done: true },
      { id: "9f", text: "Notificações: 'Você subiu pro Top 20%!'", done: true },
      { id: "9g", text: "Garantir anonimiza\u00e7\u00e3o total dos dados", done: true },
    ],
  },
  {
    id: 10,
    icon: "\u{1F517}",
    title: "Radarmix Connect \u2014 Marketplace de Insumos",
    difficulty: "hard",
    phase: 3,
    weeks: "10-14",
    description: "Ao formular a dieta, o app mostra fornecedores pr\u00f3ximos com pre\u00e7os em tempo real.",
    agent: "Agente Marketplace",
    tasks: [
      { id: "10a", text: "Criar cadastro de fornecedores (nome, local, produtos, pre\u00e7os)", done: true },
      { id: "10b", text: "Integrar geolocaliza\u00e7\u00e3o: fornecedores perto da fazenda", done: true },
      { id: "10c", text: "Ap\u00f3s formular dieta, sugerir onde comprar mais barato", done: true },
      { id: "10d", text: "Sistema de cota\u00e7\u00e3o: produtor pede, fornecedor responde", done: true },
      { id: "10e", text: "Modelo de receita: taxa de 3-5% sobre transa\u00e7\u00f5es" },
      { id: "10f", text: "Integrar com gateway de pagamento (Stripe/Asaas)" },
      { id: "10g", text: "Painel do fornecedor para gerenciar produtos e preços", done: true },
      { id: "10h", text: "Validar com 5 fornecedores reais da sua regi\u00e3o" },
    ],
  },
  {
    id: 11,
    icon: "\u{1F326}\uFE0F",
    title: "M\u00f3dulo Clim\u00e1tico Inteligente",
    difficulty: "easy",
    phase: 1,
    weeks: "3-6",
    description: "Dados de clima em tempo real que ajustam automaticamente a formula\u00e7\u00e3o. Alertas de estresse t\u00e9rmico e impacto na pastagem.",
    agent: "Agente Climatologista",
    tasks: [
      { id: "11a", text: "Integrar API INMET (dados p\u00fablicos e gratuitos)", done: true },
      { id: "11b", text: "Integrar ClimAPI da Embrapa (17 vari\u00e1veis por lat/long)", done: true },
      { id: "11c", text: "Calcular ITU (\u00cdndice Temperatura e Umidade) autom\u00e1tico", done: true },
      { id: "11d", text: "Widget de clima na tela principal do app", done: true },
      { id: "11e", text: "Alerta de estresse t\u00e9rmico: ITU > 72 = perigo", done: true },
      { id: "11f", text: "Ajuste autom\u00e1tico da dieta pelo clima (calor = + densidade energ.)", done: true },
      { id: "11g", text: "Previs\u00e3o 7 dias: sugest\u00e3o de manejo antecipada", done: true },
      { id: "11h", text: "Hist\u00f3rico de chuva: impacto na pastagem (cruzar com NDVI)", done: true },
      { id: "11i", text: "Alertas: 'Chuva forte amanh\u00e3 \u2014 n\u00e3o \u00e9 dia de pesar gado'", done: true },
      { id: "11j", text: "Modelo preditivo: padr\u00e3o de chuva \u2192 queda na MS do pasto", done: true },
    ],
  },
  {
    id: 13,
    icon: "\uD83D\uDC04",
    title: "Controle Individual de Animal",
    difficulty: "medium",
    phase: 2,
    weeks: "7-10",
    description: "Ficha individual por animal com brinco, pesagens, hist\u00f3rico de movimenta\u00e7\u00e3o e desempenho.",
    agent: "Agente de Campo",
    tasks: [
      { id: "13a", text: "Criar tabela 'animals' no Supabase (brinco, ra\u00e7a, sexo, peso, lote, status)" },
      { id: "13b", text: "Tela de cadastro individual de animal com foto" },
      { id: "13c", text: "Ficha do animal: hist\u00f3rico de pesagens, movimenta\u00e7\u00f5es, tratamentos" },
      { id: "13d", text: "Pesagem individual: registrar peso por brinco" },
      { id: "13e", text: "GMD individual: comparar desempenho animal vs lote" },
      { id: "13f", text: "Movimenta\u00e7\u00e3o individual: transferir animal entre lotes" },
      { id: "13g", text: "Sele\u00e7\u00e3o para descarte: marcar animais com baixo desempenho" },
      { id: "13h", text: "Dashboard de indicadores individuais (top performers, piores)" },
      { id: "13i", text: "Importar lista de animais via planilha (CSV/Excel)" },
      { id: "13j", text: "Integra\u00e7\u00e3o futura: leitura de brinco eletr\u00f4nico (RFID)" },
    ],
  },
  {
    id: 14,
    icon: "\uD83D\uDC89",
    title: "Manejo Sanit\u00e1rio \u2014 Calend\u00e1rio de Vacinas",
    difficulty: "medium",
    phase: 2,
    weeks: "7-10",
    description: "Controle completo de vacinas, vermifuga\u00e7\u00f5es e tratamentos por lote e individual. Alertas autom\u00e1ticos.",
    agent: "Agente Sanit\u00e1rio",
    tasks: [
      { id: "14a", text: "Criar tabelas 'health_protocols' e 'health_events' no Supabase", done: true },
      { id: "14b", text: "Calendário sanitário oficial MT: aftosa, brucelose, raiva, clostridioses", done: true },
      { id: "14c", text: "Tela de registro de evento sanitário (vacina, vermífugo, tratamento)", done: true },
      { id: "14d", text: "Alertas automáticos: 'Vacinação de aftosa em 15 dias'", done: true },
      { id: "14e", text: "Controle de vermifugação: OPG, princípio ativo, rotação de base", done: true },
      { id: "14f", text: "Custo sanitário por cabeça: integrar no DRE do lote", done: true },
      { id: "14g", text: "Histórico sanitário do lote e do animal individual", done: true },
      { id: "14h", text: "Relatório sanitário para GTA e fiscalização (INDEA-MT)" },
      { id: "14i", text: "IA sugere protocolo sanitário baseado na região e época", done: true },
      { id: "14j", text: "Dashboard sanitário: lotes em dia vs atrasados", done: true },
    ],
  },
  {
    id: 15,
    icon: "\uD83D\uDCF1",
    title: "App Mobile Nativo + Modo Offline",
    difficulty: "hard",
    phase: 2,
    weeks: "10-14",
    description: "App nativo Android/iOS com funcionamento offline no campo. Sincroniza\u00e7\u00e3o autom\u00e1tica.",
    agent: "Agente Mobile",
    tasks: [
      { id: "15a", text: "PWA configurado com Service Worker e manifest", done: true },
      { id: "15b", text: "App publicado com HTTPS no Vercel", done: true },
      { id: "15c", text: "Converter para React Native (Expo) para app nativo" },
      { id: "15d", text: "Banco local (IndexedDB) para dados offline", done: true },
      { id: "15e", text: "Sincronização automática: offline → online com Supabase", done: true },
      { id: "15f", text: "Modo campo: interface simplificada para uso no curral" },
      { id: "15g", text: "Integra\u00e7\u00e3o Bluetooth com balan\u00e7as (Coimma, Tru-Test)" },
      { id: "15h", text: "Publicar na Google Play Store" },
      { id: "15i", text: "Publicar na Apple App Store" },
      { id: "15j", text: "Push notifications: alertas de vacina, clima, pre\u00e7o da @" },
    ],
  },
];

const DIFFICULTY_CONFIG: Record<string, any> = {
  easy: { label: "F\u00c1CIL", color: "#059669", bg: "#D1FAE5", border: "#6EE7B7", time: "2-4 semanas" },
  medium: { label: "M\u00c9DIO", color: "#D97706", bg: "#FEF3C7", border: "#FCD34D", time: "4-8 semanas" },
  hard: { label: "DIF\u00cdCIL", color: "#DC2626", bg: "#FEE2E2", border: "#FCA5A5", time: "8-12 semanas" },
};

const PHASE_CONFIG: Record<number, any> = {
  1: { label: "FASE 1 \u2014 MVP", color: "#059669", bg: "#ECFDF5" },
  2: { label: "FASE 2 \u2014 Expans\u00e3o", color: "#2563EB", bg: "#EFF6FF" },
  3: { label: "FASE 3 \u2014 Plataforma", color: "#7C3AED", bg: "#F5F3FF" },
  4: { label: "FASE 4 \u2014 Domin\u00e2ncia", color: "#DC2626", bg: "#FEF2F2" },
};

export default function RadarmixChecklist() {
  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    FEATURES.forEach((f: any) => f.tasks.forEach((t: any) => { if (t.done) initial[t.id] = true; }));
    return initial;
  });
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [filterPhase, setFilterPhase] = useState(0);

  const toggle = (taskId: string) => {
    setChecked((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const toggleExpand = (id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const filtered = filterPhase === 0 ? FEATURES : FEATURES.filter((f) => f.phase === filterPhase);

  const totalTasks = FEATURES.reduce((acc, f) => acc + f.tasks.length, 0);
  const completedTasks = Object.values(checked).filter(Boolean).length;
  const pct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const getFeatureProgress = (feature: any) => {
    const done = feature.tasks.filter((t: any) => checked[t.id]).length;
    return { done, total: feature.tasks.length, pct: Math.round((done / feature.tasks.length) * 100) };
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0C0F14", color: "#E5E7EB", fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ background: "linear-gradient(160deg, #0B3D2E 0%, #064E3B 40%, #0F172A 100%)", padding: "28px 20px 24px", borderBottom: "1px solid rgba(16,185,129,0.2)" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <img src="/logo-radarmix.jpg" alt="Radarmix" style={{ width: 42, height: 42, borderRadius: 12, objectFit: "contain" }} />
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0, letterSpacing: "-0.03em", color: "#F9FAFB" }}>RADARMIX IA</h1>
              <p style={{ fontSize: 11, margin: 0, color: "#6EE7B7", letterSpacing: "0.08em", fontFamily: "'JetBrains Mono', monospace" }}>CHECKLIST DE DESENVOLVIMENTO</p>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>
              <span style={{ color: "#9CA3AF" }}>{completedTasks}/{totalTasks} tarefas</span>
              <span style={{ color: "#10B981", fontWeight: 600 }}>{pct}%</span>
            </div>
            <div style={{ height: 8, background: "rgba(255,255,255,0.08)", borderRadius: 99, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg, #059669, #10B981, #34D399)", borderRadius: 99, transition: "width 0.5s ease" }} />
            </div>
          </div>

          {/* Phase stats */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[1, 2, 3, 4].map((phase) => {
              const phaseFeatures = FEATURES.filter((f) => f.phase === phase);
              const phaseTasks = phaseFeatures.reduce((a, f) => a + f.tasks.length, 0);
              const phaseDone = phaseFeatures.reduce((a, f) => a + f.tasks.filter((t: any) => checked[t.id]).length, 0);
              const pp = phaseTasks > 0 ? Math.round((phaseDone / phaseTasks) * 100) : 0;
              return (
                <div key={phase} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: "#9CA3AF", background: "rgba(255,255,255,0.05)", padding: "4px 8px", borderRadius: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 3, background: PHASE_CONFIG[phase].color }} />
                  F{phase}: {pp}%
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.06)", position: "sticky", top: 0, zIndex: 10, backdropFilter: "blur(12px)" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "8px 20px", display: "flex", gap: 4, overflowX: "auto" }}>
          {[
            { val: 0, label: "Todas" },
            { val: 1, label: "Fase 1 \u2022 MVP" },
            { val: 2, label: "Fase 2 \u2022 Expans\u00e3o" },
            { val: 3, label: "Fase 3 \u2022 Plataforma" },
            { val: 4, label: "Fase 4 \u2022 Domin\u00e2ncia" },
          ].map((f) => (
            <button
              key={f.val}
              onClick={() => setFilterPhase(f.val)}
              style={{
                padding: "6px 14px",
                borderRadius: 8,
                border: "1px solid",
                borderColor: filterPhase === f.val ? "rgba(16,185,129,0.5)" : "rgba(255,255,255,0.08)",
                background: filterPhase === f.val ? "rgba(16,185,129,0.15)" : "transparent",
                color: filterPhase === f.val ? "#6EE7B7" : "#6B7280",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Feature Cards */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "16px 20px 60px" }}>
        {filtered.map((feature) => {
          const prog = getFeatureProgress(feature);
          const diff = DIFFICULTY_CONFIG[feature.difficulty];
          const ph = PHASE_CONFIG[feature.phase];
          const isOpen = expandedId === feature.id;
          const isComplete = prog.pct === 100;

          return (
            <div
              key={feature.id}
              style={{
                marginBottom: 10,
                borderRadius: 14,
                border: "1px solid",
                borderColor: isComplete ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.08)",
                background: isComplete ? "rgba(16,185,129,0.05)" : "rgba(255,255,255,0.02)",
                overflow: "hidden",
                transition: "all 0.3s ease",
              }}
            >
              {/* Card Header */}
              <div
                onClick={() => toggleExpand(feature.id)}
                style={{ padding: "16px 18px", cursor: "pointer", userSelect: "none" }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <div style={{ fontSize: 26, lineHeight: 1, flexShrink: 0, marginTop: 2, filter: isComplete ? "none" : "grayscale(0.3)", opacity: isComplete ? 1 : 0.8 }}>
                    {isComplete ? "\u2705" : feature.icon}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: isComplete ? "#6EE7B7" : "#F3F4F6", textDecoration: isComplete ? "line-through" : "none", textDecorationColor: "rgba(110,231,183,0.4)" }}>
                        {feature.title}
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 5, background: diff.bg, color: diff.color, letterSpacing: "0.04em", fontFamily: "'JetBrains Mono', monospace" }}>
                        {diff.label}
                      </span>
                      <span style={{ fontSize: 9, fontWeight: 600, padding: "2px 7px", borderRadius: 5, background: ph.bg, color: ph.color, fontFamily: "'JetBrains Mono', monospace" }}>
                        {ph.label}
                      </span>
                      <span style={{ fontSize: 9, fontWeight: 500, padding: "2px 7px", borderRadius: 5, background: "rgba(255,255,255,0.06)", color: "#9CA3AF", fontFamily: "'JetBrains Mono', monospace" }}>
                        Sem {feature.weeks}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 99 }}>
                        <div style={{ height: "100%", width: `${prog.pct}%`, background: prog.pct === 100 ? "#10B981" : prog.pct > 0 ? "#F59E0B" : "transparent", borderRadius: 99, transition: "width 0.4s ease" }} />
                      </div>
                      <span style={{ fontSize: 10, color: "#9CA3AF", fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>
                        {prog.done}/{prog.total}
                      </span>
                      <span style={{ fontSize: 14, transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", color: "#6B7280" }}>
                        {"\u25BE"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              {isOpen && (
                <div style={{ padding: "0 18px 16px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  <p style={{ fontSize: 12, color: "#9CA3AF", margin: "12px 0", lineHeight: 1.5, paddingLeft: 40 }}>
                    {feature.description}
                  </p>
                  <div style={{ fontSize: 10, color: "#6B7280", margin: "8px 0 12px", paddingLeft: 40, fontFamily: "'JetBrains Mono', monospace" }}>
                    {"\u{1F916}"} {feature.agent}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingLeft: 40 }}>
                    {feature.tasks.map((task: any) => {
                      const isDone = checked[task.id];
                      return (
                        <div
                          key={task.id}
                          onClick={() => toggle(task.id)}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 10,
                            padding: "10px 12px",
                            borderRadius: 8,
                            background: isDone ? "rgba(16,185,129,0.08)" : "rgba(255,255,255,0.03)",
                            border: "1px solid",
                            borderColor: isDone ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.05)",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            userSelect: "none",
                          }}
                        >
                          <div
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: 5,
                              border: "2px solid",
                              borderColor: isDone ? "#10B981" : "rgba(255,255,255,0.2)",
                              background: isDone ? "#10B981" : "transparent",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                              marginTop: 1,
                              transition: "all 0.2s ease",
                            }}
                          >
                            {isDone && (
                              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                <path d="M1 3.5L3.5 6L9 1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </div>

                          <span
                            style={{
                              fontSize: 12,
                              lineHeight: 1.4,
                              color: isDone ? "#6EE7B7" : "#D1D5DB",
                              textDecoration: isDone ? "line-through" : "none",
                              textDecorationColor: "rgba(110,231,183,0.3)",
                              opacity: isDone ? 0.7 : 1,
                              fontFamily: "'DM Sans', sans-serif",
                            }}
                          >
                            {task.text}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Summary Footer */}
        <div style={{ marginTop: 24, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: 20 }}>
          <p style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "#6B7280", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.08em" }}>Resumo por dificuldade</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {(["easy", "medium", "hard"] as const).map((d) => {
              const feats = FEATURES.filter((f) => f.difficulty === d);
              const cfg = DIFFICULTY_CONFIG[d];
              return (
                <div key={d} style={{ flex: 1, minWidth: 140, background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: 14, border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: cfg.bg, color: cfg.color, fontFamily: "'JetBrains Mono', monospace" }}>{cfg.label}</span>
                  </div>
                  <p style={{ fontSize: 20, fontWeight: 800, color: "#F3F4F6", margin: "4px 0 2px" }}>{feats.length}</p>
                  <p style={{ fontSize: 10, color: "#6B7280", margin: 0 }}>funcionalidades \u2022 {cfg.time} cada</p>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 16, padding: 14, background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)", borderRadius: 10 }}>
            <p style={{ fontSize: 12, color: "#6EE7B7", fontWeight: 600, margin: "0 0 4px" }}>{"\u{1F4A1}"} Ordem recomendada de desenvolvimento:</p>
            <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0, lineHeight: 1.5 }}>
              Fase 1 (MVP): Infraestrutura + Radar/Lotes + Simulador Lucro/@ + Chat IA + Clima {"\u2192"} Fase 2: Balan\u00e7a + DRE {"\u2192"} Fase 3: Radar Regional + Ranking + Marketplace + Preditiva {"\u2192"} Fase 4: Computer Vision + Sat\u00e9lite
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
