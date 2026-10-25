import type { Business } from './knowledge';
import type { ClientMessage } from './security';
import { getBusiness } from './knowledge';

/**
 * Respuestas simuladas SOLO para desarrollo local (MOCK_AI=true).
 * Permite probar el flujo completo sin gastar cuota de Groq ni
 * necesitar API key. Nunca activar en producción.
 */
export function mockReply(business: Business, messages: ClientMessage[]): string {
  const last = messages.filter(m => m.role === 'user').pop()?.content.toLowerCase() ?? '';
  const wa = business.whatsapp;

  if (/hola|buenas|buenos d/.test(last))
    return `¡Hola! Soy ${business.assistantName}, el asistente de ${business.name}. 😊 ¿En qué te ayudo hoy? Puedo contarte del menú, horarios o ayudarte con una reserva.`;
  if (/horario|hora|abren|cierran|abierto/.test(last))
    return `Abrimos ${business.hours}. ¡Te esperamos! 🍽️`;
  if (/direcci|dónde|donde|ubicaci|llegar/.test(last))
    return `Estamos en ${business.address}.`;
  if (/precio|cuánto|cuanto|costo|vale|menú|menu|carta/.test(last)) {
    const cats = business.menu
      .map(c => `*${c.category}*\n` + c.items.map(i => `• ${i.name}: $${i.price.toLocaleString('es-CO')}`).join('\n'))
      .join('\n\n');
    return `Este es nuestro menú:\n\n${cats}\n\n¿Te antoja algo? 😋`;
  }
  if (/reserv|mesa|apartar/.test(last))
    return `¡Claro! Para reservar escríbenos por WhatsApp aquí: ${wa} con la fecha, la hora y cuántas personas son. ¡Te guardamos la mejor mesa! 📲`;
  if (/domicilio|delivery|llevar/.test(last))
    return `Sí, tenemos domicilios. Escríbenos por WhatsApp: ${wa} y te lo llevamos calientico. 🛵`;
  if (/gracias/.test(last))
    return `¡Con gusto! Aquí estaré cuando me necesites. 🌊`;
  return `Buena pregunta. Para darte el dato exacto, escríbenos por WhatsApp: ${wa} y te atendemos de una. 📲`;
}
