# Asistente IA para negocios — Akmon Studios

Un asistente de chat con IA que cualquier negocio puede incrustar en su web con un solo `<script>`.
El negocio define su información (menú, horarios, políticas) en una base de conocimiento JSON y el
asistente responde a los clientes usando solo esos datos. Si no sabe algo, lo dice y dirige al WhatsApp.

**Demo en vivo (negocio ficticio):** restaurante "Casa Brasa" — `demo-web/index.html` + widget 💬.

## Estructura

```
akmon-asistente-ia/
├── backend/            # API Express + TypeScript (se despliega en Render)
│   └── src/
│       ├── index.ts    # /health, /api/businesses, /api/chat + sirve el widget
│       ├── knowledge.ts# carga knowledge/*.json y arma el system prompt
│       ├── security.ts # x-app-key, rate limit por IP, validación de entrada
│       ├── groq.ts     # cliente Groq con cadena de modelos ante 429
│       └── mock.ts     # respuestas simuladas (SOLO desarrollo local)
├── knowledge/
│   └── casa-brasa.json # base de conocimiento del restaurante demo (ficticio)
├── widget/
│   └── chat-widget.js  # widget embedible, vanilla JS, sin dependencias
├── demo-web/
│   └── index.html      # landing del restaurante ficticio con el widget incrustado
├── README.md
└── PLAN.md             # módulos, roadmap y guion de demo para clientes
```

## Cómo funciona

1. El visitante escribe en el widget → `POST /api/chat` con `{ business, messages }`.
2. El backend valida, autentica (`x-app-key`), limita por IP y arma el system prompt
   desde `knowledge/<negocio>.json`.
3. Groq responde usando **solo** los datos del negocio. La API key nunca sale del servidor.
4. El widget muestra la respuesta. El conocimiento vive en el backend: el negocio puede
   cambiar su menú sin tocar su web.

## Desarrollo local

```bash
cd backend
pnpm install        # en Windows: pnpm install
cp .env.example .env
# edita .env: APP_API_KEY=demo-key-local, MOCK_AI=true
pnpm dev            # http://localhost:3000
```

Abre `demo-web/index.html` en el navegador (el widget apunta a `http://localhost:3000`).
Con `MOCK_AI=true` las respuestas son simuladas: no gastas cuota de Groq ni necesitas API key.

## Despliegue en Render

1. Sube el repo a GitHub y crea un **Blueprint** con `backend/render.yaml`.
2. Define `GROQ_API_KEY` en Environment (la key de Groq, gratis en console.groq.com).
3. `APP_API_KEY` se genera sola; cópiala para el `data-app-key` del widget.
4. Ajusta `ALLOWED_ORIGINS` con el dominio del cliente (ej. `https://casabrasa.com`).

El cliente pega esto en su web y listo:

```html
<script src="https://tu-backend.onrender.com/widget/chat-widget.js"
  data-backend="https://tu-backend.onrender.com"
  data-app-key="SU_CLAVE"
  data-business="casa-brasa"
  data-name="Brasi"
  data-color="#f59e0b"></script>
```

## Seguridad (estándares mínimos aplicados)

- `x-app-key` con comparación en tiempo constante; sin key no hay chat.
- Rate limit 40 req / 15 min por IP (protege la cuota de Groq).
- Validación estricta de entrada: negocio existente, roles permitidos, topes de tamaño.
- El system prompt lo arma el **servidor**; el cliente no puede inyectar instrucciones.
- Helmet, JSON limitado a 100kb, `trust proxy` para IP real tras Render.
- Secretos solo en variables de entorno; `.env` en `.gitignore`.
- Respuestas de error genéricas: nunca filtran detalles internos ni keys.
- `MOCK_AI` es solo local: el arranque avisa si está activo.

## Agregar un negocio nuevo

1. Crea `knowledge/mi-negocio.json` (copia `casa-brasa.json` como plantilla).
2. Reinicia el backend. Aparece en `GET /api/businesses`.
3. Cambia `data-business="mi-negocio"` en el script del widget.
