-- ══════════════════════════════════════════════════════════
--  ORAK UNIVERSE — Migration 002
--  Tabla de perfiles de usuario (preparación para auth)
--  NO ejecutar aún — es para cuando se active la autenticación
-- ══════════════════════════════════════════════════════════

-- Perfiles vinculados a Supabase Auth
CREATE TABLE IF NOT EXISTS perfiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username    TEXT UNIQUE,
  avatar_url  TEXT,
  oruns       INTEGER DEFAULT 0,
  glimmers    INTEGER DEFAULT 0,
  rol         TEXT DEFAULT 'escritor',   -- escritor | moderador | admin
  creado_en   TIMESTAMPTZ DEFAULT NOW(),
  editado_en  TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: cada usuario solo ve/edita su perfil
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Perfil propio — lectura"
  ON perfiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Perfil propio — escritura"
  ON perfiles FOR UPDATE USING (auth.uid() = id);
