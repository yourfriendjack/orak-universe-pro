# 🌌 ORAK Universe — Arquitectura Profesional v3.0

## Árbol del proyecto

```
orak-universe/
│
├── frontend/                          ← Todo lo que corre en el navegador
│   ├── index.html                     ← Página principal (HTML estructural)
│   ├── css/
│   │   └── orak.css                   ← Estilos globales (sin cambios)
│   ├── assets/
│   │   └── universo.json              ← Datos embebidos de respaldo
│   └── js/
│       ├── config.js                  ← 🆕 URLs y config (sin hardcode)
│       ├── engine.js                  ← Orquestador principal (legacy, se vacía gradualmente)
│       ├── api/
│       │   ├── client.js              ← 🆕 Cliente HTTP centralizado
│       │   ├── crud.js                ← Acciones CRUD (extraído de engine.js)
│       │   └── websocket.js           ← 🆕 Cliente WS con auto-reconexión
│       ├── state/
│       │   └── store.js               ← Estado global (_libros, _stats, _timeline)
│       ├── services/
│       │   ├── auth.js                ← Supabase Auth + economía (Oruns/Glimmers)
│       │   └── pdf.js                 ← PDF viewer + post-its
│       ├── ui/
│       │   ├── navigation.js          ← Sidebar, drawer, setVista()
│       │   ├── render.js              ← renderVista() + renderFeed()
│       │   └── mobile.js             ← Nav móvil + menú hamburguesa
│       ├── components/
│       │   ├── chat.js                ← Chat del universo
│       │   ├── notifications.js       ← Sistema de notificaciones
│       │   └── store.js               ← Tienda de skins
│       ├── animations/
│       │   ├── canvas.js              ← Constelaciones + cometa (Canvas)
│       │   └── particles.js           ← Glimmers (partículas CSS)
│       └── utils/
│           └── icons.js               ← ORAK_ICONS SVG
│
├── backend/                           ← Servidor Python / FastAPI
│   ├── main.py                        ← 🆕 Entry point limpio (solo config + routers)
│   ├── api/
│   │   └── routes/
│   │       ├── libros.py              ← 🆕 GET/POST/DELETE/PATCH /libros
│   │       ├── personajes.py          ← 🆕 Personajes, habilidades, armas
│   │       ├── mundo.py               ← 🆕 Eventos, lugares, facciones, relaciones
│   │       ├── universo.py            ← 🆕 WS, chat, timeline, stats, info
│   │       └── web.py                 ← 🆕 Sirve frontend estático
│   ├── core/
│   │   ├── config.py                  ← 🆕 Settings desde .env (sin hardcode)
│   │   └── orak_core.py               ← Lógica de negocio pura (sin cambios)
│   ├── services/
│   │   ├── store.py                   ← 🆕 Cache en memoria + Repository pattern
│   │   └── websocket_manager.py       ← 🆕 ConnectionManager aislado
│   ├── models/
│   │   └── schemas.py                 ← 🆕 Todos los modelos Pydantic juntos
│   ├── database/
│   │   ├── supabase_client.py         ← 🆕 Singleton del cliente Supabase
│   │   └── repository.py              ← 🆕 Todas las queries a Supabase aquí
│   ├── ai/
│   │   └── narrator.py                ← 🆕 Stub de IA narrativa (listo para LLM)
│   └── utils/
│       ├── helpers.py                 ← 🆕 ok(), error(), dec_titulo()
│       └── middleware.py              ← 🆕 SlashEncoderMiddleware aislado
│
├── database/
│   ├── schema.sql                     ← Schema Supabase completo
│   └── migrations/
│       ├── 001_initial_schema.sql     ← 🆕 Tabla libros con índices y triggers
│       └── 002_user_profiles.sql      ← 🆕 Perfiles de usuario (para auth futura)
│
├── docker/
│   ├── Dockerfile.backend             ← 🆕 Build de producción (non-root)
│   └── nginx/
│       └── nginx.conf                 ← 🆕 Reverse proxy + static files
│
├── scripts/
│   └── dev.sh                         ← 🆕 Setup y arranque local
│
├── .env.example                       ← 🆕 Template de variables de entorno
├── .gitignore                         ← 🆕 .env, __pycache__, .venv
├── requirements.txt                   ← Actualizado con pydantic-settings
├── Procfile                           ← Compatible Railway
├── railway.toml                       ← Compatible Railway
├── docker-compose.yml                 ← 🆕 Stack completo local
└── README.md                          ← Este archivo
```

---

## 🚨 Problemas críticos detectados y corregidos

### Seguridad
| Problema | Severidad | Corrección |
|---|---|---|
| `service_role` key de Supabase hardcodeada en `orak_server.py` | 🔴 CRÍTICA | Movida a `.env` → `SUPABASE_KEY` |
| `service_role` key en `engine.js` (frontend público) | 🔴 CRÍTICA | Eliminada del frontend — solo backend |
| `anon` key hardcodeada en `engine.js` | 🟠 Alta | Movida a `window.ORAK_CONFIG` inyectado por servidor |
| URL de ngrok hardcodeada (`hazing-diffusive-affidavit...`) | 🟡 Media | Reemplazada por `API_BASE` desde `config.js` |
| Sin `.gitignore` — riesgo de commitear `.env` | 🟡 Media | Añadido `.gitignore` |

### Arquitectura
| Problema | Corrección |
|---|---|
| `engine.js` de 3,317 líneas con 15+ responsabilidades | Dividido en 13 módulos especializados |
| `orak_server.py` mezclando rutas, modelos, DB, WS, config | Separado en 8 archivos con responsabilidad única |
| Estado en memoria acoplado directamente a Supabase | Patrón Repository: `store.py` → `repository.py` → `supabase_client.py` |
| Sin lifespan — `on_event("startup")` obsoleto en FastAPI | Migrado a `@asynccontextmanager lifespan` |
| Sin layers — routes llamaban Supabase directamente | Routes → Services → Repository → Database |

---

## 🗺️ Roadmap de migración — paso a paso seguro

### FASE 0 — Preparación (hoy, 30 min)
```bash
# 1. Crear .env desde el template
cp .env.example .env

# 2. Rellenar con tus credenciales reales (las mismas que tenías hardcodeadas)
nano .env   # o tu editor favorito

# 3. Añadir .env a .gitignore
echo ".env" >> .gitignore
echo "__pycache__/" >> .gitignore
echo ".venv/" >> .gitignore
echo "*.pyc" >> .gitignore

# 4. Instalar pydantic-settings (nueva dependencia)
pip install pydantic-settings
```

### FASE 1 — Backend modular (1–2 horas)
```bash
# Arrancar con la nueva arquitectura
bash scripts/dev.sh

# Verificar que todos los endpoints funcionan igual
curl http://localhost:8000/info
curl http://localhost:8000/libros
curl http://localhost:8000/stats

# Si algo falla, el engine.js original sigue ahí — no rompiste nada
```

### FASE 2 — Frontend seguro (1 hora)
Edita `backend/api/routes/web.py` para inyectar la config del servidor en el HTML:

```python
# En serve el / , antes de retornar el HTML, insertar:
config_script = f"""<script>
window.ORAK_CONFIG = {{
  supabaseUrl:  "{cfg.SUPABASE_URL}",
  supabaseAnon: "{cfg.SUPABASE_ANON_KEY}",
  apiServer:    "{cfg.public_url}"
}};
</script>"""
content = content.replace('<!-- SERVER_CONFIG_INJECTION_POINT -->', config_script)
```

### FASE 3 — Migrar engine.js a módulos (incremental, 1 semana)
El orden recomendado (cada paso es independiente):

```
Día 1: Verificar que config.js + client.js + websocket.js funcionan
Día 2: Migrar state/store.js (reemplaza las vars globales de engine.js)
Día 3: Migrar ui/navigation.js + ui/render.js
Día 4: Migrar components/ (chat, notifications, store)
Día 5: Migrar services/pdf.js
Día 6: Migrar animations/ (no afectan lógica)
Día 7: engine.js debería quedar solo con init() — luego eliminarlo
```

### FASE 4 — Docker (cuando quieras escalar)
```bash
docker compose up --build
# Backend en :8000, listo para poner nginx delante
```

### FASE 5 — Auth (futuro)
```bash
# Ejecutar migración de usuarios
psql $DATABASE_URL < database/migrations/002_user_profiles.sql

# Activar JWT en config.py + instalar dependencias
pip install python-jose passlib

# El stub en backend/ai/narrator.py ya espera OPENAI_API_KEY en .env
```

---

## ⚡ Comandos de desarrollo

```bash
# Arrancar en local (modo dev con reload)
bash scripts/dev.sh

# O directamente con uvicorn
uvicorn backend.main:app --reload --port 8000

# Verificar endpoints
curl http://localhost:8000/info
curl http://localhost:8000/docs      # Swagger UI automático de FastAPI

# Docker local
docker compose up --build

# Limpiar caché Python
find . -type d -name __pycache__ | xargs rm -rf
```

---

## 🔧 Stack completo

| Capa | Tecnología | Versión |
|---|---|---|
| Frontend | HTML + CSS + JS vanilla | — |
| Backend | FastAPI + Uvicorn | 0.111 / 0.29 |
| WebSockets | FastAPI native | — |
| Base de datos | PostgreSQL (Supabase) | — |
| ORM | Supabase Python SDK | 2.4 |
| Config | pydantic-settings | 2.2 |
| Deploy | Railway | — |
| Contenedor | Docker + nginx | — |
| IA (futuro) | OpenAI / Anthropic | — |

---

## 📋 Variables de entorno requeridas

| Variable | Descripción | Dónde obtenerla |
|---|---|---|
| `SUPABASE_URL` | URL de tu proyecto | Supabase → Settings → API |
| `SUPABASE_KEY` | service_role key (SOLO backend) | Supabase → Settings → API |
| `SUPABASE_ANON_KEY` | anon key (frontend, read-only) | Supabase → Settings → API |
| `JWT_SECRET` | Secreto para tokens futuros | `openssl rand -hex 32` |

---

## 🧠 Preparación IA — cómo activar cuando esté listo

```bash
# 1. Añadir key en .env
OPENAI_API_KEY=sk-...

# 2. Instalar SDK
pip install openai

# 3. El servicio ya existe — solo rellenar los métodos stub
# backend/ai/narrator.py → sugerir_evento(), describir_personaje()

# 4. Añadir endpoint en backend/api/routes/universo.py
@router.post("/ai/sugerir-evento/{titulo}")
async def sugerir_evento(titulo: str):
    libro = store.buscar(titulo)
    sugerencia = await narrator.sugerir_evento(libro)
    return {"sugerencia": sugerencia}
```
