import type { Request, Response, NextFunction } from 'express';
import { rateLimit } from 'express-rate-limit';
import { getBusiness } from './knowledge';

/**
 * Autenticación del widget: header `x-app-key` con el secreto compartido
 * (APP_API_KEY en el servidor, configurado en el script del widget).
 * Sin esto, cualquiera que encuentre la URL quemaría la cuota de Groq.
 */
export function requireAppKey(req: Request, res: Response, next: NextFunction): void {
  const expected = (process.env.APP_API_KEY || '').trim();
  if (!expected) {
    res.status(500).json({ error: 'Backend sin configurar.' });
    return;
  }
  const got = req.header('x-app-key') || '';
  // Comparación en tiempo constante para no filtrar por timing.
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const crypto = require('crypto') as typeof import('crypto');
  const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
  if (!ok) {
    res.status(401).json({ error: 'No autorizado.' });
    return;
  }
  next();
}

/**
 * Límite por IP: un chat normal no necesita más de esto.
 * Protege la cuota gratuita de Groq contra abuso.
 */
export const chatRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Espera unos minutos.' },
});

export type ClientMessage = { role: 'user' | 'assistant'; content: string };

const MAX_MESSAGES = 20;
const MAX_MESSAGE_CHARS = 2000;
const MAX_TOTAL_CHARS = 12000;

/**
 * Valida el cuerpo de /api/chat. El system prompt lo arma el servidor
 * desde la base de conocimiento: el cliente solo envía el negocio y
 * el historial (usuario/asistente). Esto evita prompt injection desde
 * el widget y mantiene el conocimiento en un solo lugar.
 */
export function validateChatBody(body: unknown): { business: string; messages: ClientMessage[] } | string {
  if (!body || typeof body !== 'object') return 'Cuerpo inválido.';
  const { business, messages } = body as { business?: unknown; messages?: unknown };
  if (typeof business !== 'string' || !business.trim()) return 'Falta el negocio.';
  if (!getBusiness(business.trim())) return 'Negocio desconocido.';
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES)
    return `messages debe tener entre 1 y ${MAX_MESSAGES} elementos.`;
  let total = 0;
  for (const m of messages) {
    if (!m || typeof m !== 'object') return 'Mensaje inválido.';
    const { role, content } = m as { role?: unknown; content?: unknown };
    if (role !== 'user' && role !== 'assistant') return 'Rol inválido.';
    if (typeof content !== 'string' || content.length === 0 || content.length > MAX_MESSAGE_CHARS)
      return `Cada mensaje debe tener entre 1 y ${MAX_MESSAGE_CHARS} caracteres.`;
    total += content.length;
    if (total > MAX_TOTAL_CHARS) return 'Petición demasiado grande.';
  }
  return { business: business.trim(), messages: messages as ClientMessage[] };
}
