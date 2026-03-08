-- =============================================================
-- Radarmix IA - Seed de Dados Nutricionais
-- Fontes: BR-CORTE 4a Ed. (2023), CQBAL 4.0, NRC/NASEM (2016)
-- =============================================================

-- =============================================================
-- PARTE 1: TABELA DE COMPOSICAO DE ALIMENTOS (Forrageiras)
-- Fonte principal: CQBAL 4.0 + estudos publicados (SciELO)
-- =============================================================

CREATE TABLE IF NOT EXISTS feed_composition (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  feed_name TEXT NOT NULL,
  feed_name_scientific TEXT,
  feed_category TEXT NOT NULL CHECK (feed_category IN (
    'pastagem_tropical', 'silagem', 'cana', 'feno', 'concentrado', 'subproduto'
  )),
  cultivar TEXT,
  season TEXT CHECK (season IN ('aguas', 'seca', 'transicao', 'media_anual')),
  -- Composicao bromatologica (% na MS salvo indicado)
  ms_percent NUMERIC,        -- Materia Seca (% materia natural)
  pb_percent NUMERIC,        -- Proteina Bruta (% MS)
  ndt_percent NUMERIC,       -- Nutrientes Digestiveis Totais (% MS)
  fdn_percent NUMERIC,       -- Fibra Detergente Neutro (% MS)
  fda_percent NUMERIC,       -- Fibra Detergente Acido (% MS)
  ee_percent NUMERIC,        -- Extrato Etereo (% MS)
  mm_percent NUMERIC,        -- Materia Mineral (% MS)
  lignina_percent NUMERIC,   -- Lignina (% MS)
  divms_percent NUMERIC,     -- Digestibilidade in vitro MS (%)
  -- Minerais
  ca_g_kg NUMERIC,           -- Calcio (g/kg MS)
  p_g_kg NUMERIC,            -- Fosforo (g/kg MS)
  na_g_kg NUMERIC,           -- Sodio (g/kg MS)
  k_g_kg NUMERIC,            -- Potassio (g/kg MS)
  mg_g_kg NUMERIC,           -- Magnesio (g/kg MS)
  s_g_kg NUMERIC,            -- Enxofre (g/kg MS)
  zn_mg_kg NUMERIC,          -- Zinco (mg/kg MS)
  cu_mg_kg NUMERIC,          -- Cobre (mg/kg MS)
  mn_mg_kg NUMERIC,          -- Manganes (mg/kg MS)
  fe_mg_kg NUMERIC,          -- Ferro (mg/kg MS)
  -- Degradabilidade ruminal
  pdr_percent NUMERIC,       -- Proteina Degradavel no Rumen (% PB)
  pndr_percent NUMERIC,      -- Proteina Nao Degradavel no Rumen (% PB)
  -- Metadados
  source TEXT DEFAULT 'CQBAL 4.0 / BR-CORTE 2023',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indice para busca por nome e categoria
CREATE INDEX IF NOT EXISTS idx_feed_composition_name ON feed_composition(feed_name);
CREATE INDEX IF NOT EXISTS idx_feed_composition_category ON feed_composition(feed_category);

-- ---------------------------------------------------------
-- INSERTS: Pastagens Tropicais
-- Fontes: CQBAL 4.0, SciELO (Ciencia e Agrotecnologia),
--         Embrapa publicacoes, BR-CORTE 2023
-- ---------------------------------------------------------

-- Brachiaria brizantha cv. Marandu - Aguas (periodo chuvoso)
INSERT INTO feed_composition (feed_name, feed_name_scientific, feed_category, cultivar, season,
  ms_percent, pb_percent, ndt_percent, fdn_percent, fda_percent, ee_percent, mm_percent, lignina_percent, divms_percent,
  ca_g_kg, p_g_kg, na_g_kg, k_g_kg, mg_g_kg, s_g_kg, zn_mg_kg, cu_mg_kg, mn_mg_kg, fe_mg_kg,
  pdr_percent, pndr_percent, source, notes)
VALUES (
  'Brachiaria brizantha cv. Marandu', 'Urochloa brizantha', 'pastagem_tropical', 'Marandu', 'aguas',
  18.05, 12.40, 55.0, 56.33, 24.05, 2.1, 8.5, 3.8, 62.0,
  3.5, 1.8, 0.3, 18.0, 2.5, 1.5, 25.0, 7.0, 120.0, 250.0,
  70.0, 30.0,
  'CQBAL 4.0 / SciELO - Ciencia Animal Brasileira',
  'Valores medios periodo chuvoso, 28-35 dias rebrota. MS e PB de estudo SciELO com cultivares Brachiaria/Panicum.'
);

-- Brachiaria brizantha cv. Marandu - Seca (periodo seco)
INSERT INTO feed_composition (feed_name, feed_name_scientific, feed_category, cultivar, season,
  ms_percent, pb_percent, ndt_percent, fdn_percent, fda_percent, ee_percent, mm_percent, lignina_percent, divms_percent,
  ca_g_kg, p_g_kg, na_g_kg, k_g_kg, mg_g_kg, s_g_kg, zn_mg_kg, cu_mg_kg, mn_mg_kg, fe_mg_kg,
  pdr_percent, pndr_percent, source, notes)
VALUES (
  'Brachiaria brizantha cv. Marandu', 'Urochloa brizantha', 'pastagem_tropical', 'Marandu', 'seca',
  28.0, 5.5, 48.0, 72.0, 38.0, 1.5, 7.0, 5.8, 50.0,
  3.2, 1.2, 0.2, 12.0, 2.0, 1.2, 20.0, 5.0, 100.0, 300.0,
  65.0, 35.0,
  'CQBAL 4.0 / SciELO - Revista Brasileira de Zootecnia',
  'Valores periodo seco, pastagem diferida. PB cai abaixo de 7%, limitando consumo voluntario. FDN acima 70% reduz CMS.'
);

-- Brachiaria brizantha cv. Xaraes (MG-5) - Aguas
INSERT INTO feed_composition (feed_name, feed_name_scientific, feed_category, cultivar, season,
  ms_percent, pb_percent, ndt_percent, fdn_percent, fda_percent, ee_percent, mm_percent, lignina_percent, divms_percent,
  ca_g_kg, p_g_kg, na_g_kg, k_g_kg, mg_g_kg, s_g_kg, zn_mg_kg, cu_mg_kg, mn_mg_kg, fe_mg_kg,
  pdr_percent, pndr_percent, source, notes)
VALUES (
  'Brachiaria brizantha cv. Xaraes', 'Urochloa brizantha', 'pastagem_tropical', 'Xaraes/MG-5', 'aguas',
  20.20, 12.38, 56.0, 58.21, 24.80, 2.2, 8.8, 3.5, 63.0,
  3.8, 2.0, 0.3, 19.0, 2.6, 1.6, 27.0, 8.0, 115.0, 230.0,
  72.0, 28.0,
  'CQBAL 4.0 / SciELO - Ciencia e Agrotecnologia',
  'Xaraes apresenta maior MS e PB similar ao Marandu. FDN e FDA ligeiramente superiores. Dados de estudo em Jequitinhonha-MG.'
);

-- Brachiaria brizantha cv. Xaraes (MG-5) - Seca
INSERT INTO feed_composition (feed_name, feed_name_scientific, feed_category, cultivar, season,
  ms_percent, pb_percent, ndt_percent, fdn_percent, fda_percent, ee_percent, mm_percent, lignina_percent, divms_percent,
  ca_g_kg, p_g_kg, na_g_kg, k_g_kg, mg_g_kg, s_g_kg, zn_mg_kg, cu_mg_kg, mn_mg_kg, fe_mg_kg,
  pdr_percent, pndr_percent, source, notes)
VALUES (
  'Brachiaria brizantha cv. Xaraes', 'Urochloa brizantha', 'pastagem_tropical', 'Xaraes/MG-5', 'seca',
  30.0, 5.8, 47.0, 73.0, 39.0, 1.4, 6.8, 6.0, 49.0,
  3.0, 1.1, 0.2, 11.0, 1.9, 1.1, 18.0, 5.0, 95.0, 310.0,
  63.0, 37.0,
  'CQBAL 4.0 / SciELO',
  'Periodo seco, pastagem diferida. Queda acentuada de PB e aumento de fibra.'
);

-- Brachiaria decumbens (Basilisk) - Aguas
INSERT INTO feed_composition (feed_name, feed_name_scientific, feed_category, cultivar, season,
  ms_percent, pb_percent, ndt_percent, fdn_percent, fda_percent, ee_percent, mm_percent, lignina_percent, divms_percent,
  ca_g_kg, p_g_kg, na_g_kg, k_g_kg, mg_g_kg, s_g_kg, zn_mg_kg, cu_mg_kg, mn_mg_kg, fe_mg_kg,
  pdr_percent, pndr_percent, source, notes)
VALUES (
  'Brachiaria decumbens', 'Urochloa decumbens', 'pastagem_tropical', 'Basilisk', 'aguas',
  14.00, 10.40, 53.0, 62.65, 27.46, 1.8, 8.0, 4.2, 58.0,
  3.0, 1.5, 0.2, 16.0, 2.2, 1.3, 22.0, 6.0, 130.0, 280.0,
  68.0, 32.0,
  'CQBAL 4.0 / SciELO - Ciencia Animal Brasileira / Botrel et al.',
  'PB 10.4% no periodo chuvoso (Botrel et al., Sul de Minas). MS mais baixa entre as braquiarias.'
);

-- Brachiaria decumbens (Basilisk) - Seca
INSERT INTO feed_composition (feed_name, feed_name_scientific, feed_category, cultivar, season,
  ms_percent, pb_percent, ndt_percent, fdn_percent, fda_percent, ee_percent, mm_percent, lignina_percent, divms_percent,
  ca_g_kg, p_g_kg, na_g_kg, k_g_kg, mg_g_kg, s_g_kg, zn_mg_kg, cu_mg_kg, mn_mg_kg, fe_mg_kg,
  pdr_percent, pndr_percent, source, notes)
VALUES (
  'Brachiaria decumbens', 'Urochloa decumbens', 'pastagem_tropical', 'Basilisk', 'seca',
  35.0, 2.5, 42.0, 78.0, 45.0, 1.2, 6.5, 8.7, 40.0,
  2.8, 0.9, 0.15, 8.0, 1.8, 1.0, 16.0, 4.0, 110.0, 350.0,
  60.0, 40.0,
  'SciELO - Revista Brasileira de Zootecnia',
  'Periodo seco extremo: PB < 2.5%, FDN > 78%, lignina > 8.7%. Pastagem diferida com forte queda de qualidade.'
);

-- Brachiaria humidicola (Llanero/Quicuio) - Aguas
INSERT INTO feed_composition (feed_name, feed_name_scientific, feed_category, cultivar, season,
  ms_percent, pb_percent, ndt_percent, fdn_percent, fda_percent, ee_percent, mm_percent, lignina_percent, divms_percent,
  ca_g_kg, p_g_kg, na_g_kg, k_g_kg, mg_g_kg, s_g_kg, zn_mg_kg, cu_mg_kg, mn_mg_kg, fe_mg_kg,
  pdr_percent, pndr_percent, source, notes)
VALUES (
  'Brachiaria humidicola', 'Urochloa humidicola', 'pastagem_tropical', 'Llanero', 'aguas',
  18.0, 8.60, 50.0, 73.81, 35.0, 1.5, 7.5, 5.0, 54.0,
  2.8, 1.3, 0.2, 14.0, 2.0, 1.2, 20.0, 5.5, 125.0, 270.0,
  66.0, 34.0,
  'CQBAL 4.0 / SciELO - Ciencia e Agrotecnologia / Botrel et al.',
  'PB 8.6% nas aguas (Botrel et al.). FDN mais alto entre braquiarias (73.81%). Tolerante a solos acidos e umidos.'
);

-- Brachiaria humidicola (Llanero/Quicuio) - Seca
INSERT INTO feed_composition (feed_name, feed_name_scientific, feed_category, cultivar, season,
  ms_percent, pb_percent, ndt_percent, fdn_percent, fda_percent, ee_percent, mm_percent, lignina_percent, divms_percent,
  ca_g_kg, p_g_kg, na_g_kg, k_g_kg, mg_g_kg, s_g_kg, zn_mg_kg, cu_mg_kg, mn_mg_kg, fe_mg_kg,
  pdr_percent, pndr_percent, source, notes)
VALUES (
  'Brachiaria humidicola', 'Urochloa humidicola', 'pastagem_tropical', 'Llanero', 'seca',
  32.0, 4.0, 43.0, 79.0, 44.0, 1.1, 6.0, 7.5, 42.0,
  2.5, 0.8, 0.1, 8.0, 1.6, 0.9, 15.0, 4.0, 105.0, 330.0,
  58.0, 42.0,
  'CQBAL 4.0 / SciELO',
  'Periodo seco: forte queda PB e aumento fibra. Necessita suplementacao proteica obrigatoria.'
);

-- Panicum maximum cv. Mombaca - Aguas
INSERT INTO feed_composition (feed_name, feed_name_scientific, feed_category, cultivar, season,
  ms_percent, pb_percent, ndt_percent, fdn_percent, fda_percent, ee_percent, mm_percent, lignina_percent, divms_percent,
  ca_g_kg, p_g_kg, na_g_kg, k_g_kg, mg_g_kg, s_g_kg, zn_mg_kg, cu_mg_kg, mn_mg_kg, fe_mg_kg,
  pdr_percent, pndr_percent, source, notes)
VALUES (
  'Panicum maximum cv. Mombaca', 'Megathyrsus maximus', 'pastagem_tropical', 'Mombaca', 'aguas',
  18.17, 13.0, 56.0, 64.58, 28.51, 2.0, 9.0, 3.5, 60.0,
  4.0, 2.2, 0.3, 22.0, 3.0, 1.8, 30.0, 8.0, 100.0, 220.0,
  73.0, 27.0,
  'CQBAL 4.0 / SciELO - Ciencia Animal Brasileira / Embrapa',
  'Excelente forrageira, alto PB nas aguas. MS e FDN de estudo comparativo Brachiaria/Panicum. Exige solos ferteis.'
);

-- Panicum maximum cv. Mombaca - Seca
INSERT INTO feed_composition (feed_name, feed_name_scientific, feed_category, cultivar, season,
  ms_percent, pb_percent, ndt_percent, fdn_percent, fda_percent, ee_percent, mm_percent, lignina_percent, divms_percent,
  ca_g_kg, p_g_kg, na_g_kg, k_g_kg, mg_g_kg, s_g_kg, zn_mg_kg, cu_mg_kg, mn_mg_kg, fe_mg_kg,
  pdr_percent, pndr_percent, source, notes)
VALUES (
  'Panicum maximum cv. Mombaca', 'Megathyrsus maximus', 'pastagem_tropical', 'Mombaca', 'seca',
  30.0, 6.5, 48.0, 74.0, 40.0, 1.5, 7.2, 5.5, 50.0,
  3.5, 1.4, 0.2, 14.0, 2.3, 1.3, 22.0, 6.0, 85.0, 280.0,
  65.0, 35.0,
  'CQBAL 4.0 / SciELO',
  'Periodo seco: queda PB, aumento FDN. Melhor qualidade que Brachiaria na seca se bem manejado.'
);

-- Panicum maximum cv. Tanzania - Aguas
INSERT INTO feed_composition (feed_name, feed_name_scientific, feed_category, cultivar, season,
  ms_percent, pb_percent, ndt_percent, fdn_percent, fda_percent, ee_percent, mm_percent, lignina_percent, divms_percent,
  ca_g_kg, p_g_kg, na_g_kg, k_g_kg, mg_g_kg, s_g_kg, zn_mg_kg, cu_mg_kg, mn_mg_kg, fe_mg_kg,
  pdr_percent, pndr_percent, source, notes)
VALUES (
  'Panicum maximum cv. Tanzania', 'Megathyrsus maximus', 'pastagem_tropical', 'Tanzania', 'aguas',
  18.99, 12.5, 55.0, 65.29, 28.70, 2.0, 8.8, 3.6, 59.0,
  3.8, 2.0, 0.3, 20.0, 2.8, 1.7, 28.0, 7.5, 95.0, 210.0,
  72.0, 28.0,
  'CQBAL 4.0 / SciELO - Ciencia Animal Brasileira',
  'Similar ao Mombaca com FDN/FDA ligeiramente mais altos. Dados de estudo comparativo.'
);

-- Panicum maximum cv. Tanzania - Seca
INSERT INTO feed_composition (feed_name, feed_name_scientific, feed_category, cultivar, season,
  ms_percent, pb_percent, ndt_percent, fdn_percent, fda_percent, ee_percent, mm_percent, lignina_percent, divms_percent,
  ca_g_kg, p_g_kg, na_g_kg, k_g_kg, mg_g_kg, s_g_kg, zn_mg_kg, cu_mg_kg, mn_mg_kg, fe_mg_kg,
  pdr_percent, pndr_percent, source, notes)
VALUES (
  'Panicum maximum cv. Tanzania', 'Megathyrsus maximus', 'pastagem_tropical', 'Tanzania', 'seca',
  29.0, 6.2, 47.0, 74.5, 41.0, 1.4, 7.0, 5.8, 48.0,
  3.3, 1.3, 0.2, 13.0, 2.2, 1.2, 20.0, 5.5, 80.0, 270.0,
  64.0, 36.0,
  'CQBAL 4.0 / SciELO',
  'Periodo seco: reducao qualidade similar ao Mombaca.'
);

-- Panicum maximum cv. Massai - Aguas
INSERT INTO feed_composition (feed_name, feed_name_scientific, feed_category, cultivar, season,
  ms_percent, pb_percent, ndt_percent, fdn_percent, fda_percent, ee_percent, mm_percent, lignina_percent, divms_percent,
  ca_g_kg, p_g_kg, na_g_kg, k_g_kg, mg_g_kg, s_g_kg, zn_mg_kg, cu_mg_kg, mn_mg_kg, fe_mg_kg,
  pdr_percent, pndr_percent, source, notes)
VALUES (
  'Panicum maximum cv. Massai', 'Megathyrsus maximus', 'pastagem_tropical', 'Massai', 'aguas',
  20.0, 10.70, 52.0, 76.70, 35.0, 1.8, 8.2, 6.0, 57.1,
  3.2, 1.6, 0.25, 17.0, 2.3, 1.4, 24.0, 6.5, 110.0, 240.0,
  68.0, 32.0,
  'Embrapa CNPGC - Comunicado Tecnico 69',
  'PB 10.7% aguas, FDN 76.7%, DIVMO 57.1%, lignina 6.0%. Folhas com 12.5% PB. Fonte Embrapa publicacao oficial.'
);

-- Panicum maximum cv. Massai - Seca
INSERT INTO feed_composition (feed_name, feed_name_scientific, feed_category, cultivar, season,
  ms_percent, pb_percent, ndt_percent, fdn_percent, fda_percent, ee_percent, mm_percent, lignina_percent, divms_percent,
  ca_g_kg, p_g_kg, na_g_kg, k_g_kg, mg_g_kg, s_g_kg, zn_mg_kg, cu_mg_kg, mn_mg_kg, fe_mg_kg,
  pdr_percent, pndr_percent, source, notes)
VALUES (
  'Panicum maximum cv. Massai', 'Megathyrsus maximus', 'pastagem_tropical', 'Massai', 'seca',
  28.0, 8.50, 48.0, 76.00, 38.0, 1.4, 7.0, 6.4, 53.7,
  2.8, 1.1, 0.2, 11.0, 1.9, 1.1, 18.0, 5.0, 95.0, 300.0,
  62.0, 38.0,
  'Embrapa CNPGC - Comunicado Tecnico 69',
  'PB 8.5% seca, DIVMO 53.7%, lignina 6.4%. GPD sem suplemento: 27 g/dia (seca) vs 450 g/dia (aguas). Com suplemento: 720 g/dia.'
);

-- Andropogon gayanus cv. Planaltina - Aguas
INSERT INTO feed_composition (feed_name, feed_name_scientific, feed_category, cultivar, season,
  ms_percent, pb_percent, ndt_percent, fdn_percent, fda_percent, ee_percent, mm_percent, lignina_percent, divms_percent,
  ca_g_kg, p_g_kg, na_g_kg, k_g_kg, mg_g_kg, s_g_kg, zn_mg_kg, cu_mg_kg, mn_mg_kg, fe_mg_kg,
  pdr_percent, pndr_percent, source, notes)
VALUES (
  'Andropogon gayanus', 'Andropogon gayanus', 'pastagem_tropical', 'Planaltina', 'aguas',
  22.0, 9.0, 52.0, 72.0, 36.0, 1.6, 7.5, 5.0, 55.0,
  3.0, 1.5, 0.2, 15.0, 2.0, 1.3, 22.0, 6.0, 100.0, 250.0,
  67.0, 33.0,
  'CQBAL 4.0 / Embrapa - Infoteca',
  'Melhor digestibilidade com 56 dias de rebrota. Tolerante a solos pobres. GPD ate 1 kg/dia nas aguas (cv. BRS Sarandi).'
);

-- Andropogon gayanus cv. Planaltina - Seca
INSERT INTO feed_composition (feed_name, feed_name_scientific, feed_category, cultivar, season,
  ms_percent, pb_percent, ndt_percent, fdn_percent, fda_percent, ee_percent, mm_percent, lignina_percent, divms_percent,
  ca_g_kg, p_g_kg, na_g_kg, k_g_kg, mg_g_kg, s_g_kg, zn_mg_kg, cu_mg_kg, mn_mg_kg, fe_mg_kg,
  pdr_percent, pndr_percent, source, notes)
VALUES (
  'Andropogon gayanus', 'Andropogon gayanus', 'pastagem_tropical', 'Planaltina', 'seca',
  35.0, 4.5, 44.0, 78.0, 44.0, 1.2, 6.0, 7.0, 43.0,
  2.6, 0.9, 0.15, 9.0, 1.6, 1.0, 16.0, 4.0, 85.0, 320.0,
  60.0, 40.0,
  'CQBAL 4.0 / Embrapa',
  'Periodo seco: queda forte de qualidade. Necessita suplementacao.'
);

-- ---------------------------------------------------------
-- INSERTS: Cana-de-acucar
-- Fonte: SciELO, Embrapa, CQBAL 4.0
-- ---------------------------------------------------------

-- Cana-de-acucar (media anual)
INSERT INTO feed_composition (feed_name, feed_name_scientific, feed_category, cultivar, season,
  ms_percent, pb_percent, ndt_percent, fdn_percent, fda_percent, ee_percent, mm_percent, lignina_percent, divms_percent,
  ca_g_kg, p_g_kg, na_g_kg, k_g_kg, mg_g_kg, s_g_kg, zn_mg_kg, cu_mg_kg, mn_mg_kg, fe_mg_kg,
  pdr_percent, pndr_percent, source, notes)
VALUES (
  'Cana-de-acucar', 'Saccharum officinarum', 'cana', NULL, 'media_anual',
  23.0, 4.3, 62.0, 48.8, 28.8, 1.0, 3.5, 5.0, 58.0,
  2.5, 0.8, 0.1, 5.0, 1.2, 0.8, 12.0, 3.0, 60.0, 180.0,
  41.0, 59.0,
  'Embrapa CNPGC / SciELO - Revista Brasileira de Zootecnia / CQBAL 4.0',
  'MS 23%, PB 4.3%, EM 9.1 MJ/kg MS, degradabilidade ruminal 41%. NDT 62-63.5% (aumenta com idade corte). FDN 48.8-59%.'
);

-- ---------------------------------------------------------
-- INSERTS: Silagens
-- Fonte: CQBAL 4.0, SciELO, Pioneer, Embrapa
-- ---------------------------------------------------------

-- Silagem de milho
INSERT INTO feed_composition (feed_name, feed_name_scientific, feed_category, cultivar, season,
  ms_percent, pb_percent, ndt_percent, fdn_percent, fda_percent, ee_percent, mm_percent, lignina_percent, divms_percent,
  ca_g_kg, p_g_kg, na_g_kg, k_g_kg, mg_g_kg, s_g_kg, zn_mg_kg, cu_mg_kg, mn_mg_kg, fe_mg_kg,
  pdr_percent, pndr_percent, source, notes)
VALUES (
  'Silagem de milho', 'Zea mays', 'silagem', NULL, 'media_anual',
  35.0, 8.0, 65.0, 45.0, 27.0, 3.0, 4.5, 3.0, 65.0,
  2.8, 2.0, 0.2, 10.0, 2.0, 1.2, 25.0, 6.0, 40.0, 200.0,
  57.9, 42.1,
  'Embrapa CNPGC / CQBAL 4.0 / Pioneer',
  'MS ideal 32-37%, PB 8.0%, NDT >65%, FDN 36-45%, FDA <30%. EM 9.9 MJ/kg MS. Degradabilidade 57.9%.'
);

-- Silagem de sorgo
INSERT INTO feed_composition (feed_name, feed_name_scientific, feed_category, cultivar, season,
  ms_percent, pb_percent, ndt_percent, fdn_percent, fda_percent, ee_percent, mm_percent, lignina_percent, divms_percent,
  ca_g_kg, p_g_kg, na_g_kg, k_g_kg, mg_g_kg, s_g_kg, zn_mg_kg, cu_mg_kg, mn_mg_kg, fe_mg_kg,
  pdr_percent, pndr_percent, source, notes)
VALUES (
  'Silagem de sorgo', 'Sorghum bicolor', 'silagem', NULL, 'media_anual',
  31.0, 7.0, 58.0, 56.4, 33.0, 2.5, 5.0, 4.5, 60.0,
  3.0, 2.2, 0.3, 12.0, 2.5, 1.3, 22.0, 7.0, 45.0, 250.0,
  55.0, 45.0,
  'CQBAL 4.0 / SciELO - Revista Brasileira de Zootecnia',
  'MS 30-33%, PB 6-8%, FDN 40-56%, FDA 25-33%, NDT >58%. DIVMS max 69.52% (com 60% paniculas). FDN puro 65.87%.'
);

-- ---------------------------------------------------------
-- INSERTS: Capim-elefante
-- Fonte: SciELO, Embrapa, CQBAL 4.0
-- ---------------------------------------------------------

-- Capim-elefante (Napier/Cameron) - Aguas
INSERT INTO feed_composition (feed_name, feed_name_scientific, feed_category, cultivar, season,
  ms_percent, pb_percent, ndt_percent, fdn_percent, fda_percent, ee_percent, mm_percent, lignina_percent, divms_percent,
  ca_g_kg, p_g_kg, na_g_kg, k_g_kg, mg_g_kg, s_g_kg, zn_mg_kg, cu_mg_kg, mn_mg_kg, fe_mg_kg,
  pdr_percent, pndr_percent, source, notes)
VALUES (
  'Capim-elefante', 'Pennisetum purpureum', 'pastagem_tropical', 'Napier/Cameron', 'aguas',
  16.0, 11.0, 55.0, 68.0, 34.0, 2.0, 10.0, 5.0, 58.0,
  3.5, 1.8, 0.2, 20.0, 2.5, 1.5, 25.0, 7.0, 90.0, 230.0,
  70.0, 30.0,
  'SciELO - Revista Brasileira de Zootecnia / CQBAL 4.0',
  'PB 9.4-11.6% (media genotipos), FDN 66.5-70.6%, FDA 33.5-36.3%. Colheita ideal 60-90 dias rebrota.'
);

-- Capim-elefante (Napier/Cameron) - Seca
INSERT INTO feed_composition (feed_name, feed_name_scientific, feed_category, cultivar, season,
  ms_percent, pb_percent, ndt_percent, fdn_percent, fda_percent, ee_percent, mm_percent, lignina_percent, divms_percent,
  ca_g_kg, p_g_kg, na_g_kg, k_g_kg, mg_g_kg, s_g_kg, zn_mg_kg, cu_mg_kg, mn_mg_kg, fe_mg_kg,
  pdr_percent, pndr_percent, source, notes)
VALUES (
  'Capim-elefante', 'Pennisetum purpureum', 'pastagem_tropical', 'Napier/Cameron', 'seca',
  25.0, 6.0, 48.0, 74.0, 42.0, 1.4, 8.0, 6.5, 48.0,
  3.0, 1.2, 0.15, 14.0, 2.0, 1.2, 18.0, 5.0, 75.0, 300.0,
  65.0, 35.0,
  'SciELO / CQBAL 4.0',
  'Periodo seco: PB decai 0.037%/dia, DIVMS decai 0.196%/dia com maturidade. Lignina 4.86-6.18%.'
);


-- =============================================================
-- PARTE 2: TABELA DE EXIGENCIAS NUTRICIONAIS (BR-CORTE 2023)
-- Fonte: BR-CORTE 4a Ed. (2023) / UFV / SciELO
-- =============================================================

CREATE TABLE IF NOT EXISTS nutrient_requirements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  breed_type TEXT NOT NULL CHECK (breed_type IN ('zebuino', 'taurino', 'cruzado_f1', 'leiteiro_cruzado', 'holandes')),
  animal_category TEXT NOT NULL CHECK (animal_category IN (
    'macho_inteiro', 'macho_castrado', 'femea', 'vaca_lactante', 'vaca_seca', 'bezerro'
  )),
  production_system TEXT NOT NULL CHECK (production_system IN ('confinamento', 'pasto', 'semiconfinamento')),
  production_phase TEXT NOT NULL CHECK (production_phase IN ('cria', 'recria', 'engorda', 'terminacao', 'manutencao', 'lactacao')),
  body_weight_kg NUMERIC NOT NULL,
  gmd_kg_day NUMERIC NOT NULL,   -- Ganho Medio Diario
  -- Consumo
  cms_kg_day NUMERIC,            -- Consumo Materia Seca (kg/dia)
  cms_percent_pv NUMERIC,        -- CMS como % do peso vivo
  -- Energia
  ndt_kg_day NUMERIC,            -- NDT (kg/dia)
  ndt_percent_ms NUMERIC,        -- NDT (% da MS da dieta)
  em_mcal_day NUMERIC,           -- Energia Metabolizavel (Mcal/dia)
  elm_mcal_day NUMERIC,          -- Energia Liquida manutencao (Mcal/dia)
  elg_mcal_day NUMERIC,          -- Energia Liquida ganho (Mcal/dia)
  -- Proteina
  pb_g_day NUMERIC,              -- Proteina Bruta (g/dia)
  pb_percent_ms NUMERIC,         -- PB (% da MS)
  pdr_g_day NUMERIC,             -- Proteina Degradavel Rumen (g/dia)
  pndr_g_day NUMERIC,            -- Proteina Nao Degradavel Rumen (g/dia)
  pm_g_day NUMERIC,              -- Proteina Metabolizavel (g/dia)
  -- Minerais (g/dia ou mg/dia)
  ca_g_day NUMERIC,
  p_g_day NUMERIC,
  na_g_day NUMERIC,
  k_g_day NUMERIC,
  mg_g_day NUMERIC,
  s_g_day NUMERIC,
  zn_mg_day NUMERIC,
  cu_mg_day NUMERIC,
  mn_mg_day NUMERIC,
  se_mg_day NUMERIC,
  co_mg_day NUMERIC,
  i_mg_day NUMERIC,
  fe_mg_day NUMERIC,
  -- Metadados
  source TEXT DEFAULT 'BR-CORTE 4a Ed. (2023)',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nutrient_req_breed ON nutrient_requirements(breed_type);
CREATE INDEX IF NOT EXISTS idx_nutrient_req_weight ON nutrient_requirements(body_weight_kg);
CREATE INDEX IF NOT EXISTS idx_nutrient_req_phase ON nutrient_requirements(production_phase);

-- ---------------------------------------------------------
-- Equacoes BR-CORTE (salvas como referencia na tabela)
-- Fonte: BR-CORTE 2023 / SciELO (Valadares Filho et al.)
-- ---------------------------------------------------------
-- CMS (zebuinos, pasto): CMS = -2.4001 + 0.02006*PC + 4.8195*GMD - 1.5176*GMD^2
-- ELm (zebuinos): 71.30 kcal/PCVZ^0.75
-- ELm (taurinos/holandes): 88.97 kcal/PCVZ^0.75
-- ELm (cruzados F1): 70.77 kcal/PCVZ^0.75
-- ELg (zebuinos): ER = 0.0435 * PCVZ^0.75 * GDPCVZ^0.8241
-- ELg (cruzados F1): ER = 0.0377 * PCVZ^0.75 * GDPCVZ^1.0991
-- km (eficiencia manutencao): 0.63-0.65
-- kf (eficiencia ganho): 0.25-0.37
-- PCVZ/PV: 0.88 (zebu), 0.83 (holandes)
-- PMm = 3.8 g/kg PV^0.75

-- ---------------------------------------------------------
-- INSERTS: Exigencias - MACHOS INTEIROS ZEBUINOS - CONFINAMENTO
-- Valores calculados a partir das equacoes BR-CORTE 2023
-- e dados publicados (SciELO, Valadares Filho et al.)
-- ---------------------------------------------------------

-- 200 kg, GMD 0.5 kg/dia
INSERT INTO nutrient_requirements (breed_type, animal_category, production_system, production_phase,
  body_weight_kg, gmd_kg_day,
  cms_kg_day, cms_percent_pv, ndt_kg_day, ndt_percent_ms, em_mcal_day, elm_mcal_day, elg_mcal_day,
  pb_g_day, pb_percent_ms, pdr_g_day, pndr_g_day, pm_g_day,
  ca_g_day, p_g_day, na_g_day, k_g_day, mg_g_day, s_g_day,
  zn_mg_day, cu_mg_day, mn_mg_day, se_mg_day, co_mg_day, i_mg_day, fe_mg_day,
  source, notes)
VALUES (
  'zebuino', 'macho_inteiro', 'confinamento', 'recria',
  200, 0.5,
  4.8, 2.40, 2.90, 60.4, 10.5, 4.2, 1.3,
  580, 12.1, 348, 232, 420,
  11.0, 5.8, 2.8, 14.0, 3.5, 7.2,
  145, 48, 96, 0.48, 0.72, 2.4, 240,
  'BR-CORTE 4a Ed. (2023) / Equacoes Valadares Filho',
  'Recria em confinamento. CMS calculado pela equacao BR-CORTE.'
);

-- 200 kg, GMD 1.0 kg/dia
INSERT INTO nutrient_requirements (breed_type, animal_category, production_system, production_phase,
  body_weight_kg, gmd_kg_day,
  cms_kg_day, cms_percent_pv, ndt_kg_day, ndt_percent_ms, em_mcal_day, elm_mcal_day, elg_mcal_day,
  pb_g_day, pb_percent_ms, pdr_g_day, pndr_g_day, pm_g_day,
  ca_g_day, p_g_day, na_g_day, k_g_day, mg_g_day, s_g_day,
  zn_mg_day, cu_mg_day, mn_mg_day, se_mg_day, co_mg_day, i_mg_day, fe_mg_day,
  source, notes)
VALUES (
  'zebuino', 'macho_inteiro', 'confinamento', 'recria',
  200, 1.0,
  5.7, 2.85, 3.80, 66.7, 13.7, 4.2, 3.0,
  760, 13.3, 456, 304, 570,
  16.0, 8.5, 3.5, 16.0, 4.0, 8.5,
  171, 57, 114, 0.57, 0.86, 2.9, 285,
  'BR-CORTE 4a Ed. (2023)',
  'Recria intensiva. Maior exigencia de PB e energia.'
);

-- 250 kg, GMD 0.5 kg/dia
INSERT INTO nutrient_requirements (breed_type, animal_category, production_system, production_phase,
  body_weight_kg, gmd_kg_day,
  cms_kg_day, cms_percent_pv, ndt_kg_day, ndt_percent_ms, em_mcal_day, elm_mcal_day, elg_mcal_day,
  pb_g_day, pb_percent_ms, pdr_g_day, pndr_g_day, pm_g_day,
  ca_g_day, p_g_day, na_g_day, k_g_day, mg_g_day, s_g_day,
  zn_mg_day, cu_mg_day, mn_mg_day, se_mg_day, co_mg_day, i_mg_day, fe_mg_day,
  source, notes)
VALUES (
  'zebuino', 'macho_inteiro', 'confinamento', 'recria',
  250, 0.5,
  5.6, 2.24, 3.30, 58.9, 11.9, 5.0, 1.4,
  630, 11.3, 378, 252, 465,
  11.5, 6.3, 3.2, 16.0, 4.0, 8.4,
  168, 56, 112, 0.56, 0.84, 2.8, 280,
  'BR-CORTE 4a Ed. (2023)',
  'Recria, peso medio.'
);

-- 250 kg, GMD 1.0 kg/dia
INSERT INTO nutrient_requirements (breed_type, animal_category, production_system, production_phase,
  body_weight_kg, gmd_kg_day,
  cms_kg_day, cms_percent_pv, ndt_kg_day, ndt_percent_ms, em_mcal_day, elm_mcal_day, elg_mcal_day,
  pb_g_day, pb_percent_ms, pdr_g_day, pndr_g_day, pm_g_day,
  ca_g_day, p_g_day, na_g_day, k_g_day, mg_g_day, s_g_day,
  zn_mg_day, cu_mg_day, mn_mg_day, se_mg_day, co_mg_day, i_mg_day, fe_mg_day,
  source, notes)
VALUES (
  'zebuino', 'macho_inteiro', 'confinamento', 'recria',
  250, 1.0,
  6.5, 2.60, 4.30, 66.2, 15.5, 5.0, 3.4,
  830, 12.8, 498, 332, 620,
  16.5, 9.0, 4.0, 18.0, 4.5, 9.8,
  195, 65, 130, 0.65, 0.98, 3.3, 325,
  'BR-CORTE 4a Ed. (2023)',
  'Recria intensiva.'
);

-- 300 kg, GMD 0.5 kg/dia
INSERT INTO nutrient_requirements (breed_type, animal_category, production_system, production_phase,
  body_weight_kg, gmd_kg_day,
  cms_kg_day, cms_percent_pv, ndt_kg_day, ndt_percent_ms, em_mcal_day, elm_mcal_day, elg_mcal_day,
  pb_g_day, pb_percent_ms, pdr_g_day, pndr_g_day, pm_g_day,
  ca_g_day, p_g_day, na_g_day, k_g_day, mg_g_day, s_g_day,
  zn_mg_day, cu_mg_day, mn_mg_day, se_mg_day, co_mg_day, i_mg_day, fe_mg_day,
  source, notes)
VALUES (
  'zebuino', 'macho_inteiro', 'confinamento', 'recria',
  300, 0.5,
  6.4, 2.13, 3.70, 57.8, 13.3, 5.8, 1.5,
  680, 10.6, 408, 272, 500,
  12.0, 6.5, 3.5, 18.0, 4.5, 9.6,
  192, 64, 128, 0.64, 0.96, 3.2, 320,
  'BR-CORTE 4a Ed. (2023)',
  'Recria, transicao para engorda.'
);

-- 300 kg, GMD 1.0 kg/dia (caso de referencia BR-CORTE)
INSERT INTO nutrient_requirements (breed_type, animal_category, production_system, production_phase,
  body_weight_kg, gmd_kg_day,
  cms_kg_day, cms_percent_pv, ndt_kg_day, ndt_percent_ms, em_mcal_day, elm_mcal_day, elg_mcal_day,
  pb_g_day, pb_percent_ms, pdr_g_day, pndr_g_day, pm_g_day,
  ca_g_day, p_g_day, na_g_day, k_g_day, mg_g_day, s_g_day,
  zn_mg_day, cu_mg_day, mn_mg_day, se_mg_day, co_mg_day, i_mg_day, fe_mg_day,
  source, notes)
VALUES (
  'zebuino', 'macho_inteiro', 'confinamento', 'engorda',
  300, 1.0,
  7.3, 2.43, 4.36, 59.7, 15.7, 5.8, 3.8,
  801, 11.0, 481, 320, 600,
  13.5, 7.5, 4.5, 20.0, 5.0, 11.0,
  219, 73, 146, 0.73, 1.10, 3.7, 365,
  'BR-CORTE 4a Ed. (2023) - Exemplo de referencia',
  'CASO DE REFERENCIA: Nelore 300 kg, GMD 1.0 kg/dia, pasto. NDT 4.36 kg/dia e PB 801 g/dia conforme publicacao BR-CORTE.'
);

-- 300 kg, GMD 1.5 kg/dia
INSERT INTO nutrient_requirements (breed_type, animal_category, production_system, production_phase,
  body_weight_kg, gmd_kg_day,
  cms_kg_day, cms_percent_pv, ndt_kg_day, ndt_percent_ms, em_mcal_day, elm_mcal_day, elg_mcal_day,
  pb_g_day, pb_percent_ms, pdr_g_day, pndr_g_day, pm_g_day,
  ca_g_day, p_g_day, na_g_day, k_g_day, mg_g_day, s_g_day,
  zn_mg_day, cu_mg_day, mn_mg_day, se_mg_day, co_mg_day, i_mg_day, fe_mg_day,
  source, notes)
VALUES (
  'zebuino', 'macho_inteiro', 'confinamento', 'terminacao',
  300, 1.5,
  7.8, 2.60, 5.30, 67.9, 19.1, 5.8, 5.5,
  950, 12.2, 570, 380, 720,
  17.0, 9.5, 5.0, 22.0, 5.5, 11.7,
  234, 78, 156, 0.78, 1.17, 3.9, 390,
  'BR-CORTE 4a Ed. (2023)',
  'Terminacao intensiva. Alto GMD exige dieta com > 67% NDT.'
);

-- 350 kg, GMD 0.75 kg/dia
INSERT INTO nutrient_requirements (breed_type, animal_category, production_system, production_phase,
  body_weight_kg, gmd_kg_day,
  cms_kg_day, cms_percent_pv, ndt_kg_day, ndt_percent_ms, em_mcal_day, elm_mcal_day, elg_mcal_day,
  pb_g_day, pb_percent_ms, pdr_g_day, pndr_g_day, pm_g_day,
  ca_g_day, p_g_day, na_g_day, k_g_day, mg_g_day, s_g_day,
  zn_mg_day, cu_mg_day, mn_mg_day, se_mg_day, co_mg_day, i_mg_day, fe_mg_day,
  source, notes)
VALUES (
  'zebuino', 'macho_inteiro', 'confinamento', 'engorda',
  350, 0.75,
  7.5, 2.14, 4.30, 57.3, 15.5, 6.5, 2.5,
  750, 10.0, 450, 300, 560,
  12.5, 7.0, 4.2, 20.0, 5.0, 11.3,
  225, 75, 150, 0.75, 1.13, 3.8, 375,
  'BR-CORTE 4a Ed. (2023)',
  'Engorda moderada.'
);

-- 350 kg, GMD 1.0 kg/dia
INSERT INTO nutrient_requirements (breed_type, animal_category, production_system, production_phase,
  body_weight_kg, gmd_kg_day,
  cms_kg_day, cms_percent_pv, ndt_kg_day, ndt_percent_ms, em_mcal_day, elm_mcal_day, elg_mcal_day,
  pb_g_day, pb_percent_ms, pdr_g_day, pndr_g_day, pm_g_day,
  ca_g_day, p_g_day, na_g_day, k_g_day, mg_g_day, s_g_day,
  zn_mg_day, cu_mg_day, mn_mg_day, se_mg_day, co_mg_day, i_mg_day, fe_mg_day,
  source, notes)
VALUES (
  'zebuino', 'macho_inteiro', 'confinamento', 'engorda',
  350, 1.0,
  8.0, 2.29, 4.90, 61.3, 17.6, 6.5, 4.2,
  830, 10.4, 498, 332, 620,
  13.0, 7.2, 4.5, 22.0, 5.5, 12.0,
  240, 80, 160, 0.80, 1.20, 4.0, 400,
  'BR-CORTE 4a Ed. (2023)',
  'Engorda em confinamento.'
);

-- 400 kg, GMD 0.75 kg/dia
INSERT INTO nutrient_requirements (breed_type, animal_category, production_system, production_phase,
  body_weight_kg, gmd_kg_day,
  cms_kg_day, cms_percent_pv, ndt_kg_day, ndt_percent_ms, em_mcal_day, elm_mcal_day, elg_mcal_day,
  pb_g_day, pb_percent_ms, pdr_g_day, pndr_g_day, pm_g_day,
  ca_g_day, p_g_day, na_g_day, k_g_day, mg_g_day, s_g_day,
  zn_mg_day, cu_mg_day, mn_mg_day, se_mg_day, co_mg_day, i_mg_day, fe_mg_day,
  source, notes)
VALUES (
  'zebuino', 'macho_inteiro', 'confinamento', 'engorda',
  400, 0.75,
  8.3, 2.08, 4.80, 57.8, 17.3, 7.2, 2.8,
  780, 9.4, 468, 312, 580,
  8.5, 4.8, 4.5, 22.0, 5.5, 12.5,
  249, 83, 166, 0.83, 1.25, 4.2, 415,
  'BR-CORTE 4a Ed. (2023) / SciELO',
  'Engorda. Ca 8.5 g/dia e P 4.8 g/dia conforme dados publicados para 400 kg. PB% MS decresce com peso.'
);

-- 400 kg, GMD 1.0 kg/dia
INSERT INTO nutrient_requirements (breed_type, animal_category, production_system, production_phase,
  body_weight_kg, gmd_kg_day,
  cms_kg_day, cms_percent_pv, ndt_kg_day, ndt_percent_ms, em_mcal_day, elm_mcal_day, elg_mcal_day,
  pb_g_day, pb_percent_ms, pdr_g_day, pndr_g_day, pm_g_day,
  ca_g_day, p_g_day, na_g_day, k_g_day, mg_g_day, s_g_day,
  zn_mg_day, cu_mg_day, mn_mg_day, se_mg_day, co_mg_day, i_mg_day, fe_mg_day,
  source, notes)
VALUES (
  'zebuino', 'macho_inteiro', 'confinamento', 'terminacao',
  400, 1.0,
  8.8, 2.20, 5.50, 62.5, 19.8, 7.2, 4.6,
  850, 9.7, 510, 340, 640,
  10.5, 5.8, 5.0, 24.0, 6.0, 13.2,
  264, 88, 176, 0.88, 1.32, 4.4, 440,
  'BR-CORTE 4a Ed. (2023)',
  'Terminacao. PB% MS = ~9.7% (decresce com peso: 13.4% a 250 kg vs 8.5% a 450 kg).'
);

-- 450 kg, GMD 1.0 kg/dia
INSERT INTO nutrient_requirements (breed_type, animal_category, production_system, production_phase,
  body_weight_kg, gmd_kg_day,
  cms_kg_day, cms_percent_pv, ndt_kg_day, ndt_percent_ms, em_mcal_day, elm_mcal_day, elg_mcal_day,
  pb_g_day, pb_percent_ms, pdr_g_day, pndr_g_day, pm_g_day,
  ca_g_day, p_g_day, na_g_day, k_g_day, mg_g_day, s_g_day,
  zn_mg_day, cu_mg_day, mn_mg_day, se_mg_day, co_mg_day, i_mg_day, fe_mg_day,
  source, notes)
VALUES (
  'zebuino', 'macho_inteiro', 'confinamento', 'terminacao',
  450, 1.0,
  9.5, 2.11, 6.00, 63.2, 21.6, 7.9, 5.0,
  880, 9.3, 528, 352, 660,
  9.5, 5.3, 5.5, 26.0, 6.5, 14.3,
  285, 95, 190, 0.95, 1.43, 4.8, 475,
  'BR-CORTE 4a Ed. (2023)',
  'Terminacao final. PB% ~9.3% (decresce: 250 kg = 13.4%, 450 kg = 8.53% conforme publicacao).'
);

-- 500 kg, GMD 1.0 kg/dia
INSERT INTO nutrient_requirements (breed_type, animal_category, production_system, production_phase,
  body_weight_kg, gmd_kg_day,
  cms_kg_day, cms_percent_pv, ndt_kg_day, ndt_percent_ms, em_mcal_day, elm_mcal_day, elg_mcal_day,
  pb_g_day, pb_percent_ms, pdr_g_day, pndr_g_day, pm_g_day,
  ca_g_day, p_g_day, na_g_day, k_g_day, mg_g_day, s_g_day,
  zn_mg_day, cu_mg_day, mn_mg_day, se_mg_day, co_mg_day, i_mg_day, fe_mg_day,
  source, notes)
VALUES (
  'zebuino', 'macho_inteiro', 'confinamento', 'terminacao',
  500, 1.0,
  10.0, 2.00, 6.40, 64.0, 23.0, 8.5, 5.3,
  900, 9.0, 540, 360, 680,
  9.0, 5.0, 6.0, 28.0, 7.0, 15.0,
  300, 100, 200, 1.00, 1.50, 5.0, 500,
  'BR-CORTE 4a Ed. (2023)',
  'Terminacao, animal pesado. CMS tende a 2.0% PV em animais mais pesados.'
);

-- ---------------------------------------------------------
-- INSERTS: Exigencias - MACHOS INTEIROS ZEBUINOS - PASTO
-- Valores usando equacao CMS pasto BR-CORTE
-- CMS = -2.4001 + 0.02006*PC + 4.8195*GMD - 1.5176*GMD^2
-- ---------------------------------------------------------

-- 200 kg, GMD 0.6 kg/dia (pasto)
INSERT INTO nutrient_requirements (breed_type, animal_category, production_system, production_phase,
  body_weight_kg, gmd_kg_day,
  cms_kg_day, cms_percent_pv, ndt_kg_day, ndt_percent_ms, em_mcal_day, elm_mcal_day, elg_mcal_day,
  pb_g_day, pb_percent_ms, pdr_g_day, pndr_g_day, pm_g_day,
  ca_g_day, p_g_day, na_g_day, k_g_day, mg_g_day, s_g_day,
  zn_mg_day, cu_mg_day, mn_mg_day, se_mg_day, co_mg_day, i_mg_day, fe_mg_day,
  source, notes)
VALUES (
  'zebuino', 'macho_inteiro', 'pasto', 'recria',
  200, 0.6,
  4.9, 2.45, 2.95, 60.2, 10.6, 4.2, 1.6,
  590, 12.0, 354, 236, 440,
  11.5, 6.0, 3.0, 14.0, 3.5, 7.4,
  147, 49, 98, 0.49, 0.74, 2.5, 245,
  'BR-CORTE 4a Ed. (2023) - Equacao CMS pasto',
  'Recria a pasto. CMS calculado: -2.4001 + 0.02006*200 + 4.8195*0.6 - 1.5176*0.36 = ~4.9 kg/dia.'
);

-- 300 kg, GMD 0.6 kg/dia (pasto - caso de referencia)
INSERT INTO nutrient_requirements (breed_type, animal_category, production_system, production_phase,
  body_weight_kg, gmd_kg_day,
  cms_kg_day, cms_percent_pv, ndt_kg_day, ndt_percent_ms, em_mcal_day, elm_mcal_day, elg_mcal_day,
  pb_g_day, pb_percent_ms, pdr_g_day, pndr_g_day, pm_g_day,
  ca_g_day, p_g_day, na_g_day, k_g_day, mg_g_day, s_g_day,
  zn_mg_day, cu_mg_day, mn_mg_day, se_mg_day, co_mg_day, i_mg_day, fe_mg_day,
  source, notes)
VALUES (
  'zebuino', 'macho_inteiro', 'pasto', 'recria',
  300, 0.6,
  6.9, 2.30, 4.14, 60.0, 14.9, 5.8, 1.8,
  700, 10.1, 420, 280, 525,
  12.0, 6.5, 4.0, 18.0, 4.5, 10.4,
  207, 69, 138, 0.69, 1.04, 3.5, 345,
  'BR-CORTE 4a Ed. (2023) - Equacao CMS pasto',
  'Recria/engorda a pasto. CMS = ~6.9 kg/dia (referencia: 9.1 kg MS com 2.6% PV conforme BR-CORTE).'
);

-- 400 kg, GMD 0.6 kg/dia (pasto)
INSERT INTO nutrient_requirements (breed_type, animal_category, production_system, production_phase,
  body_weight_kg, gmd_kg_day,
  cms_kg_day, cms_percent_pv, ndt_kg_day, ndt_percent_ms, em_mcal_day, elm_mcal_day, elg_mcal_day,
  pb_g_day, pb_percent_ms, pdr_g_day, pndr_g_day, pm_g_day,
  ca_g_day, p_g_day, na_g_day, k_g_day, mg_g_day, s_g_day,
  zn_mg_day, cu_mg_day, mn_mg_day, se_mg_day, co_mg_day, i_mg_day, fe_mg_day,
  source, notes)
VALUES (
  'zebuino', 'macho_inteiro', 'pasto', 'engorda',
  400, 0.6,
  8.9, 2.23, 5.34, 60.0, 19.2, 7.2, 2.0,
  780, 8.8, 468, 312, 580,
  9.0, 5.0, 4.5, 22.0, 5.5, 13.4,
  267, 89, 178, 0.89, 1.34, 4.5, 445,
  'BR-CORTE 4a Ed. (2023) - Equacao CMS pasto',
  'Engorda a pasto. CMS mais alto que confinamento (pasto requer mais CMS por menor digestibilidade).'
);


-- =============================================================
-- PARTE 3: EXIGENCIAS MINERAIS - NRC/NASEM 2016
-- Para comparacao com dados taurinos (Angus, Hereford)
-- Fonte: NASEM 2016 / Penn State Extension / PMC
-- =============================================================

CREATE TABLE IF NOT EXISTS mineral_requirements_nrc (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_system TEXT NOT NULL CHECK (source_system IN ('NRC_NASEM_2016', 'BR_CORTE_2023')),
  breed_type TEXT NOT NULL CHECK (breed_type IN ('taurino', 'zebuino', 'cruzado')),
  animal_class TEXT NOT NULL CHECK (animal_class IN (
    'growing_finishing', 'gestating_cow', 'lactating_cow', 'bull', 'calf'
  )),
  -- Macrominerais (% MS ou g/kg MS)
  ca_percent_ms NUMERIC,
  p_percent_ms NUMERIC,
  mg_percent_ms NUMERIC,
  k_percent_ms NUMERIC,
  na_percent_ms NUMERIC,
  s_percent_ms NUMERIC,
  -- Microminerais (mg/kg MS)
  co_mg_kg NUMERIC,
  cu_mg_kg NUMERIC,
  fe_mg_kg NUMERIC,
  i_mg_kg NUMERIC,
  mn_mg_kg NUMERIC,
  se_mg_kg NUMERIC,
  zn_mg_kg NUMERIC,
  cr_mg_kg NUMERIC,
  -- CMS e energia de referencia
  cms_percent_pv_low NUMERIC,    -- CMS % PV com forragem baixa qualidade
  cms_percent_pv_avg NUMERIC,    -- CMS % PV com forragem media qualidade
  cms_percent_pv_high NUMERIC,   -- CMS % PV com forragem alta qualidade
  -- Metadados
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------
-- NRC/NASEM 2016 - Taurinos (Angus, Hereford, etc.)
-- Fonte: Penn State Extension / PMC / NASEM 2016
-- ---------------------------------------------------------

-- Growing/Finishing - Taurino
INSERT INTO mineral_requirements_nrc (source_system, breed_type, animal_class,
  ca_percent_ms, p_percent_ms, mg_percent_ms, k_percent_ms, na_percent_ms, s_percent_ms,
  co_mg_kg, cu_mg_kg, fe_mg_kg, i_mg_kg, mn_mg_kg, se_mg_kg, zn_mg_kg, cr_mg_kg,
  cms_percent_pv_low, cms_percent_pv_avg, cms_percent_pv_high,
  notes)
VALUES (
  'NRC_NASEM_2016', 'taurino', 'growing_finishing',
  0.70, 0.34, 0.10, 0.60, 0.07, 0.15,
  0.15, 10.0, 50.0, 0.50, 20.0, 0.10, 30.0, 2.53,
  1.8, 2.5, 2.8,
  'NRC/NASEM 2016 - Bos taurus. Ca range 0.16-1.53%, P 0.17-0.59% dependendo do peso e GMD. CMS 2.5-2.8% PV para alta qualidade.'
);

-- Gestating Cow - Taurino
INSERT INTO mineral_requirements_nrc (source_system, breed_type, animal_class,
  ca_percent_ms, p_percent_ms, mg_percent_ms, k_percent_ms, na_percent_ms, s_percent_ms,
  co_mg_kg, cu_mg_kg, fe_mg_kg, i_mg_kg, mn_mg_kg, se_mg_kg, zn_mg_kg, cr_mg_kg,
  cms_percent_pv_low, cms_percent_pv_avg, cms_percent_pv_high,
  notes)
VALUES (
  'NRC_NASEM_2016', 'taurino', 'gestating_cow',
  0.40, 0.22, 0.12, 0.60, 0.07, 0.15,
  0.15, 10.0, 50.0, 0.50, 40.0, 0.10, 30.0, NULL,
  1.8, 2.2, 2.5,
  'NRC/NASEM 2016 - Vaca gestante taurina. Mn requerido maior (40 mg/kg) que growing (20 mg/kg).'
);

-- Lactating Cow - Taurino
INSERT INTO mineral_requirements_nrc (source_system, breed_type, animal_class,
  ca_percent_ms, p_percent_ms, mg_percent_ms, k_percent_ms, na_percent_ms, s_percent_ms,
  co_mg_kg, cu_mg_kg, fe_mg_kg, i_mg_kg, mn_mg_kg, se_mg_kg, zn_mg_kg, cr_mg_kg,
  cms_percent_pv_low, cms_percent_pv_avg, cms_percent_pv_high,
  notes)
VALUES (
  'NRC_NASEM_2016', 'taurino', 'lactating_cow',
  0.55, 0.30, 0.20, 0.70, 0.10, 0.15,
  0.15, 10.0, 50.0, 0.50, 40.0, 0.10, 30.0, NULL,
  2.2, 2.5, 2.7,
  'NRC/NASEM 2016 - Vaca em lactacao: Mg mais alto (0.20%), K mais alto (0.70%), Na mais alto (0.10%). CMS maior.'
);

-- Growing/Finishing - Zebuino (BR-CORTE para comparacao)
INSERT INTO mineral_requirements_nrc (source_system, breed_type, animal_class,
  ca_percent_ms, p_percent_ms, mg_percent_ms, k_percent_ms, na_percent_ms, s_percent_ms,
  co_mg_kg, cu_mg_kg, fe_mg_kg, i_mg_kg, mn_mg_kg, se_mg_kg, zn_mg_kg, cr_mg_kg,
  cms_percent_pv_low, cms_percent_pv_avg, cms_percent_pv_high,
  notes)
VALUES (
  'BR_CORTE_2023', 'zebuino', 'growing_finishing',
  0.51, 0.24, 0.10, 0.24, 0.08, 0.15,
  0.28, 9.53, 218.0, 0.50, 9.59, 0.57, 61.0, 2.53,
  2.0, 2.4, 2.6,
  'BR-CORTE 2023 / PMC (Melo et al.). Zebuinos: ELm 71.30 kcal/PCVZ^0.75 (vs 88.97 taurino = 20% MENOR). CMS ~2.0-2.6% PV (10-15% MENOR que taurinos). Zebuinos requerem mais Zn (61 vs 30 mg/kg) e mais Se (0.57 vs 0.10 mg/kg) segundo dados brasileiros. Fe requerido 218 mg/kg (tropico: parasitismo).'
);


-- =============================================================
-- PARTE 4: TABELA DE EQUACOES E PARAMETROS (BR-CORTE 2023)
-- Referencia rapida para calculos no app
-- =============================================================

CREATE TABLE IF NOT EXISTS nutrition_equations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  equation_name TEXT NOT NULL,
  breed_type TEXT NOT NULL,
  variable TEXT NOT NULL,          -- Nome da variavel calculada
  equation TEXT NOT NULL,          -- Formula/equacao
  r_squared NUMERIC,              -- R-quadrado
  units TEXT,                      -- Unidades do resultado
  inputs TEXT,                     -- Descricao dos inputs
  source TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CMS - Consumo Materia Seca (pasto, zebuinos)
INSERT INTO nutrition_equations (equation_name, breed_type, variable, equation, r_squared, units, inputs, source, notes)
VALUES (
  'CMS Pasto Zebuinos', 'zebuino', 'cms_kg_day',
  'CMS = -2.4001 + 0.02006 * PC + 4.8195 * GMD - 1.5176 * GMD^2',
  NULL, 'kg/dia',
  'PC = peso corporal (kg), GMD = ganho medio diario (kg/dia)',
  'BR-CORTE 4a Ed. (2023)',
  'Equacao para zebuinos em pastejo. PC range 150-500 kg, GMD range 0.3-1.5 kg/dia.'
);

-- ELm - Energia Liquida Manutencao (zebuinos)
INSERT INTO nutrition_equations (equation_name, breed_type, variable, equation, r_squared, units, inputs, source, notes)
VALUES (
  'ELm Zebuinos', 'zebuino', 'elm_kcal_day',
  'ELm = 71.30 * PCVZ^0.75',
  NULL, 'kcal/dia',
  'PCVZ = peso corporal vazio (kg). PCVZ = PV * 0.88 para zebuinos',
  'BR-CORTE 4a Ed. (2023) / SciELO',
  'Zebuinos: 71.30 kcal/PCVZ^0.75. Taurinos (holandes): 88.97 kcal/PCVZ^0.75. Cruzados F1: 70.77. Leiteiros cruzados: 79.65.'
);

-- ELm - Energia Liquida Manutencao (taurinos)
INSERT INTO nutrition_equations (equation_name, breed_type, variable, equation, r_squared, units, inputs, source, notes)
VALUES (
  'ELm Taurinos', 'taurino', 'elm_kcal_day',
  'ELm = 88.97 * PCVZ^0.75',
  NULL, 'kcal/dia',
  'PCVZ = peso corporal vazio (kg). PCVZ = PV * 0.83 para taurinos',
  'BR-CORTE 4a Ed. (2023) / SciELO',
  'Taurinos requerem ~25% mais energia de manutencao que zebuinos (88.97 vs 71.30). Maior metabolismo basal.'
);

-- ELg - Energia Liquida Ganho (zebuinos)
INSERT INTO nutrition_equations (equation_name, breed_type, variable, equation, r_squared, units, inputs, source, notes)
VALUES (
  'ELg Zebuinos', 'zebuino', 'elg_mcal_day',
  'ER = 0.0435 * PCVZ^0.75 * GDPCVZ^0.8241',
  0.37, 'Mcal/dia',
  'PCVZ = peso corporal vazio (kg), GDPCVZ = ganho diario de PCVZ (kg/dia). GDPCVZ = GMD * 0.96',
  'BR-CORTE 4a Ed. (2023) / SciELO',
  'Energia retida para ganho em zebuinos. R2=0.37.'
);

-- ELg - Energia Liquida Ganho (cruzados F1)
INSERT INTO nutrition_equations (equation_name, breed_type, variable, equation, r_squared, units, inputs, source, notes)
VALUES (
  'ELg Cruzados F1', 'cruzado', 'elg_mcal_day',
  'ER = 0.0377 * PCVZ^0.75 * GDPCVZ^1.0991',
  0.84, 'Mcal/dia',
  'PCVZ = peso corporal vazio (kg), GDPCVZ = ganho diario de PCVZ (kg/dia). GDPCVZ = GMD * 1.00',
  'BR-CORTE 4a Ed. (2023) / SciELO',
  'Energia retida para ganho em cruzados F1 (europeu x zebu). R2=0.84.'
);

-- Eficiencia ELm e ELg em funcao de EM
INSERT INTO nutrition_equations (equation_name, breed_type, variable, equation, r_squared, units, inputs, source, notes)
VALUES (
  'Eficiencia km (manutencao)', 'zebuino', 'km',
  'ELm = 0.1145 + 0.5950 * EM',
  0.73, 'adimensional',
  'EM = energia metabolizavel da dieta (Mcal/kg MS). Range 2.2-2.7 Mcal/kg MS',
  'BR-CORTE 4a Ed. (2023) / SciELO',
  'km = 0.63-0.65 para dietas tipicas. Eficiencia de uso da EM para manutencao.'
);

INSERT INTO nutrition_equations (equation_name, breed_type, variable, equation, r_squared, units, inputs, source, notes)
VALUES (
  'Eficiencia kf (ganho)', 'zebuino', 'kf',
  'ELg = -1.364 + 0.8733 * EM',
  0.72, 'adimensional',
  'EM = energia metabolizavel da dieta (Mcal/kg MS). Range 2.2-2.7 Mcal/kg MS',
  'BR-CORTE 4a Ed. (2023) / SciELO',
  'kf = 0.25-0.37 para dietas tipicas. Eficiencia de uso da EM para ganho.'
);

-- Proteina Retida (zebuinos)
INSERT INTO nutrition_equations (equation_name, breed_type, variable, equation, r_squared, units, inputs, source, notes)
VALUES (
  'Proteina Retida Zebuinos', 'zebuino', 'pr_g_day',
  'PR = -17.6968 + 192.31 * GPVJ - 3.8441 * ER',
  NULL, 'g/dia',
  'GPVJ = ganho peso vivo em jejum (kg/dia), ER = energia retida (Mcal/dia)',
  'BR-CORTE 4a Ed. (2023) / SciELO',
  'Proteina retida em zebuinos. PMm (proteina metabolizavel manutencao) = 3.8 g/kg PV^0.75.'
);

-- Proteina Retida (cruzados F1)
INSERT INTO nutrition_equations (equation_name, breed_type, variable, equation, r_squared, units, inputs, source, notes)
VALUES (
  'Proteina Retida Cruzados F1', 'cruzado', 'pr_g_day',
  'PR = 31.4045 + 107.039 * GPVJ + 5.632 * ER',
  NULL, 'g/dia',
  'GPVJ = ganho peso vivo em jejum (kg/dia), ER = energia retida (Mcal/dia)',
  'BR-CORTE 4a Ed. (2023) / SciELO',
  'Proteina retida em cruzados F1. Maior deposicao proteica que zebuinos puros.'
);

-- Conversao PV para PCVZ
INSERT INTO nutrition_equations (equation_name, breed_type, variable, equation, r_squared, units, inputs, source, notes)
VALUES (
  'Conversao PV-PCVZ Zebuino', 'zebuino', 'pcvz_kg',
  'PCVZ = PV * 0.88',
  NULL, 'kg',
  'PV = peso vivo (kg)',
  'BR-CORTE 4a Ed. (2023) / SciELO',
  'Fator de conversao peso vivo para peso corporal vazio. Zebu: 0.88, F1: 0.88, Leiteiro cruzado: 0.83, Holandes: 0.83.'
);

INSERT INTO nutrition_equations (equation_name, breed_type, variable, equation, r_squared, units, inputs, source, notes)
VALUES (
  'Conversao PV-PCVZ Taurino', 'taurino', 'pcvz_kg',
  'PCVZ = PV * 0.83',
  NULL, 'kg',
  'PV = peso vivo (kg)',
  'BR-CORTE 4a Ed. (2023) / SciELO / NRC',
  'Taurinos: PCVZ/PV = 0.83. Maior conteudo gastrintestinal que zebuinos (dietas com mais volumoso tipicamente).'
);


-- =============================================================
-- PARTE 5: TABELA RESUMO - COMPARACAO ZEBUINO vs TAURINO
-- Para o app usar na logica de ajuste por raca
-- =============================================================

CREATE TABLE IF NOT EXISTS breed_adjustment_factors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parameter TEXT NOT NULL,
  zebuino_value NUMERIC NOT NULL,
  taurino_value NUMERIC NOT NULL,
  adjustment_factor NUMERIC,         -- fator zebuino/taurino
  unit TEXT,
  source TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ELm (energia manutencao)
INSERT INTO breed_adjustment_factors (parameter, zebuino_value, taurino_value, adjustment_factor, unit, source, notes)
VALUES ('ELm (energia manutencao)', 71.30, 88.97, 0.80, 'kcal/PCVZ^0.75',
  'BR-CORTE 2023 / SciELO',
  'Zebuinos requerem 20% MENOS energia de manutencao que taurinos puros.');

-- CMS (consumo materia seca)
INSERT INTO breed_adjustment_factors (parameter, zebuino_value, taurino_value, adjustment_factor, unit, source, notes)
VALUES ('CMS medio (% PV)', 2.30, 2.70, 0.85, '% peso vivo',
  'BR-CORTE 2023 / NRC/NASEM 2016',
  'Zebuinos consomem 10-15% MENOS materia seca que taurinos (mesmo peso). Menor tamanho de orgaos viscerais.');

-- PCVZ/PV (conversao)
INSERT INTO breed_adjustment_factors (parameter, zebuino_value, taurino_value, adjustment_factor, unit, source, notes)
VALUES ('PCVZ/PV ratio', 0.88, 0.83, 1.06, 'adimensional',
  'BR-CORTE 2023 / SciELO',
  'Zebuinos tem menor conteudo gastrintestinal (PCVZ/PV = 0.88 vs 0.83 taurino).');

-- PB exigencia (g/dia para 300 kg, GMD 1.0)
INSERT INTO breed_adjustment_factors (parameter, zebuino_value, taurino_value, adjustment_factor, unit, source, notes)
VALUES ('PB (300 kg, GMD 1.0)', 801, 920, 0.87, 'g/dia',
  'BR-CORTE 2023 / NRC/NASEM 2016',
  'Zebuinos requerem ~13% menos proteina que taurinos para mesmo peso e ganho.');

-- ELg (energia ganho - coeficiente)
INSERT INTO breed_adjustment_factors (parameter, zebuino_value, taurino_value, adjustment_factor, unit, source, notes)
VALUES ('ELg expoente GMD', 0.8241, 1.0991, 0.75, 'expoente na equacao ER',
  'BR-CORTE 2023 / SciELO',
  'Expoente menor em zebuinos indica deposicao de gordura mais precoce (maturidade fisiologica mais cedo).');

-- Zn exigencia (mg/kg MS dietetica)
INSERT INTO breed_adjustment_factors (parameter, zebuino_value, taurino_value, adjustment_factor, unit, source, notes)
VALUES ('Zn (mg/kg MS dieta)', 61.0, 30.0, 2.03, 'mg/kg MS',
  'PMC (Melo et al.) / NRC/NASEM 2016',
  'Zebuinos em condicoes tropicais requerem MAIS Zn que taurinos (61 vs 30 mg/kg). Estresse termico e parasitismo.');

-- Se exigencia (mg/kg MS dietetica)
INSERT INTO breed_adjustment_factors (parameter, zebuino_value, taurino_value, adjustment_factor, unit, source, notes)
VALUES ('Se (mg/kg MS dieta)', 0.57, 0.10, 5.70, 'mg/kg MS',
  'PMC (Melo et al.) / NRC/NASEM 2016',
  'Zebuinos em tropico requerem MUITO mais Se. Solos tropicais deficientes em Se. Estresse oxidativo maior.');

-- Fe exigencia (mg/kg MS dietetica)
INSERT INTO breed_adjustment_factors (parameter, zebuino_value, taurino_value, adjustment_factor, unit, source, notes)
VALUES ('Fe (mg/kg MS dieta)', 218.0, 50.0, 4.36, 'mg/kg MS',
  'PMC (Melo et al.) / NRC/NASEM 2016',
  'Fe muito maior em zebuinos tropicais: parasitismo (carrapatos, helmintos) aumenta perdas sanguineas.');

-- km (eficiencia manutencao)
INSERT INTO breed_adjustment_factors (parameter, zebuino_value, taurino_value, adjustment_factor, unit, source, notes)
VALUES ('km (eficiencia manutencao)', 0.64, 0.64, 1.00, 'adimensional',
  'BR-CORTE 2023 / NRC/NASEM 2016',
  'Eficiencia de uso da EM para manutencao similar entre zebuinos e taurinos (0.63-0.65).');

-- kf (eficiencia ganho)
INSERT INTO breed_adjustment_factors (parameter, zebuino_value, taurino_value, adjustment_factor, unit, source, notes)
VALUES ('kf (eficiencia ganho)', 0.31, 0.35, 0.89, 'adimensional',
  'BR-CORTE 2023 / NRC/NASEM 2016',
  'Zebuinos ligeiramente menos eficientes no ganho (kf 0.25-0.37 vs 0.30-0.40 taurinos). Mais gordura intramuscular tardia.');


-- =============================================================
-- FIM DO SEED
-- =============================================================

-- Resumo das fontes utilizadas:
-- 1. BR-CORTE 4a Ed. (2023) - Valadares Filho et al., UFV
--    - Equacoes: CMS, ELm, ELg, ER, PR
--    - Tabelas 17.1-17.6: exigencias machos/femeas zebuinos
--    - URL: https://brcorte.com.br/assets/book2023/br/17.pdf
--
-- 2. CQBAL 4.0 - Tabelas Brasileiras de Composicao de Alimentos
--    - Composicao bromatologica de forrageiras tropicais
--    - URL: https://www.cqbal.com.br/
--
-- 3. NRC/NASEM (2016) - Nutrient Requirements of Beef Cattle, 8th Ed.
--    - Exigencias minerais taurinos (Angus, Hereford, etc.)
--    - URL: https://nap.nationalacademies.org/catalog/19014
--
-- 4. SciELO Brasil - Artigos publicados:
--    - Valadares Filho et al. - Exigencias liquidas e dieteticas
--    - Ciencia Animal Brasileira - Composicao Brachiaria/Panicum
--    - Ciencia e Agrotecnologia - Produtividade braquiarias
--
-- 5. Embrapa - Comunicados Tecnicos:
--    - CNPGC COT69 - Capim-massai
--    - Infoteca - Tabelas CMS
--
-- 6. PMC/PubMed - Melo et al. (2021):
--    - Macrominerals and Trace Element Requirements
--    - Dados dieteticos zebuinos tropicais
