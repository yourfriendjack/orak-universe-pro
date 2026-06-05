-- ══════════════════════════════════════════════════════════════════════
--  ORAK UNIVERSE — Migration 003
--  Red Social Completa
--  Ejecutar en Supabase SQL Editor en este orden exacto.
-- ══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
--  0. EXTENSIONES
-- ─────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- búsqueda fuzzy de texto


-- ─────────────────────────────────────────────────────────────────────
--  1. PERFILES  (ampliar la tabla existente de 002)
--     Si ya corriste 002, usa el ALTER. Si no, crea desde cero.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS perfiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username      TEXT UNIQUE NOT NULL,
  display_name  TEXT,
  avatar_url    TEXT,
  banner_url    TEXT,
  bio           TEXT DEFAULT '',
  generos       TEXT[] DEFAULT '{}',          -- géneros favoritos
  oruns         INTEGER DEFAULT 50,           -- saldo inicial al registrarse
  glimmers_week INTEGER DEFAULT 10,           -- se resetean cada lunes
  glimmers_total INTEGER DEFAULT 0,
  nivel         INTEGER DEFAULT 1,
  xp            INTEGER DEFAULT 0,
  rol           TEXT DEFAULT 'escritor',      -- escritor | moderador | admin
  es_publico    BOOLEAN DEFAULT TRUE,
  creado_en     TIMESTAMPTZ DEFAULT NOW(),
  editado_en    TIMESTAMPTZ DEFAULT NOW()
);

-- Columnas extra si ya existe la tabla (idempotente)
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS display_name  TEXT;
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS banner_url    TEXT;
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS bio           TEXT DEFAULT '';
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS generos       TEXT[] DEFAULT '{}';
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS glimmers_week INTEGER DEFAULT 10;
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS glimmers_total INTEGER DEFAULT 0;
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS nivel         INTEGER DEFAULT 1;
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS xp            INTEGER DEFAULT 0;
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS es_publico    BOOLEAN DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_perfiles_username ON perfiles (username);
CREATE INDEX IF NOT EXISTS idx_perfiles_username_trgm ON perfiles USING GIN (username gin_trgm_ops);


-- ─────────────────────────────────────────────────────────────────────
--  2. LIBROS SOCIALES  (extiende la tabla `libros` existente)
--     Añade columnas de red social sin romper nada existente.
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE libros ADD COLUMN IF NOT EXISTS autor_id    UUID REFERENCES perfiles(id) ON DELETE SET NULL;
ALTER TABLE libros ADD COLUMN IF NOT EXISTS es_publico  BOOLEAN DEFAULT TRUE;
ALTER TABLE libros ADD COLUMN IF NOT EXISTS genero      TEXT DEFAULT 'fantasía';
ALTER TABLE libros ADD COLUMN IF NOT EXISTS portada_url TEXT;
ALTER TABLE libros ADD COLUMN IF NOT EXISTS fork_de     BIGINT REFERENCES libros(id) ON DELETE SET NULL;
ALTER TABLE libros ADD COLUMN IF NOT EXISTS glimmers    INTEGER DEFAULT 0;
ALTER TABLE libros ADD COLUMN IF NOT EXISTS lectores    INTEGER DEFAULT 0;
ALTER TABLE libros ADD COLUMN IF NOT EXISTS forks_count INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_libros_autor    ON libros (autor_id);
CREATE INDEX IF NOT EXISTS idx_libros_publico  ON libros (es_publico);
CREATE INDEX IF NOT EXISTS idx_libros_genero   ON libros (genero);
CREATE INDEX IF NOT EXISTS idx_libros_titulo_trgm ON libros USING GIN (titulo gin_trgm_ops);


-- ─────────────────────────────────────────────────────────────────────
--  3. CAPÍTULOS
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS capitulos (
  id          BIGSERIAL PRIMARY KEY,
  libro_id    BIGINT NOT NULL REFERENCES libros(id) ON DELETE CASCADE,
  numero      INTEGER NOT NULL,
  titulo      TEXT NOT NULL,
  contenido   TEXT DEFAULT '',
  palabras    INTEGER DEFAULT 0,
  estado      TEXT DEFAULT 'borrador',   -- borrador | en_progreso | completo
  es_publico  BOOLEAN DEFAULT TRUE,
  creado_en   TIMESTAMPTZ DEFAULT NOW(),
  editado_en  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(libro_id, numero)
);

CREATE INDEX IF NOT EXISTS idx_capitulos_libro ON capitulos (libro_id);


-- ─────────────────────────────────────────────────────────────────────
--  4. POSTS DEL FEED
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS posts (
  id          BIGSERIAL PRIMARY KEY,
  autor_id    UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  tipo        TEXT NOT NULL,             -- nuevo_libro | capitulo | fork | colaboracion | reflexion | compartido
  texto       TEXT NOT NULL,
  libro_id    BIGINT REFERENCES libros(id) ON DELETE SET NULL,
  ref_post_id BIGINT REFERENCES posts(id) ON DELETE SET NULL,   -- para compartidos
  glimmers    INTEGER DEFAULT 0,
  forks       INTEGER DEFAULT 0,
  notas       INTEGER DEFAULT 0,
  creado_en   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_autor     ON posts (autor_id);
CREATE INDEX IF NOT EXISTS idx_posts_creado    ON posts (creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_posts_libro     ON posts (libro_id);


-- ─────────────────────────────────────────────────────────────────────
--  5. FOLLOWS  (seguir — asimétrico como Twitter/Instagram)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS follows (
  seguidor_id  UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  seguido_id   UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  creado_en    TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (seguidor_id, seguido_id),
  CHECK (seguidor_id <> seguido_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_seguidor ON follows (seguidor_id);
CREATE INDEX IF NOT EXISTS idx_follows_seguido  ON follows (seguido_id);


-- ─────────────────────────────────────────────────────────────────────
--  6. LECTORES FIELES  (mutuo — como amistad)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lectores_fieles (
  solicitante_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  receptor_id    UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  estado         TEXT DEFAULT 'pendiente',   -- pendiente | aceptado | rechazado
  creado_en      TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (solicitante_id, receptor_id),
  CHECK (solicitante_id <> receptor_id)
);

CREATE INDEX IF NOT EXISTS idx_lectores_solicitante ON lectores_fieles (solicitante_id);
CREATE INDEX IF NOT EXISTS idx_lectores_receptor    ON lectores_fieles (receptor_id);


-- ─────────────────────────────────────────────────────────────────────
--  7. CO-ESCRITORES
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coescritores (
  libro_id   BIGINT NOT NULL REFERENCES libros(id) ON DELETE CASCADE,
  perfil_id  UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  rol        TEXT DEFAULT 'colaborador',    -- autor | colaborador
  porcentaje INTEGER DEFAULT 50,            -- % de Oruns compartidos
  estado     TEXT DEFAULT 'pendiente',      -- pendiente | activo | rechazado
  creado_en  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (libro_id, perfil_id)
);


-- ─────────────────────────────────────────────────────────────────────
--  8. GLIMMERS LOG  (cada Glimmer dado queda registrado)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS glimmers_log (
  id          BIGSERIAL PRIMARY KEY,
  donante_id  UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  receptor_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  post_id     BIGINT REFERENCES posts(id) ON DELETE CASCADE,
  libro_id    BIGINT REFERENCES libros(id) ON DELETE CASCADE,
  cantidad    INTEGER NOT NULL CHECK (cantidad BETWEEN 1 AND 5),
  creado_en   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_glimmers_donante  ON glimmers_log (donante_id);
CREATE INDEX IF NOT EXISTS idx_glimmers_receptor ON glimmers_log (receptor_id);
CREATE INDEX IF NOT EXISTS idx_glimmers_post     ON glimmers_log (post_id);


-- ─────────────────────────────────────────────────────────────────────
--  9. NOTAS EN PÁRRAFO  (comentarios anclados a texto — como GitHub)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notas (
  id           BIGSERIAL PRIMARY KEY,
  autor_id     UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  capitulo_id  BIGINT REFERENCES capitulos(id) ON DELETE CASCADE,
  post_id      BIGINT REFERENCES posts(id) ON DELETE CASCADE,
  parrafo_idx  INTEGER,                  -- índice del párrafo al que se ancla
  texto        TEXT NOT NULL,
  creado_en    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notas_capitulo ON notas (capitulo_id);
CREATE INDEX IF NOT EXISTS idx_notas_post     ON notas (post_id);


-- ─────────────────────────────────────────────────────────────────────
--  10. NOTIFICACIONES
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notificaciones (
  id          BIGSERIAL PRIMARY KEY,
  usuario_id  UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  tipo        TEXT NOT NULL,   -- glimmer | fork | follow | lector_fiel | collab | nota | hito
  titulo      TEXT NOT NULL,
  cuerpo      TEXT,
  ref_id      TEXT,            -- id del recurso relacionado (post, libro, etc.)
  leida       BOOLEAN DEFAULT FALSE,
  creado_en   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_usuario ON notificaciones (usuario_id);
CREATE INDEX IF NOT EXISTS idx_notif_leida   ON notificaciones (usuario_id, leida);


-- ─────────────────────────────────────────────────────────────────────
--  11. ORUNS LOG  (historial de economía)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS oruns_log (
  id          BIGSERIAL PRIMARY KEY,
  perfil_id   UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  cantidad    INTEGER NOT NULL,            -- positivo = ganó, negativo = gastó
  concepto    TEXT NOT NULL,
  tipo        TEXT DEFAULT 'logro',        -- logro | gasto | glimmer | fork | colaboracion
  creado_en   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oruns_perfil ON oruns_log (perfil_id);


-- ─────────────────────────────────────────────────────────────────────
--  12. TRIGGERS  (automatismos)
-- ─────────────────────────────────────────────────────────────────────

-- Trigger genérico para editado_en
CREATE OR REPLACE FUNCTION set_editado_en()
RETURNS TRIGGER AS $$
BEGIN NEW.editado_en = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_perfiles_editado') THEN
    CREATE TRIGGER trg_perfiles_editado
      BEFORE UPDATE ON perfiles
      FOR EACH ROW EXECUTE FUNCTION set_editado_en();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_capitulos_editado') THEN
    CREATE TRIGGER trg_capitulos_editado
      BEFORE UPDATE ON capitulos
      FOR EACH ROW EXECUTE FUNCTION set_editado_en();
  END IF;
END $$;

-- Auto-crear perfil cuando se registra un usuario en Supabase Auth
CREATE OR REPLACE FUNCTION crear_perfil_nuevo_usuario()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.perfiles (id, username, display_name, oruns)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    50
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_nuevo_usuario ON auth.users;
CREATE TRIGGER trg_nuevo_usuario
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION crear_perfil_nuevo_usuario();

-- Actualizar contador de forks en el libro original
CREATE OR REPLACE FUNCTION incrementar_forks_libro()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.fork_de IS NOT NULL THEN
    UPDATE libros SET forks_count = forks_count + 1 WHERE id = NEW.fork_de;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_fork_libro ON libros;
CREATE TRIGGER trg_fork_libro
  AFTER INSERT ON libros
  FOR EACH ROW EXECUTE FUNCTION incrementar_forks_libro();

-- Resetear glimmers_week cada lunes (ejecutar como cron en Supabase Edge Functions)
-- La función queda lista; el cron se configura en el dashboard de Supabase
CREATE OR REPLACE FUNCTION resetear_glimmers_semanales()
RETURNS void AS $$
BEGIN
  UPDATE perfiles SET glimmers_week = 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ─────────────────────────────────────────────────────────────────────
--  13. VISTAS  (consultas frecuentes precalculadas)
-- ─────────────────────────────────────────────────────────────────────

-- Feed: posts con datos del autor y del libro enlazado
CREATE OR REPLACE VIEW vista_feed AS
SELECT
  p.id,
  p.tipo,
  p.texto,
  p.glimmers,
  p.forks,
  p.notas,
  p.creado_en,
  p.ref_post_id,
  -- autor
  per.id          AS autor_id,
  per.username    AS autor_handle,
  per.display_name AS autor_nombre,
  per.avatar_url  AS autor_avatar,
  per.oruns       AS autor_oruns,
  -- libro
  l.id            AS libro_id,
  l.titulo        AS libro_titulo,
  l.genero        AS libro_genero,
  l.portada_url   AS libro_portada
FROM posts p
JOIN perfiles per ON per.id = p.autor_id
LEFT JOIN libros l ON l.id = p.libro_id;

-- Ranking de escritores
CREATE OR REPLACE VIEW vista_ranking AS
SELECT
  id,
  username,
  display_name,
  avatar_url,
  oruns,
  nivel,
  (SELECT COUNT(*) FROM libros WHERE autor_id = perfiles.id AND es_publico = TRUE) AS libros_publicados,
  (SELECT COUNT(*) FROM follows WHERE seguido_id = perfiles.id) AS seguidores
FROM perfiles
ORDER BY oruns DESC;

-- Perfil público completo
CREATE OR REPLACE VIEW vista_perfil_publico AS
SELECT
  p.id,
  p.username,
  p.display_name,
  p.avatar_url,
  p.banner_url,
  p.bio,
  p.generos,
  p.oruns,
  p.nivel,
  p.xp,
  p.creado_en,
  (SELECT COUNT(*) FROM libros   WHERE autor_id = p.id AND es_publico = TRUE) AS libros_count,
  (SELECT COUNT(*) FROM follows  WHERE seguido_id = p.id)  AS seguidores_count,
  (SELECT COUNT(*) FROM follows  WHERE seguidor_id = p.id) AS siguiendo_count,
  (SELECT COUNT(*) FROM libros   WHERE fork_de IN (SELECT id FROM libros WHERE autor_id = p.id)) AS forks_recibidos
FROM perfiles p;


-- ─────────────────────────────────────────────────────────────────────
--  14. RLS — Row Level Security
-- ─────────────────────────────────────────────────────────────────────

-- Perfiles
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "perfiles_lectura_publica"  ON perfiles;
DROP POLICY IF EXISTS "perfiles_escritura_propia" ON perfiles;
CREATE POLICY "perfiles_lectura_publica"  ON perfiles FOR SELECT USING (es_publico = TRUE OR auth.uid() = id);
CREATE POLICY "perfiles_escritura_propia" ON perfiles FOR UPDATE USING (auth.uid() = id);

-- Libros
ALTER TABLE libros ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "libros_lectura"   ON libros;
DROP POLICY IF EXISTS "libros_escritura" ON libros;
DROP POLICY IF EXISTS "libros_insertar"  ON libros;
DROP POLICY IF EXISTS "libros_borrar"    ON libros;
CREATE POLICY "libros_lectura"   ON libros FOR SELECT USING (es_publico = TRUE OR autor_id = auth.uid());
CREATE POLICY "libros_insertar"  ON libros FOR INSERT WITH CHECK (autor_id = auth.uid());
CREATE POLICY "libros_escritura" ON libros FOR UPDATE USING (autor_id = auth.uid());
CREATE POLICY "libros_borrar"    ON libros FOR DELETE USING (autor_id = auth.uid());

-- Capítulos
ALTER TABLE capitulos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "capitulos_lectura" ON capitulos FOR SELECT
  USING (es_publico = TRUE OR EXISTS (
    SELECT 1 FROM libros WHERE libros.id = capitulos.libro_id AND libros.autor_id = auth.uid()
  ));
CREATE POLICY "capitulos_escritura" ON capitulos FOR ALL
  USING (EXISTS (
    SELECT 1 FROM libros WHERE libros.id = capitulos.libro_id AND libros.autor_id = auth.uid()
  ));

-- Posts: todos pueden leer, solo el autor escribe
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "posts_lectura"   ON posts FOR SELECT USING (TRUE);
CREATE POLICY "posts_insertar"  ON posts FOR INSERT WITH CHECK (autor_id = auth.uid());
CREATE POLICY "posts_escritura" ON posts FOR UPDATE USING (autor_id = auth.uid());
CREATE POLICY "posts_borrar"    ON posts FOR DELETE USING (autor_id = auth.uid());

-- Follows
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "follows_lectura"   ON follows FOR SELECT USING (TRUE);
CREATE POLICY "follows_escritura" ON follows FOR ALL USING (seguidor_id = auth.uid());

-- Lectores fieles
ALTER TABLE lectores_fieles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lectores_lectura"   ON lectores_fieles FOR SELECT USING (solicitante_id = auth.uid() OR receptor_id = auth.uid());
CREATE POLICY "lectores_escritura" ON lectores_fieles FOR ALL USING (solicitante_id = auth.uid() OR receptor_id = auth.uid());

-- Notificaciones: solo el dueño las ve
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_propia" ON notificaciones FOR ALL USING (usuario_id = auth.uid());

-- Glimmers log: todos pueden leer, el donante inserta
ALTER TABLE glimmers_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "glimmers_lectura"  ON glimmers_log FOR SELECT USING (TRUE);
CREATE POLICY "glimmers_insertar" ON glimmers_log FOR INSERT WITH CHECK (donante_id = auth.uid());

-- Notas: todos leen, el autor escribe
ALTER TABLE notas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notas_lectura"   ON notas FOR SELECT USING (TRUE);
CREATE POLICY "notas_escritura" ON notas FOR ALL USING (autor_id = auth.uid());

-- Oruns log: solo el dueño
ALTER TABLE oruns_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "oruns_propia" ON oruns_log FOR ALL USING (perfil_id = auth.uid());


-- ─────────────────────────────────────────────────────────────────────
--  15. DATOS INICIALES  (géneros del sistema)
-- ─────────────────────────────────────────────────────────────────────
-- (Opcionales, se pueden insertar en el dashboard)
-- INSERT INTO ... (no hay tabla de géneros, son texto libre)

-- ══════════════════════════════════════════════════════════════════════
--  FIN — Migration 003 completada
--  Tablas creadas: perfiles, libros (ext), capitulos, posts,
--    follows, lectores_fieles, coescritores, glimmers_log,
--    notas, notificaciones, oruns_log
--  Vistas: vista_feed, vista_ranking, vista_perfil_publico
--  Triggers: auto-perfil, forks, editado_en, glimmers semanales
-- ══════════════════════════════════════════════════════════════════════
