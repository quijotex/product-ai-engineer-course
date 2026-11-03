# Instrucciones para agentes

Reglas cortas. Aplican a cualquier trabajo en este repositorio.

## Problema

La Dra. Laura tiene un consultorio dental pequeño. Cerca del 30 % de los pacientes no llega y ese espacio se pierde. Los tratamientos de varias sesiones, como la endodoncia o la ortodoncia, se abandonan cuando el dolor pasa y nadie hace seguimiento. La asistente pasa gran parte de la mañana enviando recordatorios por WhatsApp, uno por uno.

Hay que reducir las inasistencias y lograr que los pacientes terminen sus tratamientos. Hoy hay dos features especificados: el recordatorio automático de cita y la confirmación de asistencia por WhatsApp. El ICP y la persona están en `docs/icp-persona.md`.

## Usuaria

La usuaria es la asistente del consultorio. La app le quita el envío manual de recordatorios. La doctora no opera la app en el día a día.

## Agenda

Google Calendar sigue siendo la agenda. La app lee las citas. No las muda a otro calendario.

## Idioma

La interfaz y el README van en español.

## Zona horaria

Todas las horas se calculan y se muestran en America/Bogota.

## Mock

Calendar y WhatsApp arrancan en modo mock. En mock no hay llamadas a Google ni mensajes reales de WhatsApp. Las respuestas de los pacientes también son simuladas. La pantalla no carga nada de internet: ni fuentes, ni scripts, ni imágenes externas. El modo real solo entra si alguien lo configura a propósito.

## Tono

Consultorio pequeño, sobrio y clínico. Trato de usted y frases cortas. Para pantallas, color, tipografía o copy visual, aplica `.cursor/skills/diseno-de-marca/SKILL.md`.

## Si falta un detalle

Elige la opción más simple y déjala escrita en el spec o junto al código.

## Alcance

No inventes módulos que el problema no pide. Trabaja solo lo que esté escrito en un spec de `docs/`. Ahora son `docs/spec-recordatorios-whatsapp.md` y `docs/spec-confirmacion-asistencia.md`. No agregues facturación, expediente clínico ni seguimiento de tratamientos de varias sesiones.
