import assert from 'node:assert/strict';
import test from 'node:test';
import {
  citasDemo,
  desdeBogota,
  horaDeEnvio,
  presentar,
  procesar,
  sincronizar,
  textoRecordatorio,
  visibles,
} from '../src/domain.js';
import { crearWhatsapp, eventosDesdeGoogle } from '../src/adapters.js';

const AHORA = new Date('2026-10-28T23:11:00-05:00');

function fila(lista, clave) {
  const encontrada = lista.find((item) => item.clave === clave);
  assert.ok(encontrada, clave);
  return encontrada;
}

test('criterio 1: Ana tiene 24 h hoy a las 15:00 y 2 h mañana a las 13:00, en programado', () => {
  const lista = sincronizar(citasDemo(AHORA), []);
  const de24 = fila(lista, 'cita-ana:24h');
  const de2 = fila(lista, 'cita-ana:2h');
  assert.equal(de24.estado, 'programado');
  assert.equal(de2.estado, 'programado');
  assert.equal(de24.horaEnvio.toISOString(), desdeBogota(2026, 9, 28, 15, 0).toISOString());
  assert.equal(de2.horaEnvio.toISOString(), desdeBogota(2026, 9, 29, 13, 0).toISOString());
  assert.equal(presentar(de24, AHORA).linea, 'Cita mañana 15:00 · 24 h · Envío hoy 15:00 · Programado');
  assert.equal(presentar(de2, AHORA).linea, 'Cita mañana 15:00 · 2 h · Envío mañana 13:00 · Programado');
});

test('criterio 2: a las 16:00 el 24 h de Ana queda enviado y el texto se conserva', async () => {
  let llamadas = 0;
  const whatsapp = crearWhatsapp({ mode: 'mock', fetchImpl: () => { throw new Error('red'); } });
  let lista = sincronizar(citasDemo(AHORA), []);
  const dieciseis = desdeBogota(2026, 9, 28, 16, 0);
  const resultado = await procesar(lista, dieciseis, (mensaje) => {
    llamadas += 1;
    return whatsapp.enviar(mensaje);
  });
  lista = resultado.recordatorios;
  const ana = fila(lista, 'cita-ana:24h');
  assert.equal(ana.estado, 'enviado');
  assert.equal(
    ana.mensaje,
    'Consultorio de la Dra. Laura. Le recordamos su cita el jueves 29 de octubre a las 15:00.',
  );
  assert.equal(llamadas, 2);
  assert.equal(whatsapp.entregas.length, 2);
  assert.equal(whatsapp.modo, 'mock');
});

test('criterio 3: a las 07:30 el 2 h de Luis sigue programado y su envío es a las 08:00', async () => {
  let llamadas = 0;
  let lista = sincronizar(citasDemo(AHORA), []);
  const luis = fila(lista, 'cita-luis:2h');
  assert.equal(luis.horaEnvio.toISOString(), desdeBogota(2026, 9, 29, 8, 0).toISOString());
  const resultado = await procesar(lista, desdeBogota(2026, 9, 29, 7, 30), () => {
    llamadas += 1;
    return { ok: true };
  });
  assert.equal(fila(resultado.recordatorios, 'cita-luis:2h').estado, 'programado');
  assert.equal(llamadas, 0);
});

test('criterio 4: sincronizar dos veces no duplica y procesar otra vez no reenvía', async () => {
  const citas = citasDemo(AHORA);
  const una = sincronizar(citas, []);
  const dos = sincronizar(citas, una);
  assert.equal(dos.length, 6);
  assert.equal(new Set(dos.map((fila) => fila.clave)).size, 6);
  let envios = 0;
  const primero = await procesar(dos, desdeBogota(2026, 9, 28, 16, 0), () => {
    envios += 1;
    return { ok: true };
  });
  const otra = await procesar(primero.recordatorios, desdeBogota(2026, 9, 28, 16, 0), () => {
    envios += 1;
    return { ok: true };
  });
  assert.equal(fila(otra.recordatorios, 'cita-ana:24h').estado, 'enviado');
  assert.equal(envios, 2);
});

test('criterio 5: Marta queda omitida y procesar no la envía', async () => {
  let lista = sincronizar(citasDemo(AHORA), []);
  assert.equal(fila(lista, 'cita-marta:24h').estado, 'omitido');
  assert.equal(fila(lista, 'cita-marta:2h').estado, 'omitido');
  assert.equal(fila(lista, 'cita-marta:24h').motivo, 'Sin teléfono en la cita.');
  const resultado = await procesar(lista, desdeBogota(2026, 9, 28, 16, 0), () => ({ ok: true }));
  assert.equal(fila(resultado.recordatorios, 'cita-marta:24h').estado, 'omitido');
  assert.equal(fila(resultado.recordatorios, 'cita-marta:2h').estado, 'omitido');
});

test('el texto del recordatorio usa la fecha de la cita en America/Bogota', () => {
  const inicio = desdeBogota(2026, 10, 3, 15, 0);
  assert.equal(
    textoRecordatorio(inicio),
    'Consultorio de la Dra. Laura. Le recordamos su cita el martes 3 de noviembre a las 15:00.',
  );
});

test('una cita a las 08:00 mueve el recordatorio de 2 h a las 20:00 del día anterior', () => {
  const inicio = desdeBogota(2026, 9, 29, 8, 0);
  assert.equal(horaDeEnvio(inicio, 2).toISOString(), desdeBogota(2026, 9, 28, 20, 0).toISOString());
});

test('si la cita cambia de hora, el programado se recalcula y el enviado no', () => {
  const citas = citasDemo(AHORA);
  let lista = sincronizar(citas, []);
  lista = lista.map((fila) => (
    fila.clave === 'cita-ana:24h' ? { ...fila, estado: 'enviado' } : fila
  ));
  const movida = citas.map((cita) => (
    cita.id === 'cita-ana'
      ? { ...cita, inicio: desdeBogota(2026, 9, 29, 17, 0) }
      : cita
  ));
  lista = sincronizar(movida, lista);
  assert.equal(fila(lista, 'cita-ana:24h').estado, 'enviado');
  assert.equal(fila(lista, 'cita-ana:24h').horaEnvio.toISOString(), desdeBogota(2026, 9, 28, 15, 0).toISOString());
  assert.equal(fila(lista, 'cita-ana:2h').horaEnvio.toISOString(), desdeBogota(2026, 9, 29, 15, 0).toISOString());
  assert.equal(lista.filter((fila) => fila.eventoId === 'cita-ana').length, 2);
});

test('una cita cancelada pasa el programado a omitido', () => {
  const citas = citasDemo(AHORA);
  const lista = sincronizar(citas, []);
  const cancelada = sincronizar(
    citas.map((cita) => (cita.id === 'cita-luis' ? { ...cita, estado: 'cancelada' } : cita)),
    lista,
  );
  assert.equal(fila(cancelada, 'cita-luis:24h').estado, 'omitido');
  assert.equal(fila(cancelada, 'cita-luis:2h').motivo, 'Cita cancelada.');
});

test('un fallo del proveedor deja fallido y no se reintenta', async () => {
  let lista = sincronizar(citasDemo(AHORA), []);
  let llamadas = 0;
  const primero = await procesar(lista, desdeBogota(2026, 9, 28, 16, 0), () => {
    llamadas += 1;
    return { ok: false };
  });
  const segundo = await procesar(primero.recordatorios, desdeBogota(2026, 9, 28, 17, 0), () => {
    llamadas += 1;
    return { ok: true };
  });
  assert.equal(fila(segundo.recordatorios, 'cita-ana:24h').estado, 'fallido');
  assert.equal(llamadas, 2);
});

test('la lista de hoy y mañana incluye a Ana y deja fuera un envío de pasado mañana', () => {
  const lista = sincronizar(citasDemo(AHORA), []);
  lista.push({
    clave: 'cita-lejana:24h',
    eventoId: 'cita-lejana',
    tipo: '24h',
    paciente: 'Nadie',
    inicio: desdeBogota(2026, 9, 31, 10, 0),
    horaEnvio: desdeBogota(2026, 9, 30, 10, 0),
    estado: 'programado',
    motivo: null,
    mensaje: 'lejos',
  });
  const claves = visibles(lista, AHORA).map((fila) => fila.clave);
  assert.ok(claves.includes('cita-ana:24h'));
  assert.ok(claves.includes('cita-ana:2h'));
  assert.equal(claves.includes('cita-lejana:24h'), false);
});

test('el calendario real ignora eventos de día completo y marca cancelados', () => {
  const citas = eventosDesdeGoogle([
    { id: '1', summary: 'Día completo', start: { date: '2026-10-29' }, status: 'confirmed' },
    {
      id: '2',
      summary: 'Ana Gómez',
      start: { dateTime: '2026-10-29T15:00:00-05:00' },
      description: 'WhatsApp: +573001112233',
      status: 'cancelled',
    },
  ]);
  assert.equal(citas.length, 1);
  assert.equal(citas[0].estado, 'cancelada');
});

test('WhatsApp real marca fallido si el proveedor rechaza', async () => {
  const whatsapp = crearWhatsapp({
    mode: 'real',
    token: 'token',
    phoneNumberId: '123',
    fetchImpl: async () => ({ ok: false }),
  });
  const resultado = await whatsapp.enviar({ para: '+573001112233', texto: 'Hola' });
  assert.equal(whatsapp.modo, 'real');
  assert.equal(resultado.ok, false);
});

test('sin credenciales, WhatsApp pedido en real sigue en mock y no usa la red', async () => {
  let redes = 0;
  const whatsapp = crearWhatsapp({
    mode: 'real',
    token: '',
    phoneNumberId: '',
    fetchImpl: () => {
      redes += 1;
      throw new Error('red');
    },
  });
  const resultado = await whatsapp.enviar({ para: '+573001112233', texto: 'Hola' });
  assert.equal(whatsapp.modo, 'mock');
  assert.equal(resultado.ok, true);
  assert.equal(redes, 0);
});
