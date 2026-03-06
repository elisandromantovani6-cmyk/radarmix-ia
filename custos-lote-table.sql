-- ============================================
-- Tabela: custos_lote
-- Projeto: Radarmix IA
-- Descricao: Armazena custos detalhados por lote
--            para o DRE (Raio-X Financeiro)
-- ============================================

-- 1. Criar a tabela custos_lote
CREATE TABLE custos_lote (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id     UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    herd_id     UUID NOT NULL REFERENCES herds(id) ON DELETE CASCADE,
    category    TEXT NOT NULL CHECK (category IN ('aquisicao', 'nutricao', 'sanitario', 'mao_obra', 'pasto', 'outros')),
    description TEXT,
    value       NUMERIC NOT NULL,
    period      TEXT CHECK (period IN ('unico', 'diario', 'mensal')),
    date        DATE DEFAULT CURRENT_DATE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Index por herd_id (acelera consultas de custos por lote)
CREATE INDEX idx_custos_lote_herd_id ON custos_lote (herd_id);

-- 3. Habilitar RLS (Row Level Security)
ALTER TABLE custos_lote ENABLE ROW LEVEL SECURITY;

-- 4. Policies RLS - cada usuario so acessa seus proprios dados

-- SELECT: usuario pode ver apenas seus custos
CREATE POLICY "Usuarios podem ver seus proprios custos"
    ON custos_lote
    FOR SELECT
    USING (auth.uid() = user_id);

-- INSERT: usuario pode inserir custos apenas com seu proprio user_id
CREATE POLICY "Usuarios podem inserir seus proprios custos"
    ON custos_lote
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- UPDATE: usuario pode atualizar apenas seus proprios custos
CREATE POLICY "Usuarios podem atualizar seus proprios custos"
    ON custos_lote
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- DELETE: usuario pode deletar apenas seus proprios custos
CREATE POLICY "Usuarios podem deletar seus proprios custos"
    ON custos_lote
    FOR DELETE
    USING (auth.uid() = user_id);
