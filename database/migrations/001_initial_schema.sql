-- ══════════════════════════════════════════════════════════
--  ORAK UNIVERSE — Migration 001
--  Schema inicial: tabla libros con JSONB
--  Ejecutar en Supabase SQL Editor o con psql
-- ══════════════════════════════════════════════════════════

-- Tabla principal de libros
CREATE TABLE IF NOT EXISTS libros (
  id          BIGSERIAL PRIMARY KEY,
  titulo      TEXT NOT NULL UNIQUE,
  datos       JSONB NOT NULL DEFAULT '{}',
  creado_en   TIMESTAMPTZ DEFAULT NOW(),
  editado_en  TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para búsqueda por título
CREATE INDEX IF NOT EXISTS idx_libros_titulo ON libros (titulo);

-- Índice GIN para búsquedas dentro del JSON
CREATE INDEX IF NOT EXISTS idx_libros_datos ON libros USING GIN (datos);

-- Trigger: actualizar editado_en automáticamente
CREATE OR REPLACE FUNCTION actualizar_editado_en()
RETURNS TRIGGER AS $$
BEGIN
  NEW.editado_en = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_editado_en ON libros;
CREATE TRIGGER trg_editado_en
  BEFORE UPDATE ON libros
  FOR EACH ROW EXECUTE FUNCTION actualizar_editado_en();

-- RLS: desactivado (service_role lo bypasea)
ALTER TABLE libros DISABLE ROW LEVEL SECURITY;
