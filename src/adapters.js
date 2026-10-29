import { citasDemo } from './domain.js';

export function crearCalendario({ mode, calendarId, token, fetchImpl, ahoraReal }) {
  const pedido = mode === 'real' ? 'real' : 'mock';
  if (pedido !== 'real' || !calendarId || !token) {
    return {
      pedido,
      modo: 'mock',
      async leer() {
        return citasDemo(ahoraReal());
      },
    };
  }

  return {
    pedido,
    modo: 'real',
    async leer() {
      const ahora = ahoraReal();
      const hasta = new Date(ahora.getTime() + 7 * 24 * 60 * 60 * 1000);
      const url = new URL(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      );
      url.searchParams.set('singleEvents', 'true');
      url.searchParams.set('orderBy', 'startTime');
      url.searchParams.set('timeMin', ahora.toISOString());
      url.searchParams.set('timeMax', hasta.toISOString());
      url.searchParams.set('showDeleted', 'true');
      const respuesta = await fetchImpl(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!respuesta.ok) {
        throw new Error('No se pudo leer el calendario.');
      }
      const datos = await respuesta.json();
      return eventosDesdeGoogle(datos.items ?? []);
    },
  };
}

export function eventosDesdeGoogle(items) {
  const citas = [];
  for (const item of items) {
    if (!item.start?.dateTime) continue;
    citas.push({
      id: item.id,
      titulo: item.summary || 'Sin nombre',
      inicio: new Date(item.start.dateTime),
      descripcion: item.description || '',
      estado: item.status === 'cancelled' ? 'cancelada' : 'confirmada',
    });
  }
  return citas;
}

export function crearWhatsapp({ mode, token, phoneNumberId, fetchImpl }) {
  const pedido = mode === 'real' ? 'real' : 'mock';
  const entregas = [];
  if (pedido !== 'real' || !token || !phoneNumberId) {
    return {
      pedido,
      modo: 'mock',
      entregas,
      async enviar({ para, texto }) {
        entregas.push({ para, texto });
        return { ok: true };
      },
    };
  }

  return {
    pedido,
    modo: 'real',
    entregas,
    async enviar({ para, texto }) {
      try {
        const respuesta = await fetchImpl(
          `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: para.replace(/^\+/, ''),
              type: 'text',
              text: { body: texto },
            }),
          },
        );
        return { ok: respuesta.ok };
      } catch {
        return { ok: false };
      }
    },
  };
}
