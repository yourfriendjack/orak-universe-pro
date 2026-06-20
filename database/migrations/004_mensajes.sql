-- ── MENSAJES DIRECTOS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mensajes (
  id          BIGSERIAL PRIMARY KEY,
  emisor_id   UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  receptor_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  texto       TEXT NOT NULL CHECK (char_length(texto) BETWEEN 1 AND 1000),
  leido       BOOLEAN DEFAULT FALSE,
  creado_en   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS mensajes_emisor_idx    ON mensajes(emisor_id);
CREATE INDEX IF NOT EXISTS mensajes_receptor_idx  ON mensajes(receptor_id);
CREATE INDEX IF NOT EXISTS mensajes_creado_idx    ON mensajes(creado_en DESC);

-- RLS: solo emisor y receptor pueden ver sus mensajes
ALTER TABLE mensajes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mensajes_select" ON mensajes FOR SELECT
  USING (auth.uid() = emisor_id OR auth.uid() = receptor_id);

CREATE POLICY "mensajes_insert" ON mensajes FOR INSERT
  WITH CHECK (auth.uid() = emisor_id);

CREATE POLICY "mensajes_update" ON mensajes FOR UPDATE
  USING (auth.uid() = receptor_id);
