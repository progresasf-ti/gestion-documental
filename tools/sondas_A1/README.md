# Sondas A1 — parentesco de archivos en unidades compartidas

Tres sondas de Apps Script que se usaron el **4 de septiembre de 2026** para
decidir si `moverA()` podía seguir usando `removeFile`/`addFile` o tenía que
pasar a `moveTo()`.

**No son código del sistema.** Nunca van al proyecto de PSF GED. Van a un
proyecto de Apps Script nuevo y desechable, y no tocan el archivo documental:
crean sus propios archivos temporales y los mandan a la papelera al terminar.

Se conservan porque son la evidencia del commit `0dc10a1`, y porque la tercera
enseña algo que vale más que el resultado (ver abajo).

## Qué se midió

| Movimiento | `removeFile`/`addFile` | `moveTo()` |
|---|---|---|
| Mi unidad → Mi unidad | ✅ funciona | ✅ funciona |
| Mi unidad → unidad compartida | ✅ funciona | ✅ funciona |
| **dentro de la unidad compartida** | ❌ **excepción** | ✅ funciona |

El único caso que falla lanza:

```
Cannot use this operation on a shared drive item.
```

Y es el que decide todo. Instalado en una unidad compartida, los nueve puntos
de llamada de `moverA()` mueven de carpeta a carpeta **dentro** de ella
(`00_BANDEJA_ENTRADA` → `01_EN_REVISION` → `02_ARCHIVO_CONTROLADO/…`). Con la
API vieja el sistema no daría un paso.

`makeCopy(nombre, carpeta)` —el camino de `CONSERVAR_ORIGINAL`— se midió aparte
y funciona en ambos sitios.

## Los archivos

| Archivo | Función | Necesita |
|---|---|---|
| `sonda_1_unidad_compartida.gs` | `sondaA1()` | ID de una carpeta de la unidad compartida |
| `sonda_2_mi_unidad.gs` | `sondaMiUnidad()` | nada — usa carpetas temporales |
| `sonda_3_control.gs` | `sondaControl()` | el mismo ID de la sonda 1 |

Los tres van en el **mismo** proyecto, cada uno en su archivo: la sonda 2 reusa
`nombrePadres()`, que está definida en la sonda 1.

El ID sale de la URL de la carpeta: `…/folders/ESTO_ES_EL_ID`. La raíz de una
unidad compartida sirve; no hace falta crear subcarpeta.

## ⚠️ Por qué existe la sonda 3, que es lo que de verdad hay que recordar

Las sondas 1 y 2 leyeron los padres **sobre el mismo objeto `File` que usaron
para mover**. Apps Script deja ese objeto en caché: `moveTo()` lo actualiza,
pero `addFile()` actúa sobre la *carpeta* y deja el `File` con el padre viejo.

Resultado: las dos primeras sondas reportaron **fallos que no existían**.
Durante veinte minutos hubo sobre la mesa un hallazgo grave —que el instalador
dejaba el `Listado Maestro` en Mi unidad en silencio, justo el riesgo que A1
existe para eliminar— que era enteramente un artefacto de la medición.

Lo que lo desarmó no fue discutirlo sino **medir la medición**. La sonda 3
comprueba cada movimiento de tres formas independientes:

- **(a)** el objeto viejo — lo que hacían las sondas 1 y 2
- **(b)** un objeto recién traído con `getFileById()` — la verdad
- **(c)** preguntándole a las carpetas quién tiene el archivo — la verdad, por el otro lado

Con (a) discrepando de (b) y (c), el falso hallazgo se cayó solo.

**Si escribe una sonda nueva, verifique por (b) o (c). Nunca por (a).**

Detalle secundario: en unidades compartidas, **(c) no sirve como evidencia**.
`Folder.getFilesByName()` de DriveApp no las enumera de forma confiable y
responde "no" incluso cuando el archivo sí llegó. Allá vale (b).

## Lo que estas sondas NO responden

Que `moveTo()` funcione no basta para dar A1 por decidida. `Instalador.gs:9`
sigue anclando la instalación con `DriveApp.getRootFolder()`, es decir en Mi
unidad de quien la ejecute. Hasta que eso reciba el ID de la carpeta destino,
el sistema no puede instalarse en la unidad compartida aunque ya sepa moverse
dentro de ella.
