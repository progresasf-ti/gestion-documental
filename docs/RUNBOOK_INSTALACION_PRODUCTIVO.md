# Runbook — Instalación definitiva de PSF GED

**Fecha objetivo:** lunes 7 de septiembre de 2026
**Cuenta ejecutora:** `comercial@progresasf.com`
**Aprobador:** Diego (`diego@progresasf.com`)

> Este documento existe para que el día de la instalación sea seguir pasos, no
> reconstruir decisiones. Todo lo que está aquí ya se decidió o se verificó en
> ejecución; nada es una propuesta abierta.

---

## Decisiones ya tomadas — no volver a discutirlas

| | Decisión | Estado |
|---|---|---|
| **A1** | Vive en una unidad compartida | ✅ decidido — falta elegir cuál |
| **A2** | Ejecuta `comercial@progresasf.com` | ✅ decidido 4-sep |
| **A4** | Aprueba Diego | ✅ decidido 4-sep — sin suplente |
| **A5** | Retención: 99 años MC/PL/CA/LG, 10 el resto | ✅ confirmado 4-sep |

**Producción nace limpia.** No se migra nada del banco de pruebas que vive hoy
en `angel.castano@gmail.com`. Consecutivos, huellas y orígenes de terceros
arrancan de cero, y eso es deseable.

**`CONSERVAR_ORIGINAL` arranca en `true`.** Cada documento queda duplicado
(copia archivada + original en `99_ORIGINALES`) mientras siga así. Es lo
correcto para arrancar; hay que ponerle fecha de apagado más adelante.

---

## Lo que debe estar listo antes de empezar

- [ ] **Unidad compartida definitiva creada**, con administrador definido.
- [ ] Acceso a **`comercial@progresasf.com`**.
- [ ] **`ANTHROPIC_API_KEY`** a la mano, y decidido quién la custodia y cómo se rota.
- [ ] Un **documento real** para la verificación final (ver ⚠️ en la Parte 4).

El acta complementaria firmada no bloquea técnicamente, pero sin ella el sistema
arranca sin dueño documental de sus reglas.

---

# PARTE 0 — Preparación (se puede hacer antes del lunes)

Nada de esto necesita la unidad compartida. Si queda hecho, el lunes son quince
minutos.

- [ ] **0.1** Con `comercial@progresasf.com`, crear el proyecto en
      `script.google.com` → **Nuevo proyecto**. Nombrarlo `PSF GED`.
- [ ] **0.2** ⚠️ Con **esa misma cuenta**, abrir
      `script.google.com/home/usersettings` y activar la **API de Apps Script**.
      Es un interruptor por cuenta. El 4-sep esto frenó el ensayo veinte
      minutos: verificar arriba a la derecha que la sesión sea la correcta, no
      la personal.
- [ ] **0.3** `clasp login --user comercial` y autorizar con esa cuenta. Las
      credenciales conviven: la de por defecto sigue siendo la personal.
- [ ] **0.4** Empujar el código con `clasp push -P <config> -u comercial`.
      El manifiesto activa solo el servicio avanzado de Drive.
- [ ] **0.5** Configuración del proyecto → Propiedades de la secuencia de
      comandos → `ANTHROPIC_API_KEY`.

---

# PARTE 1 — Configurar (lunes)

- [ ] **1.1** Crear la carpeta raíz dentro de la **unidad compartida
      definitiva** y copiar su ID de la URL:
      `…/folders/`**`ESTO_ES_EL_ID`** — cortar antes de cualquier `?`.
- [ ] **1.2** En `Config.gs` del proyecto de producción:

```js
const PAUSADO = true;                       // se suelta en la Parte 4
CARPETA_INSTALACION : 'ID_DE_LA_CARPETA',
ALERT_EMAIL         : 'diego@progresasf.com',   // ya viene así
```

⚠️ **`PAUSADO = true` no es opcional.** Da la ventana para verificar la
estructura en frío antes de que los disparadores empiecen a correr cada 15
minutos.

---

# PARTE 2 — Instalar

- [ ] **2.1** Ejecutar **`diagnostico()`**. Autorizar los permisos.
      Esperado: **✗** en `RAIZ_ID`, `INBOX_ID`, `ARCHIVO_ID`, `INDEX_SHEET_ID`
      (todavía no existen) y **✓** en el resto.
- [ ] **2.2** Ejecutar **`instalarSistema()`**.
- [ ] **2.3** Ejecutar `diagnostico()` otra vez. Esperado: **✓ en las 8 líneas**,
      incluida **"Disparadores: 4 de 4"**.

> Si revienta con `CARPETA_INSTALACION no es una carpeta accesible…`, es el
> `throw` funcionando como debe: el ID o los permisos están mal. **No cae de
> vuelta a Mi unidad a propósito** — una instalación que parece exitosa y deja
> el archivo en una cuenta personal sería peor que un error.

---

# PARTE 3 — Verificar la estructura (antes de tocar nada)

- [ ] **3.1** Las 5 carpetas (`00_BANDEJA_ENTRADA` … `99_ORIGINALES`) y las
      subcarpetas por proceso dentro de `02_ARCHIVO_CONTROLADO`, **todas dentro
      de la unidad compartida**.
- [ ] **3.2** ⚠️ **`FT-GC-001 Listado Maestro de Documentos` está en la unidad
      compartida, NO en Mi unidad de `comercial@`.**
      Nace en Mi unidad por `SpreadsheetApp.create()` y `moveTo()` lo mueve
      después. Es el camino más frágil del sistema. **Si aparece en Mi unidad,
      parar aquí.**
- [ ] **3.3** Hoja `APROBACIONES`: **21 columnas**, `TIPO_ID` en la 7,
      `SU_DECISION` en la **18**, `DECIDIDO_POR` en la **21**.
- [ ] **3.4** Hoja `LISTADO_MAESTRO`: **24 columnas**, `TIPO_ID` en la **5**.
- [ ] **3.5** El desplegable APROBADO/RECHAZADO está sobre `SU_DECISION`, y el
      formato condicional reacciona a `ESTADO` (columna **Q**).

---

# PARTE 4 — La prueba que decide (con Diego presente)

⚠️ **Usar un documento REAL, no uno de prueba.** Producción nace limpia y no
queremos basura en el archivo. Si usas un documento real, no hay nada que
limpiar después: es simplemente el primer documento del sistema.

⚠️ **Que sea un documento PROPIO de PSF, no de un tercero.** El `ORIGEN` de cada
tercero **se fija con el primer documento que se archiva de ese NIT** y todos los
siguientes lo heredan. Estrenar el sistema con el documento de un tercero fija su
origen para siempre, y corregirlo después exige tocar `ORIGENES_TERCEROS`.

- [ ] **4.1** `PAUSADO = false`.
- [ ] **4.2** Dejar el documento en `00_BANDEJA_ENTRADA`.
- [ ] **4.3** Ejecutar `analizarBandeja()` a mano (o esperar 15 min).
- [ ] **4.4** **Verificar que el archivo salió de la bandeja y está en
      `01_EN_REVISION`.** Primer movimiento dentro de la unidad compartida.
- [ ] **4.5** ⚠️ **DIEGO** —no tú— escribe `APROBADO` en `SU_DECISION`.
      **Mirar `DECIDIDO_POR` en ese instante**, antes de correr nada más.
      Debe aparecer `diego@progresasf.com`.
- [ ] **4.6** Ejecutar `ejecutarDecisiones()`.
- [ ] **4.7** Verificar: copia en
      `02_ARCHIVO_CONTROLADO/{proceso}/{tipo}/PROPIO` y original en
      `99_ORIGINALES`.
- [ ] **4.8** En `LISTADO_MAESTRO`, `APROBADO_POR` = `diego@progresasf.com`,
      **no** `(sin identificar; …)`.

### Por qué el 4.5 es el paso crítico

Es la única cosa de toda la instalación **que no se ha probado en esta
configuración**. En el ensayo del 4-sep, la misma cuenta era dueña del script y
editora de la hoja. Aquí `comercial@` es dueña y `diego@` edita.

Google entrega la identidad del editor sólo dentro del mismo dominio. Ambas son
`@progresasf.com`, así que **debería** funcionar — pero "debería" es exactamente
la palabra que costó veinte minutos el 4-sep.

**Si `DECIDIDO_POR` queda vacía:** el sistema no inventa nada (registra
`(sin identificar; ejecutó comercial@…)`, que es honesto pero no sirve como
evidencia del numeral 7.5.3.2). No es un fallo de la instalación y no obliga a
detenerla — pero A2 quedaría sin cerrar y habría que buscar otra vía. Anotarlo
y seguir.

---

# PARTE 5 — Cerrar

- [ ] **5.1** **Rango protegido sobre `SU_DECISION`** en la hoja
      `APROBACIONES`, y permisos: quién edita, quién sólo ve, quién puede tocar
      `02_ARCHIVO_CONTROLADO`. Es lo que convierte "Diego aprueba" de acuerdo
      verbal en control efectivo, y es lo que un auditor va a mirar.
- [ ] **5.2** Actualizar `src/Config.gs` en el repositorio con el
      `CARPETA_INSTALACION` real y commitear. **Sin esto, `src/` deja de ser
      igual al editor y `tools/cotejo.js` reporta deriva permanente**, con lo
      que la herramienta pierde su valor de alarma.
- [ ] **5.3** Correr `node tools/cotejo.js` — debe dar **9/9**.
      ⚠️ Ese cotejo apunta al proyecto **de producción viejo**; hay que
      actualizar el `scriptId` de `.clasp.json` al proyecto nuevo primero.
- [ ] **5.4** Apagar o borrar el proyecto viejo en `angel.castano@gmail.com`:
      tiene disparadores corriendo cada 15 minutos y manda resumen diario.

---

# Si algo sale mal

| Síntoma | Qué significa | Qué hacer |
|---|---|---|
| `CARPETA_INSTALACION no es una carpeta accesible` | ID malo o sin permisos | Revisar el ID y el acceso de `comercial@` a la unidad compartida |
| `FT-GC-001` quedó en Mi unidad | `moveTo()` falló en el camino más frágil | **Parar.** No cargar documentos |
| El documento no sale de `00_BANDEJA_ENTRADA` | Los movimientos internos fallan | **Parar.** `PAUSADO = true` |
| `diagnostico()` dice "3 de 4" | El disparador de edición no se creó | `DECIDIDO_POR` no se llenará. Volver a correr `crearDisparadores()` |
| `DECIDIDO_POR` vacía | Google no entrega la identidad del editor | No detiene nada. A2 queda abierta |
| `User has not enabled the Apps Script API` | Interruptor por cuenta | `script.google.com/home/usersettings` **con esa cuenta** |

---

# Lo que NO hay que hacer

- ❌ **No cambiar `CARPETA_INSTALACION` y volver a correr `instalarSistema()`
  sobre una instalación viva.** No muda nada: crea un árbol nuevo y vacío y
  repunta `RAIZ_ID` hacia allá, dejando huérfano lo ya archivado.
- ❌ **No usar la unidad compartida definitiva para pruebas.** Producción nace
  limpia.
- ❌ **No tocar el editor de Apps Script con una pestaña abierta desde antes de
  un `clasp push`.** Su próximo guardado revierte el push, en silencio y sin
  conflicto. La regla es: **push → recargar la pestaña → recién ahí tocar**.
  Recargar *antes* no sirve.
- ❌ **No dejar `cotejo/` llena.** Un `clasp push` sin `-P` subiría esa copia
  vieja al editor.

---

# Pendientes que NO bloquean el arranque

- **Suplente de Diego.** Con aprobador único, si no está, el flujo se detiene:
  los documentos se acumulan en `01_EN_REVISION` sin perderse, pero nada se
  archiva.
- **Respaldo del `LISTADO_MAESTRO`.** Es la fuente única de verdad. Si se pierde
  o se corrompe, se pierde la trazabilidad aunque los archivos sigan en Drive.
  **Es el único punto donde una pérdida sería irreversible**, y no tiene
  política.
- **Fecha para apagar `CONSERVAR_ORIGINAL`.** Mientras esté en `true`, cada
  documento ocupa el doble.
- **Regla 5 incompleta.** Manda los contratos de factoring al proceso `OP` pero
  no dice de qué tipo son, así que salen como `LG-JR`. Afecta a endosos,
  pagarés, cartas de instrucción y contratos de factoring — probablemente la
  familia de mayor volumen. Cambio redactado, **aplazado al piloto** por
  decisión del usuario.
- **`NO_CLASIFICADO` cubierto sólo por inspección**, nunca ejercitado.
- **Acta complementaria** a PDF y firmada; **instructivo** con pantallazos y
  codificación SGC.

---

*Base documental: `CONTEXTO_PSF-GED.md` (ANEXO 6 y su continuación) y
`PSF-GED_Checklist_Paso_a_Productivo.md`. La evidencia de que `moveTo()` era
necesario está en `tools/sondas_A1/`.*
