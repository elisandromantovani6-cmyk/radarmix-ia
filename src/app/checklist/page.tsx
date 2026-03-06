'use client'
import { useState, useEffect } from "react";

const FEATURES = [
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
      { id: "4b", text: "Rotular fotos: % de sobra, qualidade vis\u00edvel" },
      { id: "4c", text: "Treinar modelo de vis\u00e3o (pode usar API Claude Vision)", done: true },
      { id: "4d", text: "Criar fluxo: tirar foto \u2192 upload \u2192 an\u00e1lise \u2192 resultado", done: true },
      { id: "4e", text: "MVP alternativo: produtor informa sobra manualmente (mais simples)", done: true },
      { id: "4f", text: "Tela de resultado: '12% sobra \u2014 reduza 0.8kg/cab/dia'", done: true },
      { id: "4g", text: "Treinar modelo continuamente com novas fotos dos usu\u00e1rios" },
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
      { id: "8g", text: "Exportar relat\u00f3rio em PDF por lote", done: true },
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
      { id: "9f", text: "Notifica\u00e7\u00f5es: 'Voc\u00ea subiu pro Top 20%!'" },
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
      { id: "10g", text: "Painel do fornecedor para gerenciar produtos e pre\u00e7os" },
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
      { id: "11c", text: "Calcular ITU (Indice Temperatura e Umidade) autom\u00e1tico", done: true },
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
    id: 12.1,
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
    id: 13,
    icon: "\uD83D\uDC89",
    title: "Manejo Sanit\u00e1rio \u2014 Calend\u00e1rio de Vacinas",
    difficulty: "medium",
    phase: 2,
    weeks: "7-10",
    description: "Controle completo de vacinas, vermifuga\u00e7\u00f5es e tratamentos por lote e individual. Alertas autom\u00e1ticos.",
    agent: "Agente Sanit\u00e1rio",
    tasks: [
      { id: "14a", text: "Criar tabelas 'health_protocols' e 'health_events' no Supabase", done: true },
      { id: "14b", text: "Calend\u00e1rio sanit\u00e1rio oficial MT: aftosa, brucelose, raiva, clostridioses", done: true },
      { id: "14c", text: "Tela de registro de evento sanit\u00e1rio (vacina, verm\u00edfugo, tratamento)", done: true },
      { id: "14d", text: "Alertas autom\u00e1ticos: 'Vacina\u00e7\u00e3o de aftosa em 15 dias'", done: true },
      { id: "14e", text: "Controle de vermifuga\u00e7\u00e3o: OPG, princ\u00edpio ativo, rota\u00e7\u00e3o de base", done: true },
      { id: "14f", text: "Custo sanit\u00e1rio por cabe\u00e7a: integrar no DRE do lote", done: true },
      { id: "14g", text: "Hist\u00f3rico sanit\u00e1rio do lote e do animal individual", done: true },
      { id: "14h", text: "Relat\u00f3rio sanit\u00e1rio para GTA e fiscaliza\u00e7\u00e3o (INDEA-MT)", done: true },
      { id: "14i", text: "IA sugere protocolo sanit\u00e1rio baseado na regi\u00e3o e \u00e9poca", done: true },
      { id: "14j", text: "Dashboard sanit\u00e1rio: lotes em dia vs atrasados", done: true },
    ],
  },
  {
    id: 14,
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
      { id: "15d", text: "Banco local (SQLite/WatermelonDB) para dados offline" },
      { id: "15e", text: "Sincroniza\u00e7\u00e3o autom\u00e1tica: offline \u2192 online com Supabase" },
      { id: "15f", text: "Modo campo: interface simplificada para uso no curral" },
      { id: "15g", text: "Integra\u00e7\u00e3o Bluetooth com balan\u00e7as (Coimma, Tru-Test)" },
      { id: "15h", text: "Publicar na Google Play Store" },
      { id: "15i", text: "Publicar na Apple App Store" },
      { id: "15j", text: "Push notifications: alertas de vacina, clima, pre\u00e7o da @" },
    ],
  },
  {
    id: 15,
    icon: "\uD83D\uDD04",
    title: "Comparar Produtos + Estoque + Lota\u00e7\u00e3o",
    difficulty: "easy",
    phase: 1,
    weeks: "2-3",
    description: "Funcionalidades extras: compara\u00e7\u00e3o entre produtos, controle de estoque com dias restantes, e c\u00e1lculo de lota\u00e7\u00e3o/capacidade do pasto.",
    agent: "Agente Operacional",
    tasks: [
      { id: "16a", text: "Comparar produtos lado a lado (garantias, pre\u00e7o, indica\u00e7\u00e3o)", done: true },
      { id: "16b", text: "Controle de estoque: produto, quantidade, consumo/dia, pre\u00e7o/kg", done: true },
      { id: "16c", text: "Indicador de dias restantes de estoque com status (OK/Alerta)", done: true },
      { id: "16d", text: "C\u00e1lculo de lota\u00e7\u00e3o: cab/ha atual vs capacidade suporte", done: true },
      { id: "16e", text: "Alerta de superlota\u00e7\u00e3o autom\u00e1tico", done: true },
      { id: "16f", text: "Bot\u00e3o + Adicionar estoque com formul\u00e1rio", done: true },
    ],
  },
  {
    id: 16,
    icon: "\uD83C\uDFA8",
    title: "Design + UX + Deploy",
    difficulty: "easy",
    phase: 1,
    weeks: "1-2",
    description: "Tema premium, logo real, navega\u00e7\u00e3o mobile, PWA e publica\u00e7\u00e3o no Vercel.",
    agent: "Agente UX",
    tasks: [
      { id: "17a", text: "Tema premium dark com cores Radarmix (laranja #F97316)", done: true },
      { id: "17b", text: "Fonte Outfit premium + cards glass morphism", done: true },
      { id: "17c", text: "Logo real da Radarmix integrada no app", done: true },
      { id: "17d", text: "Barra de navega\u00e7\u00e3o inferior (mobile-first): In\u00edcio, Chat, Connect, Ranking, Checklist", done: true },
      { id: "17e", text: "Checklist de desenvolvimento vis\u00edvel no app", done: true },
      { id: "17f", text: "Deploy no Vercel com HTTPS (radarmix-ia.vercel.app)", done: true },
      { id: "17g", text: "PWA configurado: manifest + service worker + offline", done: true },
      { id: "17h", text: "Pitch deck para investidores (12 slides)", done: true },
      { id: "17i", text: "3 modelos de email para capta\u00e7\u00e3o de investimento", done: true },
    ],
  },
  // ========== FASE 5 — IA AVANÇADA ==========
  {
    id: 17,
    icon: "\uD83D\uDD2E",
    title: "IA Previs\u00e3o de Lucro com Probabilidade",
    difficulty: "medium",
    phase: 5,
    weeks: "2-4",
    description: "IA prev\u00ea lucro futuro do lote antes de come\u00e7ar, com probabilidade, ponto de equil\u00edbrio e dias at\u00e9 abate.",
    agent: "Agente Preditivo Financeiro",
    tasks: [
      { id: "18a", text: "Modelo: ra\u00e7a + peso + dieta + custo + @pre\u00e7o + clima \u2192 lucro prov\u00e1vel" },
      { id: "18b", text: "Calcular probabilidade de lucro (%) com intervalo de confian\u00e7a" },
      { id: "18c", text: "Ponto de equil\u00edbrio: pre\u00e7o m\u00ednimo da @ para n\u00e3o ter preju\u00edzo" },
      { id: "18d", text: "Proje\u00e7\u00e3o de dias at\u00e9 abate com GMD estimado" },
      { id: "18e", text: "Cen\u00e1rios: otimista, prov\u00e1vel, pessimista com Monte Carlo" },
      { id: "18f", text: "Dashboard visual: gr\u00e1fico de probabilidade de lucro" },
      { id: "18g", text: "Comparar cen\u00e1rios: confinar vs pasto vs semi" },
    ],
  },
  {
    id: 18,
    icon: "\uD83C\uDF7D\uFE0F",
    title: "IA Formuladora de Dieta Autom\u00e1tica",
    difficulty: "medium",
    phase: 5,
    weeks: "3-5",
    description: "IA monta dieta completa automaticamente: ingredientes, quantidades, custo, ganho esperado e efici\u00eancia.",
    agent: "Agente Nutricionista IA",
    tasks: [
      { id: "19a", text: "Entrada: peso, ra\u00e7a, fase, pasto, objetivo (GMD desejado)" },
      { id: "19b", text: "IA calcula exig\u00eancias nutricionais (PB, NDT, Ca, P, micromin.)" },
      { id: "19c", text: "Seleciona ingredientes dispon\u00edveis (milho, farelo, n\u00facleo, mineral)" },
      { id: "19d", text: "Otimiza dieta por custo m\u00ednimo atendendo exig\u00eancias (solver)" },
      { id: "19e", text: "Sa\u00edda: kg de cada ingrediente + custo/dia + ganho esperado" },
      { id: "19f", text: "Calcular efici\u00eancia alimentar (kg MS / kg ganho)" },
      { id: "19g", text: "Comparar dieta IA vs dieta atual do produtor" },
      { id: "19h", text: "Integrar com estoque: alertar quando ingrediente acabar" },
    ],
  },
  {
    id: 19,
    icon: "\uD83D\uDCCA",
    title: "Radar de Pre\u00e7os Agro (Bloomberg Rural)",
    difficulty: "hard",
    phase: 5,
    weeks: "4-8",
    description: "Monitor nacional de pre\u00e7os de insumos e arroba. IA detecta oportunidades de compra e venda.",
    agent: "Agente de Mercado",
    tasks: [
      { id: "20a", text: "Integrar API CEPEA/Esalq para pre\u00e7o da @ em tempo real" },
      { id: "20b", text: "Integrar IMEA-MT para pre\u00e7os de insumos (milho, soja, farelo)" },
      { id: "20c", text: "Hist\u00f3rico de pre\u00e7os com gr\u00e1fico de tend\u00eancia (30, 90, 365 dias)" },
      { id: "20d", text: "IA detecta queda de pre\u00e7o: 'Milho caiu 9% em 7 dias'" },
      { id: "20e", text: "Calcular economia potencial: 'Comprar agora economiza R$ 5.420 no lote 3'" },
      { id: "20f", text: "Alertas push de oportunidade de compra/venda" },
      { id: "20g", text: "Comparar pre\u00e7os entre fornecedores do marketplace" },
    ],
  },
  {
    id: 20,
    icon: "\uD83D\uDCF7",
    title: "IA Estima Peso do Gado pela C\u00e2mera",
    difficulty: "hard",
    phase: 5,
    weeks: "8-14",
    description: "Produtor tira foto do animal. IA estima peso, escore corporal e crescimento sem balan\u00e7a.",
    agent: "Agente Vis\u00e3o Animal",
    tasks: [
      { id: "21a", text: "Coletar dataset: 1000+ fotos de bovinos com peso real registrado" },
      { id: "21b", text: "Treinar modelo: pose estimation + depth estimation \u2192 peso" },
      { id: "21c", text: "Fluxo: tirar foto \u2192 upload \u2192 IA processa \u2192 peso estimado" },
      { id: "21d", text: "Calcular escore corporal (1-9) pela foto" },
      { id: "21e", text: "Comparar peso estimado vs \u00faltima pesagem real" },
      { id: "21f", text: "Parceria com UFMT/Embrapa para valida\u00e7\u00e3o cient\u00edfica" },
      { id: "21g", text: "Integrar com pesagem: substituir balan\u00e7a em fazendas menores" },
    ],
  },
  {
    id: 21,
    icon: "\uD83C\uDF21\uFE0F",
    title: "IA Previs\u00e3o de Estresse T\u00e9rmico",
    difficulty: "easy",
    phase: 5,
    weeks: "1-2",
    description: "Cruza temperatura, umidade, vento e radia\u00e7\u00e3o solar para prever estresse t\u00e9rmico e impacto no GMD.",
    agent: "Agente Clima Avan\u00e7ado",
    tasks: [
      { id: "22a", text: "Cruzar previs\u00e3o 5 dias com modelo de ITU preditivo" },
      { id: "22b", text: "Calcular impacto no GMD: 'Estresse previsto \u2192 -0.12 kg/dia'" },
      { id: "22c", text: "Sugest\u00f5es autom\u00e1ticas: sombra, alterar dieta, manejo de \u00e1gua" },
      { id: "22d", text: "Alerta antecipado: 'Estresse t\u00e9rmico em 2 dias'" },
      { id: "22e", text: "Hist\u00f3rico de eventos de estresse vs GMD real (correla\u00e7\u00e3o)" },
    ],
  },
  {
    id: 22,
    icon: "\uD83D\uDEE1\uFE0F",
    title: "IA Previs\u00e3o de Problemas Sanit\u00e1rios",
    difficulty: "medium",
    phase: 5,
    weeks: "3-5",
    description: "Cruza clima, regi\u00e3o e hist\u00f3rico para prever risco de doen\u00e7as: pneumonia, tristeza parasit\u00e1ria, carrapato.",
    agent: "Agente Sanit\u00e1rio Preditivo",
    tasks: [
      { id: "23a", text: "Modelo: clima + regi\u00e3o + \u00e9poca + hist\u00f3rico \u2192 risco de doen\u00e7a" },
      { id: "23b", text: "Prever risco de carrapato com probabilidade (%)" },
      { id: "23c", text: "Prever risco de pneumonia (frio + chuva + lota\u00e7\u00e3o)" },
      { id: "23d", text: "Prever tristeza parasit\u00e1ria (\u00e9poca + regi\u00e3o end\u00eamica)" },
      { id: "23e", text: "Recomenda\u00e7\u00e3o preventiva com prazo: 'Aplicar controle em 5 dias'" },
      { id: "23f", text: "Integrar com calend\u00e1rio sanit\u00e1rio: antecipar vacinas se risco alto" },
    ],
  },
  {
    id: 23,
    icon: "\uD83E\uDDE0",
    title: "IA Intelig\u00eancia Coletiva (aprende com todos)",
    difficulty: "hard",
    phase: 5,
    weeks: "6-10",
    description: "Sistema aprende com milhares de fazendas. Sugere pr\u00e1ticas de produtores com perfil similar e melhores resultados.",
    agent: "Agente Rede Neural",
    tasks: [
      { id: "24a", text: "Anonimizar e agregar dados de todos os produtores" },
      { id: "24b", text: "Clustering: agrupar fazendas por perfil (ra\u00e7a, regi\u00e3o, sistema)" },
      { id: "24c", text: "Benchmark: 'Produtores similares usam X e t\u00eam +14% GMD'" },
      { id: "24d", text: "Sugest\u00f5es personalizadas baseadas em melhores pr\u00e1ticas da rede" },
      { id: "24e", text: "Ranking an\u00f4nimo: 'Voc\u00ea est\u00e1 no top 20% da sua regi\u00e3o'" },
      { id: "24f", text: "Precisa de massa cr\u00edtica: m\u00ednimo 100 produtores com dados reais" },
    ],
  },
  {
    id: 24,
    icon: "\uD83D\uDCC8",
    title: "IA Melhor Momento de Vender o Boi",
    difficulty: "medium",
    phase: 5,
    weeks: "3-5",
    description: "Cruza pre\u00e7o hist\u00f3rico, oferta de boi gordo, d\u00f3lar e exporta\u00e7\u00e3o para sugerir janela ideal de venda.",
    agent: "Agente Trader",
    tasks: [
      { id: "25a", text: "Integrar dados hist\u00f3ricos de pre\u00e7o da @ (CEPEA, B3)" },
      { id: "25b", text: "Modelo: sazonalidade + oferta + d\u00f3lar + exporta\u00e7\u00e3o \u2192 previs\u00e3o" },
      { id: "25c", text: "Calcular janela ideal de venda com pre\u00e7o estimado" },
      { id: "25d", text: "Alertar quando pre\u00e7o atingir ponto \u00f3timo de venda" },
      { id: "25e", text: "Comparar: vender agora vs esperar 30/60/90 dias" },
      { id: "25f", text: "Integrar com DRE: simular lucro em cada cen\u00e1rio de venda" },
    ],
  },
  {
    id: 25,
    icon: "\uD83D\uDCA1",
    title: "IA Detectora de Desperd\u00edcio Financeiro",
    difficulty: "easy",
    phase: 5,
    weeks: "2-3",
    description: "IA analisa custos, dieta e insumos e detecta onde o produtor est\u00e1 pagando mais que a m\u00e9dia regional.",
    agent: "Agente Efici\u00eancia",
    tasks: [
      { id: "26a", text: "Comparar custo de dieta do produtor vs m\u00e9dia regional" },
      { id: "26b", text: "Detectar insumo mais caro: 'Farelo 14% acima da regi\u00e3o'" },
      { id: "26c", text: "Calcular dieta de custo \u00f3timo e comparar com atual" },
      { id: "26d", text: "Sugerir trocas: fornecedor mais barato ou ingrediente alternativo" },
      { id: "26e", text: "Relat\u00f3rio mensal de economia potencial (R$)" },
    ],
  },
  {
    id: 26,
    icon: "\uD83E\uDD16",
    title: "Copiloto da Fazenda (Consultor Digital Di\u00e1rio)",
    difficulty: "medium",
    phase: 5,
    weeks: "3-5",
    description: "Agente IA que analisa tudo e gera briefing matinal com a\u00e7\u00f5es do dia para o produtor.",
    agent: "Agente Copiloto",
    tasks: [
      { id: "27a", text: "Cruzar todos os m\u00f3dulos: clima, lotes, estoque, sanit\u00e1rio, pre\u00e7os" },
      { id: "27b", text: "Gerar resumo di\u00e1rio autom\u00e1tico com 3-5 a\u00e7\u00f5es priorit\u00e1rias" },
      { id: "27c", text: "Exemplo: 'Reduzir milho lote 2, n\u00e3o pesar (chuva), comprar mineral'" },
      { id: "27d", text: "Push notification matinal: briefing do dia" },
      { id: "27e", text: "Aprender com feedback: produtor marca a\u00e7\u00f5es como feitas ou ignoradas" },
      { id: "27f", text: "Tela dedicada no app: 'Bom dia, aqui est\u00e1 seu dia'" },
    ],
  },
  // ========== FASE 6 — FINTECH AGRO ==========
  {
    id: 27,
    icon: "\uD83C\uDFE6",
    title: "Cr\u00e9dito Inteligente (Score Produtivo)",
    difficulty: "hard",
    phase: 6,
    weeks: "10-16",
    description: "IA calcula score produtivo da fazenda baseado em dados reais. Parceria com banco/fintech para aprova\u00e7\u00e3o de cr\u00e9dito.",
    agent: "Agente Fintech",
    tasks: [
      { id: "28a", text: "Modelo de score produtivo: GMD, ROI, lota\u00e7\u00e3o, efici\u00eancia" },
      { id: "28b", text: "Calcular capacidade de pagamento baseada no DRE real" },
      { id: "28c", text: "Dashboard de score para o produtor: 'Seu score: 842'" },
      { id: "28d", text: "Parceria com banco/fintech (BB, Sicredi, Asaas)" },
      { id: "28e", text: "Integrar aprova\u00e7\u00e3o de cr\u00e9dito no app" },
      { id: "28f", text: "Modelo de receita: comiss\u00e3o por cr\u00e9dito aprovado" },
    ],
  },
  {
    id: 28,
    icon: "\uD83E\uDD1D",
    title: "Compra Coletiva Autom\u00e1tica de Insumos",
    difficulty: "medium",
    phase: 6,
    weeks: "4-8",
    description: "IA detecta quando v\u00e1rios produtores da mesma regi\u00e3o precisam do mesmo insumo e dispara compra coletiva.",
    agent: "Agente Negocia\u00e7\u00e3o",
    tasks: [
      { id: "29a", text: "Detectar demanda agregada: produtores + regi\u00e3o + produto + prazo" },
      { id: "29b", text: "Calcular volume total e negociar pre\u00e7o com fornecedor" },
      { id: "29c", text: "Notificar produtores: 'Pre\u00e7o normal R$78/saca \u2192 R$70 com 24 produtores'" },
      { id: "29d", text: "Sistema de ades\u00e3o: produtor confirma quantidade e prazo" },
      { id: "29e", text: "Log\u00edstica: coordenar entrega para m\u00faltiplas fazendas" },
      { id: "29f", text: "Modelo de receita: comiss\u00e3o sobre economia gerada" },
    ],
  },
  {
    id: 29,
    icon: "\uD83D\uDEE1\uFE0F",
    title: "Seguro Rural Baseado em Dados Reais",
    difficulty: "hard",
    phase: 6,
    weeks: "10-16",
    description: "Seguro rural mais barato porque o risco \u00e9 calculado com dados reais da fazenda (clima, pastagem, desempenho).",
    agent: "Agente Seguros",
    tasks: [
      { id: "30a", text: "Modelo de risco: clima + pastagem + desempenho + hist\u00f3rico \u2192 risco" },
      { id: "30b", text: "Calcular pr\u00eamio justo: 'Seguro mortalidade: R$ 2.180/ano'" },
      { id: "30c", text: "Parceria com seguradora (Brasilseg, Fairfax, Swiss Re)" },
      { id: "30d", text: "Dashboard de risco para o produtor" },
      { id: "30e", text: "Modelo de receita: comiss\u00e3o seguradora" },
    ],
  },
  {
    id: 30,
    icon: "\uD83D\uDCC9",
    title: "Hedge Autom\u00e1tico da Arroba",
    difficulty: "hard",
    phase: 6,
    weeks: "8-12",
    description: "IA sugere travamento de pre\u00e7o futuro quando detecta probabilidade de queda. Integra\u00e7\u00e3o com B3/corretoras.",
    agent: "Agente Hedge",
    tasks: [
      { id: "31a", text: "Modelo: pre\u00e7o atual + tend\u00eancia + oferta \u2192 probabilidade de queda" },
      { id: "31b", text: "Sugerir travamento: 'Pre\u00e7o R$298, prob. queda 63%, travar a R$304'" },
      { id: "31c", text: "Parceria com corretora B3 para execu\u00e7\u00e3o" },
      { id: "31d", text: "Dashboard de posi\u00e7\u00f5es e resultados do hedge" },
      { id: "31e", text: "Modelo de receita: comiss\u00e3o por opera\u00e7\u00e3o" },
    ],
  },
  {
    id: 31,
    icon: "\uD83D\uDCB3",
    title: "Conta Digital do Produtor",
    difficulty: "hard",
    phase: 6,
    weeks: "12-20",
    description: "Conta banc\u00e1ria digital dentro do app: pagar insumos, receber venda de gado, cr\u00e9dito rural, financiamento.",
    agent: "Agente Banking",
    tasks: [
      { id: "32a", text: "Parceria com institui\u00e7\u00e3o de pagamento (Asaas, Stark, Celcoin)" },
      { id: "32b", text: "Conta digital com Pix, boleto e TED" },
      { id: "32c", text: "Pagar insumos direto pelo marketplace" },
      { id: "32d", text: "Receber pagamento de venda de gado no app" },
      { id: "32e", text: "Cr\u00e9dito rural integrado com score produtivo" },
      { id: "32f", text: "Modelo de receita: taxas, float, cr\u00e9dito" },
    ],
  },
];

const DIFFICULTY_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; time: string }> = {
  easy: { label: "F\u00c1CIL", color: "#059669", bg: "#D1FAE5", border: "#6EE7B7", time: "2-4 semanas" },
  medium: { label: "M\u00c9DIO", color: "#D97706", bg: "#FEF3C7", border: "#FCD34D", time: "4-8 semanas" },
  hard: { label: "DIF\u00cdCIL", color: "#DC2626", bg: "#FEE2E2", border: "#FCA5A5", time: "8-12 semanas" },
};

const PHASE_CONFIG: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: "FASE 1 \u2014 MVP", color: "#059669", bg: "#ECFDF5" },
  2: { label: "FASE 2 \u2014 Expans\u00e3o", color: "#2563EB", bg: "#EFF6FF" },
  3: { label: "FASE 3 \u2014 Plataforma", color: "#7C3AED", bg: "#F5F3FF" },
  4: { label: "FASE 4 \u2014 Domin\u00e2ncia", color: "#DC2626", bg: "#FEF2F2" },
  5: { label: "FASE 5 \u2014 IA Avan\u00e7ada", color: "#0891B2", bg: "#ECFEFF" },
  6: { label: "FASE 6 \u2014 Fintech Agro", color: "#CA8A04", bg: "#FEFCE8" },
};

export default function RadarmixChecklist() {
  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    FEATURES.forEach(f => f.tasks.forEach(t => { if (t.done) initial[t.id] = true; }));
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

  const getFeatureProgress = (feature: typeof FEATURES[number]) => {
    const done = feature.tasks.filter((t) => checked[t.id]).length;
    return { done, total: feature.tasks.length, pct: Math.round((done / feature.tasks.length) * 100) };
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0C0F14", color: "#E5E7EB", fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ background: "linear-gradient(160deg, #0B3D2E 0%, #064E3B 40%, #0F172A 100%)", padding: "28px 20px 24px", borderBottom: "1px solid rgba(16,185,129,0.2)" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{"\u{1F402}"}</div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0, letterSpacing: "-0.03em", color: "#F9FAFB" }}>RADARMIX IA</h1>
              <p style={{ fontSize: 11, margin: 0, color: "#6EE7B7", letterSpacing: "0.08em", fontFamily: "'JetBrains Mono', monospace" }}>CHECKLIST DE DESENVOLVIMENTO &bull; v3.1 &bull; 33 FEATURES &bull; 6 FASES</p>
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
            {[1, 2, 3, 4, 5, 6].map((phase) => {
              const phaseFeatures = FEATURES.filter((f) => f.phase === phase);
              const phaseTasks = phaseFeatures.reduce((a, f) => a + f.tasks.length, 0);
              const phaseDone = phaseFeatures.reduce((a, f) => a + f.tasks.filter((t) => checked[t.id]).length, 0);
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
            { val: 0, label: "Todas (33)" },
            { val: 1, label: "Fase 1 \u2022 MVP" },
            { val: 2, label: "Fase 2 \u2022 Expans\u00e3o" },
            { val: 3, label: "Fase 3 \u2022 Plataforma" },
            { val: 4, label: "Fase 4 \u2022 Domin\u00e2ncia" },
            { val: 5, label: "Fase 5 \u2022 IA Avan\u00e7ada" },
            { val: 6, label: "Fase 6 \u2022 Fintech" },
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
                  {/* Icon */}
                  <div style={{ fontSize: 26, lineHeight: 1, flexShrink: 0, marginTop: 2, filter: isComplete ? "none" : "grayscale(0.3)", opacity: isComplete ? 1 : 0.8 }}>
                    {isComplete ? "\u2705" : feature.icon}
                  </div>

                  {/* Content */}
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

                    {/* Mini progress */}
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
                    {feature.tasks.map((task) => {
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
                          {/* Checkbox */}
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

                          {/* Task text */}
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
                  <p style={{ fontSize: 10, color: "#6B7280", margin: 0 }}>funcionalidades &bull; {cfg.time} cada</p>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 16, padding: 14, background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)", borderRadius: 10 }}>
            <p style={{ fontSize: 12, color: "#6EE7B7", fontWeight: 600, margin: "0 0 4px" }}>{"\u{1F4A1}"} Status do projeto:</p>
            <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0, lineHeight: 1.5 }}>
              Fase 1 (MVP): {"\u2705"} COMPLETA &bull; Fase 2 (Campo): {"\uD83D\uDD04"} 50% &bull; Fase 3 (Plataforma): {"\uD83D\uDD04"} 35% &bull; Fase 4 (DeepTech): {"\uD83D\uDD04"} 57% &bull; Fase 5 (IA Avan\u00e7ada): {"\u2B1C"} Nova &bull; Fase 6 (Fintech): {"\u2B1C"} Nova &bull; App: radarmix-ia.vercel.app
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}