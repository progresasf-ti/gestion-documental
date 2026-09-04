# PSF GED — Checklist de paso a productivo

**Progresa Soluciones Financieras S.A.S.** · Sistema de Gestión Documental ISO 9001:2015 (num. 7.5)
Versión del checklist: 2 · Fecha: 2 de septiembre de 2026

---

## Cómo usar este documento

Las fases van en orden y **no son intercambiables**. La fase A condiciona la B, y
la instalación (fase C) no debe empezar hasta que A y B estén completas.

Marcadores usados:

- 🔴 **Bloqueante.** No se sigue adelante sin esto.
- 🟡 **Necesario antes de declarar producción**, pero no impide instalar el piloto.
- ⚪ Recomendado.
- ⚠️ Trampa conocida: algo que ya falló o casi falla en las pruebas.

---

# FASE A — Decisiones que hay que tomar antes de tocar nada

### A1. 🔴 Dónde vive el archivo documental

⚠️ **Esta es la decisión más costosa de revertir.**

`Instalador.gs` creaba todo en `DriveApp.getRootFolder()`, es decir en **Mi
unidad de quien ejecuta la instalación**. En una cuenta corporativa eso
significa que el archivo documental completo queda como **propiedad personal de
un empleado**. Si esa persona sale de la compañía y se suspende su cuenta, el
archivo se va con ella.

Para un SGC esto es un riesgo serio y contradice el propósito del sistema.

⚠️ **Dato del 4-sep-2026:** el proyecto de producción corre hoy bajo
`angel.castano@gmail.com` — una cuenta **personal de Gmail**, no de la empresa.
Se descubrió al intentar empujar código al proyecto de ensayo con `clasp`. Es el
banco de pruebas, así que no es grave, pero fija el punto de partida real: la
instalación definitiva cambia de carpeta **y de cuenta**.

**Lo que dependía del código ya no depende** (medido el 4-sep, ver
`tools/sondas_A1/`):

| Movimiento | API vieja | `moveTo()` |
|---|---|---|
| Mi unidad → Mi unidad | ✅ | ✅ |
| Mi unidad → unidad compartida | ✅ | ✅ |
| **dentro de la unidad compartida** | ❌ `Cannot use this operation on a shared drive item.` | ✅ |

El caso que falla es el que el sistema recorre todo el tiempo una vez instalado
allá. Ya está corregido: `moverA()` usa `moveTo()` (commit `0dc10a1`).

- [ ] Decidir: **unidad compartida** (recomendado) o Mi unidad de una cuenta de servicio.
- [ ] Si es unidad compartida: crearla y definir quién es administrador.
- [x] **Hecho 4-sep-2026.** `Instalador.gs` recibe el destino por
      `CONFIG.CARPETA_INSTALACION` a través de `carpetaBase()`. Vacío = Mi
      unidad (como siempre); con ID = esa carpeta. Si el ID no sirve, la
      instalación **revienta**, no cae de vuelta a Mi unidad. Commit `704d1d1`.
- [x] **Hecho 4-sep-2026.** `moverA()` y el traslado de la hoja usan `moveTo()`,
      que sirve en los dos mundos. Verificado en ejecución sobre la instalación
      actual. Commit `0dc10a1`.
- [ ] ⚠️ **Instalación de prueba completa en una unidad compartida desechable**,
      antes de cargar documentos reales. Es lo único que falta para que A1 se
      decida con datos. Bloqueada el 4-sep esperando credenciales de la cuenta
      corporativa.
- [ ] Verificar en esa prueba que `FT-GC-001` quede **en la unidad compartida**:
      nace en Mi unidad por `SpreadsheetApp.create()` y se mueve después.

### A2. 🔴 Con qué cuenta se instala

Los disparadores corren **como el usuario que los creó**. Si esa cuenta se
suspende, el sistema deja de correr sin aviso.

⚠️ **El hueco que A2 destapaba — cerrado el 4-sep-2026 (commit `25df2e2`).**
`APROBADO_POR` registraba `Session.getActiveUser().getEmail()` desde dentro de
`ejecutarDecisiones()`, que corre por disparador de tiempo: eso es **la cuenta
que ejecuta, no la persona que aprobó**. Con una cuenta de servicio —que es
justo la recomendación de este punto— todas las aprobaciones habrían quedado
firmadas por la cuenta de servicio, y la evidencia del numeral 7.5.3.2 se
pierde: el control existiría en el procedimiento pero no en el registro.

Ahora un disparador instalable de edición captura el correo de quien escribe la
decisión y lo deja en `DECIDIDO_POR` (columna 21 de `APROBACIONES`). Si Google
oculta la identidad del editor no se inventa nada: el índice queda con
`(sin identificar; ejecutó <cuenta>)`. Una firma falsa es peor que una ausente.

- [ ] **Verificar en la instalación de ensayo que `e.user` sí entrega el correo**
      dentro del dominio `progresasf.com`. Google sólo lo entrega en el mismo
      dominio del dueño del script. Es lo primero que hay que mirar allá.
- [ ] Definir la cuenta ejecutora. Recomendado: cuenta de servicio o genérica
      del área de calidad, no la cuenta personal de una persona.
- [ ] Documentar quién tiene acceso a esa cuenta.
- [ ] Definir el procedimiento si esa cuenta cambia.

### A3. 🔴 Firmar el acta de decisiones de clasificación

`PSF-GED_Acta-Decision-Reglas-Clasificacion.pdf` sigue **sin firmar**. Es lo que
le da dueño a las reglas. Sin ella, ante la pregunta de auditoría *"¿quién
decidió que los estados financieros de un tercero van a GR?"*, la respuesta es
"el sistema".

- [x] **Hecho 3-sep-2026** (commit `0305e94`). No se reescribió el acta: se
      redactó `docs/ACTA_COMPLEMENTARIA_REGLAS_CLASIFICACION.md`, que la
      **complementa sin reemplazarla**. Registra las decisiones 3–8 tomadas
      después del 31-ago, ratifica la decisión 1 corrigiendo su primer
      fundamento, y deja tres puntos abiertos con recomendación.
- [ ] Convertir la complementaria a PDF.
- [ ] Llenar responsable, cargo y firma **de las dos**.
- [ ] Firmar y archivar.

### A4. 🟡 Quién aprueba

Todo el control del sistema depende de que una persona escriba `APROBADO`.

- [ ] Definir aprobadores y suplentes.
- [ ] Definir permisos: quién edita la hoja `APROBACIONES`, quién solo la ve,
      quién puede tocar `02_ARCHIVO_CONTROLADO`.
- [ ] ⚠️ **Nunca se ha probado con más de un aprobador.** Ver E4.

### A5. 🟡 Retención y respaldo

- [ ] Confirmar que la tabla de retención de `TIPOS` refleja la política real
      de la compañía (hoy: 99 años para MC/PL/CA/LG, 10 para el resto).
- [ ] Definir respaldo del `LISTADO_MAESTRO`. **Es la fuente única de verdad**:
      si se pierde, se pierde la trazabilidad aunque los archivos sigan en Drive.

---

# FASE B — Preparación técnica

### B1. ✅ Identificación real de PFI — CERRADO EN EJECUCIÓN 3-sep-2026

⚠️ **La versión 1 de este checklist decía "NIT real de PFI, en forma canónica de
10 dígitos". Esa premisa era falsa.** PFI no tiene NIT colombiano: se identifica
con **RUC 155709241**, una identificación tributaria extranjera **sin dígito de
verificación de la DIAN**. Sin este cambio, el código habría convertido ese
número en `1557092416` —un DV inventado— y en silencio, porque la verificación
de coherencia solo corre para el tipo `NIT`. Ver sección 12 del ANEXO 4.

Hecho el 2-sep-2026:

- [x] `Taxonomia.gs`: `TIPOS_ID.RUC` con `llevaDV: false`
- [x] `Taxonomia.gs`: `NITS_PROPIOS['155709241'] = 'PFI'`, sin el comodín
- [x] `Clasificador.gs`: `RUC` en el enum del esquema y regla 7 reescrita
- [x] `Clasificador.gs`: guarda que busca `NITS_PROPIOS` por la forma canónica
      **y por la cruda**, porque las claves ya no comparten forma
- [x] `test/prueba_origen.js`: sección 9, 13 aserciones (55 → 68)
- [x] Empujado a Apps Script y cotejado (9 de 9 idénticos)

**Cerrado el 3-sep-2026** (commit `c713a2f`). Prueba de campo con un documento
real de PFI:

- [x] **Documento real visto.** El RUC no aparece con sufijos, así que la forma
      larga nunca hizo falta — el diseño analizado el 2-sep se archiva sin
      implementar, a propósito.
- [x] **Prueba de campo.** Quedó
      `LG-JR-001_V01_Contrato-Doble-Cesion-Sin-Responsabilidad_20260903.docx`,
      **sin rastro de identificación en el nombre**, en
      `07_Juridica/LG_Documento_Legal_Societario/PROPIO`, con `ORIGEN = PFI` y
      `TIPO_ID`/`NIT` vacíos. Sin DV inventado.
- [x] Reanudado (`PAUSADO = false`).

De paso, el tipo **LG quedó ejercitado por primera vez** (estaba en la lista de
tipos nunca probados, junto a MC y MZ).

⚠️ **Lo que ese mismo documento destapó, y que NO es de B1:** es un instrumento
por operación de factoring, no un documento societario, y salió `LG-JR`. La
**regla 5 está incompleta** — manda los contratos de factoring al proceso `OP`
pero nunca dice de qué **tipo** son, así que el modelo toma la regla 4, que sí
responde completo. Afecta a endosos, pagarés, cartas de instrucción y contratos
de factoring: probablemente la familia de mayor volumen del negocio. El cambio
está redactado y **no aplicado**: por decisión del usuario se aplaza al piloto,
donde se decidirá con volumen real y no con un caso. Ver ANEXO 5 §13.

**Diseño ya analizado y aplazado a propósito** (2-sep): reconocer la forma larga
por prefijo, aplicándolo **solo si la cadena supera los 10 dígitos** y derivando
la longitud de la clave de `NITS_PROPIOS`. Sin esa guarda de longitud colisiona
con identificaciones colombianas legítimas —`1557092416` es exactamente lo que da
un NIT colombiano `155709241` con su DV real—. Se aplazó para decidirlo sobre un
documento real y no sobre una forma supuesta.

### B2. ✅ Archivos de código al día — CERRADO 2-sep-2026

⚠️ **Son NUEVE archivos, no ocho.** La versión 1 de este checklist listaba siete
y decía "ocho": faltaban `Extractor.gs` y el manifiesto. `appsscript.json` no
estaba en `src/` y por eso ningún cotejo lo habría detectado.

- [x] `Config.gs` — con `const PAUSADO` **fuera** del objeto `CONFIG`
- [x] `Taxonomia.gs`
- [x] `Nomenclatura.gs`
- [x] `Indice.gs`
- [x] `Clasificador.gs`
- [x] `Motor.gs`
- [x] `Extractor.gs`
- [x] `Instalador.gs`
- [x] `appsscript.json` — el manifiesto: zona horaria y servicio avanzado de Drive
- [x] `Motor.gs` tiene `if (PAUSADO) return;` como **primera línea**, antes de
      `cargarConfig()`, en `analizarBandeja()` (16), `ejecutarDecisiones()` (126)
      y `resumenDiario()` (312) — las **tres** funciones que agenda
      `crearDisparadores()`, no dos
- [x] **Cotejo `src/` ↔ Apps Script**: 9 de 9 idénticos byte a byte (SHA256) y
      17 de 17 marcadores de cambio presentes en el editor

**Cómo se vuelve a verificar** (`.clasp.json` ya configurado, `rootDir` apunta a
`cotejo/` y **nunca** a `src/`):

```
node tools/cotejo.js        # baja el editor, compara y borra la copia
```

Sale con código 0 si está conciliado y 1 si hay deriva. **Correrlo antes de
pegar nada en corporativo.**

- [x] ⚠️ ~~**Pendiente de A1:** si A1 decide unidad compartida, `Instalador.gs`
      cambia y hay que rehacer el cotejo después.~~ `Instalador.gs` ya cambió
      (4-sep, commits `0dc10a1` y `704d1d1`) y `Motor.gs` también. **Rehacer el
      cotejo después del próximo push.**

### B3. ✅ Suites de prueba en verde — VERIFICADO 2-sep-2026

Estructura obligatoria: `proyecto/src/` (los `.gs`) y `proyecto/test/`.

- [x] `node test/pruebas.js` → 133 pasadas, 0 fallidas
- [x] `node test/fuzz.js` → 20.000 + 5.000, 0 excepciones, 0 invariantes violados
- [x] `node test/prueba_origen.js` → 55 ok, 0 fallas
- [x] ⚠️ Las tres son necesarias. `pruebas.js` y `fuzz.js` **no ejercitan la
      herencia del ORIGEN** porque nunca pasan `indice`; eso solo lo cubre
      `prueba_origen.js`.

⚠️ Verde **hoy**. Hay que volver a correrlas después de cualquier cambio de
código, incluido el NIT de PFI de B1.

### B4. 🔴 Configuración del proyecto de Apps Script

Marcado el 2-sep-2026 **solo lo verificable en el código y el manifiesto**. Lo
que queda sin marcar no es que esté mal: es que exige una decisión o mirar la
consola, no leer un archivo.

- [ ] `ANTHROPIC_API_KEY` en Propiedades del script (no en el código) — no
      verificable desde el repositorio; hay que mirar el editor
- [ ] Definir quién tiene acceso a esa clave y cómo se rota
- [ ] Confirmar presupuesto/límites de la cuenta de Anthropic para el volumen esperado
- [x] Servicio avanzado **Drive API** activado — `appsscript.json`, Drive v3
- [ ] `CONFIG.ALERT_EMAIL` apuntando al buzón correcto — el valor **es**
      `diego@progresasf.com`; falta confirmar que ese sea el buzón que se quiere
- [x] `CONFIG.TIMEZONE` = `America/Bogota` — coincide con el manifiesto
- [x] `CONFIG.MODELO` = `claude-haiku-4-5-20251001`, nombre válido y **ya se usa**
      de verdad en `clasificarConIA()` — ⚠️ por eso un nombre mal escrito hace
      fallar `diagnostico()` con un error que parece de clave
- [x] `CONFIG.CONSERVAR_ORIGINAL = true` durante todo el piloto
- [ ] `CONFIG.MAX_LOTE` acorde al volumen (hoy 15, por el tope de 6 minutos) —
      el valor está; "acorde al volumen" depende del volumen real

⚠️ **El manifiesto no viaja en el código.** La zona horaria y el servicio
avanzado de Drive son configuración del proyecto: una instalación nueva en
corporativo **no los hereda** de `src/`, hay que fijarlos allá.

### B5. ⚪ Etiquetas de Drive

- [ ] Decidir si se usan. Si no, dejar `LABEL_ID` vacío: se omite en silencio.
- [ ] Si sí: crear la etiqueta, llenar `LABEL_ID` y `LABEL_CAMPOS`.

---

# FASE C — Instalación

⚠️ **Antes de empezar:** `instalarSistema()` **sí se puede ejecutar más de una
vez**. Reutiliza carpetas y hoja por nombre. El riesgo aparece solo si alguien
**renombró o movió** la carpeta raíz o la hoja: entonces no las encuentra y crea
duplicados.

- [ ] **C1.** Con la cuenta definida en A2, crear el proyecto de Apps Script.
- [ ] **C2.** Pegar los **ocho `.gs`** con `PAUSADO = true`. Correr antes
      `node tools/cotejo.js` contra el proyecto de pruebas, para pegar desde un
      `src/` que se sabe conciliado.
- [ ] **C3.** Configurar `ANTHROPIC_API_KEY` y **replicar el manifiesto**:
      activar el servicio avanzado Drive (v3) y fijar la zona horaria en
      `America/Bogota`. ⚠️ No basta con pegar los `.gs`.
- [ ] **C4.** Ejecutar `instalarSistema()` una vez. Autorizar los permisos.
- [ ] **C5.** Verificar el árbol creado en la ubicación de A1:
      `00_BANDEJA_ENTRADA`, `01_EN_REVISION`, `02_ARCHIVO_CONTROLADO`,
      `98_REVISION_MANUAL`, `99_ORIGINALES`, más las 10 carpetas de proceso.
- [ ] **C6.** Verificar cabeceras de las hojas:
  - `LISTADO_MAESTRO`: **24** columnas, **`TIPO_ID` en la 5**, entre ORIGEN y NIT
    (la versión anterior de este checklist decía 23; estaban mal contadas)
  - `APROBACIONES`: **21** columnas, **`TIPO_ID` en la 7**, entre ORIGEN y NIT
  - `DECIDIDO_POR` **en la 21**, al final. Va al final a propósito: correrla
    movería `SU_DECISION` y `ESTADO`, que están cableadas por posición
  - El desplegable APROBADO/RECHAZADO sobre **`SU_DECISION`, columna 18**
  - El formato condicional reacciona a la columna **`ESTADO` ($Q)**
- [ ] **C7.** Ejecutar `diagnostico()`. Debe dar ✓ en las 8 líneas, incluida
      "API Anthropic responde 200" y **"Disparadores: 4 de 4"** — son cuatro
      desde el 4-sep: los tres de tiempo más el de edición que registra al
      aprobador.
- [ ] **C8.** Poner `PAUSADO = false`.

---

# FASE D — Verificación funcional (con documentos de prueba)

Usar los PDF generados el 1 de septiembre. **No usar documentos reales todavía.**

⚠️ El orden de la tanda 1 no es opcional: la V02 necesita la V01 en el índice
para versionar, y la bancaria necesita el certificado aprobado para heredar el
origen.

**Atajo:** no hay que esperar los 15 minutos. `analizarBandeja()` y
`ejecutarDecisiones()` se ejecutan a mano desde el editor y hacen lo mismo.

### D1. Tanda 1 — mismo tercero, en secuencia

- [ ] Certificado de cámara de comercio v1 → aprobar
- [ ] Certificado v2 → aprobar
- [ ] Certificación bancaria → aprobar

Esperado:

| Documento | Código | Estado |
|---|---|---|
| Certificado v1 | `DE-GR-PRV-9012345677-001` V01 | OBSOLETO, en `_OBSOLETOS` con prefijo |
| Certificado v2 | `DE-GR-PRV-9012345677-001` V02 | VIGENTE |
| Certificación bancaria | `DE-GR-PRV-9012345677-002` V01 | VIGENTE, hereda PRV |

- [ ] NIT de **10 dígitos** en las tres filas
- [ ] `TIPO_ID` = `NIT` en las tres
- [ ] Las dos filas del certificado comparten `CLAVE_LOGICA`
- [ ] La bancaria muestra en NOTAS el ajuste de ORIGEN

### D2. Tanda 2 — los otros cuatro, juntos

| Documento | Esperado | Qué prueba |
|---|---|---|
| EEFF Distribuidora Andina | `DE-GR-PRV-9012345677-003` | Canonización del NIT y regla 6(b) |
| EEFF PSF | `RG-GF-001` | Regla 6(a) y cláusula anti-vocabulario |
| Política de Calidad | `PL-GC-001` | Regla 9 y cláusula anti-emisor |
| Caracterización | `CA-OP-001` | Regla 9(c) |

- [ ] Ningún título contiene "Comparativos" (regla 8(d))
- [ ] Los tres propios tienen NIT y `TIPO_ID` vacíos y van a la carpeta `PROPIO`
- [ ] Rutas correctas, **sin guiones bajos de más ni tildes convertidas**:
      `PL_Politica`, `CA_Caracterizacion_de_Proceso`, `RG_Registro_Evidencia`,
      `DE_Documento_Externo`

### D3. 🟡 Tipos sin cobertura

⚠️ **MC y MZ nunca se han ejercitado.** Quedan 2 de 10 tipos.

- [ ] Probar un documento tipo **MC** (Manual de Calidad)
- [ ] Probar un documento tipo **MZ** (Matriz)
- [x] **LG ejercitado el 3-sep-2026** con el contrato real de PFI. Fue el mismo
      documento que cerró B1, y el que destapó el hueco de la regla 5.

### D4. 🟡 Rutas de excepción

**Prueba de campo del 3-sep-2026** (commit `563801c`): cuatro de los cinco
eventos, verificados en ejecución real.

- [x] **Duplicado**: copia de un documento ya archivado → `DUPLICADO` ✓
- [x] **Sin texto**: escaneo ilegible → `SIN_TEXTO`, va a `01_EN_REVISION` ✓
- [x] **Obsoleto**: v2 de un certificado vigente → `OBSOLETO` + `ARCHIVADO` ✓
- [x] **Revisar**: documento genérico bajo el umbral de 0,75 → `REVISAR` ✓
- [ ] ⚠️ **`NO_CLASIFICADO` sigue cubierto sólo por inspección, no probado.**
      Provocarlo exige que `validarClasificacion()` falle, y con `tool_choice`
      forzado y los enums en el esquema eso casi no ocurre con un documento
      real. Fabricarlo habría exigido tocar el código sólo para la prueba, que
      es sanear el caso de prueba al revés. Riesgo residual bajo: recorre el
      mismo camino que los otros tres.
- [ ] **Rechazo**: escribir `RECHAZADO` → el archivo va a `98_REVISION_MANUAL`
- [ ] **Conflicto de clasificación**: mismo título y tercero, distinto tipo →
      evento `CONFLICTO` en bitácora y estado `REVISAR`
- [ ] **Documento de persona natural** con cédula de 7 u 8 dígitos, `TIPO_ID = CC`
      → el número **no** debe recibir dígito de verificación

---

# FASE E — Piloto con documentos reales

⚠️ **Todo lo probado hasta hoy fueron PDF generados: limpios, con capa de texto,
NIT explícito y fecha clara.** Los documentos reales llegan escaneados torcidos,
con sellos encima y fechas ambiguas. **La ruta de OCR apenas se ha tocado.**

Duración sugerida: **2 a 3 semanas**, con `CONSERVAR_ORIGINAL = true`.

- [ ] **E1.** Definir un volumen acotado y un responsable diario de revisar
      `APROBACIONES` y `01_EN_REVISION`.
- [ ] **E2.** Cargar documentos reales variados: escaneos de baja calidad,
      documentos con sello, fotos de celular, PDF de más de 20 páginas.
- [ ] **E3.** Llevar registro de: tasa de aciertos por tipo, documentos que caen
      en `REVISAR` y por qué, y **casos donde el modelo acertó con confianza baja
      o falló con confianza alta** (este segundo es el peligroso).
- [ ] **E4.** ⚠️ Probar con **dos o más aprobadores simultáneos**. Nunca se ha
      hecho. Riesgo concreto: dos ejecuciones pidiendo el mismo consecutivo.
      Hay `LockService` en `registrarEnIndice()`, pero no se ha probado bajo
      concurrencia real.
- [ ] **E5.** Probar volumen: más de `MAX_LOTE` archivos de golpe, y verificar
      que no se agote el tiempo de ejecución de Apps Script.
- [ ] **E6.** Revisar semanalmente la `BITACORA` buscando `ERROR` y
      `ERROR_EJECUCION`.

---

# FASE F — Documentación (antes de declarar producción)

🟡 Un control sin procedimiento documentado es, en sí mismo, una no conformidad
del 7.5.3. **Todo el control del sistema depende de una persona escribiendo
`APROBADO` en una hoja.**

- [ ] **F1.** Instructivo del aprobador: cómo leer la fila, qué significa cada
      estado, cuándo corregir una celda y cuándo rechazar.
- [ ] **F2.** Instructivo de revisión de `01_EN_REVISION` y `98_REVISION_MANUAL`.
- [ ] **F3.** Documentar las rarezas que hoy solo conoce el equipo del proyecto:
  - ⚠️ El **ORIGEN editado a mano se pierde al aprobar**. La vía correcta es la
    tabla `ORIGENES_TERCEROS` en `Taxonomia.gs`.
  - ⚠️ El ORIGEN de un tercero **lo fija su primer documento**. Si el primero no
    trae la pista, queda mal fijado para todos los demás.
  - ⚠️ Un documento cuyo contenido dice "Versión 2" **se archiva como V01**: la
    versión la lleva el índice, no el documento. Es correcto según 7.5.3, pero
    le va a llamar la atención al auditor.
  - El `LISTADO_MAESTRO` es la fuente única de verdad, no las carpetas.
- [ ] **F4.** Procedimiento de mantenimiento: `PAUSADO`, cómo pegar código,
      cuándo se puede correr `instalarSistema()` y cuándo no.
- [ ] **F5.** Registrar las **limitaciones conocidas** (sección de riesgos abajo).

---

# FASE G — Criterios para declarar producción

No es una fecha, son condiciones:

- [ ] Fases A a D completas
- [ ] Piloto de al menos 2 semanas con documentos reales
- [ ] Los 10 tipos documentales ejercitados al menos una vez
- [ ] Las 4 rutas de excepción de D4 probadas
- [ ] Acta firmada (A3)
- [ ] Instructivos F1 a F3 escritos y socializados
- [ ] Cero `ERROR` sin explicar en la `BITACORA` de la última semana
- [ ] Al menos dos personas saben operar y mantener el sistema

---

# RIESGOS Y LIMITACIONES CONOCIDAS

Documentar, no necesariamente resolver antes de arrancar.

| # | Limitación | Impacto |
|---|---|---|
| 1 | **Pasaportes (`PA`) no soportados.** `limpiarNIT()` borra las letras, así que un pasaporte alfanumérico queda mutilado | Aparece con el primer tercero extranjero |
| 2 | `NOMBRE_ARCHIVO` no se actualiza al obsoletar: el índice apunta a un nombre que ya no existe en Drive. El `FILE_ID` sí es correcto | Cosmético, confunde en auditoría. Arreglo de una línea |
| 3 | La `BITACORA` no registra `SIN_TEXTO`, `DUPLICADO`, `REVISAR` ni obsolescencias | Huecos de trazabilidad |
| 4 | Los originales en `99_ORIGINALES` no se marcan | Puede confundirse con documentación vigente |
| 5 | La regla 10 desempata "por número menor" en vez de por precedencias explícitas | Desempate arbitrario, no razonado |
| 6 | Los índices de columna de `formatearAprobaciones()` están escritos a mano | Agregar una columna los desalinea. La sección 13 de `pruebas.js` lo detecta |
| 7 | Sin guarda determinista entre `razonSocial` y `titulo` en el validador | Riesgo de que la razón social vuelva al título |
| 8 | El sistema depende de un proveedor externo (API de Anthropic) | Definir qué se hace si la API no responde |

---

# ORDEN RECOMENDADO

1. **A1** (unidad compartida) y **A2** (cuenta ejecutora) — condicionan todo
2. **B1** (NIT de PFI) — único bloqueante técnico vivo. **B2 y B3 cerrados el
   2-sep**; de B4 queda la clave de API y las decisiones de presupuesto y buzón
3. **C** (instalación) y **D** (verificación con documentos de prueba)
4. **A3** (acta) y **F** (documentación), en paralelo al piloto
5. **E** (piloto, 2-3 semanas)
6. **G** (declarar producción)

**A1 es lo primero.** Cambiar la ubicación después de tener cientos de documentos
archivados es mucho más caro que decidirlo ahora, y el código no está probado en
unidad compartida.
