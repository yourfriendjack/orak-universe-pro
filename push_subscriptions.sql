-- Tabla: push_subscriptions
-- Ejecutar en Supabase → SQL Editor

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint          TEXT        NOT NULL UNIQUE,
  subscription_json TEXT        NOT NULL,
  creado_en         TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_sub_own_select" ON push_subscriptions
  FOR SELECT USING (usuario_id = auth.uid());

CREATE POLICY "push_sub_own_insert" ON push_subscriptions
  FOR INSERT WITH CHECK (usuario_id = auth.uid());

CREATE POLICY "push_sub_own_delete" ON push_subscriptions
  FOR DELETE USING (usuario_id = auth.uid());

-- Índice para buscar por usuario rápido
CREATE INDEX IF NOT EXISTS idx_push_subs_usuario ON push_subscriptions(usuario_id);
