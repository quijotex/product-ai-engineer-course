# Consultorio de la Dra. Laura

Las citas siguen en Google Calendar. La app avisa por WhatsApp 24 horas antes y 2 horas antes, entre las 08:00 y las 20:00 (America/Bogota). El paciente responde 1 para confirmar o 2 para cancelar, y la asistente ve la respuesta.

Todo es una simulación: Calendar y WhatsApp arrancan en mock, las respuestas de los pacientes se escriben en la pantalla Conversaciones y la página no carga nada de internet, ni siquiera fuentes.

## Cómo abrirlo

```bash
node server.js
```

Abrir http://127.0.0.1:3000.

## Despliegue en Netlify

La app también corre completa en el navegador, sin servidor: si la pantalla no encuentra `/api/`, usa el mismo núcleo (`src/consultorio.js`) dentro de la pestaña. El estado vive en la pestaña y se reinicia al recargar.

La versión publicada arranca en marcha: hoy a las 16:00, con los recordatorios de 24 h de Ana y Luis ya enviados, para que Conversaciones tenga pacientes a cualquier hora. Así se puede saltar el paso 1 de la demo. "Cambiar hora" sigue disponible.

`netlify.toml` ya trae la configuración: build `node scripts/build.js` y publicación de `dist/`. En la pantalla de Netlify se dejan vacíos los campos de build. Para probar el build en local:

```bash
npm run build
```

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
- `src/` — reglas de envío y de respuestas, adaptadores de Calendar y WhatsApp, el núcleo de la app (`consultorio.js`) y el servidor.
- `scripts/build.js` y `netlify.toml` — arman `dist/` para el despliegue estático.
- `public/` — las tres pantallas.
- `test/` — los criterios de aceptación.
- `.env.example` — interruptor de mock o real. Para este ejercicio se queda en mock.
- `README.md` — este archivo.
