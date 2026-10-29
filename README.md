# Consultorio de la Dra. Laura

La asistente abre una sola pantalla, Recordatorios. Las citas siguen en Google Calendar y la app avisa por WhatsApp 24 horas antes y 2 horas antes, entre las 08:00 y las 20:00 (America/Bogota). Calendar y WhatsApp arrancan en mock: no se llama a Google ni sale un mensaje real.

## Cómo abrirlo

```bash
node server.js
```

Abrir http://127.0.0.1:3000. Para comprobar la demo, usar "Poner hoy a las 16:00" o "Poner mañana a las 07:30" y después "Procesar pendientes".

Las pruebas están en `node --test`.

## Archivos

- `AGENTS.md` — reglas para cualquier agente: problema, asistente, agenda, idioma, zona horaria, mock, tono y alcance.
- `docs/spec-recordatorios-whatsapp.md` — spec del recordatorio automático de cita por WhatsApp, 24 horas antes y 2 horas antes.
- `.cursor/skills/diseno-de-marca/SKILL.md` — marca visual y tono para pantallas, color, tipografía y copy.
- `server.js` — arranca la app.
- `src/` — reglas de envío, adaptadores de Calendar y WhatsApp, y el servidor.
- `public/` — la pantalla Recordatorios.
- `test/` — los criterios de aceptación.
- `.env.example` — interruptor de mock o real, y las credenciales si hacen falta.
- `README.md` — este archivo.
