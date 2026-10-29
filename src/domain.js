const OFFSET_BOGOTA_MS = 5 * 60 * 60 * 1000;
const MINUTO_INICIO = 8 * 60;
const MINUTO_FIN = 20 * 60;

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];
const MESES_CORTOS = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

export function partesBogota(fecha) {
  const shifted = new Date(fecha.getTime() - OFFSET_BOGOTA_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    weekday: shifted.getUTCDay(),
  };
}

export function desdeBogota(year, month, day, hour, minute) {
  return new Date(Date.UTC(year, month, day, hour, minute) + OFFSET_BOGOTA_MS);
}

export function dentroDeVentana(fecha) {
  const { hour, minute } = partesBogota(fecha);
  const minutos = hour * 60 + minute;
  return minutos >= MINUTO_INICIO && minutos <= MINUTO_FIN;
}

export function horaDeEnvio(inicio, horasAntes) {
  const ideal = new Date(inicio.getTime() - horasAntes * 60 * 60 * 1000);
  return ajustarVentana(ideal, inicio);
}

function ajustarVentana(ideal, inicio) {
  if (dentroDeVentana(ideal)) return ideal;
  const partes = partesBogota(ideal);
  const minutos = partes.hour * 60 + partes.minute;

  if (minutos < MINUTO_INICIO) {
    const ocho = desdeBogota(partes.year, partes.month, partes.day, 8, 0);
    if (ocho.getTime() < inicio.getTime()) return ocho;
    const veintePrevio = desdeBogota(partes.year, partes.month, partes.day - 1, 20, 0);
    if (veintePrevio.getTime() < inicio.getTime()) return veintePrevio;
    return null;
  }

  const veinte = desdeBogota(partes.year, partes.month, partes.day, 20, 0);
  if (veinte.getTime() < inicio.getTime()) return veinte;
  return null;
}

export function leerTelefono(descripcion) {
  if (!descripcion) return null;
  const lineas = String(descripcion).split(/\r?\n/);
  for (const linea of lineas) {
    if (!linea.startsWith('WhatsApp: ')) continue;
    const numero = linea.slice('WhatsApp: '.length).trim();
    if (/^\+\d+$/.test(numero)) return numero;
    return null;
  }
  return null;
}

export function textoRecordatorio(inicio) {
  const partes = partesBogota(inicio);
  const hora = hhmm(inicio);
  return `Consultorio de la Dra. Laura. Le recordamos su cita el ${DIAS[partes.weekday]} ${partes.day} de ${MESES[partes.month]} a las ${hora}.`;
}

export function sincronizar(citas, anteriores) {
  const porClave = new Map(anteriores.map((fila) => [fila.clave, { ...fila }]));
  const ids = new Set(citas.map((cita) => cita.id));

  for (const cita of citas) {
    for (const tipo of ['24h', '2h']) {
      const clave = `${cita.id}:${tipo}`;
      const previo = porClave.get(clave);
      if (previo && (previo.estado === 'enviado' || previo.estado === 'fallido')) continue;

      if (cita.estado === 'cancelada') {
        if (previo && previo.estado === 'programado') {
          porClave.set(clave, { ...previo, estado: 'omitido', motivo: 'Cita cancelada.' });
        }
        continue;
      }

      porClave.set(clave, filaDesdeCita(cita, tipo));
    }
  }

  for (const [clave, fila] of porClave) {
    if (!ids.has(fila.eventoId) && fila.estado === 'programado') {
      porClave.set(clave, { ...fila, estado: 'omitido', motivo: 'Cita cancelada.' });
    }
  }

  return [...porClave.values()];
}

function filaDesdeCita(cita, tipo) {
  const horas = tipo === '24h' ? 24 : 2;
  const inicio = cita.inicio instanceof Date ? cita.inicio : new Date(cita.inicio);
  const horaEnvio = horaDeEnvio(inicio, horas);
  const telefono = leerTelefono(cita.descripcion);
  let estado = 'programado';
  let motivo = null;
  let mensaje = null;

  if (!telefono) {
    estado = 'omitido';
    motivo = 'Sin teléfono en la cita.';
  } else if (!horaEnvio) {
    estado = 'omitido';
    motivo = 'Sin hora de envío dentro de la ventana.';
  } else {
    mensaje = textoRecordatorio(inicio);
  }

  return {
    clave: `${cita.id}:${tipo}`,
    eventoId: cita.id,
    tipo,
    paciente: cita.titulo,
    inicio,
    horaEnvio,
    telefono,
    estado,
    motivo,
    mensaje,
  };
}

export async function procesar(recordatorios, ahora, enviar) {
  const copia = recordatorios.map((fila) => ({ ...fila }));
  const resumen = { enviados: 0, fallidos: 0, omitidos: 0 };

  if (!dentroDeVentana(ahora)) {
    return { recordatorios: copia, ...resumen };
  }

  for (const fila of copia) {
    if (fila.estado !== 'programado' || !fila.horaEnvio) continue;
    if (fila.horaEnvio.getTime() > ahora.getTime()) continue;
    if (fila.inicio.getTime() <= ahora.getTime()) {
      fila.estado = 'omitido';
      fila.motivo = 'La cita ya empezó.';
      resumen.omitidos += 1;
      continue;
    }

    try {
      const resultado = await enviar({ para: fila.telefono, texto: fila.mensaje });
      if (resultado?.ok) {
        fila.estado = 'enviado';
        fila.motivo = null;
        resumen.enviados += 1;
      } else {
        fila.estado = 'fallido';
        fila.motivo = 'El proveedor rechazó el mensaje.';
        resumen.fallidos += 1;
      }
    } catch {
      fila.estado = 'fallido';
      fila.motivo = 'El proveedor rechazó el mensaje.';
      resumen.fallidos += 1;
    }
  }

  return { recordatorios: copia, ...resumen };
}

// Hoy y mañana: el recordatorio de 2 h de una cita de mañana no cae hoy,
// y la demo tiene que mostrar los dos juntos.
export function visibles(recordatorios, ahora) {
  return recordatorios
    .filter((fila) => {
      const fecha = fila.horaEnvio ?? fila.inicio;
      return esHoyOManana(fecha, ahora);
    })
    .sort((a, b) => {
      const ta = a.horaEnvio ? a.horaEnvio.getTime() : Number.POSITIVE_INFINITY;
      const tb = b.horaEnvio ? b.horaEnvio.getTime() : Number.POSITIVE_INFINITY;
      if (ta !== tb) return ta - tb;
      return a.clave.localeCompare(b.clave);
    });
}

export function presentar(fila, ahora) {
  const estadoTexto = fila.estado.charAt(0).toUpperCase() + fila.estado.slice(1);
  const citaTexto = `Cita ${cuando(fila.inicio, ahora)} ${hhmm(fila.inicio)}`;
  const tipoTexto = fila.tipo === '24h' ? '24 h' : '2 h';
  const envioTexto = fila.horaEnvio
    ? `Envío ${cuando(fila.horaEnvio, ahora)} ${hhmm(fila.horaEnvio)}`
    : 'Sin hora de envío';
  return {
    clave: fila.clave,
    paciente: fila.paciente,
    tipo: fila.tipo,
    estado: fila.estado,
    motivo: fila.motivo,
    mensaje: fila.mensaje,
    citaTexto,
    tipoTexto,
    envioTexto,
    estadoTexto,
    linea: `${citaTexto} · ${tipoTexto} · ${envioTexto} · ${estadoTexto}`,
  };
}

export function textoReloj(fecha) {
  const partes = partesBogota(fecha);
  return `${partes.day} ${MESES_CORTOS[partes.month]} ${hhmm(fecha)}`;
}

export function valorDatetime(fecha) {
  const partes = partesBogota(fecha);
  const mes = String(partes.month + 1).padStart(2, '0');
  const dia = String(partes.day).padStart(2, '0');
  return `${partes.year}-${mes}-${dia}T${hhmm(fecha)}`;
}

export function textoResultado({ enviados, fallidos, omitidos }) {
  if (enviados === 0 && fallidos === 0 && omitidos === 0) {
    return 'No hay recordatorios pendientes para esta hora.';
  }
  const partes = [];
  if (enviados === 1) partes.push('Se envió 1 recordatorio');
  else if (enviados > 1) partes.push(`Se enviaron ${enviados} recordatorios`);
  if (fallidos === 1) partes.push('1 quedó fallido');
  else if (fallidos > 1) partes.push(`${fallidos} quedaron fallidos`);
  if (omitidos === 1) partes.push('1 se omitió porque la cita ya empezó');
  else if (omitidos > 1) partes.push(`${omitidos} se omitieron porque la cita ya empezó`);
  return `${partes.join('. ')}.`;
}

export function citasDemo(ahoraReal) {
  const partes = partesBogota(ahoraReal);
  const manana = (hora, minuto) => desdeBogota(partes.year, partes.month, partes.day + 1, hora, minuto);
  return [
    {
      id: 'cita-ana',
      titulo: 'Ana Gómez',
      inicio: manana(15, 0),
      descripcion: 'WhatsApp: +573001112233',
      estado: 'confirmada',
    },
    {
      id: 'cita-luis',
      titulo: 'Luis Pérez',
      inicio: manana(9, 0),
      descripcion: 'WhatsApp: +573004445566',
      estado: 'confirmada',
    },
    {
      id: 'cita-marta',
      titulo: 'Marta Ruiz',
      inicio: manana(11, 0),
      descripcion: '',
      estado: 'confirmada',
    },
  ];
}

function hhmm(fecha) {
  const { hour, minute } = partesBogota(fecha);
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function esMismoDia(fecha, ahora) {
  const a = partesBogota(fecha);
  const b = partesBogota(ahora);
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

function esManana(fecha, ahora) {
  const base = partesBogota(ahora);
  const manana = desdeBogota(base.year, base.month, base.day + 1, 12, 0);
  return esMismoDia(fecha, manana);
}

function esHoyOManana(fecha, ahora) {
  return esMismoDia(fecha, ahora) || esManana(fecha, ahora);
}

function cuando(fecha, ahora) {
  if (esMismoDia(fecha, ahora)) return 'hoy';
  if (esManana(fecha, ahora)) return 'mañana';
  const partes = partesBogota(fecha);
  return `${partes.day} ${MESES_CORTOS[partes.month]}`;
}
