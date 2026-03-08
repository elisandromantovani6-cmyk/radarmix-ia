-- Tabela para histórico de ranking (notificações de mudança de posição)
-- Executar no Supabase SQL Editor

CREATE TABLE IF NOT EXISTS ranking_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL,
  percentile INTEGER NOT NULL,
  score INTEGER NOT NULL,
  badges_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- RLS
ALTER TABLE ranking_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ranking_history_select" ON ranking_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "ranking_history_insert" ON ranking_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ranking_history_update" ON ranking_history
  FOR UPDATE USING (auth.uid() = user_id);

-- Índice
CREATE INDEX IF NOT EXISTS idx_ranking_history_user ON ranking_history(user_id);
