import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { crearCalendario, crearWhatsapp } from './adapters.js';
import { leerConfig } from './config.js';
import {
  dentroDeVentana,
  desdeBogota,
  partesBogota,
  presentar,
  procesar,
  sincronizar,
  textoReloj,
  textoResultado,
  valorDatetime,
  visibles,
} from './domain.js';

const PUBLICO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const ARCHIVOS = {
  '/': 'index.html',
  '/index.html': 'index.html',
  '/styles.css': 'styles.css',
  '/app.js': 'app.js',
};
const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
};

export function createApp(opciones = {}) {
  const config = opciones.config ?? leerConfig();
  const ahoraReal = opciones.ahoraReal ?? (() => new Date());
  const fetchImpl = opciones.fetchImpl ?? globalThis.fetch;
  const calendario = opciones.calendario ?? crearCalendario({
    mode: config.calendarPedido,
    calendarId: config.calendarId,
    token: config.calendarToken,
    fetchImpl,
    ahoraReal,
  });
  const whatsapp = opciones.whatsapp ?? crearWhatsapp({
    mode: config.whatsappPedido,
    token: config.whatsappToken,
    phoneNumberId: config.whatsappPhoneNumberId,
    fetchImpl,
  });

  let recordatorios = [];
  let horaDemo = null;
  let errorCalendario = null;

  function ahora() {
    return horaDemo ?? ahoraReal();
  }

  async function sincronizarAhora() {
    try {
      const citas = await calendario.leer();
      errorCalendario = null;
      recordatorios = sincronizar(citas, recordatorios);
    } catch {
      errorCalendario = 'No se pudo leer el calendario.';
    }
  }

  async function aplicarProceso() {
    const resultado = await procesar(
      recordatorios,
      ahora(),
      (mensaje) => whatsapp.enviar(mensaje),
    );
    recordatorios = resultado.recordatorios;
    return resultado;
  }

  let cola = Promise.resolve();
  function encolar(trabajo) {
    const ejecucion = cola.then(trabajo, trabajo);
    cola = ejecucion.then(() => {}, () => {});
    return ejecucion;
  }

  const arranque = encolar(async () => {
    await sincronizarAhora();
    if (whatsapp.modo === 'real') await aplicarProceso();
  });

  function cuerpoEstado(resultado) {
    const momento = ahora();
    const lista = visibles(recordatorios, momento).map((fila) => presentar(fila, momento));
    return {
      zona: 'America/Bogota',
      ahora: momento.toISOString(),
      ahoraCampo: valorDatetime(momento),
      hora: textoReloj(momento),
      horaDemo: Boolean(horaDemo),
      calendar: calendario.modo,
      whatsapp: whatsapp.modo,
      calendarPedido: calendario.pedido,
      whatsappPedido: whatsapp.pedido,
      dentroDeVentana: dentroDeVentana(momento),
      errorCalendario,
      entregasMock: whatsapp.modo === 'mock' ? whatsapp.entregas.length : null,
      recordatorios: lista,
      resultado: resultado ? textoResultado(resultado) : null,
    };
  }

  function fijarHora(cuerpo) {
    if (whatsapp.modo !== 'mock') {
      return { error: 'La hora de la demo solo está disponible con WhatsApp en mock.', status: 400 };
    }
    if (!cuerpo || cuerpo.hora === null || cuerpo.preset === 'real') {
      horaDemo = null;
      return { ok: true };
    }
    if (cuerpo.preset === 'hoy-16:00' || cuerpo.preset === 'manana-07:30') {
      const base = partesBogota(ahoraReal());
      const dia = cuerpo.preset === 'hoy-16:00' ? base.day : base.day + 1;
      const hora = cuerpo.preset === 'hoy-16:00' ? 16 : 7;
      const minuto = cuerpo.preset === 'hoy-16:00' ? 0 : 30;
      horaDemo = desdeBogota(base.year, base.month, dia, hora, minuto);
      return { ok: true };
    }
    if (typeof cuerpo.hora === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(cuerpo.hora)) {
      const [fecha, hm] = cuerpo.hora.split('T');
      const [year, month, day] = fecha.split('-').map(Number);
      const [hour, minute] = hm.split(':').map(Number);
      if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) {
        return { error: 'La hora no es válida.', status: 400 };
      }
      horaDemo = desdeBogota(year, month - 1, day, hour, minute);
      return { ok: true };
    }
    return { error: 'La hora no es válida.', status: 400 };
  }

  const server = http.createServer(async (req, res) => {
    try {
      await arranque;
      const url = new URL(req.url, 'http://127.0.0.1');
      if (url.pathname.startsWith('/api/')) {
        await rutaApi(req, res, url.pathname);
        return;
      }
      servirEstatico(res, url.pathname);
    } catch {
      enviarJson(res, 500, { error: 'No se pudo completar la acción.' });
    }
  });

  async function rutaApi(req, res, pathname) {
    if (req.method === 'GET' && pathname === '/api/estado') {
      enviarJson(res, 200, cuerpoEstado(null));
      return;
    }
    if (req.method === 'POST' && pathname === '/api/sincronizar') {
      await encolar(sincronizarAhora);
      enviarJson(res, 200, cuerpoEstado(null));
      return;
    }
    if (req.method === 'POST' && pathname === '/api/procesar') {
      const resultado = await encolar(aplicarProceso);
      enviarJson(res, 200, cuerpoEstado(resultado));
      return;
    }
    if (req.method === 'POST' && pathname === '/api/hora') {
      const cuerpo = await leerJson(req);
      const fijada = fijarHora(cuerpo);
      if (fijada.error) {
        enviarJson(res, fijada.status, { error: fijada.error });
        return;
      }
      enviarJson(res, 200, cuerpoEstado(null));
      return;
    }
    enviarJson(res, 404, { error: 'No se encontró.' });
  }

  if (whatsapp.modo === 'real') {
    const timer = setInterval(() => {
      encolar(aplicarProceso).catch(() => {});
    }, 60_000);
    timer.unref?.();
    server.on('close', () => clearInterval(timer));
  }

  return server;
}

function servirEstatico(res, pathname) {
  const nombre = ARCHIVOS[pathname];
  if (!nombre) {
    enviarJson(res, 404, { error: 'No se encontró.' });
    return;
  }
  const archivo = path.join(PUBLICO, nombre);
  const cuerpo = fs.readFileSync(archivo);
  res.writeHead(200, {
    'Content-Type': TIPOS[path.extname(archivo)],
    'Cache-Control': 'no-store',
  });
  res.end(cuerpo);
}

function enviarJson(res, status, cuerpo) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(cuerpo));
}

function leerJson(req) {
  return new Promise((resolve, reject) => {
    const trozos = [];
    let tamano = 0;
    req.on('data', (trozo) => {
      tamano += trozo.length;
      if (tamano > 1_000_000) {
        reject(new Error('cuerpo grande'));
        req.destroy();
        return;
      }
      trozos.push(trozo);
    });
    req.on('end', () => {
      if (trozos.length === 0) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(trozos).toString('utf8')));
      } catch {
        reject(new Error('json'));
      }
    });
    req.on('error', reject);
  });
}
