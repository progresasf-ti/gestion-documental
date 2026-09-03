# Instructivo de Operación — PSF GED

**Sistema de Gestión Documental · ISO 9001:2015, numeral 7.5**
Progresa Soluciones Financieras S.A.S.

| | |
|---|---|
| Código | `IT-GC-___` *(asignar)* |
| Versión | 01 |
| Fecha | ___________ |
| Elaboró | ___________ |
| Revisó | ___________ |
| Aprobó | ___________ |

> **BORRADOR BASE.** Los datos técnicos de este documento están verificados
> contra el código del sistema. Falta: asignar código y responsables, agregar
> pantallazos donde se indica, y ajustar la periodicidad de las tareas del
> numeral 6 a la realidad de la operación.

---

## 1. Objeto

Describir cómo se opera el sistema PSF GED: cómo se radica un documento, cómo se
revisa y aprueba la clasificación que el sistema propone, y qué tareas periódicas
mantienen el archivo documental sano.

## 2. Alcance

Aplica a todo documento que se incorpore al archivo documental controlado de PSF,
propio o de terceros. No aplica a correspondencia ordinaria ni a documentos de
trabajo sin valor de evidencia.

## 3. Responsabilidades

| Rol | Responsabilidad |
|---|---|
| **Radicador** *(quién: ______)* | Deja los documentos en la bandeja de entrada, en formato legible. |
| **Aprobador** *(quién: ______)* | Revisa la propuesta del sistema y decide. **Ningún documento se archiva sin su decisión.** |
| **Responsable de calidad** *(quién: ______)* | Revisa `01_EN_REVISION` y la bitácora con la periodicidad del numeral 6. Resuelve las clasificaciones dudosas. |
| **Administrador del sistema** *(quién: ______)* | Mantenimiento, cambios de configuración y despliegue de código (anexo A). |

> El correo de resumen diario llega hoy a `diego@progresasf.com`. Si cambia el
> aprobador, hay que cambiar `ALERT_EMAIL` en la configuración.

---

## 4. Cómo funciona, en una página

El sistema trabaja en **dos fases separadas**, cada una con su disparador
automático cada 15 minutos:

```
   Usted deja el documento
            │
            ▼
   00_BANDEJA_ENTRADA
            │
            │  FASE 1 — analizarBandeja()   (cada 15 min, hasta 15 documentos)
            │  Lee el texto, lo clasifica y PROPONE. No renombra, no archiva.
            ▼
   01_EN_REVISION  ─────────►  fila nueva en la hoja APROBACIONES
            │
            │  ◄── AQUÍ DECIDE UNA PERSONA: escribe APROBADO o RECHAZADO
            │
            │  FASE 2 — ejecutarDecisiones()  (cada 15 min)
            ▼
   02_ARCHIVO_CONTROLADO / {proceso} / {tipo} / {NIT o PROPIO}
```

**La regla que no se rompe nunca:** ningún archivo se renombra, se mueve ni se
marca sin que una persona haya escrito `APROBADO` en la hoja. El sistema propone;
usted dispone.

> 📷 **[Pantallazo: la carpeta raíz `PSF GED - Gestion Documental ISO 9001` con
> sus cinco subcarpetas]**

### Las carpetas

| Carpeta | Para qué sirve |
|---|---|
| `00_BANDEJA_ENTRADA` | **Aquí deja usted los documentos.** Es lo único que necesita saber para radicar. |
| `01_EN_REVISION` | Destino temporal de todo lo analizado, mientras espera decisión. |
| `02_ARCHIVO_CONTROLADO` | El archivo definitivo, organizado por proceso → tipo → tercero. |
| `98_REVISION_MANUAL` | Lo que se rechazó o falló. Requiere que alguien lo mire. |
| `99_ORIGINALES` | Copia del archivo tal como llegó, sin renombrar. Red de seguridad. |

### La hoja de control

Se llama **`FT-GC-001 Listado Maestro de Documentos`** y tiene tres pestañas:

| Pestaña | Qué es |
|---|---|
| **`APROBACIONES`** | Su bandeja de trabajo. Aquí decide. |
| **`LISTADO_MAESTRO`** | El índice oficial de todo lo archivado. Es la fuente de verdad. **No se edita a mano.** |
| **`BITACORA`** | Registro de todo lo que el sistema hizo. Para auditoría y diagnóstico. |

---

## 5. Operación diaria

### 5.1 Radicar un documento

1. Abra `00_BANDEJA_ENTRADA`.
2. Arrastre el archivo (PDF, Word, imagen escaneada).
3. Listo. En los siguientes 15 minutos aparecerá una fila en `APROBACIONES`.

**Requisito de calidad del escaneo:** el documento debe tener texto legible. Un
escaneo malo no se puede clasificar y termina en `01_EN_REVISION` esperando que
alguien lo reescanee (ver 5.4). Si escanea, hágalo a **300 dpi**.

> 📷 **[Pantallazo: arrastrando un archivo a `00_BANDEJA_ENTRADA`]**

### 5.2 Revisar la propuesta

Cada mañana llega un correo de resumen a las 7:00 con cuántos documentos esperan
decisión y un enlace a la hoja.

Abra la pestaña `APROBACIONES`. Las filas vienen **coloreadas** para que sepa
dónde mirar primero:

| Color | Significa |
|---|---|
| **Sin color** | `PENDIENTE` — clasificación confiable. Revisión rápida. |
| 🟡 **Amarillo** | `REVISAR` — el sistema no está seguro. Lea la columna `NOTAS`. |
| 🔴 **Rojo** | Novedad: `SIN_TEXTO`, `DUPLICADO` o `NO_CLASIFICADO`. Ver 5.4. |
| 🟢 **Verde** | `EJECUTADO` — ya se archivó. No hay nada que hacer. |

Las columnas que conviene mirar, en este orden:

| Columna | Qué le dice |
|---|---|
| `NOMBRE_PROPUESTO` | **Lo más importante.** Cómo va a quedar el archivo. Si esto está bien, casi todo está bien. |
| `NOTAS` | Avisos del sistema: correcciones que hizo, parecidos que encontró, conflictos. **Léala siempre en las filas amarillas.** |
| `CONFIANZA` | Qué tan seguro está el modelo (0 a 1). Bajo `0.75` la fila se marca `REVISAR` automáticamente. |
| `JUSTIFICACION` | En qué se basó para clasificar. Útil cuando algo no cuadra. |
| `TIPO` / `PROCESO` | La clasificación. Se pueden corregir a mano (ver 5.3). |

> 📷 **[Pantallazo: la hoja APROBACIONES con filas de varios colores]**

### 5.3 Decidir

Escriba en la columna **`SU_DECISION`** (tiene lista desplegable):

| Decisión | Qué hace el sistema |
|---|---|
| **`APROBADO`** | Renombra, archiva en la carpeta que corresponde, registra en el `LISTADO_MAESTRO` y, si es una versión nueva, marca la anterior como obsoleta. |
| **`RECHAZADO`** | Mueve el documento a `98_REVISION_MANUAL` y no lo archiva. |
| **`VERSION_DE <código>`** | Le indica que este documento es una versión nueva de otro. Ver 5.5. |

**Si la clasificación está mal, corríjala antes de aprobar.** Edite las celdas
`TIPO`, `PROCESO` o `TITULO_PROPUESTO` en la misma fila y **después** escriba
`APROBADO`: el sistema reconstruye la clasificación leyendo la fila, así que
manda su corrección, no lo que dijo el modelo.

> ⚠️ **La columna `ORIGEN` es la excepción: editarla a mano no sirve.** El origen
> se hereda del primer documento que se archivó de ese tercero, y esa herencia se
> vuelve a aplicar al aprobar, sobrescribiendo lo que usted escriba. Si un tercero
> quedó con el origen equivocado, se corrige en la tabla `ORIGENES_TERCEROS` de la
> configuración — pídalo al administrador. Ver también 7.3.

> 📷 **[Pantallazo: la lista desplegable de SU_DECISION]**

### 5.4 Qué hacer con cada novedad

| Estado | Qué pasó | Qué hacer |
|---|---|---|
| `SIN_TEXTO` | No se pudo extraer texto: escaneo ilegible o imagen pura. Las columnas de clasificación quedan **vacías a propósito** — el sistema no inventa datos. | **Reescanee a 300 dpi** y vuelva a dejarlo en `00_BANDEJA_ENTRADA`. Marque la fila vieja como `RECHAZADO`. |
| `DUPLICADO` | El contenido es idéntico a un documento ya archivado. La columna `NOTAS` dice a cuál. | Normalmente `RECHAZADO`: ya está archivado, no hace falta otra copia. |
| `NO_CLASIFICADO` | El sistema no pudo producir una clasificación válida. La columna `NOTAS` explica por qué. | Revise el documento. Si es clasificable, complete `TIPO`, `PROCESO` y `TITULO_PROPUESTO` a mano y apruebe. Si no, `RECHAZADO`. |
| `REVISAR` | Confianza baja, o falta un dato, o se parece a otro documento. | Lea `NOTAS`, corrija lo que haga falta y apruebe. |

> ❗ **No escriba `APROBADO` en una fila `SIN_TEXTO`.** No tiene tipo, proceso ni
> título, así que el sistema rechaza la fila y deja un error en la columna
> `RESULTADO`. Lo correcto es `RECHAZADO` y volver a radicar el documento
> reescaneado.

### 5.5 Cuando llega una versión nueva de un documento

Si el documento ya existe y usted sube una versión actualizada, el sistema lo
detecta solo: en `NOTAS` aparecerá *"Se registrará como versión N del documento
XXX; la anterior quedará OBSOLETA"*. Solo apruebe.

Al aprobar:
- El documento nuevo queda `VIGENTE` con el **mismo consecutivo** y versión `+1`.
- El anterior pasa a `OBSOLETO` en el `LISTADO_MAESTRO`, **se mueve a una
  subcarpeta `_OBSOLETOS`** dentro de su misma carpeta y **se le antepone
  `OBSOLETO_`** al nombre. Así nadie lo usa por error, ni navegando ni buscando.

**Si el sistema NO lo detectó** (porque el título cambió lo suficiente), aparecerá
un aviso de parecido en `NOTAS` con un código. Escriba entonces
`VERSION_DE <ese código>` en `SU_DECISION`, corrija el `TITULO_PROPUESTO` para que
coincida con el del documento original, y vuelva a escribir `APROBADO`.

> 📷 **[Pantallazo: una carpeta `_OBSOLETOS` con un archivo `OBSOLETO_...`]**

---

## 6. Tareas periódicas

Estas son las que nadie hace si no están escritas. **Son las que sostienen el
sistema.**

| Tarea | Periodicidad sugerida | Por qué importa |
|---|---|---|
| **Revisar `01_EN_REVISION`** | Semanal | Los documentos que nunca se aprobaron se quedan ahí **en silencio**. Nadie recibe alerta. Si no se revisa, se acumulan indefinidamente. |
| **Revisar `98_REVISION_MANUAL`** | Semanal | Es donde cae lo rechazado y lo que falló. Alguien tiene que decidir qué hacer con esos documentos. |
| **Revisar la `BITACORA`** | Mensual | Buscar eventos `ERROR` y `ERROR_EJECUCION`. Deberían ser cero. |
| **Vaciar filas antiguas de `APROBACIONES`** | Trimestral | La hoja crece indefinidamente. **No borre los encabezados**: si se corren o se renombran, el sistema deja de encontrar las columnas y falla en silencio. |
| **Revisar `99_ORIGINALES`** | Semestral | Crece con una copia por documento. Definir hasta cuándo se conservan (decisión de retención pendiente). |

> ⚠️ La revisión de `01_EN_REVISION` es la más fácil de olvidar y la de peor
> consecuencia: un documento mal escaneado que nadie reescanea nunca entra al
> archivo, y nadie se entera.

---

## 7. Cosas que parecen errores y no lo son

Esta sección existe porque estas cuatro cosas confunden a todo el mundo la
primera vez, **incluido un auditor**.

### 7.1 Un documento que dice "Versión 2" se archiva como `_V01_`

La versión que lleva el nombre del archivo es la **versión en este sistema**, no
la que diga el encabezado del documento. Si un documento entró por primera vez,
es `V01` aunque internamente diga "Versión 3".

Es el comportamiento correcto según el numeral 7.5.3: el control de versiones lo
lleva el índice, no el contenido. La versión que declara el documento sigue
visible dentro de él y en el `LISTADO_MAESTRO` queda la trazabilidad completa.

### 7.2 Un duplicado no siempre se detecta

La huella de contenido se compara contra el `LISTADO_MAESTRO`, que **solo se
llena cuando un documento se aprueba y se archiva**. Si sube dos copias del mismo
archivo y las dos están pendientes, ninguna se marca como duplicada. La detección
funciona cuando la primera ya quedó archivada.

### 7.3 El `ORIGEN` lo fija el primer documento del tercero

El origen (`CLI`, `PRV`, `PAG`, `FON`, `ENT`) describe **la relación de PSF con
el tercero**, no quién expidió el papel. Se fija con el **primer** documento que
se archiva de ese NIT y todos los siguientes lo heredan, aunque el modelo proponga
otra cosa. Verá esa corrección anunciada en `NOTAS`.

Es deliberado: evita que el mismo tercero quede con orígenes distintos según qué
documento llegue. Si el primero fijó un origen equivocado, se corrige en
`ORIGENES_TERCEROS` (administrador), no editando la celda.

### 7.4 Hay dos archivos por cada documento

El sistema conserva el original en `99_ORIGINALES` tal como llegó, sin renombrar,
además de la copia archivada con nomenclatura. Es una red de seguridad: mientras
esté activa, cualquier error es reversible.

**Consecuencia:** una búsqueda global en Drive puede devolver el original sin
nomenclatura. El archivo bueno es siempre el que está bajo `02_ARCHIVO_CONTROLADO`.

---

## 8. Cómo leer el nombre de un archivo

**Documento propio de PSF:**
```
PR-GR-001_V01_Procedimiento-Vinculacion-Clientes_20260315.pdf
│  │   │   │   │                                 └─ fecha del documento
│  │   │   │   └─ título
│  │   │   └─ versión en este sistema
│  │   └─ consecutivo dentro de su serie
│  └─ proceso (GR = Gestión de Riesgos y SAGRILAFT)
└─ tipo (PR = Procedimiento)
```

**Documento de un tercero** — lleva además el origen y la identificación:
```
DE-GR-PRV-9012345677-002_V01_Certificacion-Bancaria_20260820.pdf
│  │  │   │            └─ segundo documento archivado de ESE tercero
│  │  │   └─ NIT del tercero (con dígito de verificación)
│  │  └─ origen: PRV = el tercero es un proveedor
│  └─ proceso
└─ tipo (DE = Documento Externo)
```

Cada tercero numera **desde 001**, de forma independiente.

### Tipos documentales

| | | | | |
|---|---|---|---|---|
| `MC` Manual de Calidad | `PL` Política | `CA` Caracterización | `PR` Procedimiento | `IT` Instructivo |
| `FT` Formato | `RG` Registro / Evidencia | `MZ` Matriz | `DE` Documento Externo | `LG` Documento Legal / Societario |

### Procesos y carpetas

| | | |
|---|---|---|
| `GE` → `01_Gestion_Estrategica` | `GC` → `02_Gestion_Calidad` | `CM` → `03_Comercial` |
| `OP` → `04_Operaciones` | `GR` → `05_Riesgos_Cumplimiento` | `GF` → `06_Financiera` |
| `JR` → `07_Juridica` | `GH` → `08_Gestion_Humana` | `TI` → `09_Tecnologia` |
| `CI` → `10_Control_Interno` | | |

---

## 9. Qué hacer si algo falla

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| Dejé un documento y no aparece fila | Aún no han pasado 15 minutos | Espere. Si pasa media hora, avise al administrador. |
| Escribí `APROBADO` y no pasa nada | Aún no ha corrido la fase 2 | Espere 15 minutos. Si sigue igual, revise la columna `RESULTADO`. |
| La columna `RESULTADO` dice `ERROR: …` | La fila quedó inconsistente | Lea el mensaje. Suele ser un `TIPO` o `PROCESO` mal escrito a mano. Corrija y vuelva a escribir `APROBADO`. |
| Nada funciona desde hace rato | El sistema puede estar en mantenimiento | Avise al administrador: puede estar en pausa (anexo A). |

---

## Anexo A — Para el administrador del sistema

> Esta sección no es para el usuario final.

### Funciones desde el editor de Apps Script

| Función | Para qué |
|---|---|
| `diagnostico()` | Revisa las 6 cosas que suelen fallar (clave de API, IDs, disparadores). **Primer paso ante cualquier problema.** |
| `analizarBandeja()` | Fase 1, a mano. No hay que esperar los 15 minutos. |
| `ejecutarDecisiones()` | Fase 2, a mano. |
| `resumenDiario()` | Reenvía el correo de resumen. |
| `instalarSistema()` | **Solo en una instalación nueva.** Es idempotente, pero si alguien renombró la carpeta raíz o la hoja, crea duplicados. Verificar los nombres antes. |

### Interruptor de mantenimiento

`Config.gs` tiene `const PAUSADO`. Con `true`, las tres funciones automáticas
salen sin hacer nada. **Póngalo en `true` antes de cualquier cambio de código** y
espere a que termine la ejecución en curso (panel *Ejecuciones*).

### Procedimiento de cambio de código

1. `PAUSADO = true`; confirmar que no hay ejecuciones en vuelo.
2. Correr las tres suites locales: `node test/pruebas.js`, `node test/fuzz.js`,
   `node test/prueba_origen.js`. **Las tres: no son redundantes.**
3. Desplegar el código.
4. **Recargar la pestaña del editor de Apps Script.**
5. `diagnostico()`.
6. `PAUSADO = false`.
7. Prueba de humo con un documento.

> ⚠️ **El paso 4 no es opcional.** El editor de Apps Script guarda **toda su copia
> en memoria del proyecto** cuando usted salva cualquier archivo. Una pestaña
> abierta desde antes del despliegue revierte ese despliegue en silencio, sin
> conflicto ni aviso. Orden: desplegar → recargar → recién ahí tocar el editor.

### Verificar que el código desplegado es el correcto

```
node tools/cotejo.js
```

Compara el repositorio contra el proyecto de Apps Script y verifica que estén
presentes los marcadores de todos los cambios documentados. Sale con código 0 si
está conciliado. **Ante cualquier comportamiento raro, cotejar antes de depurar:**
más de una vez el problema ha sido que el código correcto no estaba desplegado.

### Eventos de la BITACORA

| Evento | Significa |
|---|---|
| `LOTE` | Se procesó un lote de documentos. |
| `ARCHIVADO` | Un documento se archivó. |
| `OBSOLETO` | Una versión anterior quedó obsoleta. |
| `SIN_TEXTO` / `DUPLICADO` / `NO_CLASIFICADO` / `REVISAR` | El documento quedó a la espera de intervención humana. |
| `CONFLICTO` | Mismo título y tercero que otro documento, pero con distinta clasificación. |
| `RECHAZADO` | Enviado a revisión manual por decisión de una persona. |
| `ERROR` / `ERROR_EJECUCION` | **Deberían ser cero.** Investigar. |

---

*Fin del instructivo.*
