-- =========================================================
-- Tabela de animais individuais e tabelas relacionadas
-- Controle individual de animal dentro de lotes
-- =========================================================

-- Tabela principal de animais
CREATE TABLE IF NOT EXISTS animals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  herd_id UUID NOT NULL REFERENCES herds(id) ON DELETE CASCADE,
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ear_tag VARCHAR(50) NOT NULL,  -- número do brinco
  name VARCHAR(100),
  breed_id UUID REFERENCES breeds(id),
  sex VARCHAR(10) NOT NULL DEFAULT 'macho' CHECK (sex IN ('macho', 'femea')),
  birth_date DATE,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  entry_weight_kg NUMERIC(6,2),
  current_weight_kg NUMERIC(6,2),
  status VARCHAR(20) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'vendido', 'morto', 'descarte', 'transferido')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(herd_id, ear_tag)
);

-- Histórico de pesagens individuais
CREATE TABLE IF NOT EXISTS animal_weighings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id UUID NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  weight_kg NUMERIC(6,2) NOT NULL,
  weighed_at DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Eventos do animal (tratamentos, movimentações, etc)
CREATE TABLE IF NOT EXISTS animal_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id UUID NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  event_type VARCHAR(30) NOT NULL CHECK (event_type IN ('tratamento', 'vacinacao', 'vermifugo', 'transferencia', 'descarte', 'observacao')),
  description TEXT,
  from_herd_id UUID REFERENCES herds(id),
  to_herd_id UUID REFERENCES herds(id),
  cost NUMERIC(10,2),
  event_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Políticas de segurança por linha (RLS)
ALTER TABLE animals ENABLE ROW LEVEL SECURITY;
ALTER TABLE animal_weighings ENABLE ROW LEVEL SECURITY;
ALTER TABLE animal_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "animals_policy" ON animals FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "animal_weighings_policy" ON animal_weighings FOR ALL USING (
  EXISTS (SELECT 1 FROM animals WHERE animals.id = animal_weighings.animal_id AND animals.user_id = auth.uid())
);
CREATE POLICY "animal_events_policy" ON animal_events FOR ALL USING (
  EXISTS (SELECT 1 FROM animals WHERE animals.id = animal_events.animal_id AND animals.user_id = auth.uid())
);

-- Índices para performance
CREATE INDEX idx_animals_herd ON animals(herd_id);
CREATE INDEX idx_animals_user ON animals(user_id);
CREATE INDEX idx_animals_status ON animals(status);
CREATE INDEX idx_animal_weighings_animal ON animal_weighings(animal_id);
CREATE INDEX idx_animal_events_animal ON animal_events(animal_id);
