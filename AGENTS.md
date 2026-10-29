# Instrucciones para agentes

Reglas cortas. Aplican a cualquier trabajo en este repositorio.

## Problema

La Dra. Laura tiene un consultorio dental pequeño. Cerca del 30 % de los pacientes no llega y ese espacio se pierde. Los tratamientos de varias sesiones, como la endodoncia o la ortodoncia, se abandonan cuando el dolor pasa y nadie hace seguimiento. La asistente pasa gran parte de la mañana enviando recordatorios por WhatsApp, uno por uno.

Hay que reducir las inasistencias y lograr que los pacientes terminen sus tratamientos. El único feature especificado hoy es el recordatorio automático de cita.

## Usuaria

La usuaria es la asistente del consultorio. La app le quita el envío manual de recordatorios. La doctora no opera la app en el día a día.

## Agenda

Google Calendar sigue siendo la agenda. La app lee las citas. No las muda a otro calendario.

## Idioma

La interfaz y el README van en español.

## Zona horaria

Todas las horas se calculan y se muestran en America/Bogota.

## Mock

Calendar y WhatsApp arrancan en modo mock. En mock no hay llamadas a Google ni mensajes reales de WhatsApp. El modo real solo entra si alguien lo configura a propósito.

## Tono

Consultorio pequeño, sobrio y clínico. Trato de usted y frases cortas. Para pantallas, color, tipografía o copy visual, aplica `.cursor/skills/diseno-de-marca/SKILL.md`.

## Si falta un detalle

Elige la opción más simple y déjala escrita en el spec o junto al código.

## Alcance

No inventes módulos que el problema no pide. Trabaja solo lo que esté escrito en un spec de `docs/`. Ahora ese spec es `docs/spec-recordatorios-whatsapp.md`. No agregues facturación, expediente clínico ni seguimiento de tratamientos de varias sesiones.
