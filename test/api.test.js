import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import { createApp } from '../src/app.js';

const AHORA = new Date('2026-10-28T23:11:00-05:00');

async function conServidor(fn) {
  let redes = 0;
  const server = createApp({
    ahoraReal: () => AHORA,
    fetchImpl: () => {
      redes += 1;
      throw new Error('red');
    },
    config: {
      calendarPedido: 'mock',
      whatsappPedido: 'mock',
      calendarId: '',
      calendarToken: '',
      whatsappToken: '',
      whatsappPhoneNumberId: '',
      port: 0,
    },
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;
  try {
    await fn(base, () => redes);
  } finally {
    server.closeAllConnections?.();
    server.close();
    await once(server, 'close');
  }
}

async function api(base, ruta, cuerpo) {
  const respuesta = await fetch(`${base}${ruta}`, cuerpo
    ? {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo),
    }
    : undefined);
  const datos = await respuesta.json();
  assert.equal(respuesta.ok, true, JSON.stringify(datos));
  return datos;
}

function porClave(datos, clave) {
  const fila = datos.recordatorios.find((item) => item.clave === clave);
  assert.ok(fila, clave);
  return fila;
}

test('la demo cumple los cinco criterios sin llamar a la red', async () => {
  await conServidor(async (base, redes) => {
    const inicio = await api(base, '/api/estado');
    assert.equal(porClave(inicio, 'cita-ana:24h').linea, 'Cita mañana 15:00 · 24 h · Envío hoy 15:00 · Programado');
    assert.equal(porClave(inicio, 'cita-ana:2h').linea, 'Cita mañana 15:00 · 2 h · Envío mañana 13:00 · Programado');
    assert.equal(porClave(inicio, 'cita-luis:2h').linea, 'Cita mañana 09:00 · 2 h · Envío mañana 08:00 · Programado');
    assert.equal(porClave(inicio, 'cita-marta:24h').estado, 'omitido');
    assert.equal(porClave(inicio, 'cita-marta:2h').estado, 'omitido');
    assert.equal(inicio.recordatorios.length, 6);

    const tarde = await api(base, '/api/hora', { preset: 'hoy-16:00' });
    assert.equal(tarde.hora, '28 oct 16:00');
    const envio = await api(base, '/api/procesar', {});
    assert.equal(porClave(envio, 'cita-ana:24h').estado, 'enviado');
    assert.equal(
      porClave(envio, 'cita-ana:24h').mensaje,
      'Consultorio de la Dra. Laura. Le recordamos su cita el jueves 29 de octubre a las 15:00. Responda 1 para confirmar o 2 para cancelar.',
    );
    assert.equal(envio.entregasMock, 2);
    assert.equal(redes(), 0);

    const repetido = await api(base, '/api/procesar', {});
    assert.equal(repetido.entregasMock, 2);
    assert.equal(porClave(repetido, 'cita-ana:24h').estado, 'enviado');

    await api(base, '/api/sincronizar', {});
    const segunda = await api(base, '/api/sincronizar', {});
    assert.equal(segunda.recordatorios.length, 6);
    assert.equal(new Set(segunda.recordatorios.map((fila) => fila.clave)).size, 6);

    const madrugada = await api(base, '/api/hora', { preset: 'manana-07:30' });
    assert.equal(madrugada.hora, '29 oct 07:30');
    const temprano = await api(base, '/api/procesar', {});
    assert.equal(porClave(temprano, 'cita-luis:2h').estado, 'programado');
    assert.equal(porClave(temprano, 'cita-luis:2h').envioTexto, 'Envío hoy 08:00');
    assert.equal(porClave(temprano, 'cita-marta:2h').estado, 'omitido');
    assert.equal(temprano.entregasMock, 2);
  });
});

async function apiError(base, ruta, cuerpo) {
  const respuesta = await fetch(`${base}${ruta}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
  });
  assert.equal(respuesta.status, 400);
  return respuesta.json();
}

test('la confirmación de asistencia cumple sus criterios sin llamar a la red', async () => {
  await conServidor(async (base, redes) => {
    const antes = await api(base, '/api/estado');
    assert.equal(antes.leeRespuestas, true);
    assert.equal(antes.conversaciones.length, 0);
    const sinEnvio = await apiError(base, '/api/responder', { eventoId: 'cita-ana', texto: '1' });
    assert.equal(sinEnvio.error, 'Esta cita no tiene un recordatorio enviado.');

    await api(base, '/api/hora', { preset: 'hoy-16:00' });
    const envio = await api(base, '/api/procesar', {});
    assert.deepEqual(envio.conversaciones.map((item) => item.paciente), ['Luis Pérez', 'Ana Gómez']);
    assert.ok(envio.conversaciones.every((item) => item.confirmacion === 'sin_respuesta'));
    assert.equal(porClave(envio, 'cita-ana:24h').selloTexto, 'Sin respuesta');

    const ana = await api(base, '/api/responder', { eventoId: 'cita-ana', texto: ' 1 ' });
    assert.equal(ana.avisoSimulador, 'Ana Gómez confirmó su cita.');
    assert.equal(porClave(ana, 'cita-ana:24h').selloTexto, 'Confirmó');
    assert.equal(porClave(ana, 'cita-ana:2h').confirmacion, 'confirmo');
    assert.equal(porClave(ana, 'cita-ana:2h').estado, 'programado');

    const luis = await api(base, '/api/responder', { eventoId: 'cita-luis', texto: '2' });
    assert.equal(porClave(luis, 'cita-luis:24h').selloTexto, 'Canceló');
    assert.equal(porClave(luis, 'cita-luis:2h').estado, 'omitido');
    assert.equal(porClave(luis, 'cita-luis:2h').motivo, 'El paciente canceló por WhatsApp.');
    assert.equal(porClave(luis, 'cita-luis:24h').inicioTexto, 'mañana a las 09:00');

    const cambio = await api(base, '/api/responder', { eventoId: 'cita-luis', texto: '1' });
    assert.equal(cambio.avisoSimulador, 'La cita ya estaba cancelada. La respuesta quedó registrada.');
    const sincronizado = await api(base, '/api/sincronizar', {});
    assert.equal(porClave(sincronizado, 'cita-luis:24h').confirmacion, 'cancelo');
    assert.equal(porClave(sincronizado, 'cita-luis:2h').estado, 'omitido');

    const libre = await api(base, '/api/responder', { eventoId: 'cita-ana', texto: 'sí, gracias' });
    assert.equal(libre.avisoSimulador, 'No se reconoce la respuesta. Solo valen 1 o 2. La cita sigue igual.');
    assert.equal(porClave(libre, 'cita-ana:24h').confirmacion, 'confirmo');
    assert.equal(porClave(libre, 'cita-ana:24h').respuestaReconocida, false);

    const noCancelada = await apiError(base, '/api/espacio', { eventoId: 'cita-ana' });
    assert.equal(noCancelada.error, 'Solo se libera el espacio de una cita cancelada.');
    const liberado = await api(base, '/api/espacio', { eventoId: 'cita-luis' });
    assert.equal(porClave(liberado, 'cita-luis:24h').espacioLiberado, true);

    assert.deepEqual(
      {
        citas: liberado.resumen.citas,
        confirmadas: liberado.resumen.confirmadas,
        canceladas: liberado.resumen.canceladas,
        sinRespuesta: liberado.resumen.sinRespuesta,
        tasaRespuesta: liberado.resumen.tasaRespuesta,
        espaciosLiberados: liberado.resumen.espaciosLiberados,
        mensajes: liberado.resumen.mensajes,
      },
      { citas: 2, confirmadas: 1, canceladas: 1, sinRespuesta: 0, tasaRespuesta: 100, espaciosLiberados: 1, mensajes: 2 },
    );

    await api(base, '/api/hora', { hora: '2026-10-29T15:30' });
    const tarde = await apiError(base, '/api/responder', { eventoId: 'cita-ana', texto: '2' });
    assert.equal(tarde.error, 'La cita ya empezó.');
    assert.equal(redes(), 0);
  });
});

test('con WhatsApp real no se piden ni se aceptan respuestas', async () => {
  const server = createApp({
    ahoraReal: () => AHORA,
    fetchImpl: async () => ({ ok: true, json: async () => ({ items: [] }) }),
    config: {
      calendarPedido: 'mock',
      whatsappPedido: 'real',
      calendarId: '',
      calendarToken: '',
      whatsappToken: 'token',
      whatsappPhoneNumberId: '123',
      port: 0,
    },
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const estado = await api(base, '/api/estado');
    assert.equal(estado.leeRespuestas, false);
    assert.equal(porClave(estado, 'cita-ana:24h').confirmacion, null);
    assert.ok(!porClave(estado, 'cita-ana:24h').mensaje.includes('Responda'));
    const rechazo = await apiError(base, '/api/responder', { eventoId: 'cita-ana', texto: '1' });
    assert.equal(rechazo.error, 'Las respuestas simuladas solo están disponibles con WhatsApp en mock.');
  } finally {
    server.closeAllConnections?.();
    server.close();
    await once(server, 'close');
  }
});
