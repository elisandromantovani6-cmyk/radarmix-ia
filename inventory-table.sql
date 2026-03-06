-- =============================================
-- TABELA DE ESTOQUE — NutriPec / Radarmix IA
-- Execute este SQL no Supabase SQL Editor
-- =============================================

CREATE TABLE IF NOT EXISTS inventory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity_kg NUMERIC NOT NULL DEFAULT 0,
  daily_consumption_kg NUMERIC NOT NULL DEFAULT 0,
  days_remaining INTEGER,
  unit_price NUMERIC,
  status TEXT NOT NULL DEFAULT 'ok' CHECK (status IN ('ok', 'atencao', 'critico')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indice para buscar por fazenda
CREATE INDEX IF NOT EXISTS idx_inventory_farm ON inventory(farm_id);

-- RLS (Row Level Security) — cada usuario so ve seu estoque
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own inventory"
  ON inventory FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own inventory"
  ON inventory FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own inventory"
  ON inventory FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own inventory"
  ON inventory FOR DELETE
  USING (user_id = auth.uid());
