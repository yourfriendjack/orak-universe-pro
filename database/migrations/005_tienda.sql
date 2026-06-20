-- ═══════════════════════════════════════════════════════════════
--  005_tienda.sql  —  Tienda de Oruns
--  Ejecutar en Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1. Columnas de personalización en perfiles
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS tema_ui       TEXT DEFAULT NULL;
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS tema_lectura  TEXT DEFAULT NULL;
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS titulo_activo TEXT DEFAULT NULL;

-- 2. Tabla de compras
CREATE TABLE IF NOT EXISTS tienda_compras (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID REFERENCES perfiles(id) ON DELETE CASCADE,
  item_id     TEXT NOT NULL,
  comprado_en TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, item_id)
);

-- 3. RLS
ALTER TABLE tienda_compras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuario ve sus compras"
  ON tienda_compras FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "usuario inserta sus compras"
  ON tienda_compras FOR INSERT
  WITH CHECK (user_id = auth.uid());
