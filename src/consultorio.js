// Núcleo de la app sin HTTP ni Node: lo usan el servidor (src/app.js) y,
// en el despliegue estático, el navegador (public/app.js).
import { crearCalendario, crearWhatsapp } from './adapters.js';
import {
  aplicarRespuestas,
  confirmacionDe,
  conversaciones,
  dentroDeVentana,
  desdeBogota,
  liberarEspacio,
  partesBogota,
  presentar,
  procesar,
  responder,
  resumen,
  sincronizar,
  textoFecha,
  textoReloj,
  textoRespuesta,
  textoResultado,
  valorDatetime,
  visibles,
} from './domain.js';

const CONFIG_MOCK = {
  calendarPedido: 'mock',
  whatsappPedido: 'mock',
  calendarId: '',
  calendarToken: '',
  whatsappToken: '',
  whatsappPhoneNumberId: '',
};

export function crearConsultorio(opciones = {}) {
  const config = opciones.config ?? CONFIG_MOCK;
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
  let respuestas = {};
  let horaDemo = null;
  let errorCalendario = null;
  // En real no hay webhook para leer respuestas: no se piden ni se muestran.
  const leeRespuestas = whatsapp.modo === 'mock';

  function ahora() {
    return horaDemo ?? ahoraReal();
  }

  async function sincronizarAhora() {
    try {
      const citas = await calendario.leer();
      errorCalendario = null;
      recordatorios = aplicarRespuestas(
        sincronizar(citas, recordatorios, { pedirRespuesta: leeRespuestas }),
        respuestas,
      );
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

  const listo = encolar(async () => {
    await sincronizarAhora();
    if (whatsapp.modo === 'real') await aplicarProceso();
  });

  function responderAhora(cuerpo) {
    if (!leeRespuestas) {
      return { error: 'Las respuestas simuladas solo están disponibles con WhatsApp en mock.' };
    }
    if (typeof cuerpo?.eventoId !== 'string' || typeof cuerpo?.texto !== 'string') {
      return { error: 'Falta la cita o la respuesta.' };
    }
    const salida = responder(recordatorios, respuestas, cuerpo, ahora());
    if (salida.error) return salida;
    recordatorios = salida.recordatorios;
    respuestas = salida.respuestas;
    return { aviso: textoRespuesta(salida) };
  }

  function liberarAhora(cuerpo) {
    if (typeof cuerpo?.eventoId !== 'string') return { error: 'Falta la cita.' };
    const salida = liberarEspacio(respuestas, cuerpo.eventoId);
    if (salida.error) return salida;
    respuestas = salida.respuestas;
    return {};
  }

  function cuerpoEstado(resultado, avisoSimulador = null) {
    const momento = ahora();
    const lista = visibles(recordatorios, momento).map((fila) => presentar(
      fila,
      momento,
      leeRespuestas
        ? {
          confirmacion: confirmacionDe(fila.eventoId, recordatorios, respuestas),
          respuesta: respuestas[fila.eventoId] ?? null,
        }
        : {},
    ));
    return {
      leeRespuestas,
      conversaciones: leeRespuestas ? conversaciones(recordatorios, respuestas, momento) : [],
      resumen: resumen(recordatorios, respuestas),
      avisoSimulador,
      zona: 'America/Bogota',
      ahora: momento.toISOString(),
      ahoraCampo: valorDatetime(momento),
      hora: textoReloj(momento),
      fecha: textoFecha(momento),
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
      return { error: 'La hora de la demo solo está disponible con WhatsApp en mock.' };
    }
    if (!cuerpo || cuerpo.hora === null || cuerpo.preset === 'real') {
      horaDemo = null;
      return {};
    }
    if (cuerpo.preset === 'hoy-16:00' || cuerpo.preset === 'manana-07:30') {
      const base = partesBogota(ahoraReal());
      const dia = cuerpo.preset === 'hoy-16:00' ? base.day : base.day + 1;
      const hora = cuerpo.preset === 'hoy-16:00' ? 16 : 7;
      const minuto = cuerpo.preset === 'hoy-16:00' ? 0 : 30;
      horaDemo = desdeBogota(base.year, base.month, dia, hora, minuto);
      return {};
    }
    if (typeof cuerpo.hora === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(cuerpo.hora)) {
      const [fecha, hm] = cuerpo.hora.split('T');
      const [year, month, day] = fecha.split('-').map(Number);
      const [hour, minute] = hm.split(':').map(Number);
      if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) {
        return { error: 'La hora no es válida.' };
      }
      horaDemo = desdeBogota(year, month - 1, day, hour, minute);
      return {};
    }
    return { error: 'La hora no es válida.' };
  }

  // Misma forma que la API HTTP: { status, cuerpo }.
  async function manejar(metodo, ruta, cuerpo) {
    await listo;
    if (metodo === 'GET' && ruta === '/api/estado') {
      return { status: 200, cuerpo: cuerpoEstado(null) };
    }
    if (metodo === 'POST' && ruta === '/api/sincronizar') {
      await encolar(sincronizarAhora);
      return { status: 200, cuerpo: cuerpoEstado(null) };
    }
    if (metodo === 'POST' && ruta === '/api/procesar') {
      const resultado = await encolar(aplicarProceso);
      return { status: 200, cuerpo: cuerpoEstado(resultado) };
    }
    const acciones = {
      '/api/responder': () => responderAhora(cuerpo),
      '/api/espacio': () => liberarAhora(cuerpo),
      '/api/hora': () => fijarHora(cuerpo),
    };
    if (metodo === 'POST' && acciones[ruta]) {
      const salida = await encolar(async () => acciones[ruta]());
      if (salida.error) return { status: 400, cuerpo: { error: salida.error } };
      return { status: 200, cuerpo: cuerpoEstado(null, salida.aviso ?? null) };
    }
    return { status: 404, cuerpo: { error: 'No se encontró.' } };
  }

  return {
    listo,
    manejar,
    whatsappModo: whatsapp.modo,
    procesarPendientes: () => encolar(aplicarProceso),
  };
}
