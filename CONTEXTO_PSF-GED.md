# PSF GED — Archivo de contexto para continuar

**Última actualización:** 2026-08-28
**Propósito:** retomar la implementación del sistema de gestión documental PSF GED sin repetir lo ya avanzado.

---

## Qué es esto

Sistema de clasificación documental automatizada para Progresa Soluciones Financieras
S.A.S. (NIT 900.974.255-5), pensado para el numeral 7.5 de ISO 9001:2015. Corre sobre
**Google Apps Script + Google Drive + API de Anthropic (modelo Haiku)**. Un compañero lo
generó con apoyo de IA; yo estoy validándolo e instalándolo.

Flujo: se deja un documento en `00_BANDEJA_ENTRADA` → cada 15 min un disparador lo lee,
lo clasifica y propone nombre/carpeta en la hoja `APROBACIONES` → **nada se mueve ni se
renombra hasta que un humano escribe APROBADO**. Humano-en-el-loop por diseño.

---

## Estado general: DÓNDE VAMOS

Estoy haciendo una **instalación de prueba en mi cuenta personal de Google** antes de
pasar a la cuenta corporativa. El sistema YA ESTÁ INSTALADO Y FUNCIONANDO en la cuenta
personal.

**EL CHECKLIST DE SEMANA 1 ESTÁ COMPLETO (2026-08-28).** Los 7 puntos cerrados
(`PSF-GED_Checklist-Semana1.pdf`). El sistema funciona de punta a punta: clasifica,
propone, archiva, versiona, marca obsoletos, detecta duplicados y descarta escaneos
ilegibles. Quedan pendientes decisiones de diseño y de calidad, no fallas del sistema
(ver PRÓXIMOS PASOS).

### Instalación (COMPLETA en cuenta personal)
- [x] Código revisado: 8 archivos .gs, todos pasan sintaxis y referencias cruzadas.
- [x] Pruebas locales corridas por Claude: `pruebas.js` (133/133 OK) y `fuzz.js`
      (20.000 casos + 5.000 textos basura, 0 excepciones, 0 invariantes violados).
      NOTA: pruebas.js y fuzz.js son SOLO para Node local, NO se pegan en Apps Script.
- [x] Proyecto creado en script.google.com, los 8 .gs pegados, Código.gs borrado.
- [x] Servicio avanzado Drive API activado.
- [x] API key guardada en Propiedades del script (ANTHROPIC_API_KEY).
- [x] instalarSistema() ejecutado con éxito (tras resolver la advertencia de
      autorización "app no verificada" → Configuración avanzada → Ir a PSF GED).
- [x] Créditos de API comprados en console.anthropic.com ($5 fue suficiente para
      pruebas). IMPORTANTE: la API (console.anthropic.com) y la suscripción de chat
      (claude.ai) tienen facturación SEPARADA. El error 400 "credit balance too low"
      era por saldo de API en cero, no por el código.
- [x] diagnostico() → 6 de 7 en verde; el único ✗ era la API, ya resuelto con la compra.

### Checklist semana 1 — progreso
- [x] **Punto 1** — NIT de PFI: se puso un COMODÍN (ver abajo). Pendiente el real.
- [x] **Punto 2** — Duplicado exacto: FUNCIONA. (Aprendizaje: la huella MD5 se compara
      contra LISTADO_MAESTRO, que solo se llena tras APROBAR y archivar. Subir dos copias
      mientras ambas están pendientes NO detecta duplicado; hay que aprobar/archivar la
      primera y LUEGO subir la copia.)
- [x] **Punto 3** — Versiones con títulos similares: **CERRADO EN VERDE** (corrida 5).
      Requirió 1 cambio de código en `claveLogica()` + reescritura de las reglas del
      prompt. Ver sección propia abajo.
- [x] **Punto 4** — PDF escaneado de mala calidad: **CERRADO EN VERDE**, probado por
      partida doble (ilegible → SIN_TEXTO; legible → PENDIENTE). Ver sección propia abajo.
- [x] **Punto 5** — Tercero con NIT completo: FUNCIONA, consecutivo arrancó en 001.
- [x] **Punto 6** — Métrica de confianza: LÍNEA BASE tomada. Ver sección propia abajo.
- [x] **Punto 7** — BITACORA revisada: **CERO eventos ERROR / ERROR_EJECUCION**.
      Ver sección propia abajo.

**✅ CHECKLIST SEMANA 1 COMPLETO (2026-08-28).**

---

## PUNTO 3 — CERRADO EN VERDE (sesión 2026-08-28, 5 corridas)

### Cómo se probó
Se descartó la prueba vieja (facturas con TIPO inconsistente DE/RG) y se rehízo limpia con
dos certificados de cámara de comercio generados por Claude (opción C): mismo tercero
DISTRIBUIDORA ANDINA DE INSUMOS S.A.S., NIT 901.234.567-7 (DV validado), textos casi
idénticos salvo fecha de expedición, número de recibo y fecha de renovación. MD5 distintos.

### RESULTADO FINAL (corrida 5) — FUNCIONA
- v1: `DE-GR-ENT-901234567-001_V01_Certificado-De-Existencia-Y-Representacion-Legal_20260312.pdf`
- v2: `DE-GR-ENT-901234567-001_V02_Certificado-Existencia-Representacion-Legal_20260820.pdf`
- Mismo NIT, **mismo consecutivo 001**, V01 → **V02**.
- NOTAS del v2: "Se registrará como versión 2 del documento DE-GR-ENT-901234567-001; la
  anterior quedará OBSOLETA."
- **VERIFICADO EN EJECUCIÓN** (no solo en propuesta): se aprobó el v2 y se corrió
  `ejecutarDecisiones()`. En LISTADO_MAESTRO el v1 pasó a ESTADO=OBSOLETO, el v2 quedó
  ESTADO=VIGENTE con VERSION=2 y consecutivo 001. `marcarObsoletos()` corrió por primera
  vez y funciona. **El ciclo completo está probado de punta a punta.**
- OJO: los títulos siguen siendo DISTINTOS en el nombre visible del archivo
  ("Certificado-De-Existencia-Y..." vs "Certificado-Existencia-..."). Ya no importa: la
  clave lógica los normaliza y ahí colisionan. Esa separación entre **nombre legible para
  humanos** y **clave interna estable** es exactamente lo que se buscaba. El sistema
  ABSORBE la variabilidad del LLM en vez de depender de que no exista.

## OBSOLESCENCIA — RESUELTA (2026-08-28)

### Cómo era originalmente (el problema)
Cadena: `ejecutarDecisiones()` → `aplicarArchivado()` → `if (decision.obsoletar.length)
marcarObsoletos(...)`.

`marcarObsoletos()` **SOLO escribía la palabra OBSOLETO en la columna ESTADO de
LISTADO_MAESTRO.** No movía el archivo, no lo renombraba, no aplicaba etiqueta. El archivo
obsoleto quedaba EXACTAMENTE donde estaba, con el mismo nombre, en la misma carpeta del
tercero, al lado del vigente. **Verificado en la prueba real:** el v1 quedó junto al v2.

Riesgo: el numeral 7.5.3.2 de ISO 9001 pide **prevenir el uso no intencionado**. Una marca
en una hoja que el usuario final nunca abre es TRAZABILIDAD, no PREVENCIÓN.

### DECISIÓN TOMADA Y APLICADA (funciona, probado 2026-08-28)
El archivo obsoleto **se mueve a `_OBSOLETOS` dentro de la carpeta del tercero Y se
renombra con prefijo `OBSOLETO_`**. Ruta resultante:
`{PROCESO}/{TIPO}/{NIT}/_OBSOLETOS/OBSOLETO_{nombre original}`

Ejemplo real: `GR/DE_Documento_Externo/901234567/_OBSOLETOS/OBSOLETO_DE-GR-ENT-...`

Se descartó poner `_OBSOLETOS` al nivel del TIPO (`{TIPO}/_OBSOLETOS/`) porque mezclaría
todos los terceros y desharía la separación por NIT recién ganada.
El prefijo se agregó ADEMÁS del movimiento para cubrir a quien llega por BÚSQUEDA de Drive
o por un enlace guardado, no solo a quien navega por carpetas.

### ⚠️ LO QUE SIGUE ABIERTO
1. **Los ORIGINALES no se marcan.** Con `CONSERVAR_ORIGINAL = true` hay 2 archivos por
   documento: la copia archivada (que sí se mueve y renombra) y el original en la carpeta
   de originales, que NO lleva nomenclatura ni marca de ningún tipo. Una búsqueda global en
   Drive todavía puede devolverlo. **Comprobarlo buscando "Certificado" en Drive.**
2. **El prefijo rompe la nomenclatura estricta.** Si alguna vez se usan las funciones de
   parseo de `Nomenclatura.gs` sobre archivos obsoletos, hay que quitar el prefijo antes.
3. **Etiquetas de Drive** siguen siendo una opción adicional; se podrán probar en
   corporativo (requieren consola de Workspace).

---

## PUNTO 4 — CERRADO EN VERDE (2026-08-28)

Se probó con DOS documentos (más de lo que pedía el checklist), ambos imagen pura sin
capa de texto (0 chars extraíbles), para verificar que SIN_TEXTO **discrimina por calidad**
y no se dispara con cualquier PDF escaneado.

### Caso A — `Escaneado_Ilegible_Certificacion_Bancaria.pdf` → ESTADO = **SIN_TEXTO** ✓
- En APROBACIONES solo se llenaron los 3 primeros campos + ESTADO. TIPO, PROCESO, NIT,
  TÍTULO y CONFIANZA quedaron vacíos. **Es el comportamiento correcto:** sin texto no hay
  nada que clasificar y el sistema NO inventó valores.
- RESULTADO y NOTAS también vacíos → mismo vacío de comunicación conocido. Impacto menor
  aquí (SIN_TEXTO es autoexplicativo) pero convendría una nota accionable del estilo
  "no se pudo extraer texto; reescanee a 300 dpi".
- **El archivo pasó de 00_BANDEJA_ENTRADA a `01_EN_REVISION`.** OJO: se creyó al principio
  que esa carpeta era exclusiva de SIN_TEXTO, y es FALSO — es el destino por defecto de
  todo lo analizado (ver Aprendizajes). Lo relevante aquí es que sale de la bandeja y no
  se archiva en la carpeta del tercero.

### Caso B (control) — `Escaneado_Regular_Certificacion_Bancaria.pdf` → **PENDIENTE** ✓
OCR lo leyó y clasificó bien: `DE-GR-FON-901234567-001_V01_Certificacion-Bancaria_20260820.pdf`

### ⚠️ PROCEDIMIENTO OPERATIVO QUE HAY QUE ESCRIBIR EN EL INSTRUCTIVO
Alguien tiene que **revisar `01_EN_REVISION` periódicamente**, reescanear el documento a
mejor calidad y volver a dejarlo en la bandeja. Si nadie mira esa carpeta, los documentos
se acumulan ahí EN SILENCIO.

---

## VALIDACIONES ADICIONALES OBTENIDAS DEL CASO B (2026-08-28)

### La regla 8 SÍ GENERALIZA ✓ (pendiente que venía de antes)
El certificado bancario tiene membrete fuerte del Banco de Occidente y NO es el ejemplo
escrito dentro de la regla. Aun así tituló **"Certificacion-Bancaria"**: por el ACTO, no
por el EMISOR. El criterio se sostiene fuera del caso que se le enseñó.

### El clasificador toma el NIT del SUJETO, no del emisor ✓
Tomó 901234567 (Distribuidora Andina) y no el del Banco de Occidente, aunque el banco es
quien emite. Consistente con lo que hizo en el certificado de cámara de comercio. Correcto
para un expediente de proveedor y el criterio se está sosteniendo solo.

### ORIGEN inconsistente — DETALLE COSMÉTICO, no funcional
Mismo tercero, mismo NIT, pero los certificados de cámara de comercio salieron `ENT` y el
bancario salió `FON`. **VERIFICADO: no tiene consecuencias.**
- `carpetaDestino()` NO usa el origen: los tres quedaron juntos en `DE_Documento_Externo`.
  El árbol se organiza por TIPO, no por origen. No hay dispersión de carpetas.
- `claveLogica()` tampoco incluye el origen (`TIPO|PROCESO|NIT|TITULO`), así que el
  versionamiento no se ve afectado.
- Queda solo como inconsistencia visual en el nombre del archivo. Si calidad quiere
  consistencia, se ajusta con una regla en el prompt. NO es urgente.

---

## PUNTO 6 — LÍNEA BASE DE CONFIANZA (2026-08-28)

**9 registros en APROBACIONES, pero solo 6 son clasificaciones reales:**
- 1 en SIN_TEXTO → sin confianza porque no había nada que clasificar. Acertó.
- 2 en DUPLICADO → resueltos por huella MD5, sin depender de la confianza del modelo.
  Acertó. (De paso confirma otra vez el Punto 2.)

De las **6 clasificaciones reales: 3 sobre 0.75 y 3 por debajo** (50%). Pero al mirar
CUÁLES son los 3 bajos, la lectura cambia por completo:
- 1 aprobado del Punto 2 (sesión 26-08-27): documento genérico de texto mínimo.
- 2 en REVISAR, ambos del 2026-08-27, **anteriores al cambio de prompt**, y ambos sin NIT
  (documentos internos): `DE-GH-001_V01_Material-Psicologico-Bienestar-Personal` y
  `DE-CI-001_V01_Documento-No-Clasificable-Proveedor-Abc`. Los títulos delatan que son
  documentos de prueba improvisados.

### LECTURA HONESTA
**De los 3 documentos realistas clasificados con el prompt ACTUAL, los 3 superaron 0.75.**
No hay ningún caso de confianza baja con el sistema en su estado actual. Que los genéricos
cayeran en REVISAR es el comportamiento CORRECTO: el sistema no fingió certeza donde no la
tenía, que es justo lo que pide la instrucción de honestidad del prompt.

⚠️ **3 documentos NO son una métrica.** Es una señal favorable, nada más. El Punto 6 pide
un porcentaje ACUMULADO y eso solo tiene sentido con semanas de documentos reales.
**Volver a medir tras unas semanas de operación real.**

---

## PUNTO 7 — BITACORA REVISADA (2026-08-28)

**CERO eventos ERROR y CERO ERROR_EJECUCION** en dos días de uso intensivo, incluidas las
5 corridas fallidas del Punto 3. Hallazgo importante: **todos los fallos fueron de lógica
y de datos, nunca excepciones.** El código no se rompió ni una vez.

### Lo que la bitácora confirmó
- **La corrida 4 queda explicada:** 12:27 se archivó el certificado con NIT de 10 dígitos
  y 12:45 otro con 9. Dos archivados distintos con 18 min de diferencia → era residuo de
  limpieza, tal como se concluyó.
- **Secuencia de versionamiento limpia:** 12:45 el V01, 14:29 el V02 con mismo consecutivo.
- Se ve el rastro de cada ajuste de prompt en la evolución del título a lo largo del día.

### ⚠️ DOS HUECOS DE TRAZABILIDAD (para semana 2 / calidad)
1. **La bitácora solo registra LOTE y ARCHIVADO.** NO hay eventos para SIN_TEXTO,
   DUPLICADO ni REVISAR — justamente los casos que requieren intervención humana. El
   escaneado ilegible que fue a `01_EN_REVISION` no dejó rastro; solo aparece el LOTE que
   lo procesó. Quien audite buscando qué pasó con un documento que nunca se archivó, no lo
   encuentra. Para el numeral 7.5 de ISO (trazabilidad) es un hueco.
2. **No queda registro de las obsolescencias.** El archivado del V02 aparece, pero no que
   el V01 pasó a OBSOLETO. Esa información existe SOLO en LISTADO_MAESTRO. Refuerza el
   tema de visibilidad de lo obsoleto (ver sección propia).

---

## DECISIÓN DE TAXONOMÍA — YA RESUELTA (2026-08-28)

Pregunta que estaba abierta: ¿un certificado de cámara de comercio de un TERCERO es LG-JR
o DE-GR? **Respuesta del usuario: le da igual cuál de los dos.** Lo que sí le importa es
que el nombre traiga el NIT (ya lo trae) y que NO traiga la razón social de la empresa.

**Decisión tomada: DE-GR.** Razones: (a) es lo que el clasificador ya produce de forma
consistente, (b) no obliga a pelear contra la regla 1, que es la de mayor prioridad.
LG-JR queda reservado para documentos societarios PROPIOS de PSF.

OJO: aunque al negocio le dé igual, **al sistema NO**. `claveLogica()` incluye TIPO y
PROCESO, así que si el mismo certificado cae en LG-JR una vez y DE-GR otra, el
versionamiento se rompe igual que se rompe por el título. Da lo mismo cuál, pero tiene
que ser SIEMPRE el mismo.

---

## ESTRUCTURA DE CARPETAS — CAMBIADA Y VALIDADA (2026-08-28)

### Cómo era y cómo quedó
ANTES: `02_ARCHIVO_CONTROLADO / {PROCESO} / {TIPO}` (dos niveles — los documentos de todos
los terceros se mezclaban en la misma carpeta de tipo).
AHORA: `02_ARCHIVO_CONTROLADO / {PROCESO} / {TIPO} / {NIT}` (tres niveles).
Documentos propios (sin NIT de tercero) → carpeta literal `PROPIO`, igual criterio que usa
`claveLogica()`.

### Se descartaron dos alternativas
- `NIT/proceso/tipo` (expediente por cliente): replica los 10 tipos dentro de cada NIT.
  Con 100 terceros serían ~1000 carpetas. Se descartó por eso.
- `proceso/NIT/tipo`: era la opción inicial del usuario; reparte un mismo tercero entre
  varios procesos, que es justo lo que se quería evitar.

### Validado con 4 documentos internos + los externos previos
| Documento | Resultado | Ruta |
|---|---|---|
| Instructivo Radicación Facturas | IT-OP | `OP/IT_Instructivo_de_Trabajo/PROPIO` ✓ |
| Procedimiento Vinculación | PR-GR | `GR/PR_Procedimiento/PROPIO` ✓ |
| Formato Estudio Cupo EN BLANCO | FT-OP | `OP/FT_formato/PROPIO` ✓ |
| Estudio Cupo DILIGENCIADO | RG-OP | `OP/RG_Registro___Evidencia/901234567` ✓ |

**Los 4 correctos.** El par FT/RG validó las DOS ramas del cambio (PROPIO y NIT) de una vez.

### Cosmético: `RG_Registro___Evidencia` tiene 3 guiones bajos
Viene de `TIPOS[c.tipo].nombre.replace(/[^\w]/g, '_')` aplicado a "Registro / Evidencia":
cada carácter no alfanumérico (incluidos los espacios alrededor de la barra) se vuelve un
guion bajo. **Ya existía antes de estos cambios.** Si se quiere colapsar repeticiones, este
es el momento (antes de instalar corporativo), porque cambiaría nombres de carpetas ya
creadas.

---

## COBERTURA DE PRUEBAS DEL PROMPT — LO QUE YA SE EJERCITÓ (2026-08-28)

Hasta antes de esta ronda SOLO se habían probado documentos externos de terceros (todos
DE-GR). Ahora la cobertura es bastante mayor:
- **Tipos probados:** DE, PR, IT, FT, RG. (Faltan: MC, PL, CA, MZ, LG.)
- **Procesos probados:** GR, OP. (Faltan: GE, GC, CM, GF, JR, GH, TI, CI.)
- **Reglas ejercitadas con documentos realistas:** 1, 2, 3, 4, 5, 8.

### ⭐ REGLA 2 VALIDADA EN LAS DOS DIRECCIONES
El MISMO documento, con el MISMO título y el MISMO código interno (SGC-031), se clasificó
**FT con la tabla vacía** y **RG con la tabla diligenciada**. Es la distinción más fina del
prompt y el clasificador la resolvió sin ayuda.

### El clasificador reconoce el NIT propio de PSF
Los documentos internos traen "NIT 900.974.255-5" en el encabezado y NO fueron tratados
como documentos de tercero. `NITS_PROPIOS` cumple su función.

### NOTA DE MÉTODO: los códigos de los documentos de prueba son NEUTROS
Se usaron códigos tipo `SGC-014`, `SGC-027`, `SGC-031` en vez de los realistas
`PR-GR-001`. Un código realista le daría la respuesta al clasificador (el mismo error que
se cometió con el ejemplo dentro de la regla 8). Mantener este criterio en pruebas futuras.

---

## ⚠️ DESVIACIÓN DETECTADA EN LA REGLA 8 — PENDIENTE DE CORREGIR (2026-08-28)

**Patrón identificado:** la regla 8 se cumple bien, SALVO cuando el documento contiene el
nombre de una empresa en su CONTENIDO. Ahí el modelo lo arrastra al título.

Evidencia — mismo documento base, mismo encabezado, distinto contenido:
- Formato EN BLANCO → `FT-OP-001_V01_Formato-Estudio-De-Cupo_20260212.pdf` ✓ limpio
- Formato DILIGENCIADO → clave `RG|OP|901234567|ESTUDIO-CUPO-DISTRIBUIDORA-ANDINA`
  ← metió la razón social, contra lo que dice la regla

**Consecuencia práctica:** es el MISMO problema del Punto 3 por otra vía. Si mañana llega
una v2 de ese estudio de cupo y el modelo titula "Estudio-Cupo-Andina" o
"Estudio-Cupo-Distribuidora", las claves no colisionan y NO se versiona.

**Corrección propuesta** — agregar a la regla 8:
```javascript
    '   Si el documento contiene datos de una empresa o persona (nombre, razon social,',
    '   NIT), NO los incluyas en el titulo: esa informacion ya va en el codigo del',
    '   documento. Un formato diligenciado se titula igual que el formato en blanco.',
```
La última frase es la clave: da un criterio VERIFICABLE en vez de una prohibición
abstracta, y alinea el par FT/RG, que son el mismo documento en dos estados.

**NO SE APLICÓ TODAVÍA.** Razones: (a) el FT y el RG ya están archivados con los títulos
actuales, tocaría limpiar otra vez; (b) toda la sesión se trabajó con UN cambio a la vez y
eso es lo que permitió aislar cada problema. Aplicarlo junto con la revisión de reglas
pendiente con calidad, en una sola tanda.

---

## PRÓXIMOS PASOS (semana 1 cerrada — esto es lo que sigue)

### A. Decisiones que hay que llevar a calidad / al compañero
1. ~~VISIBILIDAD DE LO OBSOLETO~~ → **RESUELTO 2026-08-28.** Se mueve a `_OBSOLETOS` y se
   renombra con prefijo. Queda abierto solo el tema de los ORIGINALES sin marcar (ver
   sección de OBSOLESCENCIA) — comprobar buscando "Certificado" en Drive.
2. **HUECOS DE TRAZABILIDAD EN BITACORA** (ver Punto 7). No registra SIN_TEXTO, DUPLICADO,
   REVISAR ni las obsolescencias. Son justo los casos que requieren intervención humana.
3. **Las 3 cosas que Claude agregó por su cuenta** al bloque de reglas (ver CAMBIOS DE
   CÓDIGO): separación factoring OP vs gastos propios GF, regla 9 de determinismo, y la
   prohibición de LG para terceros.

### B. Procedimiento operativo que hay que escribir
4. **Instructivo de `01_EN_REVISION`**: alguien tiene que revisar esa carpeta con alguna
   periodicidad, reescanear a mejor calidad y devolver el documento a la bandeja. Sin eso,
   los escaneos malos se acumulan EN SILENCIO.

### C. Cambios de prompt pendientes (aplicar TODOS JUNTOS en una tanda)
5. **Corregir la DESVIACIÓN DE LA REGLA 8** (ver sección propia): el modelo mete la razón
   social en el título cuando el documento trae datos de una empresa adentro. Texto de la
   corrección ya redactado. Es el mismo riesgo del Punto 3 por otra vía.
6. Junto con lo anterior, revisar las 3 cosas del punto A.3.

### D. Deuda técnica menor (no bloquea nada)
7. **Corregir los 3 defectos menores** listados en la sección del Punto 3.
8. **Consistencia del campo ORIGEN** (ENT vs FON para el mismo tercero). Verificado que NO
   tiene consecuencias funcionales. Cosmético.
9. **Guiones bajos repetidos** en `RG_Registro___Evidencia`. Si se va a arreglar, hacerlo
   ANTES de instalar corporativo.
10. **Marcar también los ORIGINALES** cuando un documento queda obsoleto (hoy solo se
   mueve/renombra la copia archivada). Depende de si se mantiene `CONSERVAR_ORIGINAL = true`
   más allá del mes 3.

### E. Medición continua
11. **Volver a medir el Punto 6** tras unas semanas de operación real. La línea base actual
   (3 de 3 con el prompt nuevo) es una señal favorable, no una métrica.

### F. Y luego: PASO A CUENTA CORPORATIVA
Ver la sección de RECORDATORIOS más abajo. Lo crítico: NIT real de PFI, API key nueva,
instalación desde cero (los IDs de Config.gs no sirven), y trasladar los .gs YA
MODIFICADOS (Taxonomia.gs, Clasificador.gs, Nomenclatura.gs).

### PROCEDIMIENTO DE LIMPIEZA ENTRE CORRIDAS (importante)
Borrar SIEMPRE, o los residuos producen falsos hallazgos (pasó en la corrida 4):
1. Filas de APROBACIONES y de LISTADO_MAESTRO (dejar encabezados intactos — si se corren
   o renombran, el mapeo `C` falla en silencio).
2. Carpetas del árbol `02_ARCHIVO_CONTROLADO`.
3. **`01_EN_REVISION`** ← esta se olvidó durante toda la sesión y acumuló 12 archivos.
4. Carpeta de ORIGINALES (con `CONSERVAR_ORIGINAL = true` hay 2 archivos por documento).
5. `00_BANDEJA_ENTRADA` por si quedó algo.
6. **Vaciar la papelera de Drive** (por las huellas MD5).
BITACORA se puede dejar: nada la consulta para decidir y es el único registro histórico.

### Documentos de prueba ya generados (reutilizables)
Todos con NIT 901.234.567-7 (DISTRIBUIDORA ANDINA DE INSUMOS S.A.S., DV validado):
- `Certificado_Camara_Comercio_Distribuidora_Andina_v1.pdf` (exp. 12-mar-2026) y `_v2.pdf`
  (exp. 20-ago-2026). Textos casi idénticos, MD5 distintos. Para probar VERSIONAMIENTO.
- `Escaneado_Ilegible_Certificacion_Bancaria.pdf` — imagen pura, ilegible. Para SIN_TEXTO.
- `Escaneado_Regular_Certificacion_Bancaria.pdf` — imagen pura pero legible. Control de
  que SIN_TEXTO discrimina por calidad + prueba de que la regla 8 generaliza.

Documentos INTERNOS de PSF (sin NIT de tercero, prueban el fallback `PROPIO`):
- `PSF_Procedimiento_Vinculacion_Clientes.pdf` → PR-GR
- `PSF_Instructivo_Radicacion_Facturas.pdf` → IT-OP
- `PSF_Formato_Estudio_Cupo_EN_BLANCO.pdf` → FT-OP
- `PSF_Estudio_Cupo_Distribuidora_Andina_DILIGENCIADO.pdf` → RG-OP + NIT 901234567
  (los dos últimos son el par que valida la REGLA 2)

---

## CAMBIOS DE CÓDIGO YA HECHOS (respecto a los archivos originales del compañero)

### Taxonomia.gs — NIT comodín para PFI
Se agregó una tercera entrada a NITS_PROPIOS. El bloque quedó así:

```javascript
const NITS_PROPIOS = {
  '9009742555': 'PSF',
  '9020741441': 'EQM',
  '9999999999': 'PFI'   // COMODIN — NO es un NIT real.
                         // Reemplazar por el NIT verdadero de Progresa Soluciones
                         // Financieras Internacionales S.A. ANTES de instalar en
                         // la cuenta corporativa.
};
```
Motivo: ORIGENES incluye PFI pero NITS_PROPIOS no tenía su NIT (sin él, el sistema no
puede autocorregir el origen por NIT para documentos de PFI). 9999999999 es seguro como
comodín: 10 dígitos (pasa el formato), ningún NIT real es diez nueves, y el código no
valida el dígito de verificación de las llaves de NITS_PROPIOS. **PENDIENTE: conseguir el
NIT real de PFI y reemplazarlo antes de la instalación corporativa.**

### Nomenclatura.gs — `claveLogica()` normalizada (2026-08-28) ⭐ CAMBIO CLAVE
**Este es el cambio que hizo funcionar el versionamiento (Punto 3).** El título entraba a
la clave vía `aKebab()` SIN filtrar palabras vacías, mientras `similitudTitulos()` sí las
filtraba vía `tokensDe()`. Se eliminó esa asimetría haciendo que la clave use `tokensDe()`,
que YA existía en el código y YA tenía su lista `PALABRAS_VACIAS`.

```javascript
function claveLogica(c) {
  var toks = tokensDe(c.titulo);
  var out = '';
  for (var i = 0; i < toks.length; i++) {
    var cand = out ? out + '-' + toks[i] : toks[i];
    if (cand.length > 60) break;
    out = cand;
  }
  if (!out) out = (toks[0] || 'SIN-TITULO').slice(0, 60);
  return [c.tipo, c.proceso, c.nit || 'PROPIO', out.toUpperCase()].join('|');
}
```
El bucle replica el truncado por PALABRAS COMPLETAS de `aKebab()` (no usar `slice(0,60)`
directo: cortaría a mitad de palabra y dos títulos distintos podrían colisionar).
`aKebab()` NO se tocó: se sigue usando para el nombre visible del archivo, donde sí
queremos las preposiciones porque lo lee un humano.
NOTA: `Nomenclatura.gs` estaba marcado como "no tocar" en la doc del compañero; la
decisión de modificarlo la tomó el usuario conscientemente.

### Indice.gs — `marcarObsoletos()` mueve y renombra (2026-08-28)
Antes solo escribía OBSOLETO en la hoja. Ahora además mueve el archivo a `_OBSOLETOS`
dentro de su carpeta actual y le antepone el prefijo `OBSOLETO_`.

```javascript
function marcarObsoletos(fileIds) {
  if (!fileIds || !fileIds.length) return 0;

  var hoja = SpreadsheetApp.openById(CONFIG.INDEX_SHEET_ID)
                           .getSheetByName(CONFIG.INDEX_SHEET_NAME);
  var datos = hoja.getDataRange().getValues();
  var colFile = datos[0].indexOf('FILE_ID');
  var colEst = datos[0].indexOf('ESTADO');
  var n = 0;

  for (var i = 1; i < datos.length; i++) {
    if (fileIds.indexOf(datos[i][colFile]) === -1) continue;
    if (datos[i][colEst] !== 'VIGENTE') continue;

    // 1) La marca en la hoja va PRIMERO: es la fuente de verdad y no debe
    //    perderse si Drive falla.
    hoja.getRange(i + 1, colEst + 1).setValue('OBSOLETO');
    n++;

    // 2) Mover y renombrar es best-effort: si falla, se registra y se sigue.
    try {
      var f = DriveApp.getFileById(datos[i][colFile]);
      var padres = f.getParents();
      if (padres.hasNext()) {
        var actual = padres.next();
        if (actual.getName() !== '_OBSOLETOS') {
          var it = actual.getFoldersByName('_OBSOLETOS');
          var destino = it.hasNext() ? it.next() : actual.createFolder('_OBSOLETOS');
          if (f.getName().indexOf('OBSOLETO_') !== 0) {
            f.setName('OBSOLETO_' + f.getName());
          }
          moverA(f, destino);
        }
      }
    } catch (e) {
      bitacora('ERROR', String(datos[i][colFile]), 'No se pudo mover a _OBSOLETOS: ' + (e.message || e));
    }
  }
  return n;
}
```
**Decisiones de diseño, para que no se deshagan sin querer:**
- La escritura en la hoja va ANTES del movimiento en Drive. Si DriveApp falla por permisos
  o cuota, el estado OBSOLETO queda registrado igual. Al revés se perdería la marca, que
  es lo único que sostiene la trazabilidad.
- El `try/catch` es PROPIO, no delega en el de `ejecutarDecisiones()`. Si dejara subir la
  excepción, el catch de arriba abortaría el resto del bucle y quedarían documentos a medio
  marcar. Así cada archivo falla por separado y queda en la bitácora.
- `_OBSOLETOS` se crea dentro del padre ACTUAL del archivo, no en una ruta calculada. Así
  funciona sin importar dónde esté archivado, incluso con la estructura vieja de 2 niveles.
- Dos guardas de idempotencia: no vuelve a mover si ya está en `_OBSOLETOS`, y no duplica
  el prefijo. Sin ellas, una reejecución daría `OBSOLETO_OBSOLETO_...`.

### Motor.gs — `carpetaDestino()` con nivel de NIT (2026-08-28)
Se agregó un tercer nivel al árbol: `{PROCESO}/{TIPO}/{NIT}`. Antes eran dos niveles y los
documentos de todos los terceros se mezclaban en la misma carpeta de tipo.

```javascript
function carpetaDestino(c) {
  var raiz = DriveApp.getFolderById(CONFIG.ARCHIVO_ID);

  var nombreProc = PROCESOS[c.proceso].carpeta;
  var itProc = raiz.getFoldersByName(nombreProc);
  var proc = itProc.hasNext() ? itProc.next() : raiz.createFolder(nombreProc);

  var nombreTipo = c.tipo + '_' + TIPOS[c.tipo].nombre.replace(/[^\w]/g, '_');
  var itTipo = proc.getFoldersByName(nombreTipo);
  var tipo = itTipo.hasNext() ? itTipo.next() : proc.createFolder(nombreTipo);

  var nombreNit = String(c.nit || '').trim() || 'PROPIO';
  var itNit = tipo.getFoldersByName(nombreNit);
  return itNit.hasNext() ? itNit.next() : tipo.createFolder(nombreNit);
}
```
Notas: se nombraron las variables intermedias porque el original repetía la expresión del
tipo dos veces (en la búsqueda y en la creación), fácil de desincronizar. El fallback usa
`String(c.nit || '').trim() || 'PROPIO'` en vez de `c.nit || 'PROPIO'` por si el NIT llega
con espacios. NO cambia la nomenclatura ni `claveLogica()`; el versionamiento no se afecta.
**Los documentos archivados ANTES del cambio no se mueven solos.**

### Clasificador.gs — bloque de REGLAS DE DECISIÓN reescrito (2026-08-28)
En `construirPromptSistema()` se reemplazó el bloque completo de reglas (antes 8 reglas,
ahora 9). Cambios respecto al original del compañero:
- Regla 1: ahora prohíbe explícitamente LG para documentos de terceros (cerraba el hueco
  por el que se contradecía con la regla 4).
- Regla 4: separa documentos societarios PROPIOS de PSF (LG-JR) de los de TERCEROS (DE-GR).
- Regla 5: facturas/notas crédito/débito/cuentas de cobro de terceros SIEMPRE RG, nunca DE.
  Además separa facturas de factoring (OP) de facturas de proveedores por gastos propios (GF).
- Regla 8: reescrita para titulación estable. **Versión FINAL aplicada** (ancla única en
  el acto/trámite, no en el membrete):

```javascript
    '8. TITULO: usa el nombre del ACTO O TRAMITE que el documento certifica, acredita o',
    '   documenta. El titulo describe lo que el documento ES, nunca quien lo emite.',
    '   PROHIBIDO usar el nombre de la entidad emisora (camara de comercio, DIAN, banco,',
    '   notaria, aseguradora), la razon social de las partes, el NIT, la ciudad, la fecha',
    '   o el numero de radicado. Ejemplo: un documento expedido por una camara de comercio',
    '   que acredita la existencia y representacion legal de una sociedad se titula',
    '   "Certificado de Existencia y Representacion Legal", NUNCA "Certificado Camara de',
    '   Comercio". Maximo 6 palabras, sin tildes ni signos. El mismo documento debe',
    '   producir SIEMPRE el mismo titulo: no lo varies segun la fecha de expedicion, el',
    '   numero de recibo ni ningun otro dato variable del contenido.',
```
- Regla 9: NUEVA. Ante empate, preferir la regla de MENOR número. Solo para forzar
  determinismo, que es lo que la clave lógica necesita.

### probarAPI() — función temporal de diagnóstico
Se pegó al final de Instalador.gs para ver el mensaje de error real de la API (devolvía
400 = saldo insuficiente). Ya cumplió su función; SE PUEDE BORRAR para dejar el código
limpio. No hace daño si se deja.

---

## RECORDATORIOS PARA CUANDO PASE A LA CUENTA CORPORATIVA

- NO es migración de datos, es una **instalación nueva**. Los IDs guardados en Config.gs
  (RAIZ_ID, INBOX_ID, etc.) son de archivos del Drive PERSONAL; no sirven en corporativo.
- Lo que SÍ se traslada es el CÓDIGO (los 8 .gs con los ajustes que haya hecho a
  Taxonomia.gs y Clasificador.gs durante las pruebas).
- Generar una **API key NUEVA** para corporativo (separada de la de pruebas, para no
  mezclar gasto ni trazabilidad).
- **Reemplazar el NIT comodín 9999999999 por el real de PFI** en Taxonomia.gs.
- Las Etiquetas de Drive (sección opcional) SÍ se pueden probar en corporativo porque
  requieren Consola de Administración de Workspace (la cuenta personal no la tiene). Si
  LABEL_ID queda vacío, el sistema omite ese paso en silencio, sin romper nada.
- En corporativo, recargar créditos pensando en el rango $5–15/mes que estimó el compañero
  (100 docs/día con Haiku), más un colchón.

---

## DATOS CLAVE DEL PROYECTO

- **Config.gs** es el único archivo de edición rutinaria. Valores actuales relevantes:
  ALERT_EMAIL = 'diego@progresasf.com', MODELO = 'claude-haiku-4-5-20251001',
  MAX_LOTE = 15, CONSERVAR_ORIGINAL = true (NO cambiar a false hasta el mes 3: mientras
  esté en true, todo error es reversible).
- **Taxonomia.gs** es el archivo de datos donde se ajusta la taxonomía (10 tipos, 10
  procesos). Tipos válidos: MC, PL, CA, PR, IT, FT, RG, MZ, DE, LG. Procesos: GE, GC, CM,
  OP, GR, GF, JR, GH, TI, CI. (OJO: OP es un PROCESO, no un tipo — me confundí una vez.)
- **Funciones útiles en el editor:** instalarSistema() (una sola vez), diagnostico()
  (revisa 6 cosas), analizarBandeja() (fase 1: propone), ejecutarDecisiones() (fase 2:
  aplica lo aprobado), resumenDiario() (correo).
- **Estados en APROBACIONES:** PENDIENTE (confiable), REVISAR (conviene revisar),
  EJECUTADO (ya archivado), y novedades: DUPLICADO, SIN_TEXTO, NO_CLASIFICADO.
- **Nomenclatura:** interno = TIPO-PROCESO-NNN_Vxx_Titulo_AAAAMMDD ;
  tercero = TIPO-PROCESO-ORIGEN-NIT-NNN_Vxx_Titulo_AAAAMMDD. Cada tercero numera desde 001.

---

## ARCHIVOS DEL PROYECTO (los que subió el compañero)

- Taxonomia.gs — datos: tipos, procesos, orígenes, NITs propios, reglas. (EDITABLE)
- Config.gs — configuración. (EDITABLE a mano)
- Nomenclatura.gs — arma y parsea nombres + `claveLogica()` y `aKebab()`.
  (YA MODIFICADO 2026-08-28: `claveLogica()` normalizada. Ver CAMBIOS DE CÓDIGO.)
- Clasificador.gs — prompt + validador + llamada a la API. (ajustar solo REGLAS)
- Indice.gs — consecutivos, versiones, similitud, duplicados, `marcarObsoletos()`.
  (YA MODIFICADO 2026-08-28: mueve y renombra obsoletos. Ver CAMBIOS DE CÓDIGO.)
- Extractor.gs — lectura y OCR. (no tocar)
- Motor.gs — orquesta el flujo con aprobación + `carpetaDestino()`.
  (YA MODIFICADO 2026-08-28: nivel de NIT en las rutas. Ver CAMBIOS DE CÓDIGO.)
- Instalador.gs — crea todo + diagnostico(). (no tocar)
- pruebas.js / fuzz.js — pruebas locales de Node. NO van en Apps Script.


# ANEXO DE CONTEXTO — Sesión del 31 de agosto de 2026

> Este documento se agrega al final de `CONTEXTO_PSF-GED.md`. No lo reemplaza.

---

## 1. RESULTADO PRINCIPAL

**El ciclo completo de versionamiento quedó probado de punta a punta.** Era el
pendiente abierto desde el 28 de agosto.

Evidencia en LISTADO_MAESTRO:

| CODIGO | V | ESTADO | HUELLA | CLAVE_LOGICA |
|---|---|---|---|---|
| RG-GR-PSF-901234567-001 | V01 | OBSOLETO | 0410687c… | `RG\|GR\|901234567\|ESTUDIO-CUPO` |
| RG-GR-PSF-901234567-001 | V02 | VIGENTE | 80371aee… | `RG\|GR\|901234567\|ESTUDIO-CUPO` |
| FT-GR-001 | V01 | VIGENTE | b679de52… | `FT\|GR\|PROPIO\|ESTUDIO-CUPO` |

El V1 y el V2 comparten clave lógica y consecutivo; el FT no colisiona con
ellos porque difiere en TIPO y NIT. El V1 se movió a `_OBSOLETOS` con el
prefijo `OBSOLETO_`.

---

## 2. CAMBIOS DE CÓDIGO APLICADOS HOY

### 2.1 `Clasificador.gs`

**(a) Esquema de la herramienta, campo `titulo`.** Hallazgo importante: la
descripción del campo **contradecía directamente la regla 8**. Traía como
ejemplo a seguir `"Certificado Camara Comercio"`, que es exactamente el título
que la regla 8 prohíbe, y fijaba un máximo de 8 palabras contra las 6 de la
regla. La descripción nueva usa el ejemplo correcto, unifica el límite en 6 y
—lo más relevante— **redirige la razón social al campo `razonSocial`**, en vez
de pedir que se suprima. Mover un dato de casilla se obedece mejor que
suprimirlo.

**(b) Regla 8, reescrita en tres apartados**, cada uno con su ejemplo trabajado
(la estructura que ya había demostrado generalizar):
- (a) prohíbe el emisor, la ciudad, la fecha y el radicado
- (b) prohíbe la razón social y el NIT del sujeto del documento
- (c) prohíbe empezar el título con "Formato", "Formulario" o "Plantilla"
  ("Registro" se dejó permitido a propósito: "Registro de Asistencia" es un
  título legítimo)

**(c) Reglas 3 y 5** — ver decisión en la sección 3.

### 2.2 `Indice.gs` — función nueva `casiColisiones()`

Detecta documentos del mismo tercero con título equivalente pero **distinto
TIPO o PROCESO**, que es el caso en que el sistema creaba un documento nuevo
en silencio.

Hallazgo: `documentosSimilares()` ya era el detector de casi-colisión que hacía
falta, pero **exigía que TIPO y PROCESO coincidieran**, así que descartaba
justo este caso. Se dejó intacta —su propósito es otro: variaciones de título
dentro de una misma clasificación— y se añadió la función complementaria.

Probada con 13 casos automáticos (`prueba_casicolisiones.js`), con énfasis en
falsos positivos. El par FT/RG no dispara porque el FT en blanco no lleva NIT.
Cubre también el caso LG-JR contra DE-GR previsto el 28-ago.

### 2.3 `Motor.gs` — cableado en `procesarUno()`

Cuando hay conflicto: escribe la nota, fuerza `ESTADO = REVISAR` y registra un
evento `CONFLICTO` en BITACORA.

La nota indica **corregir TIPO y PROCESO en la fila**, no escribir `VERSION_DE`.
Motivo: `VERSION_DE` responde con instrucciones sobre el título, que en este
caso ya coincide. Corregir las celdas sí funciona porque `aplicarArchivado()`
reconstruye la clasificación leyendo la hoja. La nota ofrece también la salida
contraria ("si de verdad son distintos, apruebe sin cambios") para no bloquear
al operador.

---

## 3. DECISIÓN TOMADA: EL ESTUDIO DE CUPO VA A GR

### Cómo se detectó

El V2 se clasificó como **RG-GR** mientras el V1 era **RG-OP**. Sin colisión de
clave, sin versionamiento. Tres corridas dieron GR con confianza 0,95: el
comportamiento era **estable, no errático** — la peor forma del fallo, porque
reintentar lo confirma en vez de revelarlo.

La justificación del modelo citó la regla textualmente: *"Va a GR por ser
evaluación de riesgos y conocimiento del cliente (debida diligencia)"*.

### Causa raíz

Dos reglas se contradecían y **ambas estaban bien escritas**:
- Regla 3: todo lo de *conocimiento del cliente* va a GR
- Regla 5: los *estudios de cupo* van a OP

Un estudio de cupo es literalmente conocimiento del cliente. La contradicción
existía desde el diseño; solo se activó cuando llegó un documento con
suficiente lenguaje de riesgo. **Que el V1 cayera en OP fue suerte, no
corrección.** Y la regla 9 (desempate por número menor) resolvió el choque a
favor de la 3 con determinismo perfecto, en la dirección no deseada.

### Decisión

**El Estudio de Cupo pertenece a GR**, plantilla en blanco y diligenciados.
Fundamento: lo elabora el Analista de Riesgos, lo revisa el Director de Riesgos
y lo aprueba el Comité de Riesgos (numerales 4.4 y 5.3 — el registro reside en
el proceso que responde por él, y las auditorías del 9.2 se planifican por
proceso). Además mantiene íntegro el expediente del tercero, coherente con la
decisión del 28-ago sobre documentos societarios.

**Se descartó clasificar por palabra clave** ("todo lo que mencione riesgo").
Motivo: institucionaliza la causa raíz —la clasificación dependería del
vocabulario ocasional de cada documento— y su alcance sería inmanejable, porque
contratos de factoring, estados financieros y pólizas mencionan riesgos de
forma habitual. En su lugar, **lista cerrada por clase documental** con
advertencia expresa contra el criterio de vocabulario.

### Nota sobre el origen de las reglas

Las reglas **no fueron definidas por el SGC**: las propuso una IA a partir de
ISO 9001 y del contexto de la compañía, y operan sin ratificación formal. El
numeral 5.3 exige responsabilidades asignadas, así que un cuerpo de reglas sin
dueño designado es una no conformidad potencial por sí mismo. Se preparó
`PSF-GED_Acta-Decision-Reglas-Clasificacion.pdf` (**pendiente de firma**), que
registra las decisiones, las alternativas evaluadas y los puntos abiertos.

---

## 4. HALLAZGOS NUEVOS, NO CORREGIDOS

**4.1 El ORIGEN no era cosmético.** El 28-ago se concluyó que el ENT/FON del
mismo tercero era inocuo, tras verificar que `carpetaDestino()` y
`claveLogica()` no usan el origen. **No se revisó `serieDe()`, que sí lo usa**:
`[tipo, proceso, origen, nit]`. Consecuencia: un mismo tercero inicia una
numeración nueva en 001 por cada origen distinto que el modelo le asigne. No
rompe la unicidad del código, pero contradice el criterio de diseño de una
numeración por tercero. Requiere decisión, no parche.

**4.2 `ORIGEN = PSF` con NIT de tercero.** El RG quedó
`RG-GR-**PSF**-901234567-001`. Es defendible (el documento es de PSF, sobre un
tercero), pero la nomenclatura de terceros usa ese campo para describir la
relación, y "PSF" no aporta ahí; lo esperable era `CLI`. **El validador no lo
detecta**: comprueba *origen de tercero sin NIT*, pero no el caso simétrico
—*origen propio con NIT que no está en `NITS_PROPIOS`*—.

**4.3 `NOMBRE_ARCHIVO` desactualizado al obsoletar.** `marcarObsoletos()`
renombra el archivo en Drive a `OBSOLETO_...` pero no actualiza la columna en
el índice. El `FILE_ID` sigue correcto, así que nada se rompe, pero el Listado
Maestro apunta a un nombre que ya no existe. Arreglo trivial (una celda más).

**4.4 Regla 6, ambigüedad latente.** Dice que los estados financieros de un
tercero *"(para estudio de cupo)"* son tipo RG, **pero no define el proceso**.
Ahora que el estudio de cupo es GR, sus soportes quedan en el aire: el modelo
puede mandarlos a GF una vez y a GR otra. Misma familia de fallo, esperando
turno. Recomendación: GR, para no fragmentar el expediente del cliente.
**Registrado en el acta como punto abierto.**

**4.5 El nombre del archivo llega al modelo.** `construirPromptUsuario()` envía
`nombreOriginal`. En las pruebas, "Distribuidora Andina" llegó por el nombre
del archivo además del cuerpo. No se saneó a propósito: en operación real los
nombres vienen así, y limpiarlos haría que la prueba pasara por construcción.
La regla 8(b) aguantó igual.

**4.6 Ventana entre propuesta y ejecución.** `aplicarArchivado()` recalcula el
consecutivo al ejecutar, pero **no vuelve a revisar conflictos**. No se cerró a
propósito: bloquear al ejecutar impediría aprobar a quien ya decidió que son
documentos distintos. Haría falta un mecanismo de "conflicto ya revisado", que
es diseño y no parche. Riesgo real bajo.

---

## 5. PENDIENTES ACTUALIZADOS

**Bloqueantes antes de la cuenta corporativa**
1. Firmar el acta de decisión (asigna el responsable que hoy no existe).
2. Resolver 4.1 y 4.2 (ORIGEN): cambia códigos ya asignados.
3. Resolver 4.4 (regla 6).
4. Guiones bajos de `RG_Registro___Evidencia`: cambia nombres de carpetas.
5. NIT real de PFI. **Agregarlo también a la regla 7 del prompt**, no solo a
   `Taxonomia.gs`, o el clasificador tratará a PFI como tercero.

**No bloqueantes**
6. Regla 9 (desempate por número): sustituirla por precedencias explícitas.
   Convierte el orden de redacción en jerarquía formal no diseñada como tal.
7. Huecos de BITACORA: no registra SIN_TEXTO, DUPLICADO, REVISAR ni
   obsolescencias. Hoy se añadió el evento `CONFLICTO`.
8. Originales sin marcar en la carpeta de originales.
9. `NOMBRE_ARCHIVO` al obsoletar (4.3).
10. Instructivo de revisión de `01_EN_REVISION`.
11. Guarda determinista en el validador: comparar `razonSocial` contra
    `titulo` y avisar si se filtra. Convertiría "el modelo casi siempre
    obedece" en "el sistema lo detecta siempre". Ojo con sufijos societarios.

---

## 6. LECCIONES DE MÉTODO DE ESTA SESIÓN

- **Buscar instrucciones que compitan, no solo instrucciones que falten.** La
  desviación de la regla 8 no venía de una prohibición débil sino de una
  instrucción contraria en el esquema de la herramienta, pegada al campo que el
  modelo rellenaba.
- **Un fallo estable es peor que uno intermitente.** Reintentar lo confirma en
  vez de revelarlo, y llega con confianza alta.
- **Leer `justificacion` antes de teorizar.** El campo ya existía y contenía la
  respuesta; ahorró varias hipótesis equivocadas.
- **No sanear el caso de prueba para que pase.** Se conservaron el nombre del
  archivo contaminado y el lenguaje de riesgo del V2.
- **Alinear el documento de prueba con el real.** El primer V2 generado traía
  otra fecha, otra versión de plantilla y otros datos de la empresa; habría
  invalidado la prueba.
- **Tres de los cuatro campos de la clave lógica son salida cruda del modelo.**
  Solo el título tiene normalización. TIPO y PROCESO entran sin filtro, y por
  eso son el próximo punto de fallo de la misma familia.


# ANEXO DE CONTEXTO — Sesión del 1 de septiembre de 2026

> Se agrega al final de `CONTEXTO_PSF-GED.md`. No reemplaza nada.

---

## 1. RESULTADO PRINCIPAL

**Se cerraron tres de los cinco bloqueantes para la cuenta corporativa**, todos
verificados en ejecución real, no solo en propuesta:

- **4.1 y 4.2 — ORIGEN.** La serie de numeración dejó de incluir el origen y el
  origen pasó a heredarse del tercero.
- **4.4 — Regla 6.** Los documentos contables de un tercero quedaron definidos
  como DE-GR; los propios, RG-GF.
- **Guiones bajos en nombres de carpeta.** Resultó ser cuatro tipos afectados,
  no uno.

El acta de decisión **se aplazó a la instalación corporativa por decisión del
usuario**; no se considera bloqueante para seguir probando en la personal.

**Único bloqueante que queda: el NIT real de PFI.**

---

## 2. PUNTO 2 — ORIGEN (4.1 + 4.2) — CERRADO

### Hallazgo que cambió el alcance del parche

`codigoDe()` era `serieDe(c) + '-' + NNN`. Es decir, **la serie de numeración y
el código visible eran la misma función**. Quitarle el ORIGEN a `serieDe()` para
arreglar el 4.1 se lo habría quitado también al código: `RG-GR-PSF-901234567-001`
habría pasado a `RG-GR-901234567-001`.

Eran dos responsabilidades distintas que coincidían por accidente. Se separaron:
la **serie** (llave con la que se cuentan los consecutivos) pierde el origen; el
**código** (lo que se lee) lo conserva. La nomenclatura no cambió.

### Decisión de fondo

**El ORIGEN es atributo del TERCERO, no del documento.** Mientras lo decidiera el
LLM documento por documento iba a ser inestable por construcción, igual que el
título antes del Punto 3. La cascada quedó:

```
NIT en NITS_PROPIOS      → origen de la tabla (comportamiento previo)
NIT en ORIGENES_TERCEROS → escotilla manual, tiene prioridad
NIT ya en el MAESTRO     → hereda el origen de la fila MÁS ANTIGUA
NIT nuevo                → acepta el propuesto y queda fijado
```

Se prefirió *la fila más antigua* sobre *el origen más frecuente* porque el
segundo cambia de respuesta según lo que llegue después, que es justo la
inestabilidad que se quería eliminar.

### Dónde se resolvió, y por qué ahí

**Dentro de `validarClasificacion()`**, no en el Motor. Razones:
- El validador ya contenía la regla hermana ("el NIT propio manda sobre lo que
  diga el modelo"); la herencia es la misma clase de regla.
- Resuelve un problema de orden: si la cascada corriera después del validador,
  la guarda del 4.2 marcaría REVISAR por un origen que la herencia iba a
  corregir un paso más adelante.
- El índice entra por `ctx`, que es **opcional**. Sin él la función sigue siendo
  pura y `pruebas.js` / `fuzz.js` no cambian.

### Consecuencia aceptada a conciencia

La herencia se aplica **también al ejecutar**, así que si el operador edita la
celda ORIGEN a mano, la corrección se pierde al aprobar. Es deliberado: el punto
del cambio es que el origen deje de decidirse documento a documento. La salida
existe y es explícita (`ORIGENES_TERCEROS`), y a diferencia de la celda es
permanente y queda a la vista. **Debe quedar escrito en el instructivo.**

### Verificación en producción

| Documento | ORIGEN propuesto | ORIGEN final | Código |
|---|---|---|---|
| Certificado cámara v1 | ENT | ENT | `DE-GR-ENT-901234567-001` V01 → OBSOLETO |
| Certificado cámara v2 | ENT | ENT | `DE-GR-ENT-901234567-001` V02 VIGENTE |
| Certificación bancaria | **FON** | **ENT** (heredado) | `DE-GR-ENT-901234567-**002**` V01 |

Nota registrada en APROBACIONES: *"ORIGEN ajustado a ENT (ya registrado para
este tercero); el clasificador había propuesto FON."* Nombre final idéntico al
propuesto, o sea que el recálculo al aprobar dio lo mismo.

⚠️ **La corrida de los dos certificados (V01 → V02, consecutivo 001) NO prueba
el 4.1.** Ambos salían con origen ENT, así que la serie vieja y la nueva daban
lo mismo; es prueba de regresión. La que cierra el 4.1 es la certificación
bancaria, que antes reiniciaba en 001 por venir con FON.

---

## 3. PUNTO 3 — REGLA 6 — CERRADA

### Dos hallazgos que no estaban en el 4.4

**(a) El tipo RG de la regla 6 peleaba con la regla 1.** La regla 1 da el
criterio: DE si acredita un estado o condición, RG si es evidencia de una
operación. Unos estados financieros de tercero acreditan una condición → DE. La
regla 6 decía RG. Y la regla 9 desempata a favor del número menor, o sea que
**la regla escrita decía RG mientras el modelo probablemente ya producía DE**.
Un desacuerdo entre la regla y el comportamiento real es peor que cualquiera de
los dos por separado.

**(b) La regla 3 decía lo contrario.** Su última frase era *"Un contrato de
factoring, una factura o unos estados financieros NO pasan a GR por mencionar
riesgos"*. Bien intencionada —ataca el criterio de vocabulario— pero un modelo
que lee rápido ve "estados financieros … NO pasan a GR". Era una instrucción
contraria pegada al caso, el mismo error del 31-ago con el esquema de la
herramienta.

### Qué quedó

- **Regla 6 reescrita**: partición por dueño, no por propósito. Propio (PSF, EQM,
  PFI) → RG-GF. Tercero → DE-GR con su NIT. Misma partición de las reglas 4 y 5,
  así el modelo ve un patrón repetido en vez de tres criterios distintos.
- Se eliminó el paréntesis *"(para estudio de cupo)"*: **el propósito es un
  criterio no verificable leyendo el documento**, igual que el vocabulario.
  La cláusula final lo dice expresamente: *decide de quién es el documento,
  nunca para qué se usó*.
- **Regla 3**: se quitó "estados financieros" de sus ejemplos y se agregó un
  puntero explícito a la regla 6.

### Validación (par de documentos, dos ramas de una pasada)

| Documento | Resultado | Confianza |
|---|---|---|
| Estados financieros de Distribuidora Andina | `DE-GR-ENT-901234567-003_V01_Estados-Financieros-Comparativos` | 0,95 |
| Estados financieros de PSF | `RG-GF-001_V01_Estados-Financieros-Comparativos` | 0,95 |

Rutas confirmadas en Drive: `GR/DE_Documento_Externo/901234567` y
`GF/RG_Registro_Evidencia/PROPIO`.

**Dos victorias colaterales:**
- **La regla 8(b) aguantó.** El título salió sin "Distribuidora Andina" pese a
  que el nombre estaba en el encabezado, en el cuerpo y en el nombre del
  archivo. La razón social fue a su campo.
- **La cláusula anti-vocabulario de la regla 3 funcionó.** El estado financiero
  de PSF trae una nota entera de gestión de riesgos, con Comité de Riesgos
  incluido, y aun así fue a GF. Ese era el caso que discriminaba de verdad, y se
  puso a propósito.

---

## 4. PUNTO 4 — GUIONES BAJOS — CERRADO (era más grande de lo anotado)

`TIPOS[c.tipo].nombre.replace(/[^\w]/g, '_')` — **`\w` es ASCII, así que las
tildes también se convertían en guion bajo.** No era solo el `RG_Registro___Evidencia`:

| Tipo | Antes | Ahora |
|---|---|---|
| PL | `PL_Pol_tica` | `PL_Politica` |
| CA | `CA_Caracterizaci_n_de_Proceso` | `CA_Caracterizacion_de_Proceso` |
| RG | `RG_Registro___Evidencia` | `RG_Registro_Evidencia` |
| LG | `LG_Documento_Legal___Societario` | `LG_Documento_Legal_Societario` |

Cuatro tipos, no uno. PL y CA nunca se habían ejercitado, así que el defecto
estaba esperando a la primera política o caracterización. **No era cosmético:
era un nombre de carpeta corrupto en un sistema documental de calidad.**

Se corrigió en `carpetaDestino()` usando `normalizarTexto()`, que ya existía.
**Se descartó cambiar el texto de `TIPOS[].nombre`** en `Taxonomia.gs` por dos
razones: ese campo alimenta también la lista de tipos del prompt (sería un
cambio de prompt disfrazado de cambio de carpeta), y dejaría el generador roto
para el próximo tipo que alguien agregue con tilde.

Verificado en Drive con PL y CA, los dos tipos que tenían la tilde corrupta.

---

## 5. CAMBIOS DE CÓDIGO APLICADOS HOY

### `Taxonomia.gs`
- Tabla nueva `ORIGENES_TERCEROS = {}` (escotilla manual, prioridad sobre la
  herencia). Agregada al `module.exports`.

### `Indice.gs`
- `esSerieDeTercero(c)` — condición compartida, antes repetida en tres sitios.
- `serieDe(c)` — **sin ORIGEN**: `[tipo, proceso, nit]`.
- `codigoDe(c, n)` — **con ORIGEN**, ya no derivado de `serieDe()`.
- `serieDeFila(f)` — deja de pasar el origen.
- `origenRegistrado(nit, indice)` — nueva. Devuelve el origen de la fila más
  antigua de ese NIT. Considera **todas** las filas, incluidas OBSOLETO y
  ANULADO: el código con ese origen ya se emitió y puede existir en Drive.

### `Clasificador.gs`
- Bloque de herencia del ORIGEN dentro de `validarClasificacion()`, con guarda
  `ctxSeguro.indice` que preserva la pureza.
- Guarda simétrica del 4.2: origen propio (PSF/EQM/PFI) con NIT que no está en
  `NITS_PROPIOS` → aviso + `requiereRevision`. No lo vuelve error.
- Reglas 3 y 6 reescritas (ver sección 3).

### `Nomenclatura.gs`
- `construirNombre()` ahora usa `raiz = codigoDe(c, consecutivo)` en vez de
  rearmar la raíz por su cuenta. **El código ES el prefijo del nombre**; tenerlo
  escrito dos veces era el mismo riesgo que acabábamos de encontrar en
  `serieDe`/`codigoDe`. La dependencia hacia `Indice.gs` ya existía vía
  `tokensDe()` en `claveLogica()`.

### `Motor.gs`
- `procesarUno()`: pasa `indice` al validador.
- `aplicarArchivado()`: `leerIndice()` **subió por encima** de la validación (el
  validador lo necesita para heredar); se pasa al validador y se reutiliza para
  el consecutivo.
- `aplicarArchivado()`: escribe de vuelta el ORIGEN resuelto en la hoja si la
  herencia lo cambió, para que la fila no quede mintiendo.
- `carpetaDestino()`: normalización del nombre de carpeta (ver sección 4).

### `Config.gs`
- `const PAUSADO = false;` **fuera** del objeto `CONFIG`, como constante suelta.
  Interruptor de mantenimiento; las dos funciones de `Motor.gs` empiezan con
  `if (PAUSADO) return;` **antes** de `cargarConfig()`.
  Va fuera de `CONFIG` porque dentro sería un valor de aspecto configurable que
  `cargarConfig()` ni siquiera lee.

---

## 6. ESTADO DE LAS PRUEBAS

Las tres suites en verde contra el código parcheado:

| Suite | Resultado |
|---|---|
| `pruebas.js` | **133 pasadas, 0 fallidas** |
| `fuzz.js` | 20.000 clasificaciones + 5.000 textos basura, **0 excepciones, 0 invariantes violados** |
| `prueba_origen.js` (**nueva**) | **35 ok, 0 fallas** |

### Cómo correrlas (esto costó tiempo)
Los scripts hacen `path.join(__dirname, '../src', f)`. **Exigen esta estructura:**

```
proyecto/
  src/     ← los .gs (los 5 + Instalador.gs)
  test/    ← pruebas.js, fuzz.js, prueba_origen.js
```

Desde `proyecto/`: `node test/pruebas.js`. Con todo suelto en una carpeta falla
con ENOENT antes de ejecutar nada. La sección 13 de `pruebas.js` además lee
`Instalador.gs`; sin él se pierden 5 pruebas.

### ⚠️ Las 133 NO cubren la herencia
`pruebas.js` y `fuzz.js` nunca pasan `indice`, así que el `&&` de la guarda
corta antes y **el camino de la herencia no se ejercita jamás**. Quien lo cubre
es `prueba_origen.js`. **No son redundantes: hay que correr las tres.**

(De paso: la predicción de que `pruebas.js` fallaría con ReferenceError por no
conocer `ORIGENES_TERCEROS` resultó equivocada, por esa misma guarda.)

---

## 7. PROCEDIMIENTO DE MANTENIMIENTO (probado hoy)

1. **`PAUSADO = true`** y esperar a que pase el cuarto de hora en curso.
   ⚠️ Este paso no estaba en el procedimiento de limpieza anterior y es el
   riesgo más fácil de pasar por alto: un disparador a mitad del cambio procesa
   documentos con medio código viejo y medio nuevo.
2. Correr las tres suites en local.
3. Limpieza completa (los 6 pasos del procedimiento anterior, incluidas
   `01_EN_REVISION` y la papelera de Drive).
4. Pegar los `.gs`. **NUNCA volver a correr `instalarSistema()`**: crearía otro
   árbol y otra hoja, y los IDs de `Config.gs` quedarían apuntando a otro lado.
5. `diagnostico()`.
6. `PAUSADO = false`.
7. Prueba de humo.

**Si se prefiere borrar los activadores en vez de usar `PAUSADO`:** recrearlos
es ejecutar `crearDisparadores()` desde el editor, que los deja exactamente como
estaban. Ojo: esa función **borra todos los disparadores del proyecto** antes de
crear los tres.

**Orden entre limpieza y pegado:** da igual mientras los disparadores estén
apagados.

**Un cambio a la vez.** El parche del ORIGEN es determinista (consecutivos y
códigos); la regla 6 depende del juicio del modelo. Se probaron por separado a
propósito.

---

## 8. HALLAZGOS NUEVOS, NO CORREGIDOS

**8.1 MC, PL y CA no tienen regla — EL MÁS SERIO.** Las nueve reglas no los
mencionan ni una vez. Evidencia de hoy:

- Caracterización → **OP**, justificada *por el proceso que describe*.
- Política de Calidad → **GE**, justificada *por quién la emite* (Alta Dirección).

Los dos son defendibles y **usan criterios distintos**. Con el criterio de la
caracterización, la política iría a GC; con el de la política, la caracterización
también iría a GC porque la emite Calidad. Confianza 0,98 y 0,99: el modelo está
improvisando con seguridad alta, que es el patrón de *fallo estable* del 31-ago.
Como `claveLogica()` incluye el PROCESO, el día que llegue la v2 de esa política
y caiga en GC, **no versiona**. Son además los tipos más visibles en auditoría.

**8.2 ENT vs CLI: la tabla `ORIGENES` mezcla dos ejes.** La herencia congeló
`ENT` para Distribuidora Andina, heredado del certificado de cámara de comercio,
donde el modelo miró **quién emite**. Pero Andina es un **cliente**: `CLI`. El
modelo propuso CLI en los estados financieros y el sistema lo sobrescribió.

La causa está en las descripciones de `ORIGENES`, que son *del documento*
("Documento de una entidad pública o de control", "Documento de un cliente"),
mientras la decisión de esta semana trata el campo como *atributo del tercero*.
Dos ejes conviviendo en un solo campo: el modelo puede dar ENT o CLI para el
mismo tercero sin equivocarse en ninguno de los dos marcos. **La herencia
funcionó como se diseñó; lo que está mal definido es el campo.**

Tres salidas: (a) dejarlo —el origen ya no afecta serie ni clave lógica—;
(b) fijar `ORIGENES_TERCEROS['901234567'] = 'CLI'`, que cambia códigos ya
emitidos; (c) redefinir `ORIGENES` para que describa la relación con el tercero.
La (c) es lo correcto de fondo y **es decisión de taxonomía: va al acta.**

**8.3 "Comparativos" en el título.** Salió `Estados-Financieros-Comparativos`.
"Comparativos" es un **descriptor variable**: el año entrante pueden venir como
"Individuales" o "Consolidados" y las claves no colisionan → no versiona. Es el
riesgo del Punto 3 por una vía nueva. Red de seguridad: `documentosSimilares()`
da 0,67 entre las variantes, sobre el umbral de 0,6, así que avisaría y forzaría
REVISAR — pero eso es revisión manual cada año en vez de versionamiento
automático. Corrección: extender la regla 8 para prohibir calificativos de
alcance o periodicidad (comparativos, individuales, consolidados, mensual,
anual), por la misma razón que ya prohíbe la fecha.

**8.4 El esquema vuelve a ser más estricto que la regla 8.** El campo `titulo`
del esquema dice *"ni la palabra del tipo documental"*, pero la regla 8(c) solo
prohíbe "Formato", "Formulario" y "Plantilla". El modelo siguió la 8(c) y trató
la lista como cerrada: salieron "Politica de Calidad" y "Caracterizacion Proceso
Operaciones Factoring". **Aquí la regla 8(c) tiene razón** —quitarle "Politica"
al título dejaría "Calidad", que no sirve—, así que **lo que hay que ajustar es
el esquema, no la regla.** Es la misma pareja que se corrigió el 31-ago, con una
discrepancia distinta: conviene revisarlos siempre juntos.

**8.5 `CONFIG.MODELO` no se usa.** `clasificarConIA()` tiene
`'claude-haiku-4-5-20251001'` escrito directo en el payload. Los dos valores
coinciden, así que no hay efecto hoy, pero es **una palanca que aparenta
funcionar y no funciona** — va a morder el día que se quiera probar otro modelo
en corporativo. Se arregla con `model: CONFIG.MODELO`.

**8.6 La versión del documento no es la versión del sistema.** La política dice
"Versión 2" en su encabezado y trae tabla de control de cambios, pero el sistema
la archivó como `_V01_` porque la versión la lleva el índice. Es **correcto**
según el 7.5.3, pero produce un archivo `_V01_` cuyo contenido dice "Versión 2".
**A un auditor le va a llamar la atención: debe quedar explicado en el
instructivo.**

---

## 9. PENDIENTES ACTUALIZADOS

**Bloqueantes antes de la cuenta corporativa**
1. ~~Firmar el acta~~ → **aplazada a corporativo por decisión del usuario.**
2. ~~Resolver 4.1 y 4.2 (ORIGEN)~~ → **CERRADO.**
3. ~~Resolver 4.4 (regla 6)~~ → **CERRADO.**
4. ~~Guiones bajos~~ → **CERRADO** (y eran 4 tipos, no 1).
5. **NIT real de PFI.** Único bloqueante vivo. Agregarlo también a la regla 7
   del prompt, no solo a `Taxonomia.gs`.

**No bloqueantes — prioridad alta**
6. **Regla para MC, PL y CA** (8.1). Decisión de taxonomía, va al acta.
7. **Redefinir `ORIGENES`** (8.2). Decisión de taxonomía, va al acta.

**No bloqueantes — tanda de prompt** (aplicar todos juntos)
8. Calificativos variables en el título (8.3).
9. Alinear el esquema de la herramienta con la regla 8 (8.4).
10. Regla 9 (desempate por número): sustituirla por precedencias explícitas.

**Deuda técnica menor**
11. `CONFIG.MODELO` sin usar (8.5).
12. Huecos de BITACORA: no registra SIN_TEXTO, DUPLICADO, REVISAR ni
    obsolescencias.
13. `NOMBRE_ARCHIVO` desactualizado al obsoletar (4.3). Arreglo de una línea
    dentro de `marcarObsoletos()`.
14. Originales sin marcar.
15. Guarda determinista `razonSocial` vs `titulo` en el validador.

**Documentación / instructivo**
16. Instructivo de revisión de `01_EN_REVISION`.
17. Explicar que el ORIGEN editado a mano se pierde al aprobar, y que la vía es
    `ORIGENES_TERCEROS` (sección 2).
18. Explicar por qué un documento que dice "Versión 2" se archiva como V01 (8.6).

---

## 10. DOCUMENTOS DE PRUEBA GENERADOS HOY

Todos con capa de texto real (no pasan por OCR) y **códigos internos NEUTROS**
(`SGC-048` a `SGC-051`), siguiendo el criterio del 28-ago de no darle la
respuesta al clasificador.

- `Estados_Financieros_Distribuidora_Andina_2025.pdf` → `DE-GR-ENT-901234567-003`
- `PSF_Estados_Financieros_2025.pdf` → `RG-GF-001`.
  **Lleva a propósito una nota completa de gestión de riesgos** (riesgo de
  crédito, de liquidez, de mercado, Comité de Riesgos) para probar que la
  cláusula anti-vocabulario de la regla 3 discrimina. Es el caso que decide.
- `PSF_Politica_Calidad.pdf` → `PL-GE-001`
- `PSF_Caracterizacion_Proceso_Operaciones.pdf` → `CA-OP-001`

Nota de diseño: para probar el nombre de las carpetas se eligieron documentos
con proceso inequívoco, para que un fallo de clasificación no enturbiara el
resultado. **Salió mal igual**: la política fue a GE y no a GC (ver 8.1).

---

## 11. LECCIONES DE MÉTODO DE ESTA SESIÓN

- **Leer el código real antes de escribir el parche.** El plan acordado
  (quitar el ORIGEN de `serieDe()`) habría roto la nomenclatura, porque
  `codigoDe()` derivaba de ahí. No se veía en el archivo de contexto, que
  describía las funciones pero no las mostraba.
- **Dos cosas que coinciden no son necesariamente la misma cosa.** `serieDe` y
  `codigoDe` coincidían por accidente y había que separarlas; `codigoDe` y la
  raíz de `construirNombre()` coincidían por identidad genuina y había que
  unirlas. La pregunta no es si coinciden hoy, sino si *deben* coincidir siempre.
- **Verificado en propuesta no es verificado en ejecución** (criterio del
  28-ago, aplicado otra vez hoy con la certificación bancaria).
- **Una prueba que pasa no siempre prueba lo que uno cree.** Los dos
  certificados dieron V01→V02 con consecutivo 001, pero ambos traían ENT: el
  resultado se habría obtenido igual sin el parche.
- **Poner la trampa en el caso de control.** El estado financiero de PSF llevaba
  lenguaje de riesgo a propósito; sin eso, el par no habría probado nada sobre
  la regla 3.
- **Buscar el defecto completo, no el reportado.** El hallazgo decía "guiones
  bajos repetidos en RG"; el defecto real eran las tildes en cuatro tipos.
- **Arreglar el generador, no el dato.** Cambiar `TIPOS[].nombre` habría
  arreglado RG y dejado roto el próximo tipo con tilde — además de ser un cambio
  de prompt encubierto.
- **La guarda de pureza tiene un costo oculto.** Hacer opcional el `indice`
  mantuvo `pruebas.js` intacto, pero también significa que las 133 pruebas no
  tocan el camino nuevo. Un diseño defensivo puede volver invisible aquello de
  lo que protege.

---

# ANEXO 2 — Sesión del 1 de septiembre de 2026 (segunda mitad)

> Continuación del anexo anterior. Cierra los hallazgos 8.1 a 8.6 y abre uno nuevo
> y más grave que todos ellos.

---

## 12. RESULTADO

Se cerraron **los seis hallazgos abiertos** más uno descubierto durante las
pruebas. Todo verificado en ejecución real.

**El único bloqueante que queda sigue siendo el NIT real de PFI.**

---

## 13. DECISIONES DE TAXONOMÍA TOMADAS

**13.1 Política de Calidad → GC** (no GE). Criterio elegido: *el documento va al
proceso del que TRATA, no al del área que lo emite o lo aprueba*. Es el mismo
criterio que ya usaban las reglas 3, 5 y 6, así que no se agregó un criterio
nuevo sino que se extendió el existente.

**13.2 El ORIGEN describe al tercero del NIT**, no a quién expidió el documento.
Se redefinieron las descripciones de `ORIGENES` en `Taxonomia.gs` ("El tercero
del NIT es un cliente" en vez de "Documento de un cliente") y se agregó el
criterio en el prompt **pegado a la lista de orígenes**, no como regla numerada:
la lección del 31-ago fue que una instrucción pegada al campo pesa más que una
lejana.

---

## 14. LA TANDA DE PROMPT

Se aplicaron cuatro cambios de prompt juntos, **rompiendo deliberadamente el
principio de un cambio a la vez**. Justificación: probarlos uno por uno serían
cuatro ciclos de limpieza completos, y cada cambio tenía su documento
discriminante propio.

**Regla 9 nueva (MC, PL, CA).** Van al proceso del que trata el documento.
MC → siempre GC. PL → al proceso que gobierna (Calidad→GC, SAGRILAFT→GR,
seguridad de la información→TI, talento humano→GH, cartera→GF). CA → al proceso
que caracteriza. Incluye la **cláusula anti-emisor**: *que lo apruebe la Alta
Dirección, la Gerencia o la Junta NO lo envía a GE*. Es estructuralmente idéntica
a la cláusula anti-vocabulario de la regla 3 y a la anti-propósito de la regla 6:
las tres dicen "no clasifiques por la pista fácil".

**La regla del desempate pasó de 9 a 10.** Ninguna otra regla la referenciaba, así
que la renumeración fue limpia. Verificado: 1 a 10 sin saltos ni duplicados.

**Regla 8(d).** Prohibidos los calificativos de alcance o periodicidad
(comparativos, individuales, consolidados, mensual, trimestral, anual,
preliminar, definitivo), por la misma razón que ya se prohibía la fecha: son
descriptores variables que impiden que la clave lógica coincida entre ejercicios.

**Esquema alineado con la regla 8.** Se quitó del campo `titulo` el *"ni la
palabra del tipo documental"*, que era más estricto que la 8(c) y habría
prohibido "Política de Calidad". **Aquí la regla tenía razón y el esquema estaba
mal**; es la tercera vez que esa pareja se contradice, así que conviene revisarlos
siempre juntos.

**`CONFIG.MODELO`** ahora se usa de verdad en `clasificarConIA()`. Efecto
colateral: `diagnostico()` prueba la API con ese valor, así que un error 4xx
puede venir de un nombre de modelo mal escrito y no de la clave.

### Resultado

| Documento | Resultado | Qué probó |
|---|---|---|
| Política de Calidad | `PL-GC-001` | Regla 9 y su cláusula anti-emisor. Antes salía GE con 0,99 |
| Caracterización | `CA-OP-001` | La regla 9 no rompió lo que ya servía |
| EEFF de PSF | `RG-GF-001` | La regla 9 no captura lo que no le toca |
| EEFF de Andina | título `Estados-Financieros` | Regla 8(d): desapareció "Comparativos" |

---

## 15. EL ORIGEN: LO QUE PARECÍA UN FALLO Y NO LO ERA

Tras la redefinición, el certificado de cámara de comercio salió con origen
**PRV**, no CLI. Primera lectura: el modelo estaba adivinando la relación
comercial, que no está escrita en el documento; conclusión provisional, sacar el
ORIGEN de la nomenclatura.

**Era incorrecto.** El certificado dice en su última línea: *"Documento recibido
por PROGRESA SOLUCIONES FINANCIERAS S.A.S. para el expediente de vinculación del
proveedor."* El modelo **leyó la relación en el texto**, que es exactamente lo
que la redefinición le pide hacer. PRV es correcto.

Y la bancaria, que no tenía dónde leerla, propuso PAG por deducción errónea; la
herencia la corrigió a PRV. O sea: **una relación leída con evidencia y una
deducción mala que el sistema atajó.** El mecanismo hizo justo aquello para lo
que se diseñó.

**Se retiró la propuesta de sacar el ORIGEN de la nomenclatura.** No tenía
evidencia que la sustentara.

Consecuencia práctica que sí queda: el ORIGEN correcto depende de que el
**primer** documento del tercero traiga la pista. Si el primero hubiera sido la
bancaria, habría quedado PAG fijado. `ORIGENES_TERCEROS` es la salida y ahora
tiene un caso de uso concreto que documentar.

---

## 16. HALLAZGO NUEVO Y GRAVE — EL NIT NO TENÍA FORMA CANÓNICA

### Síntoma

En la misma sesión, el mismo tercero quedó con dos identificaciones:

- Tanda 1: `901234567` — nueve dígitos
- Tanda 2: `9012345677` — diez dígitos, con dígito de verificación

`limpiarNIT()` aceptaba 9 o 10 dígitos y **devolvía lo que le dieran**. Si el
modelo transcribía `901.234.567-7` salían diez; si transcribía `901234567`,
nueve. Los dos pasaban.

### Por qué es el hallazgo 4.1 otra vez, por otra puerta

El tercero se partió en **dos series de numeración, dos carpetas de Drive y dos
claves lógicas**. Los estados financieros arrancaron en 001 en vez de seguir la
serie. Y como `origenRegistrado()` compara el NIT como texto, **la herencia del
ORIGEN no se aplicó**: por eso salió CLI y no PRV.

### Causa raíz: el propio sistema enseñaba el error

La **regla 7 del prompt** decía:

```
'7. El NIT 900974255 es PSF y el 902074144 es EQUIMETRICA: son propios, no terceros.'
```

Nueve dígitos. Pero `NITS_PROPIOS` está indexado con **diez** (`9009742555`).
El prompt le enseñaba al modelo a devolver la forma que la tabla no reconoce.
Efecto latente y peor: si el modelo devolvía el NIT de PSF con nueve dígitos,
**la búsqueda fallaba y un documento propio se habría archivado como de tercero**,
con NIT en el nombre. No pasó por casualidad.

### Solución adoptada (idea del usuario, mejor que la propuesta inicial)

**Leer el tipo de identificación del documento** en vez de deducirlo del número,
porque en los papeles colombianos casi siempre está escrito ("NIT 901.234.567-7",
"C.C. 71.234.567"):

```
NIT + ≤9 dígitos  → se rellena con ceros a 9 y se calcula el DV → 10 dígitos
NIT + 10 dígitos  → ya trae DV, se deja
CC / CE / TI      → se dejan intactas: no tienen DV y su longitud es variable
tipo desconocido  → se trata como NIT (igual que hace el validador)
```

`canonizarIdentificacion()` es **idempotente**: canonizar dos veces da lo mismo.

**Se descartó la forma canónica de 9 dígitos** (recortar el DV) porque una cédula
de diez dígitos acierta el DV por azar una vez de cada once, y se recortaría un
dígito real.

### Se arregló también el mínimo

`limpiarNIT()` exigía 9 dígitos y devolvía `null` por debajo. Una **cédula de 7 u
8 dígitos** —comunes en personas mayores— se descartaba en silencio, y el
documento se archivaba como **propio**, sin NIT, en la carpeta `PROPIO`. Ahora el
mínimo es 7, y el regex de `parsearNombre()` pasó de `\d{9,10}` a `\d{7,10}` para
que esos nombres se sigan reparseando.

### ⚠️ Limitación conocida: pasaportes

`PA` **no está soportado**. `limpiarNIT()` borra las letras, así que un pasaporte
alfanumérico quedaría mutilado. Si aparece un tercero extranjero hay que
resolverlo aparte.

---

## 17. MIGRACIÓN DE COLUMNAS — `TIPO_ID`

El tipo de identificación **se guarda en columna**, no se deduce. La razón:
`aplicarArchivado()` reconstruye la clasificación desde la hoja y **vuelve a
validar**; sin la columna, en ese segundo paso el sistema no sabría si
`1012345678` es una cédula de diez dígitos o un NIT con DV. Ya van dos hallazgos
en esta sesión originados en un dato recalculado con información incompleta.

`TIPO_ID` va **entre ORIGEN y NIT**: columna 5 de `LISTADO_MAESTRO`, columna 7 de
`APROBACIONES`.

Eso corrió los índices escritos a mano en `Instalador.gs`:
`SU_DECISION` de **17 a 18**, el rango de **19 a 20**, y el formato condicional
de **`$P` a `$Q`**.

### ✅ CORRECCIÓN IMPORTANTE: `instalarSistema()` SÍ se puede volver a ejecutar

En el anexo anterior se dijo "NUNCA ejecutes `instalarSistema()`". **Esa
advertencia era exagerada.** `obtenerOCrear()` reutiliza las carpetas por nombre,
`crearHoja()` reutiliza la hoja por nombre y `guardarConfig()` reescribe los
mismos IDs. Es idempotente por diseño.

El riesgo real existe **solo si alguien renombró o movió** la carpeta raíz
(`PSF GED - Gestion Documental ISO 9001`) o la hoja (`FT-GC-001 Listado Maestro
de Documentos`): entonces no las encuentra y crea duplicados. **Verificar los
nombres antes de ejecutarlo.**

Y es **la única vía limpia para migrar el esquema de las hojas**, porque
`hojaCon()` solo escribe cabeceras cuando la hoja está vacía.

### Procedimiento de migración de hojas (probado)

0. `PAUSADO = true` y **pegar los seis `.gs` primero**. Si se ejecuta
   `instalarSistema()` con el código viejo, recrea las hojas sin `TIPO_ID`.
1. Limpieza de Drive de siempre, incluida la papelera.
2. **Eliminar las pestañas `LISTADO_MAESTRO` y `APROBACIONES` completas**, no
   solo sus filas: la validación de datos y el formato condicional viejos apuntan
   a columnas que se corrieron y limpiar filas no los quita. Dejar `BITACORA`
   (Sheets no permite quedarse sin ninguna hoja).
3. `instalarSistema()`.
4. Verificar posición de `TIPO_ID`, `diagnostico()`, `PAUSADO = false`.

### Atajo útil para probar

**No hay que esperar los 15 minutos.** `everyMinutes(15)` se agenda desde que se
creó el disparador, no en los minutos 00/15/30/45 del reloj. Se puede ejecutar
`analizarBandeja()` y `ejecutarDecisiones()` **a mano desde el editor**; hacen
exactamente lo mismo. El panel **Ejecuciones** muestra la última corrida y sirve
para confirmar que no hay ninguna en vuelo antes de tocar nada (y que `PAUSADO`
funciona: se ven corridas que terminan en menos de un segundo).

---

## 18. RESULTADO FINAL DE LAS PRUEBAS DE CAMPO

| Documento | Código | NIT |
|---|---|---|
| Certificado v1 → OBSOLETO | `DE-GR-PRV-9012345677-001` V01 | 10 dígitos |
| Certificado v2 → VIGENTE | `DE-GR-PRV-9012345677-001` V02 | 10 dígitos |
| Certificación bancaria | `DE-GR-PRV-9012345677-002` | hereda PRV |
| EEFF Andina | `DE-GR-PRV-9012345677-**003**` | hereda PRV |
| EEFF PSF | `RG-GF-001` | vacío, PROPIO |
| Política de Calidad | `PL-GC-001` | vacío, PROPIO |
| Caracterización | `CA-OP-001` | vacío, PROPIO |

⚠️ **Se predijo `004` y salió `003`. La predicción estaba mal, no el sistema.**
Hay tres filas de Andina pero solo dos documentos: el certificado ocupa el `001`
en sus dos versiones —V01 y V02 comparten consecutivo, que es el punto del
versionamiento— y la bancaria el `002`. El máximo de la serie es 2, luego el
siguiente es 3. **Si hubiera salido `004`, el versionamiento estaría roto.**

El `003` confirma dos cosas a la vez: la canonización funciona (una sola serie
para el tercero, contra el `001` de la corrida anterior) y el versionamiento no
consume consecutivos de más.

---

## 19. ESTADO DE LAS PRUEBAS

| Suite | Resultado |
|---|---|
| `pruebas.js` | **133 pasadas, 0 fallidas** |
| `fuzz.js` | 20.000 + 5.000, **0 excepciones, 0 invariantes violados** |
| `prueba_origen.js` | **55 ok, 0 fallas** (subió de 35) |

Dos secciones nuevas en `prueba_origen.js`: forma canónica de la identificación
(incluye idempotencia, cédulas de 7/8/10 dígitos y que el NIT de PSF cuadre con
`NITS_PROPIOS`) y "el mismo tercero no se parte en dos series", que verifica que
`901234567` y `901.234.567-7` produzcan el mismo NIT, la misma serie y la misma
clave lógica.

### ⚠️ Dos intervenciones sobre las pruebas que deben quedar registradas

**Un refactor revertido.** Se intentó derivar los índices de columna de
`formatearAprobaciones()` a partir de las cabeceras, en vez de tenerlos escritos
a mano. Es mejor código, pero **rompía la sección 13 de `pruebas.js`**, que lee
`Instalador.gs` como texto buscando literalmente `var col = 17; // SU_DECISION`.
Se revirtió: **perder una verificación existente a cambio de código más elegante
es mal negocio**, y esa prueba es justamente la que vigila esta desalineación. Si
alguna vez se quiere el refactor, hay que reescribir la prueba primero.

**Fixturas modificadas.** Se cambiaron las de `prueba_origen.js` para que el
índice guarde NIT en forma canónica de 10 dígitos. Es legítimo —después de la
canonización, un NIT de 9 dígitos ya no puede salir del validador— pero
**ajustar pruebas para que pasen es una maniobra que siempre hay que
justificar**. Las 4 fallas que aparecieron eran el fallo real reproducido en
miniatura.

---

## 20. PENDIENTES ACTUALIZADOS

**Bloqueante único**
1. **NIT real de PFI.** Reemplazar `'9999999999'` en `NITS_PROPIOS` por el
   número real **en forma canónica de 10 dígitos**, y agregarlo también a la
   regla 7 del prompt en forma de 9 dígitos (que es lo que se le pide transcribir
   al modelo).

**Deuda técnica**
2. Soporte de pasaportes (`PA`) para terceros extranjeros (16).
3. `NOMBRE_ARCHIVO` desactualizado al obsoletar (4.3). Una línea en
   `marcarObsoletos()`.
4. Huecos de BITACORA: no registra SIN_TEXTO, DUPLICADO, REVISAR ni
   obsolescencias.
5. Originales sin marcar.
6. Guarda determinista `razonSocial` vs `titulo` en el validador.
7. Regla 10 (desempate por número): sustituirla por precedencias explícitas.
8. Refactor de `formatearAprobaciones()` + reescritura de la sección 13 (19).

**Documentación / instructivo**
9. Instructivo de revisión de `01_EN_REVISION`.
10. El ORIGEN editado a mano se pierde al aprobar; la vía es `ORIGENES_TERCEROS`.
11. Por qué un documento que dice "Versión 2" se archiva como V01.
12. El ORIGEN lo fija el **primer** documento del tercero (15).
13. Cobertura de tipos: quedan sin ejercitar MC, MZ y LG.

---

## 21. LECCIONES DE MÉTODO DE LA SEGUNDA MITAD

- **Confirmar el hecho antes de construir la teoría.** Se llegó a proponer sacar
  el ORIGEN de la nomenclatura sobre la hipótesis de que el modelo adivinaba la
  relación comercial. Bastó preguntar qué decía el certificado: la decía. La
  propuesta se retiró.
- **Una predicción fallida no es un fallo del sistema.** El `003` vs `004`: el
  error estaba en contar filas en vez de consecutivos. Antes de declarar un bug,
  verificar que la expectativa fuera correcta.
- **Buscar la causa raíz en el propio sistema, no en el modelo.** La
  inconsistencia del NIT no venía de que el modelo fuera errático: la regla 7 le
  pedía nueve dígitos mientras la tabla indexaba con diez.
- **La mejor solución la propuso el usuario.** Leer el tipo de identificación del
  documento es más honesto que deducirlo del número, y evita el problema de las
  cédulas de diez dígitos.
- **No refactorizar lo que una prueba vigila** sin reescribir la prueba primero.
- **Declarar siempre cuándo se tocan las pruebas.**
- **Un dato que se recalcula necesita todos sus insumos guardados.** El
  `TIPO_ID` en columna existe por esto; es la misma lección que produjo el
  hallazgo del ORIGEN y el del NIT.

---

# ANEXO 3 — Sesión del 1 de septiembre de 2026 (cierre)

> Sesión corta de verificación contra `PSF-GED_Checklist_Paso_a_Productivo.md`.
> No se implementó nada. Se comprobó el estado real de la fase B y aparecieron
> dos huecos entre lo que este archivo daba por hecho y lo que hay en `src/`.

---

## 1. RESULTADO

**Los dos puntos de la fase B que se daban por cumplidos no lo estaban.** B3
(suites en verde) se venía reportando con una de las tres suites muerta, y B2
(código al día) exige una constante que no existe en ningún archivo.

Un solo archivo modificado: `test/prueba_origen.js`, y solo su ruta de carga.
Ningún `.gs` fue tocado.

---

## 2. HALLAZGO — `prueba_origen.js` NO CORRÍA

### Síntoma

`node test/prueba_origen.js` moría con `ENOENT` **antes de ejecutar una sola
aserción**, buscando `test/Taxonomia.gs`.

### Causa

Las tres suites no cargaban los `.gs` igual. `pruebas.js` y `fuzz.js` usan
`path.join(__dirname, '../src', f)`; `prueba_origen.js` usaba
`path.join(__dirname, f)`, es decir, esperaba los `.gs` **en la misma carpeta que
la prueba**. Nació el 1-sep, cuando todavía se trabajaba con todo suelto en un
directorio, y no se actualizó al adoptar la estructura `src/` + `test/`.

La sección 6 del anexo del 1-sep documentó esa estructura como requisito de las
tres. Era cierto para dos.

### Por qué importa más de lo que parece

`prueba_origen.js` es **la única suite que cubre la herencia del ORIGEN y la
canonización del NIT**. El propio anexo del 1-sep lo dejó escrito: `pruebas.js` y
`fuzz.js` nunca pasan `indice`, así que la guarda de pureza corta antes y el
camino nuevo no se ejercita jamás.

O sea que los dos hallazgos más serios de la semana —el 4.1 y el del NIT sin
forma canónica— **estaban sin cobertura efectiva desde que se creó la suite que
los cubría**, y el checklist declaraba B3 en verde. La suite existía, las
aserciones estaban bien escritas, y ninguna se ejecutó nunca en esa estructura.

### Arreglo

Una línea: la ruta pasa a `path.join(__dirname, '../src', f)`, igual que las
otras dos. **No se tocaron fixturas ni aserciones.** Resultado: **55 ok, 0 fallas**,
que es exactamente el número que el anexo anterior había registrado.

---

## 3. HALLAZGO — `PAUSADO` NO EXISTE EN EL CÓDIGO

### Síntoma

`grep -rn "PAUSADO" src/ test/` no devuelve **ninguna** coincidencia.

### Qué decía el contexto

La sección 5 del anexo del 1-sep lo da por aplicado:

> `Config.gs` — `const PAUSADO = false;` **fuera** del objeto `CONFIG`, como
> constante suelta. Interruptor de mantenimiento; las dos funciones de `Motor.gs`
> empiezan con `if (PAUSADO) return;` **antes** de `cargarConfig()`.

Y la sección 7 construyó todo el procedimiento de mantenimiento encima, con
`PAUSADO = true` como paso 1.

### Evidencia de qué pasó

Las fechas de modificación lo explican:

```
Config.gs        Aug 31 17:04   <- el resto de los .gs son del Sep 1 16:09
```

`Config.gs` es el único `.gs` que no se tocó el 1-sep. El cambio se hizo **en el
editor de Apps Script y nunca bajó al `src/` local.** Verificado además en
`Motor.gs`: `analizarBandeja()` (línea 15) y `ejecutarDecisiones()` (línea 124)
empiezan directamente en `cargarConfig()`, sin guarda.

### Consecuencia

- El paso 1 del procedimiento de mantenimiento **no se puede ejecutar** desde el
  código local.
- El check de B2 —"verificar que `Motor.gs` tenga `if (PAUSADO) return;` como
  primera línea"— falla.
- La alternativa documentada (borrar los disparadores y recrearlos con
  `crearDisparadores()`) sigue siendo válida, así que no hay bloqueo operativo;
  hay un interruptor de seguridad que se cree que existe y no existe. Que es
  peor que no tenerlo, porque nadie va a buscar la alternativa.

---

## 4. LO QUE ESTO ABRE — DERIVA ENTRE EL EDITOR Y `src/`

El hallazgo 3 no es sobre `PAUSADO`. Es sobre que **`src/` y el proyecto de Apps
Script son dos copias sin nadie que las concilie**, y ya divergieron al menos una
vez sin que nadie lo notara durante una sesión entera.

Los dos hallazgos de hoy son la misma falla por dos puertas: **algo que el
contexto declara cumplido y que nunca se verificó en el artefacto real.** Es la
versión, aplicada al repositorio, del criterio que este proyecto ya adoptó para
las clasificaciones — *verificado en propuesta no es verificado en ejecución*.

⚠️ **Antes de pegar nada en corporativo hay que cotejar los ocho `.gs` locales
contra los que hoy están en el proyecto de Apps Script.** `PAUSADO` se perdió en
ese camino; no hay razón para suponer que fue el único. Pegar en corporativo
desde un `src/` incompleto es exactamente lo que B2 existe para evitar, y el
riesgo es mayor que el de `PAUSADO` solo: los cambios del 1-sep incluyen la
canonización del NIT y la herencia del ORIGEN.

**Este cotejo debería ser el primer punto de la próxima sesión**, antes que
cualquier implementación.

---

## 5. ESTADO DE LAS PRUEBAS

| Suite | Resultado |
|---|---|
| `pruebas.js` | **133 pasadas, 0 fallidas** |
| `fuzz.js` | 20.000 + 5.000, **0 excepciones, 0 invariantes violados** |
| `prueba_origen.js` | **55 ok, 0 fallas** <- tras el arreglo de ruta; antes no corría |

Las tres corren desde la raíz del proyecto con `node test/<archivo>.js`.

### Intervención sobre las pruebas, declarada

Se modificó `test/prueba_origen.js`: **solo la ruta de carga de los `.gs`**. No se
tocaron fixturas ni aserciones, y el resultado coincide con el ya registrado
(55/55), lo que confirma que el arreglo repara el arranque y no altera lo que la
suite verifica.

---

## 6. PENDIENTES ACTUALIZADOS

**Antes que nada, en la próxima sesión**

0. **Cotejar los ocho `.gs` de `src/` contra el proyecto de Apps Script** (ver 4).
   Condiciona B2 y todo lo que se pegue en corporativo.

**Bloqueante único (sin cambios)**

1. **NIT real de PFI**, en sus dos formatos: 10 dígitos canónicos en
   `NITS_PROPIOS` y 9 dígitos en la regla 7 del prompt.

**Nuevo — reabre B2**

2. **Agregar `PAUSADO`**: `const PAUSADO = false;` fuera de `CONFIG` en
   `Config.gs`, y `if (PAUSADO) return;` como primera línea de
   `analizarBandeja()` y `ejecutarDecisiones()`, **antes** de `cargarConfig()`.
   Mientras no exista, la vía de mantenimiento es borrar los disparadores y
   recrearlos con `crearDisparadores()`.

**Resto de la deuda técnica: sin cambios** respecto al anexo anterior
(pasaportes, `NOMBRE_ARCHIVO` al obsoletar, huecos de BITACORA, originales sin
marcar, guarda `razonSocial` vs `titulo`, regla 10, refactor de
`formatearAprobaciones()`).

**Decisiones que siguen abiertas y condicionan la instalación**
A1 ubicación del archivo documental (unidad compartida vs. Mi unidad), A2 cuenta
ejecutora, A3 acta, A4 aprobadores, A5 retención y respaldo.

---

## 7. LECCIONES DE MÉTODO

- **Una suite que no corre no es una suite que falla: es una suite invisible.**
  Un fallo habría saltado a la vista; el `ENOENT` se leía como problema de
  entorno y el número de la sesión anterior (55 ok) seguía escrito en el
  contexto, dando sensación de cobertura. **Verificar que las pruebas ejecutan,
  no solo que "pasan".**
- **Lo que un archivo de contexto declara cumplido no está cumplido. Está
  declarado.** Los dos hallazgos de hoy salieron de contrastar el documento
  contra el código, no de leer el documento.
- **Las fechas de modificación son evidencia.** `Config.gs` con fecha del 31-ago
  entre siete archivos del 1-sep señaló la causa antes que cualquier hipótesis.
- **Dos copias del código sin conciliación divergen.** No hace falta descuido:
  basta con editar en el editor de Apps Script, que es donde se prueba de verdad.
- **Empezar por verificar el estado, no por implementar.** La sesión iba a
  arrancar aplicando deuda técnica; el relevamiento previo cambió por completo
  cuál era el primer problema.


---

# ANEXO 4 — Sesión del 2 de septiembre de 2026

> Cierra el punto 0 del anexo 3 (cotejo `src/` ↔ Apps Script) y el ítem B2 del
> checklist. Un solo `.gs` modificado, y lo modificó el usuario.

---

## 1. RESULTADO

**B2 quedó cerrado y, por primera vez, verificado contra el artefacto real.**
Los ocho `.gs` de `src/` y los del proyecto de Apps Script son **idénticos byte
a byte** (SHA256), y los 17 marcadores de los cambios del 28-ago y el 1-sep
están presentes en el editor.

La deriva que costó la sesión del anexo 3 **no se había repetido**: `PAUSADO`
fue el único caso. Pero eso solo se sabe habiéndolo comprobado; era exactamente
la advertencia del anexo 3 (*"no hay razón para suponer que fue el único"*), y
la respuesta resultó ser tranquilizadora en vez de alarmante.

**El único bloqueante técnico sigue siendo el NIT real de PFI.**

---

## 2. `PAUSADO` — APLICADO (por el usuario)

Estado al arrancar la sesión: `const PAUSADO = false;` ya existía en
`Config.gs:9`, pero **`Motor.gs` no tenía la guarda**. El interruptor estaba
declarado y no hacía nada, que es peor que no tenerlo.

Quedó `if (PAUSADO) return;` como primera línea, **antes de `cargarConfig()`**,
en las **tres** funciones que `crearDisparadores()` agenda:

| Función | Línea | Disparador |
|---|---|---|
| `analizarBandeja()` | 16 | cada 15 min |
| `ejecutarDecisiones()` | 126 | cada 15 min |
| `resumenDiario()` | 312 | diario, 7:00 |

⚠️ El anexo del 1-sep solo mencionaba **dos**. `resumenDiario()` no toca Drive
ni el índice —solo lee la hoja y manda correo—, así que no podía corromper nada
a mitad de un cambio; se incluyó para que `PAUSADO = true` signifique *el
sistema entero quieto* y no *casi todo el sistema quieto*. Una salvedad que hay
que recordar en el momento de usarla no sirve de nada.

Las tres suites siguen en verde con la guarda puesta, que era el riesgo real:
`PAUSADO` es un global que los scripts de Node tienen que resolver al cargar
`Config.gs`.

---

## 3. EL COTEJO — MECANIZADO

### Cómo se hizo

Se instaló **`clasp` 3.4.1** (`npm i -g @google/clasp`), se habilitó la API de
Apps Script y se autorizó con la cuenta personal. `clasp list-scripts` devolvió
**un solo proyecto**, "PSF GED", lo que de paso descarta que existan copias
olvidadas del proyecto en esa cuenta.

### Resultado

| | |
|---|---|
| Archivos idénticos | **9 de 9** (SHA256, no solo equivalentes) |
| Diferencias | **0** |
| Marcadores de cambio presentes | **17 de 17** |

### La herramienta queda en el repositorio

`tools/cotejo.js` — un comando que baja el editor, compara y limpia:

```
node tools/cotejo.js              # baja, compara, borra la copia
node tools/cotejo.js --conservar  # deja la copia para inspeccionarla
```

Sale con código 0 si está conciliado y 1 si hay deriva. Compara ignorando fin de
línea y espacios al final (el editor normaliza esas dos cosas al pegar: una
diferencia ahí sería ruido, no deriva).

Además del diff completo corre la lista de **17 marcadores** —un fragmento de
código por cada cambio documentado, con el nombre del cambio al lado—. El diff
solo detectaría el mismo problema, pero como un bloque de líneas sueltas; el
marcador dice *cuál* de las decisiones de la semana falta.

---

## 4. HALLAZGO — `appsscript.json` NO ESTABA EN `src/`

El proyecto tiene **nueve** archivos, no ocho. El manifiesto vivía solo en el
editor.

⚠️ **El cotejo no lo habría detectado nunca**, porque no tenía contraparte local
con la cual discrepar. Es el hueco de `PAUSADO` al revés: allá un cambio no bajó
al repositorio; aquí un archivo entero nunca estuvo. **Un cotejo compara lo que
sabe que existe.**

Ya está copiado a `src/` y entra en las comparaciones futuras. Su contenido
confirma dos ítems de B4 sin abrir nada:

```json
{ "timeZone": "America/Bogota",
  "dependencies": { "enabledAdvancedServices": [
    { "userSymbol": "Drive", "version": "v3", "serviceId": "drive" } ] },
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8" }
```

Y hay que replicarlo en corporativo: **el servicio avanzado de Drive y la zona
horaria son parte del proyecto, no del código**, y una instalación nueva no los
hereda de `src/`.

---

## 5. `.clasp.json` — CON `rootDir` FUERA DE `src/`

Decisión del usuario, y es la correcta. `rootDir` apunta a `cotejo/`, una
carpeta desechable, **nunca a `src/`**:

```json
{ "scriptId": "...", "rootDir": "cotejo" }
```

Motivo: los dos comandos de clasp son destructivos en direcciones opuestas y
ninguno pregunta ni fusiona.

- `clasp pull` sobrescribe el `rootDir` con el editor → cae en `cotejo/`, que es
  desechable. **Protección estructural: es configuración, no disciplina.**
- `clasp push` sobrescribe el editor con el `rootDir` → con `cotejo/` vacía no
  llega a llamar a la API.

### ⚠️ Hasta dónde llega la protección de `push`, con precisión

Se verificó **leyendo el código de clasp 3.4.1**, no ejecutándolo: si la lectura
hubiera estado equivocada, la prueba habría vaciado el proyecto de Apps Script.
`push()` tiene una guarda explícita en `build/src/core/files.js`:

```javascript
const { files, skipped } = await this.collectLocalFiles();
if (!files || files.length === 0) { return { files: [], skipped }; }
```

y antes de eso el comando consulta `getChangedFiles()`, que **itera sobre los
archivos locales**: con la carpeta vacía devuelve lista vacía y ni siquiera
entra a `push()`.

**Corrección de lo que se dijo primero en la sesión:** ese no-op **es
silencioso**. `clasp push` con la carpeta vacía no protesta. No espere un error
como señal de que algo va mal.

**Y la protección depende de que la carpeta esté vacía.** Por eso el script la
limpia solo al terminar. Si se corre con `--conservar` y se olvida, un `clasp
push` posterior subiría esa copia vieja y **revertiría el editor**. Está
anotado en la cabecera de `tools/cotejo.js`.

---

## 6. ESTRUCTURA DEL PROYECTO (actualizada)

```
Gestion-Documental/
  .clasp.json          scriptId + rootDir: "cotejo"
  cotejo/              vacía entre corridas; la llena y la vacía el script
  src/                 9 archivos: los 8 .gs + appsscript.json
  test/                pruebas.js, fuzz.js, prueba_origen.js
  tools/cotejo.js      cotejo src/ vs. editor
```

Las tres suites siguen exigiendo `src/` + `test/` y se corren desde la raíz con
`node test/<archivo>.js`.

---

## 7. ESTADO DE LAS PRUEBAS

| Suite | Resultado |
|---|---|
| `pruebas.js` | **133 pasadas, 0 fallidas** |
| `fuzz.js` | 20.000 + 5.000, **0 excepciones, 0 invariantes violados** |
| `prueba_origen.js` | **55 ok, 0 fallas** |

Corridas tres veces en la sesión: antes de tocar nada, tras la guarda en las dos
funciones y tras la tercera. **Ningún cambio de esta sesión toca lógica de
clasificación**, así que no hubo pruebas de campo con documentos.

---

## 8. PENDIENTES ACTUALIZADOS

**Bloqueante único**

1. **NIT real de PFI**, en sus dos formatos: 10 dígitos canónicos en
   `NITS_PROPIOS` y 9 dígitos en la regla 7 del prompt.

**Cerrados en esta sesión**

- ~~Punto 0 del anexo 3: cotejar `src/` contra Apps Script~~ → **CERRADO**, sin
  deriva, y mecanizado con `tools/cotejo.js`.
- ~~Agregar `PAUSADO`~~ → **CERRADO**, en las tres funciones de disparador.

**Deuda técnica: sin cambios** respecto al anexo anterior (pasaportes,
`NOMBRE_ARCHIVO` al obsoletar, huecos de BITACORA, originales sin marcar,
guarda `razonSocial` vs `titulo`, regla 10, refactor de
`formatearAprobaciones()`).

**Documentación / instructivo: sin cambios**, más uno nuevo:

- Agregar al procedimiento de mantenimiento (F4) que **el manifiesto no está en
  el código**: en corporativo hay que activar el servicio avanzado de Drive y
  fijar la zona horaria aparte (ver 4).

**Decisiones que siguen abiertas y condicionan la instalación**
A1 ubicación del archivo documental, A2 cuenta ejecutora, A3 acta, A4
aprobadores, A5 retención y respaldo.

---

## 9. LECCIONES DE MÉTODO

- **Un cotejo compara lo que sabe que existe.** Los ocho `.gs` salieron
  idénticos y el hallazgo real fue un noveno archivo que no estaba en ninguna
  lista. Antes de comparar dos copias, preguntar de qué se compone cada una.
- **Verificar lo que se afirma sobre una herramienta, no solo sobre el propio
  código.** Se afirmó que `clasp push` fallaría con la carpeta vacía; falla de
  otra manera —callado— y esa diferencia importa para quien confíe en el error
  como aviso.
- **Cuando probar una protección puede destruir lo que protege, léala.** La
  guarda de `push` se verificó en el código fuente de clasp. Una prueba en vivo
  con la lectura equivocada habría vaciado el proyecto.
- **Una advertencia que resulta infundada sigue habiendo valido la pena.** El
  anexo 3 supuso que podía haber más deriva; no la había. Comprobarlo costó una
  hora y convirtió una sospecha en un hecho.
- **La protección estructural le gana a la disciplina, pero rara vez es total.**
  `rootDir` fuera de `src/` es configuración y no se olvida; que `cotejo/` quede
  vacía sigue dependiendo de que el script se ejecute hasta el final.
- **Cubrir el caso inofensivo también.** `resumenDiario()` no podía romper nada
  con `PAUSADO` a medias, pero dejarlo fuera obligaba a recordar la excepción
  justo en el momento de más prisa.


---

# ANEXO 4 (continuación) — Sesión del 2 de septiembre de 2026

> Continúa el anexo anterior. El proyecto pasó a estar versionado en Git, y el
> último bloqueante técnico resultó no ser lo que el checklist decía que era.

---

## 10. RESULTADO DE LA SEGUNDA MITAD

- **El proyecto está en GitHub**, privado, en la cuenta `progresasf-ti`.
- **B1 quedó implementado, pero la premisa del checklist era falsa:** PFI no
  tiene NIT colombiano, tiene **RUC**. El código lo habría tratado como NIT y le
  habría inventado un dígito de verificación, en silencio.
- El cambio está empujado a Apps Script y cotejado (9 de 9 idénticos).
- **El sistema quedó con `PAUSADO = true`**, a la espera de la verificación de
  la forma del RUC y de la prueba de campo.

---

## 11. VERSIONAMIENTO EN GIT

### El repositorio

`https://github.com/progresasf-ti/gestion-documental` — **privado**. Contiene
material interno (decisiones del SGC, NIT de la compañía, reglas del prompt,
correo de un empleado), pero **ningún secreto**: la clave de la API se lee de
Propiedades del script y nunca está en el código. Se verificó antes de subir.

```
9293b8b  cotejo.js: conservar .gitkeep al limpiar
0198973  PFI se identifica con RUC, no con NIT colombiano (B1)
4cd956c  Importación inicial del sistema PSF GED
f0c84c2  Initial commit (README, creado desde la web)
```

Autoría: `Angel Castaño <tecnologia@progresasf.com>`.

### ⚠️ Aquí GitHub solo funciona por SSH

**Es el hallazgo operativo más reutilizable de la sesión.** Todo push por HTTPS
se cuelga, y no por culpa de Git ni de GitHub: el entorno donde se ejecutan los
comandos trae

```
GCM_INTERACTIVE     never
GIT_TERMINAL_PROMPT 0
GIT_ASKPASS         (vacío)
```

es decir, Credential Manager tiene **prohibido** mostrar el diálogo de
autenticación. Nunca se abre el navegador y el comando espera para siempre.
Lanzar el push a mano tampoco sirve: hereda el mismo entorno.

Se resolvió con **clave SSH**, que no pasa por ese mecanismo: la clave está en
disco y no hay nada que preguntar.

- `~/.ssh/progresasf_ti` (ed25519), **sin contraseña** — es lo que permite
  empujar sin diálogos, y el precio es que quien acceda a los archivos del
  usuario puede empujar al repositorio.
- `~/.ssh/config` con `IdentitiesOnly yes`: sin eso ssh ofrecería también la
  clave `multipli_vps` y GitHub podría cortar antes de llegar a la correcta.
- `known_hosts` se sembró **verificando** la huella contra la que GitHub publica
  (`SHA256:+DiY3wvvV6TuJJhbpZisF/zLDA0zPMSvHdkr4UvCOqU`), no aceptándola a
  ciegas. La pregunta de confianza de la primera conexión se habría colgado por
  las mismas variables.

Las credenciales HTTPS de la cuenta `angelcastano` siguen guardadas y sin tocar;
los demás repositorios funcionan como antes.

### `.gitattributes` con `eol=lf`

No es estilo. El editor de Apps Script sirve los archivos con LF y
`tools/cotejo.js` los compara contra `src/`. Con la conversión automática de
Windows a CRLF, **la comparación byte a byte por SHA256 fallaría en cualquier
clon nuevo** y habría que confiar solo en la normalizada, que es más débil.

### ⚠️ La trampa del README

El repositorio se creó marcando *"Initialize with README"*, así que el remoto
tenía un commit propio y el push fue rechazado: dos historias sin ancestro
común. Se resolvió con `git rebase origin/main` —historia lineal, el README
conservado como raíz— sin perder nada y sin forzar.

**Al crear el repositorio de corporativo, dejar esa casilla SIN marcar.**

### Cómo se empuja código a Apps Script

`.clasp.json` apunta su `rootDir` a `cotejo/` y **nunca a `src/`**, de modo que
ningún comando pueda pisar el código bueno. Para empujar de verdad hay que crear
a propósito una configuración aparte con `rootDir: "src"`, usarla y borrarla:

```
clasp push -P clasp-push.json     # y se borra el archivo enseguida
```

⚠️ `clasp` **rechaza un `rootDir` fuera del directorio del archivo de proyecto**
(protección contra recorrido de rutas), así que ese archivo tiene que estar en
la raíz del repositorio. No dejarlo ahí: la capacidad de empujar debe crearse
cada vez, deliberadamente.

---

## 12. B1 — PFI SE IDENTIFICA CON RUC, NO CON NIT

### La premisa del checklist era falsa

B1 decía: *"reemplazar `'9999999999'` por el NIT real en forma canónica de 10
dígitos (9 dígitos + DV)"* y *"agregarlo en 9 dígitos a la regla 7"*. Daba por
hecho un NIT colombiano.

**Dato real: PFI se identifica con RUC 155709241.** Es una identificación
tributaria extranjera. No tiene dígito de verificación de la DIAN.

### Lo que habría hecho el código sin tocarlo

`canonizarIdentificacion()` no conocía `RUC`. Un tipo desconocido **se trata como
NIT** (comportamiento deliberado, para que el mismo número no salga canonizado
de dos formas según por dónde entre). Resultado verificado ejecutando el código:

```
canonizarIdentificacion('NIT', '155709241')  ->  1557092416
canonizarIdentificacion('RUC', '155709241')  ->  1557092416   (RUC no existía)
```

Un `6` calculado con la fórmula de la DIAN y pegado a una identificación
panameña. **Ese número no existe en ningún registro.**

⚠️ Y habría pasado **en silencio**: `nitEsCoherente()` solo valida cuando el tipo
es `NIT`, y como el DV lo calculó el propio sistema, siempre habría cuadrado. El
único aviso posible nunca se habría disparado.

### Qué se cambió

**`Taxonomia.gs`**
- `TIPOS_ID.RUC` con `llevaDV: false`. Marcar un tipo con `llevaDV: true`
  significa *"este número obedece la fórmula de la DIAN"*, y para una
  identificación extranjera eso es falso.
- `NITS_PROPIOS['155709241'] = 'PFI'`, reemplazando el comodín.

⚠️ **Las claves de `NITS_PROPIOS` ya NO comparten forma:** NIT colombiano con DV
(10 dígitos), RUC tal cual (9). Antes la tabla era homogénea y ahora no; está
escrito en el comentario para que nadie la "arregle".

**`Clasificador.gs`**
- `RUC` en el enum del esquema; la descripción de `nit` distingue que al NIT se
  le quita el DV y al RUC **no se le quita nada**.
- Regla 7 reescrita con las tres identificaciones propias y el efecto explícito
  de equivocarse.
- **Guarda nueva:** `NITS_PROPIOS` se consulta por la forma canónica **y por la
  cruda**.

### Por qué la guarda no es adorno

Si el modelo marca el RUC como `NIT`, la canonización se va por la rama del DV,
la clave deja de coincidir y **un documento propio de PFI se archiva como de un
tercero**, con el `6` inventado en el nombre del archivo. Es el hallazgo del
1-sep otra vez —el mismo tercero partido por dos formas del mismo número— pero
entrando por la puerta del **tipo** de identificación en vez de la del número.

La tabla dejó de ser homogénea, así que la búsqueda tenía que dejar de asumir
que lo era.

### Cobertura

`test/prueba_origen.js`, sección 9 nueva: **13 aserciones, 55 → 68 ok**. Cubre
el RUC sin DV, la idempotencia, el caso mal marcado como NIT, la regresión de
PSF, y que el RUC llegue al prompt y al esquema.

**Intervención sobre las pruebas, declarada:** se agregó `TIPOS_ID` al puente
`__TAX` de la línea 10, porque los `const` no salen del `eval`. No se tocó
ninguna fixtura ni aserción existente.

### ⚠️ LO QUE SIGUE ABIERTO Y DECIDE SI ESTO ESTÁ TERMINADO

**¿En qué forma aparece el RUC en los documentos reales de PFI?**

Si viene como `155709241`, quedó bien. Pero los RUC panameños suelen escribirse
con sufijos —del estilo `155709241-2-2021 DV 45`—, y `limpiarNIT()` junta todos
los dígitos y **rechaza más de 10**: devolvería `null`, la identificación se
perdería y PFI dejaría de reconocerse como propio.

Ese caso no se arregla con un parche: exige decidir cuál es la forma canónica de
un RUC, que es exactamente la decisión que faltó en agosto con el NIT.

**Falta la prueba de campo** con un documento real de PFI. Verificado en local
no es verificado en ejecución.

---

## 13. DOS DEFECTOS DE LA PROPIA HERRAMIENTA DE COTEJO

Los dos aparecieron por **usarla**, no por revisarla, y los dos son la misma
clase de error: una herramienta de verificación con un punto ciego propio.

**13.1 El marcador de `PAUSADO` buscaba el valor.** Estaba escrito como
`const PAUSADO = false;`, así que en cuanto el sistema se pausó a propósito el
cotejo reportó *"HAY DERIVA"* — es decir, fallaba justo en el momento en que más
se usa, durante un mantenimiento. Ahora busca solo `const PAUSADO`.

**13.2 La limpieza borraba `cotejo/.gitkeep`.** Lo delató el propio commit, que
incluía `D cotejo/.gitkeep`. En un clon nuevo la carpeta no habría existido y el
`rootDir` de `.clasp.json` habría apuntado a una ruta inexistente. Corregido: la
limpieza conserva ese archivo.

---

## 14. CÓMO QUEDÓ DESPLEGADO

| | |
|---|---|
| `pruebas.js` | 133 pasadas, 0 fallidas |
| `prueba_origen.js` | **68 ok, 0 fallas** (subió de 55) |
| `fuzz.js` | 20.000 + 5.000, 0 excepciones, 0 invariantes violados |
| Cotejo `src/` ↔ editor | **9 de 9 idénticos**, 0 marcadores faltantes |
| `PAUSADO` | **`true`** — el sistema está detenido |

⚠️ **El sistema está pausado**: las tres funciones salen sin hacer nada. Se dejó
así a propósito, porque reanudar pondría a procesar documentos con un cambio
cuya corrección todavía depende de la forma del RUC. Reanudar es cambiar la
línea, empujar y hacer una prueba de humo.

---

## 15. PENDIENTES ACTUALIZADOS

**Lo que decide si B1 está terminado**

1. **Forma del RUC en los documentos reales de PFI** (12). Si trae sufijos, hay
   que decidir la forma canónica.
2. **Prueba de campo** con un documento real de PFI.
3. **Reanudar** (`PAUSADO = false`) cuando 1 y 2 estén resueltos.

**Corrección de documentación, urgente**

4. **B1 del checklist está mal redactado**: habla de "NIT real de PFI… 10 dígitos
   canónicos". Esa es la suposición que resultó falsa. Reescribirlo en términos
   de RUC.

**Deuda técnica: sin cambios** (pasaportes, `NOMBRE_ARCHIVO` al obsoletar,
huecos de BITACORA, originales sin marcar, guarda `razonSocial` vs `titulo`,
regla 10, refactor de `formatearAprobaciones()`).

**Nuevo**

5. Al crear el repositorio de corporativo, **no marcar la casilla del README**.
6. Documentar en F4 que aquí GitHub solo funciona por SSH, y por qué (11).

**Decisiones abiertas que condicionan la instalación**
A1 ubicación del archivo documental, A2 cuenta ejecutora, A3 acta, A4
aprobadores, A5 retención y respaldo.

---

## 16. LECCIONES DE MÉTODO

- **Un pendiente puede traer escrita una suposición falsa.** B1 llevaba semanas
  redactado como "el NIT real de PFI" y nadie dudó del sustantivo. El dato del
  usuario —*RUC, no NIT*— cambió el trabajo entero. **Leer los pendientes como
  hipótesis, no como especificaciones.**
- **Un valor por defecto sensato puede volverse un error silencioso al cambiar
  el dominio.** Tratar un tipo desconocido como NIT era la decisión correcta
  cuando todas las identificaciones eran colombianas; con una extranjera, la
  misma regla fabrica un número inexistente sin avisar.
- **Cuando una tabla deja de ser homogénea, las búsquedas sobre ella también
  tienen que dejar de asumirlo.** `NITS_PROPIOS` pasó a mezclar dos formas
  canónicas, y por eso la búsqueda tuvo que pasar a consultar las dos.
- **Las herramientas de verificación también tienen puntos ciegos, y solo se ven
  usándolas.** Los dos defectos del cotejo salieron de correrlo en situaciones
  reales —un sistema pausado, un commit— no de leerlo.
- **La barrera de seguridad correcta es la que hay que desarmar a propósito.**
  Empujar a Apps Script exige crear una configuración, usarla y borrarla; que
  sea incómodo es la característica, no el defecto.
- **Un síntoma de red o de permisos puede ser una variable de entorno.** El push
  colgado parecía cosa de GitHub o de credenciales, y era `GCM_INTERACTIVE=never`
  en el entorno donde corren los comandos.
- **Distinguir 401 de 403 ahorra trabajo.** El primer push devolvió 403, o sea
  que la autenticación había funcionado y solo faltaba autorización. Leerlo bien
  descartó de entrada toda una rama de diagnóstico.

---

## 17. LA FORMA LARGA DEL RUC — ANALIZADA Y APLAZADA A PROPÓSITO

**Decisión del usuario (2-sep): esperar un documento real de PFI antes de
implementar nada.** No hay todavía ninguno a la vista.

### La propuesta

Si el documento trajera el RUC como `155709241-2-2021`, extraer el comienzo de
la cadena y, si coincide con el parámetro de `NITS_PROPIOS`, tratarlo como
PROPIO. Así el reconocimiento deja de depender de la forma de representación.

### Qué pasa hoy con la forma larga (medido, no supuesto)

`limpiarNIT()` junta los dígitos y rechaza más de 10, así que
`155709241-2-2021` → 14 dígitos → `null`. De ahí salen dos comportamientos:

| El modelo propone | Resultado |
|---|---|
| `PFI` | origen PFI, correcto — **pero por suerte, no por reconocimiento**. Queda el aviso "la identificación no tiene forma válida; se ignora" |
| `CLI` u otro | origen queda `CLI`, **`REVISAR = true`**, con dos avisos |

⚠️ **Corrección de una advertencia anterior de este mismo anexo:** el fallo de la
forma larga **no es silencioso**. O sale bien dejando rastro en NOTAS, o va a
REVISAR. Nunca archiva mal en silencio. Eso baja la urgencia: lo que se pierde
es que el reconocimiento pasa a depender de que el modelo acierte el origen solo.

### Por qué la versión simple ("los primeros 9") es peligrosa

El prefijo `155709241` **choca con identificaciones colombianas legítimas**:

| Número | Qué es | ¿Choca? |
|---|---|---|
| `1557092416` | el NIT colombiano `155709241` con su DV real, que es 6 | **sí** |
| `1557092410` | una cédula de 10 dígitos de ese rango | **sí** |
| `15570924122021` | el RUC de PFI en forma larga | sí (el buscado) |

El primero no es hipotético: es exactamente la salida de
`canonizarIdentificacion('NIT', '155709241')`. Ese tercero quedaría archivado
como documento propio de PFI, en la carpeta `PROPIO`, sin identificación en el
nombre — **y eso sí sería silencioso**. La propuesta simple cambiaría un fallo
visible por uno invisible.

### El diseño que sí funciona (para cuando llegue el documento)

Tres condiciones, todas necesarias:

1. **Aplicar el prefijo solo si la cadena de dígitos supera los 10.** Por debajo
   de 11 ya hay un camino que funciona —coincidencia exacta o canónica— y el
   prefijo no debe intervenir. Por encima de 10, hoy el resultado es `null`:
   pérdida total. Así el cambio **solo agrega reconocimiento donde hoy no hay
   ninguno**, y el riesgo de regresión es cero por construcción, no por cuidado.
   Verificado: con esta guarda ninguno de los tres casos de arriba colisiona.
2. **Derivar la longitud del prefijo de la propia clave de `NITS_PROPIOS`**, en
   vez de fijar un 9 que se desactualiza. La pregunta pasa a ser "¿la cadena
   empieza por alguna clave propia?" y sirve para cualquier longitud.
3. **Dejar aviso en cada coincidencia por prefijo.** Para el 7.5 es trazabilidad,
   no cosmética.

Más el ajuste de la **regla 7 del prompt**, que hoy dice *"escribe 155709241
completo, sin quitarle el último dígito"*: frente a un documento con forma larga,
"completo" es ambiguo. Debe pedir solo la parte base. Si no, prompt y código
compiten — la causa raíz de la mitad de los hallazgos de este proyecto.

### Por qué esto es aceptable para un PROPIO y no lo sería para un tercero

Verificado en ejecución: al reconocer una identificación propia, el validador
hace `c.nit = null`. Resultado para un documento de PFI:

```
serieDe        = RG-GF
claveLogica    = RG|GF|PROPIO|ESTADOS-FINANCIEROS
nombre archivo = RG-GF-001_V01_Estados-Financieros_20260902.pdf
```

La identificación **no llega al nombre, ni a la serie, ni a la clave lógica**: es
solo una llave de búsqueda. Por eso el problema de forma canónica que en agosto
partió un tercero en dos expedientes **aquí no puede ocurrir** — no hay nada que
partir. En un tercero, el mismo mecanismo sí sería peligroso.

### ⚠️ La trampa de implementarlo a ciegas

La propuesta asume que el parámetro `155709241` es el **comienzo** de la forma
larga. Si el RUC real no empezara por ahí, la guarda no se dispararía nunca **y
no habría forma de notarlo**: el silencio sería idéntico al de "no hizo falta".

Por eso implementarlo no habría cerrado B1; solo habría cambiado la pregunta
pendiente de *"¿en qué forma viene?"* a *"¿confirmamos que empieza por
155709241?"*. Esperar el documento resuelve las dos de una vez.

### Idea anotada para cuando se retome

Hoy `limpiarNIT()` no distingue *"menos de 7 dígitos"* de *"más de 10"*. El
segundo caso es justo la señal que estamos esperando. Registrarlo en BITACORA con
el texto crudo haría que **el primer documento de PFI conteste la pregunta por sí
solo**, sin que nadie tenga que acordarse de mirar. Encaja con el pendiente ya
abierto de los huecos de la bitácora.

### Lo que sigue sin resolver, en cualquier caso

Un **tercero extranjero** con RUC largo sigue perdiendo la identificación y
yendo a REVISAR. La propuesta está acotada a los propios. Va junto a la
limitación de pasaportes.

---

# ANEXO 5 — Sesión del 3 de septiembre de 2026

> Cierra el último bloqueante técnico (B1) y los huecos de trazabilidad de
> BITACORA. Nada de esto está probado en campo todavía.

---

## 1. RESULTADO

- **El RUC de PFI viene siempre en forma corta: `155709241`.** Dato del
  usuario. Es exactamente el caso que el anexo anterior daba por bueno, así
  que **B1 queda cerrado en código sin tocar una línea**.
- **La forma larga del RUC se cierra como NO NECESARIA**, no como aplazada
  (ver 3).
- **Huecos de BITACORA cerrados en código**: se agregaron los eventos que
  faltaban. Empujado a Apps Script y cotejado (9 de 9 idénticos).
- **El sistema sigue `PAUSADO = true`**, pero ya no por el RUC: solo falta la
  prueba de campo.

---

## 2. B1 — VERIFICADO EN LOCAL, SIN CAMBIOS DE CÓDIGO

Se ejercitó el camino completo con el número real antes de declarar nada:

| Caso | Resultado |
|---|---|
| `limpiarNIT('155709241')` | `155709241` — 9 dígitos, dentro del rango 7–10 |
| `canonizarIdentificacion('RUC', …)` | sin tocar, e idempotente |
| `NITS_PROPIOS['155709241']` | `PFI` ✓ |
| Documento de PFI marcado como RUC | origen `PFI`, sin identificación en el nombre, sin revisión |
| **Marcado mal como `NIT`** | canoniza a `1557092416` (DV inventado) **pero la guarda por forma cruda lo rescata**: sigue saliendo `PFI` |
| Propuesto como tercero (`CLI`) | corregido a `PFI` con aviso explícito |
| Nombre resultante | `RG-GF-001_V01_Estados-Financieros_20260903.pdf` |

La guarda de la forma cruda —agregada el 2-sep "por si acaso"— es la que
sostiene el caso del TIPO_ID equivocado. Sin ella, un error del modelo
archivaría un documento propio de PFI como de tercero, con un DV inventado
en el nombre.

⚠️ **Falta la prueba de campo con un documento real de PFI.** Lo resuelto es
la pregunta de DISEÑO (en qué forma viene el número), que era el bloqueante.
Verificado en local no es verificado en ejecución.

---

## 3. LO QUE SE CIERRA SIN IMPLEMENTAR

**3.1 La forma larga del RUC (anexo 4 cont., §17).** Todo el diseño de
coincidencia por prefijo —las tres condiciones, el riesgo de chocar con
`1557092416` y con cédulas de 10 dígitos, el ajuste de la regla 7— existía
para un caso que no ocurre. Sale del backlog.

**3.2 La idea derivada de registrar en BITACORA las identificaciones de más
de 10 dígitos.** Su propósito era que *"el primer documento de PFI conteste la
pregunta por sí solo"*. La pregunta ya está contestada.

**3.3 La razón del `PAUSADO = true`.** El anexo anterior lo dejó así porque
*"reanudar pondría a procesar documentos con un cambio cuya corrección todavía
depende de la forma del RUC"*. Esa dependencia desapareció.

Sigue abierto, sin cambios: un **tercero extranjero** con RUC largo pierde la
identificación y va a REVISAR (junto a la limitación de pasaportes).

---

## 4. HUECOS DE BITACORA — CERRADOS EN CÓDIGO

Pendiente abierto desde el Punto 7 del 28-ago: la bitácora solo registraba
LOTE, ARCHIVADO, CONFLICTO, RECHAZADO y los errores. Los casos que requieren
intervención humana no dejaban rastro, y las obsolescencias existían solo en
LISTADO_MAESTRO.

### `Motor.gs` — `procesarUno()`
Cada salida temprana registra ahora su evento con el mismo detalle que se
escribe en APROBACIONES: `DUPLICADO`, `SIN_TEXTO`, `NO_CLASIFICADO`.

Para `REVISAR` se usó `else if` después del bloque de conflictos, no un `if`
independiente: `CONFLICTO` ya deja su propio rastro y un documento no debe
producir dos entradas por el mismo motivo. El evento `REVISAR` cubre el resto
—confianza baja, similitud de título, datos de tercero incompletos—.

### `Indice.gs` — `marcarObsoletos(fileIds, reemplazadoPor)`
Antes solo registraba `ERROR` cuando fallaba el movimiento a `_OBSOLETOS`: el
caso normal (éxito) no dejaba rastro. Ahora emite `OBSOLETO` con el CODIGO del
documento obsoletado.

El segundo parámetro es nuevo y **solo alimenta la bitácora**; `aplicarArchivado()`
le pasa el `nombre` del archivo que reemplaza. Sin él, la correlación entre el
obsoleto y su reemplazo dependía de la cercanía de los timestamps.

### Lo que NO cubren las pruebas locales
`procesarUno()` y `marcarObsoletos()` dependen de `SpreadsheetApp` y `DriveApp`;
ninguna de las tres suites las toca (buscar `marcarObsoletos` o `bitacora(` en
`test/` no devuelve nada). Las suites siguen en verde —133 / 68 / 20.000+5.000—
pero **eso solo prueba que no se rompió la sintaxis ni las funciones puras**.
Este cambio se verifica únicamente en ejecución.

---

## 5. AUDITORÍA DE LA LLAMADA A LA API (no se cambió nada)

Se auditó `Clasificador.gs` contra las prácticas actuales de la API. Modelo
objetivo: el que ya usa el código, `claude-haiku-4-5-20251001` (confirmado
vigente, no es un ID obsoleto).

**Lo que está bien y no se toca:** header `anthropic-version: 2023-06-01`
(vigente), sin parámetros de muestreo fósiles, sin `budget_tokens`, sin
cabeceras beta obsoletas, reintento con espera creciente para 429 y 5xx, y
descripciones de parámetros detalladas (que es lo que más pesa en el desempeño
de una herramienta). Las reglas del prompt tienen procedencia documentada
contra este mismo modelo, así que su lenguaje enfático **se conserva**: son
mitigaciones verificadas, no retórica heredada de modelos viejos.

**Hallazgo único (no aplicado):** `tool_choice` forzado + el "Plan B" que
reparsea texto + `extraerJSON()` son el patrón *JSON-via-forced-tool*, que hoy
tiene un reemplazo dedicado: structured outputs (`output_config.format`), que
Haiku 4.5 soporta. No es un error —en Haiku 4.5 el `tool_choice` forzado
funciona; solo devuelve 400 en Fable 5.1— sino una modernización opcional. El
diff está redactado y no se aplicó: cambia la forma de la respuesta de la API
y exige prueba de campo.

### Prompt caching: NO aplica en este modelo

Se midió el prefijo estable real: prompt de sistema ~1.900–2.300 tokens
(9.203 caracteres) + esquema de la herramienta ~650 = **~2.550–2.950 tokens**.
**Haiku 4.5 exige un mínimo de 4.096 tokens para cachear**; por debajo no
cachea y no avisa (`cache_creation_input_tokens: 0`). Estamos entre 1.150 y
1.800 tokens cortos: demasiado para ser error de estimación.

Segundo motivo, independiente: el ahorro solo aparece con dos o más llamadas
dentro de la ventana de 5 minutos. Con `analizarBandeja()` cada 15 min y pocos
documentos por ciclo, cada llamada sería una escritura sin lectura — el 1,25×
del write premium, **más caro** que no cachear.

Revisitar solo si el prompt supera los 4K tokens o si se migra a un modelo con
mínimo más bajo (Opus 5 / Sonnet 5: 512–1024).

---

## 6. ESTADO DEL DESPLIEGUE

| | |
|---|---|
| `pruebas.js` | 133 pasadas, 0 fallidas |
| `prueba_origen.js` | 68 ok, 0 fallas |
| `fuzz.js` | 20.000 + 5.000, 0 excepciones, 0 invariantes violados |
| Cotejo `src/` ↔ editor | **9 de 9 idénticos**, 0 marcadores faltantes |
| `PAUSADO` | **`true`** — el sistema sigue detenido |

El push se hizo con la configuración desechable (`clasp-push.json` con
`rootDir: "src"`), borrada inmediatamente después.

---

## 7. PENDIENTES ACTUALIZADOS

**Prueba de campo (lo único que queda para cerrar dos frentes)**
1. Reanudar (`PAUSADO = false`), `diagnostico()` y prueba de humo.
2. Ejercitar los eventos nuevos de BITACORA: un escaneo ilegible (`SIN_TEXTO`),
   una copia de un documento ya archivado (`DUPLICADO`), y una v2 de un
   documento vigente (`OBSOLETO` + `ARCHIVADO`).
3. Documento real de PFI (`RG-GF-…`, sin identificación en el nombre).

**Cerrados en esta sesión**
- ~~NIT/RUC real de PFI (B1)~~ → **CERRADO en código**, falta prueba de campo.
- ~~Forma larga del RUC~~ → **CERRADO como no necesaria.**
- ~~Huecos de BITACORA~~ → **CERRADOS en código**, falta prueba de campo.

**Documentación**
4. **B1 del checklist sigue mal redactado** ("NIT real de PFI… 10 dígitos
   canónicos"). Reescribirlo en términos de RUC de 9 dígitos sin DV.

**Deuda técnica: sin cambios** (pasaportes, `NOMBRE_ARCHIVO` al obsoletar,
originales sin marcar, guarda `razonSocial` vs `titulo`, regla 10, refactor de
`formatearAprobaciones()`), más uno nuevo:
5. Structured outputs en vez de `tool_choice` forzado (§5). Opcional.

**Decisiones abiertas que condicionan la instalación**
A1 ubicación del archivo documental, A2 cuenta ejecutora, A3 acta, A4
aprobadores, A5 retención y respaldo.

---

## 8. LECCIONES DE MÉTODO

- **Un bloqueante puede cerrarse con un dato, sin escribir código.** B1 llevaba
  semanas abierto; la respuesta fue una línea del usuario y la verificación de
  que el código ya la manejaba. Antes de implementar, comprobar si el caso real
  ya está cubierto.
- **Aplazar a propósito salió barato.** El diseño de la forma larga (§17 del
  anexo 4) se analizó pero no se implementó, a la espera del dato. El dato lo
  volvió innecesario: se ahorró un cambio riesgoso que habría podido archivar
  terceros colombianos como documentos propios de PFI.
- **Una optimización puede no ser aplicable, y eso es un resultado.** El
  caching parecía dinero sobre la mesa hasta que se midió el prefijo contra el
  mínimo del modelo. Medir antes de proponer.
- **La procedencia protege al prompt de una auditoría.** El lenguaje enfático
  de las reglas se conservó porque cada una nació de un fallo documentado
  contra este mismo modelo. Sin ese registro, una auditoría de "quitar cruft"
  las habría podado.
- **Un evento por documento, no uno por motivo.** El `else if` del `REVISAR`
  frente al `CONFLICTO` es deliberado: dos entradas para el mismo documento
  harían que contar eventos en BITACORA dejara de significar contar documentos.

---

# ANEXO 5 (continuación) — Prueba de campo de BITACORA

> Cierra en ejecución los huecos de trazabilidad. Añade un hallazgo operativo
> sobre `clasp` que costó una corrida en falso.

---

## 9. RESULTADO DE LA PRUEBA DE CAMPO

**Cuatro de los cinco eventos nuevos, verificados en ejecución real:**

| Evento | Cómo se provocó | Resultado |
|---|---|---|
| `SIN_TEXTO` | escaneo ilegible en la bandeja | ✓ registrado |
| `OBSOLETO` | v2 de un certificado ya vigente, aprobado y ejecutado | ✓ registrado |
| `DUPLICADO` | copia de un documento ya archivado | ✓ registrado |
| `REVISAR` | documento genérico bajo el umbral de 0,75 | ✓ registrado |
| `NO_CLASIFICADO` | — | **verificado por inspección, no en ejecución** |

**Por qué `NO_CLASIFICADO` no se ejercitó, a propósito.** Exige que
`validarClasificacion()` devuelva `ok:false`: un tipo o proceso fuera del enum,
o un documento sin título. Con `tool_choice` forzado y los enums en el esquema
de la herramienta, eso prácticamente no ocurre con un documento real, y
fabricarlo habría exigido tocar el código o el esquema **solo para la prueba** —
que es justamente sanear el caso de prueba al revés. Recorre además el mismo
camino que los otros tres (`encolar` + `bitacora` con el mismo detalle), así que
el riesgo residual es bajo. **Queda registrado como cubierto por inspección, no
como probado.**

Ningún documento produjo dos entradas. El `else if` entre `REVISAR` y
`CONFLICTO` se sostiene.

---

## 10. HALLAZGO OPERATIVO — `clasp push` Y EL EDITOR ABIERTO NO CONVIVEN

### El síntoma

Tras empujar el código y cotejar **9 de 9 idénticos**, la primera corrida no
registró nada en BITACORA. Un cotejo posterior mostró `Motor.gs` e `Indice.gs`
otra vez en DIFIEREN, con el editor conservando las versiones **anteriores** al
push — y `Config.gs` con el `PAUSADO = false` que el usuario acababa de poner.

### La causa

El editor de Apps Script estaba **abierto en el navegador desde antes del push**.
Al guardar el cambio de `PAUSADO`, el editor guardó **toda su copia en memoria
del proyecto**, no solo el archivo editado, y revirtió los dos archivos recién
empujados. Los otros siete no se notaron porque eran idénticos en ambas
versiones de todos modos.

### La regla

**Push → recargar la pestaña → recién ahí tocar el editor.** Cualquier pestaña
abierta desde antes de un `clasp push` es una bomba de tiempo: su próximo
guardado revierte el push, en silencio y sin conflicto.

⚠️ Recargar **antes** del push no sirve de nada — es el error que se cometió al
intentar corregirlo la primera vez. La recarga solo vale después.

### Lo que salvó el diagnóstico

`tools/cotejo.js`. Sin él, la conclusión natural habría sido "el evento
`SIN_TEXTO` no funciona" y se habría depurado código que estaba bien. El cotejo
mostró que el código correcto simplemente no estaba allá. Es la segunda vez que
esta herramienta ataja una deriva que nadie habría notado.

### Riesgo secundario, confirmado

La corrida de diagnóstico se hizo con `node tools/cotejo.js --conservar`, que
deja `cotejo/` llena de la copia **vieja** del editor. Con `.clasp.json`
apuntando su `rootDir` ahí, un `clasp push` sin `-P` habría subido ese código
viejo y revertido el proyecto. Se limpió antes de empujar. La advertencia del
anexo 4 §5 no era teórica.

---

## 11. ESTADO AL CIERRE

| | |
|---|---|
| Cotejo `src/` ↔ editor | **9 de 9 idénticos**, 0 marcadores faltantes |
| `PAUSADO` | **`false`** — el sistema está corriendo otra vez |
| Eventos de BITACORA nuevos | 4 probados en ejecución, 1 por inspección |

`PAUSADO` volvió a `false` y así se deja: la razón por la que estaba pausado
—la forma del RUC de PFI— quedó resuelta. El valor se bajó también a
`src/Config.gs` para que el push no lo revirtiera.

**Sigue pendiente la prueba de campo con un documento real de PFI** (§7.3). No
exige el sistema pausado: si el RUC llegara en una forma inesperada, la guarda
manda el documento a REVISAR, no lo archiva mal.

---

## 12. LECCIÓN DE MÉTODO

- **Dos editores sobre el mismo archivo divergen aunque ninguno se equivoque.**
  Es la misma lección del anexo 3 (`PAUSADO` perdido entre el editor y `src/`),
  esta vez en la dirección contraria: allá un cambio no bajó al repositorio,
  aquí una pestaña vieja revirtió lo que ya había subido. El repositorio y el
  editor no se sincronizan solos en ninguna de las dos direcciones.
- **Cuando una prueba falla, verificar primero que se probó lo que se cree.**
  El primer reflejo fue buscar el error en el evento; el código correcto ni
  siquiera estaba desplegado. Cotejar antes de depurar.
- **No fabricar el caso de prueba tocando el código.** `NO_CLASIFICADO` se dejó
  sin ejercitar y declarado como tal, en vez de forzar un esquema inválido para
  producir un check verde. Un verde fabricado vale menos que un pendiente
  honesto.
