const $ = (selector) => document.querySelector(selector);

const meta = $('#meta');
const error = $('#error');
const resultado = $('#resultado');
const cambiarHora = $('#cambiar-hora');
const lista = $('#lista');
const filtros = $('#filtros');
const pendientes = $('#pendientes');
const procesar = $('#procesar');
const sincronizar = $('#sincronizar');
const demo = $('#demo');
const hora = $('#hora');
const navSimulador = $('#nav-simulador');
const pacientes = $('#pacientes');
const telefono = $('#telefono');
const telNombre = $('#tel-nombre');
const telDato = $('#tel-dato');
const hilo = $('#hilo');
const telRespuestas = $('#tel-respuestas');
const libre = $('#libre');
const textoLibre = $('#texto-libre');
const libreError = $('#libre-error');
const avisoSimulador = $('#aviso-simulador');
const cifras = $('#cifras');

const VISTAS = ['recordatorios', 'simulador', 'resumen'];
const FILTROS = [
  { id: 'todos', texto: 'Todos' },
  { id: 'sin_respuesta', texto: 'Sin respuesta' },
  { id: 'confirmo', texto: 'Confirmadas' },
  { id: 'cancelo', texto: 'Canceladas' },
];

const abiertos = new Set();
let estado = null;
let filtro = 'todos';
let seleccionado = null;
// El servidor atiende en orden; si una respuesta llega tarde, no pisa a una más nueva.
let ultimaPedida = 0;
let ultimaPintada = 0;
// Servidor o núcleo local; se decide en la primera petición (ver obtenerBackend).
let backend = null;

demo.addEventListener('submit', (evento) => evento.preventDefault());
cambiarHora.addEventListener('click', () => {
  demo.hidden = !demo.hidden;
  cambiarHora.setAttribute('aria-expanded', demo.hidden ? 'false' : 'true');
});
procesar.addEventListener('click', () => enviar('/api/procesar'));
sincronizar.addEventListener('click', () => enviar('/api/sincronizar'));
$('#hora-real').addEventListener('click', () => enviar('/api/hora', { hora: null }));
$('#hoy-16').addEventListener('click', () => enviar('/api/hora', { preset: 'hoy-16:00' }));
$('#manana-0730').addEventListener('click', () => enviar('/api/hora', { preset: 'manana-07:30' }));
hora.addEventListener('change', () => {
  if (hora.value) enviar('/api/hora', { hora: hora.value });
});

for (const boton of document.querySelectorAll('[data-respuesta]')) {
  boton.addEventListener('click', () => responder(boton.dataset.respuesta));
}
libre.addEventListener('submit', (evento) => {
  evento.preventDefault();
  if (!textoLibre.value.trim()) {
    libreError.hidden = false;
    libreError.textContent = 'Escriba una respuesta antes de enviar.';
    return;
  }
  responder(textoLibre.value);
});
textoLibre.addEventListener('input', () => {
  libreError.hidden = true;
});

window.addEventListener('hashchange', mostrarVista);
mostrarVista();
cargar();

function vistaActual() {
  const vista = location.hash.replace('#', '');
  if (vista === 'simulador' && estado && !estado.leeRespuestas) return 'recordatorios';
  return VISTAS.includes(vista) ? vista : 'recordatorios';
}

function mostrarVista() {
  const actual = vistaActual();
  for (const vista of VISTAS) {
    $(`#vista-${vista}`).hidden = vista !== actual;
    const enlace = document.querySelector(`[data-vista="${vista}"]`);
    if (vista === actual) enlace.setAttribute('aria-current', 'page');
    else enlace.removeAttribute('aria-current');
  }
}

function pintarEnOrden(numero, nuevo) {
  if (numero < ultimaPintada) return;
  ultimaPintada = numero;
  pintar(nuevo);
}

async function cargar() {
  const numero = ++ultimaPedida;
  try {
    pintarEnOrden(numero, await pedir('/api/estado'));
  } catch {
    mostrarError('No se pudo cargar la información.');
  }
}

async function enviar(ruta, cuerpo) {
  const numero = ++ultimaPedida;
  try {
    const nuevo = await pedir(ruta, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo ?? {}),
    });
    pintarEnOrden(numero, nuevo);
    return nuevo;
  } catch (causa) {
    mostrarError(causa.message || 'No se pudo completar la acción.');
    return null;
  }
}

async function responder(texto) {
  if (!seleccionado) return;
  const nuevo = await enviar('/api/responder', { eventoId: seleccionado, texto });
  if (nuevo) textoLibre.value = '';
}

// Con `node server.js` la pantalla habla con /api/. En un hosting estático (Netlify)
// no hay /api/, así que corre el mismo núcleo dentro del navegador.
function obtenerBackend() {
  backend ??= (async () => {
    try {
      const prueba = await fetch('/api/estado', { cache: 'no-store' });
      if (prueba.ok && prueba.headers.get('content-type')?.includes('application/json')) {
        return { remoto: true };
      }
    } catch {
      // Sin servidor: sigue con el núcleo local.
    }
    const { crearConsultorio } = await import('./lib/consultorio.js');
    const consultorio = crearConsultorio();
    // La demo publicada arranca en marcha: hoy a las 16:00, con los recordatorios de 24 h
    // ya enviados, para que Conversaciones tenga pacientes a cualquier hora del día.
    await consultorio.manejar('POST', '/api/hora', { preset: 'hoy-16:00' });
    await consultorio.manejar('POST', '/api/procesar', {});
    return { remoto: false, consultorio };
  })();
  return backend;
}

async function pedir(ruta, opciones = {}) {
  const destino = await obtenerBackend();
  let status;
  let datos;
  if (destino.remoto) {
    const respuesta = await fetch(ruta, opciones);
    status = respuesta.status;
    datos = await respuesta.json();
  } else {
    const cuerpo = opciones.body ? JSON.parse(opciones.body) : null;
    ({ status, cuerpo: datos } = await destino.consultorio.manejar(opciones.method ?? 'GET', ruta, cuerpo));
  }
  if (status >= 400) {
    throw new Error(datos.error || 'No se pudo completar la acción.');
  }
  return datos;
}

function pintar(nuevo) {
  estado = nuevo;
  meta.textContent = estado.fecha;

  if (estado.errorCalendario) mostrarError(estado.errorCalendario);
  else {
    error.hidden = true;
    error.textContent = '';
  }

  const enMock = estado.whatsapp === 'mock';
  cambiarHora.hidden = !enMock;
  if (!enMock) demo.hidden = true;
  procesar.hidden = !enMock;
  navSimulador.hidden = !estado.leeRespuestas;
  if (enMock) hora.value = estado.ahoraCampo;

  resultado.textContent = estado.resultado ?? '';
  avisoSimulador.textContent = estado.avisoSimulador ?? '';

  mostrarVista();
  pintarFiltros();
  pintarPendientes();
  pintarLista();
  pintarSimulador();
  pintarResumen();
}

function crear(etiqueta, clase, texto) {
  const nodo = document.createElement(etiqueta);
  if (clase) nodo.className = clase;
  if (texto !== undefined) nodo.textContent = texto;
  return nodo;
}

// Las cuentas son por cita, no por recordatorio: una cita tiene dos filas.
function pintarFiltros() {
  filtros.replaceChildren();
  if (!estado.leeRespuestas) {
    filtro = 'todos';
    return;
  }
  for (const opcion of FILTROS) {
    const ids = new Set(
      estado.recordatorios
        .filter((fila) => opcion.id === 'todos' || fila.confirmacion === opcion.id)
        .map((fila) => fila.eventoId),
    );
    const boton = crear('button', 'filtro', opcion.texto);
    boton.type = 'button';
    boton.setAttribute('aria-pressed', filtro === opcion.id ? 'true' : 'false');
    boton.append(crear('span', 'cuenta', String(ids.size)));
    boton.addEventListener('click', () => {
      filtro = opcion.id;
      pintarFiltros();
      pintarLista();
    });
    filtros.append(boton);
  }
}

function pintarPendientes() {
  const ids = new Set(
    estado.recordatorios
      .filter((fila) => fila.confirmacion === 'cancelo' && !fila.espacioLiberado)
      .map((fila) => fila.eventoId),
  );
  pendientes.hidden = ids.size === 0;
  pendientes.textContent = ids.size === 1
    ? 'Hay 1 cancelación con el espacio sin liberar en Google Calendar.'
    : `Hay ${ids.size} cancelaciones con el espacio sin liberar en Google Calendar.`;
}

function pintarLista() {
  lista.replaceChildren();
  const filas = estado.recordatorios.filter(
    (fila) => filtro === 'todos' || fila.confirmacion === filtro,
  );

  if (filas.length === 0) {
    const vacio = crear('p', 'vacio');
    if (filtro === 'todos') {
      vacio.append(
        crear('strong', '', 'Hoy no hay recordatorios.'),
        crear('span', '', 'Las citas del calendario aparecerán aquí cuando tengan un envío para hoy.'),
      );
    } else {
      vacio.append(
        crear('strong', '', 'No hay citas con este filtro.'),
        crear('span', '', 'Elija "Todos" para ver la lista completa.'),
      );
    }
    lista.append(vacio);
    return;
  }

  for (const fila of filas) lista.append(tiquete(fila));
}

function tiquete(fila) {
  const abierto = abiertos.has(fila.clave);
  const id = `detalle-${fila.clave.replace(':', '-')}`;
  const ticket = crear('article', abierto ? 'ticket abierto' : 'ticket');

  const cabeza = crear('button', 'ticket-cabeza');
  cabeza.type = 'button';
  cabeza.setAttribute('aria-expanded', abierto ? 'true' : 'false');
  cabeza.setAttribute('aria-controls', id);
  cabeza.dataset.clave = fila.clave;

  const talon = crear('span', 'talon');
  talon.append(crear('b', '', fila.horaCita), crear('span', '', fila.diaCita));

  const cuerpo = crear('span', 'cuerpo');
  const textos = crear('span');
  textos.append(crear('span', 'paciente', fila.paciente), crear('span', 'dato', fila.datoTexto));
  cuerpo.append(textos, crear('span', `sello sello-${fila.sello}`, fila.selloTexto));
  cabeza.append(talon, cuerpo);
  cabeza.addEventListener('click', () => {
    if (abiertos.has(fila.clave)) abiertos.delete(fila.clave);
    else abiertos.add(fila.clave);
    pintarLista();
  });

  const detalle = crear('div', 'detalle');
  detalle.id = id;
  detalle.hidden = !abierto;

  if (fila.mensaje) {
    const mensaje = crear('p', 'burbuja', fila.mensaje);
    mensaje.dataset.mensaje = fila.clave;
    detalle.append(mensaje);
  }
  if (fila.estado === 'enviado' && fila.respuestaTexto) {
    detalle.append(crear('p', 'burbuja burbuja-paciente', fila.respuestaTexto));
    const reconocida = fila.respuestaReconocida ? '' : ' · no reconocida';
    detalle.append(crear('p', 'pie', `respondió ${fila.respuestaHora}${reconocida}`));
  }
  if (fila.motivo && fila.estado !== 'enviado') {
    detalle.append(crear('p', 'motivo', fila.motivo));
  }

  if (fila.estado === 'enviado' && fila.confirmacion === 'cancelo') {
    if (fila.espacioLiberado) {
      detalle.append(crear('p', 'liberado', 'Espacio liberado en Google Calendar.'));
    } else {
      detalle.append(crear(
        'p',
        'aviso',
        `${fila.paciente} canceló. Libere el espacio de ${fila.inicioTexto} en Google Calendar.`,
      ));
      const acciones = crear('div', 'detalle-acciones');
      const liberar = crear('button', 'tecla tecla-oscura tecla-chica', 'Ya lo liberé');
      liberar.type = 'button';
      liberar.addEventListener('click', () => enviar('/api/espacio', { eventoId: fila.eventoId }));
      acciones.append(liberar);
      detalle.append(acciones);
    }
  }

  const conversacion = estado.conversaciones.find((item) => item.eventoId === fila.eventoId);
  if (fila.estado === 'enviado' && conversacion?.abierta) {
    const ir = crear('button', 'enlace', 'Ver conversación');
    ir.type = 'button';
    ir.addEventListener('click', () => {
      seleccionado = fila.eventoId;
      location.hash = 'simulador';
      pintarSimulador();
    });
    detalle.append(ir);
  }

  ticket.append(cabeza, detalle);
  return ticket;
}

function pintarSimulador() {
  pacientes.replaceChildren();
  const lista = estado.conversaciones;

  if (lista.length === 0) {
    seleccionado = null;
    const vacio = crear('p', 'vacio');
    vacio.append(
      crear('strong', '', 'Todavía no hay recordatorios enviados.'),
      crear('span', '', 'Las conversaciones aparecen aquí cuando sale el primer recordatorio.'),
    );
    pacientes.append(vacio);
    telefono.hidden = true;
    return;
  }

  if (!lista.some((item) => item.eventoId === seleccionado)) {
    seleccionado = lista[0].eventoId;
  }

  for (const item of lista) {
    const boton = crear('button', 'paciente-op');
    boton.type = 'button';
    boton.setAttribute('aria-pressed', item.eventoId === seleccionado ? 'true' : 'false');
    boton.append(
      crear('span', 'paciente', item.paciente),
      crear('span', 'dato', item.citaTexto),
      crear('span', `sello sello-${item.confirmacion}`, item.confirmacionTexto),
    );
    boton.addEventListener('click', () => {
      seleccionado = item.eventoId;
      avisoSimulador.textContent = '';
      libreError.hidden = true;
      pintarSimulador();
    });
    pacientes.append(boton);
  }

  const actual = lista.find((item) => item.eventoId === seleccionado);
  telefono.hidden = false;
  telNombre.textContent = actual.paciente;
  telDato.textContent = `${actual.telefono} · ${actual.citaTexto.toLowerCase()}`;

  hilo.replaceChildren();
  for (const mensaje of actual.hilo) {
    const dePaciente = mensaje.de === 'paciente';
    hilo.append(crear('p', dePaciente ? 'burbuja burbuja-paciente' : 'burbuja', mensaje.texto));
    const nota = dePaciente && mensaje.reconocida === false ? ' · no reconocida' : '';
    hilo.append(crear('p', dePaciente ? 'pie pie-paciente' : 'pie', `${mensaje.hora}${nota}`));
  }

  telRespuestas.hidden = !actual.abierta;
  if (!actual.abierta) {
    hilo.append(crear('p', 'pie', 'La cita ya empezó. No se aceptan respuestas.'));
  }
}

function pintarResumen() {
  const datos = estado.resumen;
  cifras.replaceChildren();
  const items = [
    { valor: datos.citas, texto: 'Citas avisadas' },
    { valor: datos.confirmadas, texto: 'Confirmaron', nota: `${datos.tasaConfirmacion} % de las avisadas` },
    { valor: datos.canceladas, texto: 'Cancelaron con aviso', nota: `${datos.tasaCancelacion} % de las avisadas` },
    { valor: datos.sinRespuesta, texto: 'Sin respuesta' },
    { valor: `${datos.tasaRespuesta} %`, texto: 'Tasa de respuesta', nota: 'meta del piloto: 60 % o más', destacada: true },
    { valor: datos.espaciosLiberados, texto: 'Espacios liberados', nota: `de ${datos.canceladas} cancelaciones` },
    { valor: datos.mensajes, texto: 'Mensajes enviados' },
    { valor: `${datos.minutosAhorrados} min`, texto: 'Tiempo ahorrado', nota: 'estimado' },
  ];
  for (const item of items) {
    const cifra = crear('div', item.destacada ? 'cifra destacada' : 'cifra');
    cifra.append(crear('b', '', String(item.valor)), crear('span', '', item.texto));
    if (item.nota) cifra.append(crear('small', '', item.nota));
    cifras.append(cifra);
  }
}

function mostrarError(texto) {
  error.hidden = false;
  error.textContent = texto;
}
