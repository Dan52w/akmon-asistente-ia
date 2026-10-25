import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { join } from 'path';
import { chatWithGroq, GroqError, type ChatMessage } from './groq';
import { requireAppKey, chatRateLimit, validateChatBody } from './security';
import { buildSystemPrompt, getBusiness, listBusinesses } from './knowledge';
import { mockReply } from './mock';

const app = express();
const PORT = Number(process.env.PORT || 3000);
const MOCK_AI = (process.env.MOCK_AI || '').toLowerCase() === 'true';

app.use(helmet());
// Límite de tamaño del JSON: otra capa contra peticiones infladas.
app.use(express.json({ limit: '100kb' }));
// Render corre detrás de un proxy: necesario para que el rate limit
// por IP vea la IP real del cliente.
app.set('trust proxy', 1);

// CORS: el widget vive en el sitio del cliente (otro dominio).
// En producción define ALLOWED_ORIGINS con los dominios del cliente.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '*')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
app.use(cors({ origin: allowedOrigins.includes('*') ? true : allowedOrigins }));

// Salud: lo usa Render para el health check.
app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'akmon-asistente-ia' });
});

// El widget se sirve desde aquí: <backend>/widget/chat-widget.js
// Así el cliente solo pega un <script> y listo, sin hosting adicional.
app.use('/widget', express.static(join(__dirname, '..', '..', 'widget')));

// Lista pública de negocios demo (sin secretos): el widget la puede
// usar para configurarse, y sirve para el portafolio.
app.get('/api/businesses', (_req, res) => {
  res.json({ businesses: listBusinesses() });
});

/**
 * POST /api/chat
 * El widget envía { business, messages }. El backend arma el system
 * prompt desde la base de conocimiento del negocio, autentica con
 * x-app-key, limita por IP y reenvía a Groq. La API key de Groq y el
 * conocimiento del negocio nunca salen de este servidor.
 */
app.post('/api/chat', requireAppKey, chatRateLimit, async (req, res) => {
  const parsed = validateChatBody(req.body);
  if (typeof parsed === 'string') {
    res.status(400).json({ error: parsed });
    return;
  }
  const business = getBusiness(parsed.business)!;

  try {
    let reply: string;
    if (MOCK_AI) {
      reply = mockReply(business, parsed.messages);
    } else {
      const messages: ChatMessage[] = [
        { role: 'system', content: buildSystemPrompt(business) },
        ...parsed.messages,
      ];
      reply = await chatWithGroq(messages);
    }
    res.json({ reply });
  } catch (error) {
    // Nunca filtrar detalles internos ni la key en la respuesta.
    if (error instanceof GroqError) {
      const status = error.status === 429 ? 429 : 502;
      res.status(status).json({
        error:
          error.status === 429
            ? 'La IA está recibiendo muchas solicitudes. Espera un minuto.'
            : 'La IA no está disponible en este momento. Inténtalo más tarde.',
      });
      return;
    }
    console.error('[chat] error inesperado');
    res.status(500).json({ error: 'Error interno. Inténtalo más tarde.' });
  }
});

// 404 para todo lo demás.
app.use((_req, res) => res.status(404).json({ error: 'No encontrado.' }));

app.listen(PORT, () => {
  console.log(`akmon-asistente-ia escuchando en puerto ${PORT}`);
  if (MOCK_AI) console.warn('[aviso] MOCK_AI activado: las respuestas son simuladas. No usar en producción.');
  if (!process.env.GROQ_API_KEY && !MOCK_AI) console.warn('[aviso] GROQ_API_KEY no configurada.');
  if (!process.env.APP_API_KEY) console.warn('[aviso] APP_API_KEY no configurada.');
});
