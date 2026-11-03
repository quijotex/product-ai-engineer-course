import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { leerConfig } from './config.js';
import { crearConsultorio } from './consultorio.js';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
// La pantalla importa el núcleo desde /lib/. En Netlify, scripts/build.js copia los mismos archivos.
const ARCHIVOS = {
  '/': 'public/index.html',
  '/index.html': 'public/index.html',
  '/styles.css': 'public/styles.css',
  '/app.js': 'public/app.js',
  '/lib/consultorio.js': 'src/consultorio.js',
  '/lib/domain.js': 'src/domain.js',
  '/lib/adapters.js': 'src/adapters.js',
};
const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
};

export function createApp(opciones = {}) {
  const consultorio = crearConsultorio({
    ...opciones,
    config: opciones.config ?? leerConfig(),
  });

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://127.0.0.1');
      if (url.pathname.startsWith('/api/')) {
        const cuerpo = req.method === 'POST' ? await leerJson(req) : null;
        const salida = await consultorio.manejar(req.method, url.pathname, cuerpo);
        enviarJson(res, salida.status, salida.cuerpo);
        return;
      }
      servirEstatico(res, url.pathname);
    } catch {
      enviarJson(res, 500, { error: 'No se pudo completar la acción.' });
    }
  });

  if (consultorio.whatsappModo === 'real') {
    const timer = setInterval(() => {
      consultorio.procesarPendientes().catch(() => {});
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
  const archivo = path.join(RAIZ, nombre);
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
