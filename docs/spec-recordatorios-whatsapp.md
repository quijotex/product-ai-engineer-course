# Recordatorios automáticos de cita por WhatsApp

Feature único de este spec: avisar cada cita por WhatsApp 24 horas antes y 2 horas antes. Google Calendar sigue siendo la agenda. La usuaria es la asistente.

Este spec no incluye el seguimiento de tratamientos de varias sesiones.

## Problema

**En palabras de la asistente.** "Llego y me siento a escribirles por WhatsApp, uno por uno: los de mañana y los que vienen en un rato. Si se me pasa alguien, el espacio queda vacío."

**En palabras del negocio.** Cerca del 30 % de los pacientes no llega. Esa hora no se atiende y no se vuelve a llenar sola. El recordatorio sale solo, dos veces por cita, para bajar las inasistencias sin ocupar la mañana de la asistente.

El paciente solo recibe WhatsApp. No hay correo, SMS ni otra app.

## Diseño de la solución

### Flujo

1. Leer las citas futuras desde Google Calendar (mock o real).
2. Por cada cita, crear como máximo dos recordatorios si aún no existen: uno de 24 horas y uno de 2 horas.
3. Calcular la hora de envío con la ventana de las 08:00 a las 20:00.
4. Dejar el recordatorio en `programado` o en `omitido`.
5. Al llegar la hora de envío, dentro de la ventana, entregar el mensaje al adaptador de WhatsApp.
6. Pasar a `enviado` o a `fallido`.
7. La asistente abre la lista y revisa. No redacta ni envía a mano.

### Reglas

- La hora de la cita es el inicio del evento en America/Bogota.
- Hora ideal del recordatorio de 24 h: inicio menos 24 horas. Hora ideal del de 2 h: inicio menos 2 horas.
- Ventana de envío: de las 08:00 a las 20:00 inclusive, America/Bogota. Fuera de esa ventana no sale ningún mensaje.
- Si la hora ideal cae dentro de la ventana, esa es la hora de envío.
- Si la hora ideal es anterior a las 08:00, la hora de envío pasa a las 08:00 de ese mismo día, siempre que las 08:00 sean anteriores al inicio de la cita.
- Si esa corrección no cabe, la hora de envío pasa a las 20:00 del día anterior, siempre que ese instante sea anterior al inicio de la cita.
- Si la hora ideal es posterior a las 20:00, la hora de envío pasa a las 20:00 de ese mismo día, siempre que las 20:00 sean anteriores al inicio de la cita.
- Si ninguna corrección deja una hora anterior a la cita, el estado queda en `omitido`.
- Si el proceso corre tarde, envía una sola vez cuando la hora de envío ya pasó, la cita aún no empieza y la hora actual está dentro de la ventana. Si la cita ya empezó, queda en `omitido`.
- El nombre del paciente es el título del evento.
- El teléfono es la primera línea de la descripción que empieza por `WhatsApp: ` seguida del número en formato internacional, por ejemplo `WhatsApp: +573001112233`. Sin esa línea, el estado queda en `omitido`.
- Cita cancelada o borrada antes del envío: el recordatorio pasa a `omitido`.
- Si la cita cambia de hora y el recordatorio sigue en `programado`, se recalcula la hora de envío. Si ya está en `enviado`, no se reenvía.
- Un solo intento. No hay reintentos automáticos.
- Todas las horas, en la lista y en el mensaje, van en 24 horas.
- Texto del mensaje, sin emoji y de usted: `Consultorio de la Dra. Laura. Le recordamos su cita el {día de la semana} {día} de {mes} a las {HH:MM}.` Ejemplo: `Consultorio de la Dra. Laura. Le recordamos su cita el martes 3 de noviembre a las 15:00.`
- No hay link de confirmación ni lectura de respuestas. El mensaje solo informa.

### Sin duplicados

La clave de un recordatorio es el id del evento de Calendar más el tipo (`24h` o `2h`). Si esa clave ya existe, la sincronización no crea otra fila. Procesar pendientes dos veces no envía dos veces el mismo tipo: solo se envía desde `programado`.

### Estados

| Estado | Significado |
| --- | --- |
| `programado` | Tiene hora de envío y todavía no se entrega. |
| `enviado` | El adaptador aceptó el mensaje. En mock, quedó registrado en la lista. |
| `omitido` | No se envía: sin teléfono, cita cancelada, cita ya empezada o sin hora válida dentro de las reglas. |
| `fallido` | Se intentó el envío y el adaptador lo rechazó. |

### Mock y WhatsApp real

Cada adaptador tiene su propio interruptor. Los dos arrancan en mock.

- **Calendar en mock.** Lee una lista fija de citas. No llama a Google.
- **WhatsApp en mock.** No usa la red. Al procesar, el mensaje pasa a `enviado` y se lee en la pantalla.
- **Calendar real.** Lee el calendario de la doctora. Mismas reglas.
- **WhatsApp real.** Entrega al proveedor ya configurado. Si el proveedor acepta, `enviado`. Si rechaza, `fallido`. Mismas reglas, mismos estados, mismo texto.
- Sin credenciales, el adaptador se queda en mock.

Citas fijas para la demo, con la zona America/Bogota:

| Id | Paciente | Inicio | Descripción |
| --- | --- | --- | --- |
| `cita-ana` | Ana Gómez | Mañana a las 15:00 | `WhatsApp: +573001112233` |
| `cita-luis` | Luis Pérez | Mañana a las 09:00 | `WhatsApp: +573004445566` |
| `cita-marta` | Marta Ruiz | Mañana a las 11:00 | Sin línea de WhatsApp |

### Qué ve la asistente

Una pantalla, título "Recordatorios". Lista del día en curso, ordenada por hora de envío. Cada fila muestra paciente, hora de la cita, tipo (24 h o 2 h), hora de envío y estado. Al abrir la fila se ve el texto exacto del mensaje.

En mock hay una acción, "Procesar pendientes". Entrega solo los que están en `programado`, cuya hora de envío ya pasó y cuya cita aún no empieza, y solo si la hora actual está entre las 08:00 y las 20:00. No escribe mensajes y no llama a WhatsApp real.

## Criterios de aceptación

1. Con la cita de Ana Gómez, la lista muestra un recordatorio `24h` para hoy a las 15:00 y uno `2h` para mañana a las 13:00. Antes de procesar, los dos están en `programado`.
2. En mock, al procesar pendientes después de las 15:00 y antes de las 20:00, el `24h` de Ana pasa a `enviado` y la pantalla muestra el texto del mensaje. No sale ningún WhatsApp real.
3. El `2h` de Luis Pérez no se envía a las 07:00. Su hora de envío es las 08:00 del día de la cita. Si se procesa a las 07:30, sigue en `programado`.
4. Sincronizar dos veces las citas de la demo deja un solo `24h` y un solo `2h` por cada id. Procesar pendientes otra vez no vuelve a enviar el de Ana.
5. Los dos recordatorios de Marta Ruiz quedan en `omitido`. Procesar pendientes no los pasa a `enviado`.

## Decisiones

- La lista muestra los envíos de hoy y de mañana, ordenados por hora de envío. Así el recordatorio de 2 horas de una cita de mañana se ve junto al de 24 horas.
- Un recordatorio está vencido cuando su hora de envío es igual o anterior a la hora actual.
- En mock, la pantalla puede fijar una hora de demo. Las citas de prueba siguen calculadas con la hora real y no se mueven.
- La acción "Sincronizar" vuelve a leer el calendario. Sirve para comprobar que no se duplican filas.
- Sin credenciales, el adaptador pedido en real permanece en mock. Calendar real lee la API de Google Calendar. WhatsApp real usa WhatsApp Cloud API. Las variables están en `.env.example`.
- Las citas de día completo se ignoran.
- Un intento fallido deja el estado en `fallido` y no se reintenta.
