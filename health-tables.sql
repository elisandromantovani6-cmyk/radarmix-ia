-- =============================================================
-- Radarmix IA — Módulo de Manejo Sanitário
-- Tabelas: health_protocols e health_events
-- =============================================================

-- health_protocols: protocolos sanitários (calendário oficial MT)
CREATE TABLE IF NOT EXISTS health_protocols (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('vacina', 'vermifugo', 'tratamento', 'exame')),
  species TEXT NOT NULL DEFAULT 'bovinos_corte',
  description TEXT,
  frequency_days INTEGER,
  recommended_months INTEGER[],
  mandatory BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- health_events: eventos sanitários registrados pelo produtor
CREATE TABLE IF NOT EXISTS health_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  herd_id UUID REFERENCES herds(id) ON DELETE SET NULL,
  protocol_id UUID REFERENCES health_protocols(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('vacina', 'vermifugo', 'tratamento', 'exame')),
  product_name TEXT NOT NULL,
  dose TEXT,
  cost_per_head NUMERIC,
  head_count INTEGER,
  total_cost NUMERIC,
  notes TEXT,
  event_date DATE NOT NULL DEFAULT CURRENT_DATE,
  next_due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para consultas frequentes
CREATE INDEX IF NOT EXISTS idx_health_events_farm ON health_events(farm_id);
CREATE INDEX IF NOT EXISTS idx_health_events_herd ON health_events(herd_id);

-- RLS (Row Level Security) para proteger dados por usuário
ALTER TABLE health_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own health_events" ON health_events FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own health_events" ON health_events FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own health_events" ON health_events FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own health_events" ON health_events FOR DELETE USING (user_id = auth.uid());

-- =============================================================
-- Inserir protocolos oficiais do MT (INDEA/MT)
-- =============================================================
INSERT INTO health_protocols (name, type, species, description, frequency_days, recommended_months, mandatory) VALUES
('Febre Aftosa', 'vacina', 'bovinos_corte', 'Vacinação obrigatória contra febre aftosa - INDEA/MT', 180, '{5,11}', true),
('Brucelose (B19)', 'vacina', 'bovinos_corte', 'Vacinação de fêmeas de 3-8 meses contra brucelose', NULL, '{1,2,3,4,5,6,7,8,9,10,11,12}', true),
('Raiva', 'vacina', 'bovinos_corte', 'Vacinação contra raiva em áreas de risco', 365, '{3,4,5}', false),
('Clostridioses', 'vacina', 'bovinos_corte', 'Vacina polivalente contra clostrídeos', 365, '{4,5}', false),
('Carbúnculo', 'vacina', 'bovinos_corte', 'Vacina contra carbúnculo sintomático', 365, '{4,5}', false),
('IBR/BVD', 'vacina', 'bovinos_corte', 'Vacina contra rinotraqueíte e diarréia viral bovina', 365, '{3,9}', false),
('Leptospirose', 'vacina', 'bovinos_corte', 'Vacina contra leptospirose', 180, '{3,9}', false),
('Vermifugação Estratégica', 'vermifugo', 'bovinos_corte', 'Vermifugação estratégica - OPG para controle', 90, '{5,8,11}', false),
('Controle de Carrapato', 'tratamento', 'bovinos_corte', 'Banho carrapaticida conforme infestação', 21, '{1,2,3,4,10,11,12}', false),
('Exame de Brucelose', 'exame', 'bovinos_corte', 'Teste sorológico para brucelose - exigido para GTA', NULL, '{1,2,3,4,5,6,7,8,9,10,11,12}', true),
('Exame de Tuberculose', 'exame', 'bovinos_corte', 'Teste de tuberculina - exigido para GTA', NULL, '{1,2,3,4,5,6,7,8,9,10,11,12}', true);
