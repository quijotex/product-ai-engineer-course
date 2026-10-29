const meta = document.querySelector('#meta');
const error = document.querySelector('#error');
const resultado = document.querySelector('#resultado');
const mock = document.querySelector('#mock');
const lista = document.querySelector('#lista');
const procesar = document.querySelector('#procesar');
const sincronizar = document.querySelector('#sincronizar');
const demo = document.querySelector('#demo');
const hora = document.querySelector('#hora');
const horaReal = document.querySelector('#hora-real');
const hoy16 = document.querySelector('#hoy-16');
const manana0730 = document.querySelector('#manana-0730');

const abiertos = new Set();

demo.addEventListener('submit', (evento) => evento.preventDefault());
procesar.addEventListener('click', () => enviar('/api/procesar'));
sincronizar.addEventListener('click', () => enviar('/api/sincronizar'));
horaReal.addEventListener('click', () => enviar('/api/hora', { hora: null }));
hoy16.addEventListener('click', () => enviar('/api/hora', { preset: 'hoy-16:00' }));
manana0730.addEventListener('click', () => enviar('/api/hora', { preset: 'manana-07:30' }));
hora.addEventListener('change', () => {
  if (hora.value) enviar('/api/hora', { hora: hora.value });
});

cargar();

async function cargar() {
  try {
    const estado = await pedir('/api/estado');
    pintar(estado);
  } catch {
    mostrarError('No se pudo cargar la lista.');
  }
}

async function enviar(ruta, cuerpo) {
  try {
    const estado = await pedir(ruta, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo ?? {}),
    });
    pintar(estado);
  } catch (causa) {
    mostrarError(causa.message || 'No se pudo completar la acción.');
  }
}

async function pedir(ruta, opciones) {
  const respuesta = await fetch(ruta, opciones);
  const datos = await respuesta.json();
  if (!respuesta.ok) {
    throw new Error(datos.error || 'No se pudo completar la acción.');
  }
  return datos;
}

function pintar(estado) {
  const calendar = textoModo('Calendar', estado.calendar, estado.calendarPedido);
  const whatsapp = textoModo('WhatsApp', estado.whatsapp, estado.whatsappPedido);
  meta.textContent = `${calendar}. ${whatsapp}. Hora: ${estado.hora}. Envío de 08:00 a 20:00.`;

  if (estado.errorCalendario) {
    error.hidden = false;
    error.textContent = estado.errorCalendario;
  } else {
    error.hidden = true;
    error.textContent = '';
  }

  const enMock = estado.whatsapp === 'mock';
  demo.hidden = !enMock;
  procesar.hidden = !enMock;
  if (enMock) {
    hora.value = estado.ahoraCampo;
    mock.textContent = `En mock no sale ningún WhatsApp. Mensajes registrados: ${estado.entregasMock}.`;
  } else {
    mock.textContent = 'WhatsApp real. Los pendientes se envían solos entre las 08:00 y las 20:00.';
  }

  resultado.textContent = estado.resultado ?? '';
  pintarLista(estado.recordatorios);
}

function textoModo(nombre, modo, pedido) {
  if (pedido === 'real' && modo === 'mock') {
    return `${nombre} sigue en mock porque faltan credenciales`;
  }
  return `${nombre} en ${modo}`;
}

function pintarLista(filas) {
  lista.replaceChildren();
  if (filas.length === 0) {
    const vacio = document.createElement('p');
    vacio.className = 'vacio';
    const titulo = document.createElement('strong');
    titulo.textContent = 'Hoy no hay recordatorios.';
    const detalle = document.createElement('span');
    detalle.textContent = 'Las citas del calendario aparecerán aquí cuando tengan un envío para hoy.';
    vacio.append(titulo, detalle);
    lista.append(vacio);
    return;
  }

  for (const fila of filas) {
    const abierto = abiertos.has(fila.clave);
    const id = `detalle-${fila.clave.replace(':', '-')}`;
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'fila';
    boton.setAttribute('aria-expanded', abierto ? 'true' : 'false');
    boton.setAttribute('aria-controls', id);
    boton.dataset.clave = fila.clave;

    const nombre = document.createElement('span');
    nombre.className = 'paciente';
    nombre.textContent = fila.paciente;

    const resumen = document.createElement('span');
    resumen.className = 'resumen';
    resumen.append(
      document.createTextNode(`${fila.citaTexto} · ${fila.tipoTexto} · ${fila.envioTexto} · `),
    );
    const estado = document.createElement('span');
    estado.className = `estado-${fila.estado}`;
    estado.textContent = fila.estadoTexto;
    resumen.append(estado);

    boton.append(nombre, resumen);
    boton.addEventListener('click', () => {
      if (abiertos.has(fila.clave)) abiertos.delete(fila.clave);
      else abiertos.add(fila.clave);
      pintarLista(filas);
    });

    const detalle = document.createElement('div');
    detalle.id = id;
    detalle.className = 'detalle';
    detalle.hidden = !abierto;
    if (fila.mensaje) {
      const mensaje = document.createElement('p');
      mensaje.className = 'mensaje';
      mensaje.dataset.mensaje = fila.clave;
      mensaje.textContent = fila.mensaje;
      detalle.append(mensaje);
    }
    if (fila.motivo) {
      const motivo = document.createElement('p');
      motivo.className = 'motivo';
      motivo.textContent = fila.motivo;
      detalle.append(motivo);
    }

    lista.append(boton, detalle);
  }
}

function mostrarError(texto) {
  error.hidden = false;
  error.textContent = texto;
}
