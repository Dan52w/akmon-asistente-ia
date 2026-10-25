# PLAN — Asistente IA para negocios (Akmon Studios)

## Qué es y qué vende

Un restaurante recibe las mismas 5 preguntas por WhatsApp todos los días: horario, menú, precios,
dirección y reservas. Este producto responde esas preguntas **solo** en la web del negocio, 24/7,
entrenado con los datos reales del negocio. Akmon lo vende como servicio: *levantamiento de la
información + instalación + mensualidad de mantenimiento*.

**Propuesta de valor para el cliente:** menos mensajes repetitivos, más reservas, atención inmediata.

## Módulos

### v1 — Demo funcional (ESTA VERSIÓN ✅)
- [x] Backend Express+TS: `/health`, `/api/businesses`, `/api/chat`
- [x] Base de conocimiento en JSON por negocio (`knowledge/casa-brasa.json`)
- [x] System prompt armado en el servidor (anti prompt-injection desde el widget)
- [x] Widget embedible vanilla JS (botón flotante, panel, typing, responsive)
- [x] Landing demo del restaurante ficticio "Casa Brasa" con el widget incrustado
- [x] Seguridad: x-app-key, rate limit, validación, helmet, CORS configurable
- [x] Modo MOCK para desarrollo sin gastar cuota de Groq
- [x] `render.yaml` para despliegue en un clic

### v2 — Panel de administración (próximo)
El negocio edita su menú/horarios/FAQs sin tocar código ni llamar a Akmon.
- Login simple para el dueño (usuario/clave por negocio, bcrypt)
- CRUD de la base de conocimiento con formularios (no JSON a mano)
- Vista previa del chat con los cambios antes de publicar
- Historial de conversaciones (últimos 30 días) para detectar preguntas sin respuesta

### v3 — Multi-tenant + analítica (producto real)
- Un solo backend sirviendo N negocios, cada uno con su `business` id y su key
- Dashboard Akmon: preguntas frecuentes por negocio, horarios pico, leads captados
- Captura de leads: el asistente pide nombre + teléfono cuando detecta intención de compra
- Límites por plan (mensajes/mes) para cobrar mensualidades escalonadas

### v4 — Canales (expansión)
- Mismo cerebro, más bocas: WhatsApp Business API, Instagram DM, widget web
- Respuestas con imágenes del menú (el asistente muestra fotos de platos)
- Integración con reservas reales (Google Calendar del negocio o sistema propio)

## Roadmap sugerido

| Fase | Alcance | Esfuerzo aprox. |
|------|---------|-----------------|
| 1 | Demo v1 desplegada (backend en Render + demo-web en Vercel) | 1–2 días |
| 2 | Segundo negocio demo (ej. inmobiliaria) para mostrar que es reutilizable | 1 día |
| 3 | Panel admin v2 | 1–2 semanas |
| 4 | Primer cliente real pagando instalación | — |

## Guion de demo (5 minutos con un cliente)

1. **El problema (1 min):** "¿Cuántos mensajes repetidos respondes al día? ¿Horario? ¿Precios?"
2. **La demo (2 min):** abre la web de Casa Brasa en el celular, abre el chat y pregunta:
   *"¿A qué hora abren?"* → *"¿Cuánto vale el arroz con coco?"* → *"Quiero reservar para 4 mañana"*
3. **El truco (1 min):** pregunta algo que NO está en la base (*"¿Tienen parqueadero?"* está; prueba *"¿Aceptan dólares?"*)
   → el asistente dice que no lo sabe y pasa el WhatsApp. **Nunca inventa.** Eso es lo que vende confianza.
4. **El cierre (1 min):** "Esto se instala en tu web en un día. Tú me pasas tu menú y tus horarios,
   yo lo dejo entrenado. Si cambias un precio, me avisas y lo actualizo."

## Costos (para fijar precio)

- Groq (tier gratuito): miles de mensajes/día sin costo con `gpt-oss-20b`.
- Render plan gratuito: suficiente para demos y primeros clientes.
- Costo marginal por cliente ≈ $0 → la instalación y la mensualidad son casi todo margen.

## Decisiones pendientes del fundador

- [ ] Nombre del repo público (sugerido: `akmon-asistente-ia`)
- [ ] ¿Repo público o privado? (recomendado: público — es portafolio)
- [ ] Desplegar backend en Render + demo en Vercel
- [ ] Agregar la demo como "Proyecto" en akmonstudios.com
- [ ] Segundo negocio demo: ¿inmobiliaria, clínica dental o gimnasio?
