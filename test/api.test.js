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
      'Consultorio de la Dra. Laura. Le recordamos su cita el jueves 29 de octubre a las 15:00.',
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
