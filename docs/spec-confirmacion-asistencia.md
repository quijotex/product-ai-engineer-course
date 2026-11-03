# Confirmación de asistencia por WhatsApp

Feature único de este spec: el paciente responde al recordatorio con 1 para confirmar o 2 para cancelar, y la asistente ve la respuesta en la app. Se apoya en `docs/spec-recordatorios-whatsapp.md`, que sigue vigente salvo donde este spec lo cambia. La usuaria es la asistente; la persona está en `docs/icp-persona.md`.

Este spec no incluye el seguimiento de tratamientos de varias sesiones, una lista de espera ni la escritura en Google Calendar.

## Problema

**En palabras de la asistente.** "Ahora el recordatorio sale solo, pero igual no sé quién viene. Me entero de que alguien canceló cuando ya pasó la hora."

**En palabras del negocio.** El recordatorio informa, pero no avisa a tiempo de quién no llegará. Si el paciente cancela con horas de anticipación, la asistente puede liberar el espacio y ofrecerlo. Sin respuesta, la hora se pierde igual.

## Diseño de la solución

### Flujo

1. El recordatorio sale como hoy, con una línea más: `Responda 1 para confirmar o 2 para cancelar.`
2. El paciente responde. En mock, la respuesta se escribe en la pantalla Conversaciones.
3. La app interpreta la respuesta y la guarda en la cita.
4. Si el paciente cancela, el recordatorio pendiente de esa cita pasa a `omitido` y la asistente ve un aviso para liberar el espacio en Google Calendar.
5. La asistente marca "Ya lo liberé" cuando lo hizo en Calendar.
6. La pantalla Resumen muestra las cifras de confirmación.

### Reglas

- La confirmación es de la cita, no de cada recordatorio. Las dos filas de una cita muestran la misma respuesta.
- Solo se acepta una respuesta si la cita tiene al menos un recordatorio en `enviado` y la cita aún no empieza.
- `1` confirma. `2` cancela. Se ignoran los espacios al inicio y al final. Cualquier otro texto queda registrado como no reconocido y no cambia la confirmación.
- La última respuesta válida gana, con una excepción: la cancelación es definitiva. Si el paciente escribe después de cancelar, la respuesta se registra pero la cita sigue cancelada. La asistente lo resuelve por teléfono.
- Una cita cancelada no recibe más recordatorios: los que estén en `programado` pasan a `omitido` con el motivo `El paciente canceló por WhatsApp.` Sincronizar no los revive.
- Una cita confirmada recibe igual el recordatorio de 2 h.
- La app no escribe en Google Calendar. "Ya lo liberé" solo deja constancia de que la asistente lo hizo a mano.
- Texto completo del mensaje: `Consultorio de la Dra. Laura. Le recordamos su cita el {día de la semana} {día} de {mes} a las {HH:MM}. Responda 1 para confirmar o 2 para cancelar.`

### Estados de confirmación

| Estado | En pantalla | Significado |
| --- | --- | --- |
| sin recordatorio enviado | sin sello | Aún no se pregunta nada. |
| `sin_respuesta` | Sin respuesta | Se envió al menos un recordatorio y no hay respuesta válida. |
| `confirmo` | Confirmó | La última respuesta válida fue 1. |
| `cancelo` | Canceló | El paciente respondió 2. |

### Mock y modo real

- **WhatsApp en mock.** Las respuestas entran por la pantalla Conversaciones. No sale ni entra ningún mensaje real.
- **WhatsApp real.** Leer respuestas exige el webhook de WhatsApp Cloud API, que no entra en este spec. Mientras no exista, el modo real envía el texto anterior, sin la línea de respuesta, y la pantalla no muestra confirmaciones. Así no se le pide al paciente algo que nadie va a leer.

### Pantallas

Tres pantallas con una barra de navegación arriba. Estilo en `.cursor/skills/diseno-de-marca/SKILL.md`.

1. **Recordatorios.** La de hoy, con un sello de confirmación en cada fila y filtros: Todos, Sin respuesta, Confirmadas, Canceladas. Si hay cancelaciones sin liberar, un aviso arriba de la lista. Al abrir una fila se ven el mensaje, la respuesta y, si canceló, el botón "Ya lo liberé".
2. **Conversaciones** (solo en mock). Sin textos de demo: se ve como una app real. Lista de pacientes con recordatorio enviado y un teléfono con la conversación. Botones `1 Confirmar` y `2 Cancelar`, y un campo para escribir otra respuesta.
3. **Resumen.** Cifras de las citas con recordatorio enviado: confirmadas, canceladas, sin respuesta, tasa de respuesta, espacios liberados, mensajes enviados y tiempo ahorrado estimado.

## Criterios de aceptación

1. En mock, el mensaje enviado a Ana Gómez termina en `Responda 1 para confirmar o 2 para cancelar.`
2. Después de procesar a las 16:00, en Conversaciones aparecen Ana Gómez y Luis Pérez con sello `Sin respuesta`. Marta Ruiz no aparece porque no tiene teléfono.
3. Si Ana responde `1`, sus dos filas muestran `Confirmó` y su recordatorio de 2 h sigue en `programado`.
4. Si Luis responde `2`, sus filas muestran `Canceló`, su recordatorio de 2 h pasa a `omitido` con el motivo `El paciente canceló por WhatsApp.` y la pantalla Recordatorios muestra el aviso para liberar el espacio de mañana a las 09:00.
5. Si Luis responde `1` después de cancelar, sigue en `Canceló`. Sincronizar tampoco revive su recordatorio de 2 h.
6. Una respuesta como `sí, gracias` queda registrada, la pantalla dice que no se reconoce y la confirmación no cambia.
7. No se acepta una respuesta para una cita sin recordatorio enviado ni para una cita que ya empezó.
8. "Ya lo liberé" solo funciona en una cita cancelada y suma uno a "Espacios liberados" en el Resumen.
9. Con Ana confirmada y Luis cancelado, el Resumen muestra 2 citas avisadas, 1 confirmada, 1 cancelada, 0 sin respuesta y 100 % de respuesta.
10. Nada de lo anterior llama a la red.

## Métricas de éxito

Se miden en un piloto de 8 semanas con la Dra. Laura, contra las 4 semanas anteriores.

**Métrica principal**

| Métrica | Línea base | Meta | Cómo se mide |
| --- | --- | --- | --- |
| Tasa de inasistencia | 30 % | 18 % o menos | Citas sin llegar ÷ citas agendadas, contadas cada sábado con la agenda. La app no sabe quién llegó, así que se cuenta a mano. |

**Métricas de la feature**

| Métrica | Meta | Fuente |
| --- | --- | --- |
| Tasa de respuesta | 60 % o más de las citas avisadas | Resumen: (confirmadas + canceladas) ÷ citas avisadas |
| Cancelaciones avisadas por WhatsApp | 70 % o más de las cancelaciones de la semana | Resumen y agenda |
| Espacios liberados tras una cancelación | 80 % o más de las cancelaciones | Resumen: espacios liberados ÷ canceladas |
| Tiempo de la asistente en recordatorios | De unos 90 a menos de 10 minutos por día | Estimado en el Resumen: 2 minutos por mensaje que ya no escribe a mano. Se valida con la asistente en la semana 2 y la 8. |

**Métricas de control (no deben empeorar)**

| Métrica | Límite |
| --- | --- |
| Mensajes duplicados del mismo tipo para una cita | 0 |
| Mensajes enviados fuera de 08:00 a 20:00 | 0 |
| Pacientes que piden no recibir más mensajes | Menos del 2 % |

## Decisiones

- Solo se reconocen `1` y `2`. Interpretar texto libre ("sí", "no puedo") queda para después, si la tasa de respuestas no reconocidas supera el 15 %.
- Las respuestas y los avisos viven en memoria, como los recordatorios. Al reiniciar la app se pierden. Persistir el estado es un trabajo aparte, necesario antes del modo real.
- El tiempo ahorrado usa 2 minutos por mensaje: abrir el chat, copiar el texto, revisar fecha y hora, y enviar.
- El Resumen cuenta las citas que hay en memoria. No tiene filtro por semana porque en mock solo existen las citas de mañana.
