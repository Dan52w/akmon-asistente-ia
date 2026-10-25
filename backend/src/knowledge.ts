import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

export type MenuItem = { name: string; price: number; description?: string };
export type MenuCategory = { category: string; items: MenuItem[] };
export type Faq = { q: string; a: string };

export type Business = {
  id: string;
  name: string;
  description: string;
  assistantName: string;
  tone: string;
  hours: string;
  address: string;
  phone: string;
  phoneNote?: string;
  whatsapp: string;
  email?: string;
  menu: MenuCategory[];
  policies: string[];
  faqs: Faq[];
};

// La base de conocimiento vive en el SERVIDOR, no en el widget.
// Así el widget es tonto (solo envía mensajes) y el negocio puede
// actualizar su menú/horarios sin tocar el código del sitio.
const businesses = new Map<string, Business>();

function loadKnowledge(): void {
  const dir = join(__dirname, '..', '..', 'knowledge');
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.json')) continue;
    try {
      const raw = readFileSync(join(dir, file), 'utf-8');
      const b = JSON.parse(raw) as Business;
      if (b.id) businesses.set(b.id, b);
    } catch (error) {
      console.error(`[knowledge] no se pudo cargar ${file}`);
    }
  }
  console.log(`[knowledge] negocios cargados: ${[...businesses.keys()].join(', ') || 'ninguno'}`);
}

loadKnowledge();

export function getBusiness(id: string): Business | undefined {
  return businesses.get(id);
}

export function listBusinesses(): { id: string; name: string; description: string }[] {
  return [...businesses.values()].map(b => ({
    id: b.id,
    name: b.name,
    description: b.description,
  }));
}

function formatPrice(cop: number): string {
  return `$${cop.toLocaleString('es-CO')}`;
}

/**
 * Arma el system prompt con los datos del negocio. El modelo solo puede
 * responder con esta información: si algo no está aquí, debe decir que
 * no lo sabe y ofrecer el WhatsApp. Nunca inventa precios ni platos.
 */
export function buildSystemPrompt(b: Business): string {
  const menu = b.menu
    .map(c => `### ${c.category}\n` + c.items.map(i => `- ${i.name}: ${formatPrice(i.price)}${i.description ? ` — ${i.description}` : ''}`).join('\n'))
    .join('\n\n');
  const policies = b.policies.map(p => `- ${p}`).join('\n');
  const faqs = b.faqs.map(f => `P: ${f.q}\nR: ${f.a}`).join('\n\n');

  return `Eres "${b.assistantName}", el asistente virtual de ${b.name}, ${b.description}
Tono: ${b.tone}

DATOS DEL NEGOCIO (única fuente de verdad):
- Horario: ${b.hours}
- Dirección: ${b.address}
- Teléfono/WhatsApp: ${b.phone}${b.phoneNote ? ` (${b.phoneNote})` : ''}
- WhatsApp directo: ${b.whatsapp}

MENÚ Y PRECIOS (pesos colombianos):
${menu}

POLÍTICAS:
${policies}

PREGUNTAS FRECUENTES:
${faqs}

REGLAS ESTRICTAS:
1. Responde ÚNICAMENTE con la información de arriba. Si te preguntan algo que no está aquí, dilo con amabilidad y ofrece el WhatsApp (${b.whatsapp}).
2. NUNCA inventes precios, platos, horarios ni promociones.
3. Si el usuario quiere reservar, pídele fecha, hora y número de personas, y luego dirígelo al WhatsApp con esos datos listos.
4. Respuestas cortas y claras. Usa listas simples cuando enumeres. Nada de jerga técnica.
5. No menciones que eres un modelo de IA ni detalles técnicos; eres el asistente de ${b.name}.`;
}
