---
name: diseno-de-marca
description: Define la marca visual y el tono de la app del consultorio dental. Úsala al diseñar pantallas, color, tipografía o copy visual.
---

# Diseño de marca

Aplica estas reglas al diseñar o modificar pantallas, color, tipografía o copy visible. La app es el mostrador de un consultorio dental pequeño. El título de la app es "Consultorio". No inventes un nombre de producto.

## Personalidad

Porcelana y agenda. Cálida como un consultorio de barrio, ordenada como una agenda de papel. La lectora es la asistente, a quien ya conoce el consultorio. Las frases caben en una pantalla de trabajo, con el mismo tono de una nota dejada en el mostrador.

## Paleta

Color plano. Marfil de fondo, tinta azul marino para el texto y terracota para la acción. Sin verde y sin gradientes.

| Uso | Hex |
| --- | --- |
| Fondo de la app | `#F7F2EA` |
| Superficie | `#FFFDF9` |
| Texto principal (tinta) | `#1D2742` |
| Texto secundario | `#5B6275` |
| Línea | `#E6DDD0` |
| Acción (terracota) | `#B8492E` |
| Acción al presionar | `#9C3A22` |
| Texto sobre la acción | `#FFFDF9` |
| Confirmó: texto / fondo | `#2F4A8A` / `#E4E9F5` |
| Canceló y error: texto / fondo | `#9C3A22` / `#F7E3DC` |
| Aviso y sin respuesta: texto / fondo | `#7A5A0C` / `#F5EBCF` |
| Neutro (programado): texto / fondo | `#5B6275` / `#EFEAE2` |

## Tipografía

Tres voces, todas sin descargas. La app no carga fuentes de internet: si la fuente no está instalada en el equipo, usa el respaldo local.

| Voz | Fuente | Respaldo local | Uso |
| --- | --- | --- | --- |
| Serif | Fraunces | Iowan Old Style, Palatino Linotype, Georgia | Título de pantalla, horas grandes, cifras del Resumen |
| Sans | Instrument Sans | Segoe UI Variable Text, Avenir Next, system-ui | Cuerpo, nombres, botones |
| Mono | JetBrains Mono | Cascadia Mono, Consolas, Menlo | Datos: hora de envío, modo mock, teléfono |

- Título de pantalla: serif, 34px, peso 400.
- Hora en el talón del tiquete: serif, 26px.
- Nombre del paciente: sans, 17px, peso 600.
- Datos de la fila: mono, 12px.
- Cuerpo: sans, 16px, interlineado 1.45.
- Etiqueta de marca arriba del título: sans, 12px, peso 600, espaciado 2px, en terracota.

## Componentes

- **Botón tecla.** Borde de 2px en tinta y borde inferior de 5px. Radio 8px. Al presionar, el borde inferior baja a 2px y el botón se hunde 3px.
  - Principal: fondo terracota. Uno solo por pantalla.
  - Secundario: fondo superficie, texto tinta.
  - Terciario: fondo tinta, texto marfil, más pequeño.
- **Enlace.** Terracota, subrayado con separación de 4px. Para acciones menores.
- **Tiquete.** Una cita por tiquete. Talón a la izquierda con la hora en serif y el día en mono, separado por una línea punteada. Borde de 1.5px en tinta, radio 10px. Abierto, el borde pasa a terracota.
- **Sello.** Píldora de 12px, peso 600, con los colores de estado.
- **Pestañas y filtros.** Texto secundario, la activa en tinta con subrayado terracota de 2px.
- **Burbujas.** El consultorio a la izquierda en superficie con borde; el paciente a la derecha en tinta.

## Tono de voz

Español, trato de usted, frases cortas. El copy dice qué hay y qué puede hacer la asistente. Los estados se nombran así: Programado, Enviado, Omitido, Fallido. La confirmación: Sin respuesta, Confirmó, Canceló.

## Qué evitar

- Verde, gradientes, morado, violeta o neón.
- Fuentes cargadas desde internet.
- Mascotas, emoji, signos de exclamación y fotos grandes de sonrisas.
- Inglés en botones, títulos, listas o estados vacíos.
- Sombras difusas. La profundidad la da el borde inferior de la tecla.
- Más de un botón terracota por pantalla.
- Un nombre de producto distinto de "Consultorio".

## Ejemplos

### Botones

Sí: `Procesar pendientes`. Fondo `#B8492E`, texto `#FFFDF9`, borde `#1D2742` de 2px y 5px abajo.

No: `¡Enviar magia ahora!` sobre un gradiente de `#7C3AED` a `#EC4899`.

### Listas

Sí: un tiquete por recordatorio.

```
09:00 │ Luis Pérez                          Canceló
jue 29│ 24 h · enviado hoy 09:00 · respondió hoy 10:12
```

No: tarjeta con emoji de diente, anillo de progreso y el texto "Awesome, confirmed!".

### Estados vacíos

Sí:

```
Hoy no hay recordatorios.
Las citas del calendario aparecerán aquí cuando tengan un envío para hoy.
```

No: ilustración de un diente y el texto "¡Bandeja cero, campeona!".
