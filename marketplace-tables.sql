-- RADARMIX CONNECT - Marketplace de Insumos
-- Execute no Supabase SQL Editor

-- Tabela de fornecedores
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  cnpj TEXT,
  city TEXT,
  state TEXT DEFAULT 'MT',
  phone TEXT,
  email TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  description TEXT,
  verified BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Produtos do fornecedor
CREATE TABLE IF NOT EXISTS supplier_products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'mineral', 'racao', 'sal', 'milho', 'soja', 'farelo', 'ureia', 'volumoso', 'outros'
  unit TEXT NOT NULL DEFAULT 'kg', -- 'kg', 'saco', 'ton'
  price DECIMAL(10,2) NOT NULL,
  min_quantity DECIMAL(10,2) DEFAULT 1,
  available BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cotações / Pedidos
CREATE TABLE IF NOT EXISTS quotes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  producer_id UUID REFERENCES auth.users(id),
  supplier_id UUID REFERENCES suppliers(id),
  status TEXT DEFAULT 'pendente', -- 'pendente', 'respondida', 'aceita', 'recusada', 'concluida'
  items JSONB NOT NULL, -- [{product_name, quantity, unit}]
  total_estimate DECIMAL(10,2),
  supplier_response JSONB, -- {total, delivery_days, notes}
  farm_city TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

-- Todos podem ver fornecedores ativos
CREATE POLICY "Public read suppliers" ON suppliers FOR SELECT USING (active = true);
CREATE POLICY "Owners manage suppliers" ON suppliers FOR ALL USING (user_id = auth.uid());

-- Todos podem ver produtos disponíveis
CREATE POLICY "Public read supplier_products" ON supplier_products FOR SELECT USING (available = true);
CREATE POLICY "Supplier owners manage products" ON supplier_products FOR ALL USING (
  supplier_id IN (SELECT id FROM suppliers WHERE user_id = auth.uid())
);

-- Produtores veem suas cotações, fornecedores veem cotações deles
CREATE POLICY "Producers read own quotes" ON quotes FOR SELECT USING (producer_id = auth.uid());
CREATE POLICY "Suppliers read their quotes" ON quotes FOR SELECT USING (
  supplier_id IN (SELECT id FROM suppliers WHERE user_id = auth.uid())
);
CREATE POLICY "Producers create quotes" ON quotes FOR INSERT WITH CHECK (producer_id = auth.uid());
CREATE POLICY "Suppliers update quotes" ON quotes FOR UPDATE USING (
  supplier_id IN (SELECT id FROM suppliers WHERE user_id = auth.uid())
);

-- Inserir fornecedores de exemplo (MT)
INSERT INTO suppliers (name, city, state, phone, latitude, longitude, description, verified) VALUES
  ('Agropecuária Tangará', 'Tangará da Serra', 'MT', '(65) 3326-1234', -14.6229, -57.4983, 'Insumos pecuários e agrícolas. Entrega em toda região.', true),
  ('Casa Rural Diamantino', 'Diamantino', 'MT', '(65) 3336-5678', -14.4086, -56.4461, 'Rações, sal mineral, medicamentos veterinários.', true),
  ('Agro Center Nova Mutum', 'Nova Mutum', 'MT', '(65) 3308-9012', -13.8344, -56.0800, 'Distribuidor de suplementos minerais e rações.', true),
  ('Pecuária Store Campo Novo', 'Campo Novo do Parecis', 'MT', '(65) 3382-3456', -13.6584, -57.8892, 'Especialista em nutrição animal. Frete grátis acima de 1 ton.', true),
  ('AgroMais Sorriso', 'Sorriso', 'MT', '(65) 3544-7890', -12.5425, -55.7114, 'Maior variedade de insumos pecuários da região norte.', true);

-- Inserir produtos de exemplo
INSERT INTO supplier_products (supplier_id, product_name, category, unit, price, min_quantity)
SELECT s.id, p.product_name, p.category, p.unit, p.price, p.min_quantity
FROM suppliers s
CROSS JOIN (VALUES
  ('Sal Mineral - Saco 25kg', 'mineral', 'saco', 95.00, 1),
  ('Sal Proteinado - Saco 25kg', 'sal', 'saco', 78.00, 1),
  ('Milho Grão - Tonelada', 'milho', 'ton', 1200.00, 1),
  ('Farelo de Soja - Tonelada', 'soja', 'ton', 2800.00, 1),
  ('Ureia Pecuária - Saco 25kg', 'ureia', 'saco', 85.00, 1),
  ('Silagem de Milho - Tonelada', 'volumoso', 'ton', 350.00, 5)
) AS p(product_name, category, unit, price, min_quantity)
WHERE s.name = 'Agropecuária Tangará';
