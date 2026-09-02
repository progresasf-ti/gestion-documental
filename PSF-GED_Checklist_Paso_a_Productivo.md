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

`Instalador.gs` línea 9 crea todo en `DriveApp.getRootFolder()`, es decir en
**Mi unidad de quien ejecuta la instalación**. En una cuenta corporativa eso
significa que el archivo documental completo queda como **propiedad personal de
un empleado**. Si esa persona sale de la compañía y se suspende su cuenta, el
archivo se va con ella.

Para un SGC esto es un riesgo serio y contradice el propósito del sistema.

- [ ] Decidir: **unidad compartida** (recomendado) o Mi unidad de una cuenta de servicio.
- [ ] Si es unidad compartida: crearla y definir quién es administrador.
- [ ] Modificar `Instalador.gs` para recibir el ID de la carpeta destino en vez de
      usar `getRootFolder()`.
- [ ] ⚠️ Probar el sistema completo en la unidad compartida **antes** de cargar
      documentos reales. Las unidades compartidas manejan permisos y parentesco
      de archivos de forma distinta, y hay tres puntos del código que dependen
      de eso:
  - `Motor.gs` líneas 232-233 (`moverA`): usa `removeFile`/`addFile`.
  - `Instalador.gs` líneas 58-59: el mismo patrón, al mover la hoja.
  - `Instalador.gs` línea 53: `SpreadsheetApp.create()` crea en Mi unidad y
    después mueve; mover a unidad compartida exige permisos que la cuenta
    ejecutora puede no tener.

### A2. 🔴 Con qué cuenta se instala

Los disparadores corren **como el usuario que los creó**, y la columna
`APROBADO_POR` registra `Session.getActiveUser().getEmail()`. Si esa cuenta se
suspende, el sistema deja de correr sin aviso.

- [ ] Definir la cuenta ejecutora. Recomendado: cuenta de servicio o genérica
      del área de calidad, no la cuenta personal de una persona.
- [ ] Documentar quién tiene acceso a esa cuenta.
- [ ] Definir el procedimiento si esa cuenta cambia.

### A3. 🔴 Firmar el acta de decisiones de clasificación

`PSF-GED_Acta-Decision-Reglas-Clasificacion.pdf` sigue **sin firmar**. Es lo que
le da dueño a las reglas. Sin ella, ante la pregunta de auditoría *"¿quién
decidió que los estados financieros de un tercero van a GR?"*, la respuesta es
"el sistema".

- [ ] Actualizar el acta con las decisiones tomadas el 1 de septiembre:
  - Regla 6: contables de tercero → DE-GR; propios → RG-GF.
  - Regla 9: MC, PL y CA van al proceso del que trata el documento.
      Política de Calidad → GC.
  - `ORIGENES` describe la relación con el tercero del NIT, no al emisor.
  - Forma canónica del NIT: 9 dígitos + DV.
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

### B1. 🟡 Identificación real de PFI — implementada, falta prueba de campo

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

⚠️ **Lo que falta, y por qué no está cerrado:**

- [ ] **Ver un documento real de PFI** y confirmar en qué forma aparece el RUC.
      Si trae sufijos (`155709241-2-2021`), `limpiarNIT()` junta los dígitos,
      rechaza más de 10 y devuelve `null`: la identificación se pierde. El fallo
      **no es silencioso** —o queda un aviso en NOTAS, o el documento va a
      REVISAR— pero el reconocimiento pasa a depender de que el modelo proponga
      `PFI` por su cuenta.
- [ ] **Prueba de campo** con ese documento.
- [ ] Reanudar (`PAUSADO = false`) cuando lo anterior esté resuelto.

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

- [ ] ⚠️ **Pendiente de A1:** si A1 decide unidad compartida, `Instalador.gs`
      cambia y hay que rehacer el cotejo después.

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
  - `LISTADO_MAESTRO`: 23 columnas, **`TIPO_ID` en la 5**, entre ORIGEN y NIT
  - `APROBACIONES`: 20 columnas, **`TIPO_ID` en la 7**, entre ORIGEN y NIT
  - El desplegable APROBADO/RECHAZADO sobre **`SU_DECISION`, columna 18**
  - El formato condicional reacciona a la columna **`ESTADO` ($Q)**
- [ ] **C7.** Ejecutar `diagnostico()`. Debe dar ✓ en las 8 líneas, incluida
      "API Anthropic responde 200" y "Disparadores: 3 de 3".
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

⚠️ **MC, MZ y LG nunca se han ejercitado.** Son 3 de 10 tipos, y **LG son los
documentos societarios**, de los más sensibles en auditoría.

- [ ] Probar un documento tipo **MC** (Manual de Calidad)
- [ ] Probar un documento tipo **MZ** (Matriz)
- [ ] Probar un documento tipo **LG** (Documento Legal / Societario)

### D4. 🟡 Rutas de excepción

Ninguna se ha probado en profundidad.

- [ ] **Duplicado**: subir dos veces el mismo archivo → estado `DUPLICADO`
- [ ] **Sin texto**: subir un escaneo ilegible → estado `SIN_TEXTO`, va a `01_EN_REVISION`
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
