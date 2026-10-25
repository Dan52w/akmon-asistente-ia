/**
 * Cliente de Groq. La API key vive SOLO en la variable de entorno
 * GROQ_API_KEY del servidor. Nunca en código, nunca en logs,
 * nunca viaja al navegador.
 */
const API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = (process.env.GROQ_MODEL || 'openai/gpt-oss-120b').trim();
// Modelos de respaldo ante 429: cada uno tiene cuota propia en Groq.
const FALLBACK_MODELS = ['openai/gpt-oss-20b'];
const TIMEOUT_MS = 55_000;

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export class GroqError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly retryable: boolean,
  ) {
    super(message);
  }
}

function groqKey(): string {
  const key = (process.env.GROQ_API_KEY || '').trim();
  if (!key) throw new Error('GROQ_API_KEY no configurada en el servidor.');
  return key;
}

export async function chatWithGroq(messages: ChatMessage[]): Promise<string> {
  // Cadena de modelos: el fallback multiplica la cuota diaria efectiva.
  // Solo se salta al siguiente ante 429 (cuota); otros errores se propagan.
  const chain = [MODEL, ...FALLBACK_MODELS.filter(m => m !== MODEL)];
  let lastError: GroqError | null = null;
  for (const model of chain) {
    try {
      return await callGroq(model, messages);
    } catch (error) {
      if (error instanceof GroqError && error.status === 429) {
        console.warn(`[groq] cuota alcanzada en ${model}, probando siguiente.`);
        lastError = error;
        continue;
      }
      throw error;
    }
  }
  throw lastError ?? new GroqError('Sin modelos disponibles.', 429, true);
}

async function callGroq(model: string, messages: ChatMessage[]): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${groqKey()}`,
      },
      body: JSON.stringify({
        model,
        ...(model.includes('gpt-oss') ? { reasoning_effort: 'low' } : {}),
        messages,
        max_tokens: 800,
        temperature: 0.7,
      }),
      signal: controller.signal,
    });

    if (res.status === 401 || res.status === 403)
      throw new GroqError('Groq rechazó la API key.', res.status, false);
    if (res.status === 429)
      throw new GroqError('Cuota de Groq alcanzada.', res.status, true);
    if (res.status === 404)
      throw new GroqError('Modelo de Groq no disponible.', res.status, false);
    if (!res.ok)
      throw new GroqError(`Groq respondió ${res.status}.`, res.status, res.status >= 500);

    const data = (await res.json()) as {
      choices?: { message?: { content?: unknown } }[];
    };
    const reply = data.choices?.[0]?.message?.content;
    if (typeof reply !== 'string' || !reply.trim())
      throw new GroqError('Groq devolvió una respuesta vacía.', 502, true);
    return reply;
  } catch (error) {
    if (error instanceof GroqError) throw error;
    if (error instanceof Error && error.name === 'AbortError')
      throw new GroqError('Timeout llamando a Groq.', 504, true);
    throw new GroqError('Error de red llamando a Groq.', 502, true);
  } finally {
    clearTimeout(timeout);
  }
}
