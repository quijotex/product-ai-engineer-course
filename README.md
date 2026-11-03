# Consultorio de la Dra. Laura

Las citas siguen en Google Calendar. La app avisa por WhatsApp 24 horas antes y 2 horas antes, entre las 08:00 y las 20:00 (America/Bogota). El paciente responde 1 para confirmar o 2 para cancelar, y la asistente ve la respuesta.

Todo es una simulación: Calendar y WhatsApp arrancan en mock, las respuestas de los pacientes se escriben en la pantalla Conversaciones y la página no carga nada de internet, ni siquiera fuentes.

## Cómo abrirlo

```bash
node server.js
```

Abrir http://127.0.0.1:3000.

## Pantallas

- **Recordatorios.** Un tiquete por recordatorio, con un sello de confirmación y filtros. Si alguien canceló, aparece un aviso para liberar el espacio en Google Calendar.
- **Conversaciones.** El teléfono del paciente: se ve el mensaje que recibió y se responde con 1, 2 u otro texto.
- **Resumen.** Citas avisadas, confirmadas, canceladas, sin respuesta, tasa de respuesta, espacios liberados y tiempo ahorrado.

## Demo en cinco pasos

1. Junto a la fecha, pulsar "Cambiar hora" y luego "Hoy 16:00". Después, en Recordatorios, "Procesar pendientes". Salen los recordatorios de 24 h de Ana Gómez y Luis Pérez.
2. En Conversaciones, elegir a Ana Gómez y pulsar "1 · Confirmar".
3. Elegir a Luis Pérez y pulsar "2 · Cancelar". Su recordatorio de 2 h queda omitido.
4. Volver a Recordatorios, abrir el tiquete de Luis y pulsar "Ya lo liberé".
5. Abrir Resumen: 2 citas avisadas, 1 confirmada, 1 cancelada y 100 % de respuesta.

Las pruebas están en `node --test`.

## Archivos

- `AGENTS.md` — reglas para cualquier agente: problema, asistente, agenda, idioma, zona horaria, mock, tono y alcance.
- `docs/icp-persona.md` — ICP del consultorio y user persona de la asistente.
- `docs/spec-recordatorios-whatsapp.md` — spec del recordatorio automático de cita por WhatsApp, 24 horas antes y 2 horas antes.
- `docs/spec-confirmacion-asistencia.md` — spec de la confirmación de asistencia, con criterios de aceptación y métricas de éxito.
- `.cursor/skills/diseno-de-marca/SKILL.md` — marca visual y tono: porcelana, tinta y terracota, botón tecla y tiquetes.
- `server.js` — arranca la app.
- `src/` — reglas de envío y de respuestas, adaptadores de Calendar y WhatsApp, y el servidor.
- `public/` — las tres pantallas.
- `test/` — los criterios de aceptación.
- `.env.example` — interruptor de mock o real. Para este ejercicio se queda en mock.
- `README.md` — este archivo.
