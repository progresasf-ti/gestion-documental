/**********************************************************************
 * PSF GED — Motor.gs
 * Orquestación del flujo completo. Dos funciones automáticas:
 *
 *   analizarBandeja()   cada 15 min — lee, clasifica y PROPONE. No toca nada.
 *   ejecutarDecisiones() cada 15 min — aplica lo que usted aprobó en la hoja.
 *
 * REGLA INVIOLABLE: ningún archivo se renombra, mueve o marca sin que
 * exista la palabra APROBADO escrita por una persona en la hoja
 * APROBACIONES. El sistema propone; usted dispone.
 **********************************************************************/

/* ================= FASE 1 — ANALIZAR Y PROPONER ================== */

function analizarBandeja() {
  if (PAUSADO) return;
  cargarConfig();
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return;   // ya hay otra ejecución en curso

  try {
    var inbox = DriveApp.getFolderById(CONFIG.INBOX_ID);
    var revision = DriveApp.getFolderById(CONFIG.REVISION_ID);
    var indice = leerIndice();
    var it = inbox.getFiles();
    var n = 0;

    while (it.hasNext() && n < CONFIG.MAX_LOTE) {
      var file = it.next();
      n++;
      try {
        procesarUno(file, revision, indice);
      } catch (e) {
        bitacora('ERROR', file.getName(), String(e.message || e));
        moverA(file, DriveApp.getFolderById(CONFIG.MANUAL_ID));
      }
    }
    if (n > 0) bitacora('LOTE', n + ' archivo(s)', 'Analizados y puestos en aprobación.');
  } finally {
    lock.releaseLock();
  }
}

function procesarUno(file, revision, indice) {
  var ext = extraerTexto(file);

  /* Duplicado exacto: el mismo archivo ya fue registrado antes. */
  var dup = yaRegistrado(indice, ext.huella);
  if (dup) {
    encolar(file, null, null, 'DUPLICADO',
      'Contenido idéntico a ' + dup.CODIGO + ' (' + dup.NOMBRE_ARCHIVO + '). No requiere archivarse.', []);
    moverA(file, revision);
    return;
  }

  if (!textoUtilizable(ext.texto)) {
    encolar(file, null, null, 'SIN_TEXTO',
      'No se pudo extraer texto legible' + (ext.error ? ': ' + ext.error : '. Puede ser un escaneo de baja calidad.'), []);
    moverA(file, revision);
    return;
  }

  var bruto = clasificarConIA({
    texto: ext.texto,
    nombreOriginal: file.getName(),
    fechaCarga: Utilities.formatDate(file.getDateCreated(), CONFIG.TIMEZONE, 'yyyy-MM-dd'),
    paginas: ext.paginas
  });

  /* El índice va al validador porque el ORIGEN se hereda del tercero ya
     registrado, no lo decide el modelo documento a documento. */
  var v = validarClasificacion(bruto, {
    fechaCarga: Utilities.formatDate(file.getDateCreated(), CONFIG.TIMEZONE, 'yyyy-MM-dd'),
    indice: indice
  });

  if (!v.ok) {
    encolar(file, null, null, 'NO_CLASIFICADO', v.errores.join(' '), []);
    moverA(file, revision);
    return;
  }

  var c = v.clasificacion;
  c.huella = ext.huella;

  var decision = resolverConsecutivoYVersion(c, indice);
  var similares = documentosSimilares(c, indice);
  var conflictos = casiColisiones(c, indice);
  var nombre = construirNombre(c, decision.consecutivo, decision.version, extensionDe(file.getName()));

  var estado = v.requiereRevision ? 'REVISAR' : 'PENDIENTE';
  var notas = v.avisos.slice();
  if (decision.esNuevaVersion) {
    notas.push('Se registrará como versión ' + decision.version + ' del documento ' +
               codigoDe(c, decision.consecutivo) + '; la anterior quedará OBSOLETA.');
  }
  if (similares.length) {
    notas.push('ATENCIÓN: se parece a ' + similares[0].codigo + ' ("' + similares[0].titulo +
               '", ' + Math.round(similares[0].similitud * 100) + '% de coincidencia). ' +
               'Si es el mismo documento, escriba VERSION_DE ' + similares[0].codigo + '.');
    estado = 'REVISAR';
  }
  /* Casi-colisión: mismo tercero y mismo título, pero distinto TIPO o PROCESO.
     Sin este aviso el documento entraría como NUEVO en silencio, sin versionar
     y sin marcar obsoleta la versión anterior. El remedio NO es corregir el
     título (ya coincide) sino la clasificación, que se lee de esta misma fila. */
  if (conflictos.length) {
    var k = conflictos[0];
    notas.push('CONFLICTO DE CLASIFICACIÓN: este documento tiene el mismo título que ' +
               k.codigo + ' (' + k.estado + ') del mismo tercero, pero difiere en ' +
               k.motivo + '. Si son el mismo documento, corrija TIPO y PROCESO en esta ' +
               'fila para que coincidan con ' + k.codigo + ' y escriba APROBADO; se ' +
               'registrará como versión nueva. Si de verdad son documentos distintos, ' +
               'apruebe sin cambios.');
    estado = 'REVISAR';
    bitacora('CONFLICTO', file.getName(), k.codigo + ' — ' + k.motivo);
  }

  encolar(file, c, { nombre: nombre, decision: decision }, estado, notas.join(' | '), similares);
  moverA(file, revision);
}

/* ================= FASE 2 — EJECUTAR LO APROBADO ================= */

function ejecutarDecisiones() {
  if (PAUSADO) return;
  cargarConfig();
  var ss = SpreadsheetApp.openById(CONFIG.INDEX_SHEET_ID);
  var hoja = ss.getSheetByName(CONFIG.QUEUE_SHEET_NAME);
  var datos = hoja.getDataRange().getValues();
  var cab = datos[0];
  var C = {}; cab.forEach(function (h, i) { C[h] = i; });

  for (var i = 1; i < datos.length; i++) {
    var fila = datos[i];
    var decision = String(fila[C['SU_DECISION']] || '').trim().toUpperCase();
    if (!decision) continue;
    if (String(fila[C['ESTADO']]) === 'EJECUTADO') continue;

    try {
      if (decision === 'APROBADO') {
        aplicarArchivado(fila, C, i + 1, hoja);
      } else if (decision === 'RECHAZADO') {
        var f = DriveApp.getFileById(fila[C['FILE_ID']]);
        moverA(f, DriveApp.getFolderById(CONFIG.MANUAL_ID));
        hoja.getRange(i + 1, C['ESTADO'] + 1).setValue('EJECUTADO');
        hoja.getRange(i + 1, C['RESULTADO'] + 1).setValue('Enviado a revisión manual.');
        bitacora('RECHAZADO', fila[C['NOMBRE_ORIGINAL']], '');
      } else if (decision.indexOf('VERSION_DE') === 0) {
        hoja.getRange(i + 1, C['RESULTADO'] + 1)
            .setValue('Marcado como versión de ' + decision.replace('VERSION_DE', '').trim() +
                      '. Corrija el TITULO_PROPUESTO para que coincida con el documento original y vuelva a escribir APROBADO.');
      } else {
        hoja.getRange(i + 1, C['RESULTADO'] + 1)
            .setValue('Decisión no reconocida. Escriba APROBADO o RECHAZADO.');
      }
    } catch (e) {
      hoja.getRange(i + 1, C['RESULTADO'] + 1).setValue('ERROR: ' + (e.message || e));
      bitacora('ERROR_EJECUCION', fila[C['NOMBRE_ORIGINAL']], String(e.message || e));
    }
  }
}

function aplicarArchivado(fila, C, numFila, hoja) {
  var file = DriveApp.getFileById(fila[C['FILE_ID']]);

  /* Se reconstruye la clasificación desde la hoja: si usted corrigió una
     celda, manda su corrección, no lo que dijo la IA. */
  var c = {
    tipo: String(fila[C['TIPO']]).trim().toUpperCase(),
    proceso: String(fila[C['PROCESO']]).trim().toUpperCase(),
    origen: String(fila[C['ORIGEN']]).trim().toUpperCase(),
    tipoIdentificacion: String(fila[C['TIPO_ID']] || '').trim().toUpperCase(),
    nit: String(fila[C['NIT']] || '').trim(),
    razonSocial: String(fila[C['RAZON_SOCIAL']] || ''),
    titulo: String(fila[C['TITULO_PROPUESTO']] || ''),
    fechaDocumento: normalizarFecha(fila[C['FECHA_DOCUMENTO']], new Date()),
    confianza: Number(fila[C['CONFIANZA']]) || 0,
    justificacion: String(fila[C['JUSTIFICACION']] || ''),
    huella: String(fila[C['HUELLA']] || '')
  };
  /* El índice se lee ANTES de validar: el validador lo necesita para heredar
     el ORIGEN del tercero. El consecutivo se recalcula con el mismo índice y
     AHORA, no cuando se propuso: entre la propuesta y la aprobación pudieron
     archivarse otros documentos. */
  var indice = leerIndice();
  var vv = validarClasificacion(c, { indice: indice });
  if (!vv.ok) throw new Error('La fila corregida sigue inválida: ' + vv.errores.join(' '));
  c = vv.clasificacion;
  c.huella = String(fila[C['HUELLA']] || '');

  var decision = resolverConsecutivoYVersion(c, indice);
  var nombre = construirNombre(c, decision.consecutivo, decision.version, extensionDe(String(fila[C['NOMBRE_ORIGINAL']])));

  var carpeta = carpetaDestino(c);
  var objetivo;

  if (CONFIG.CONSERVAR_ORIGINAL) {
    objetivo = file.makeCopy(nombre, carpeta);
    moverA(file, DriveApp.getFolderById(CONFIG.ORIGINALES_ID));
  } else {
    file.setName(nombre);
    moverA(file, carpeta);
    objetivo = file;
  }

  aplicarEtiqueta(objetivo.getId(), c);
  if (decision.obsoletar.length) marcarObsoletos(decision.obsoletar);

  registrarEnIndice(c, decision, nombre, objetivo.getId(), carpeta.getName(),
                    Session.getActiveUser().getEmail());

  /* Si la herencia cambió el origen, la celda de la hoja quedaría mintiendo. */
  if (c.origen !== String(fila[C['ORIGEN']] || '').trim().toUpperCase()) {
    hoja.getRange(numFila, C['ORIGEN'] + 1).setValue(c.origen);
  }

  hoja.getRange(numFila, C['ESTADO'] + 1).setValue('EJECUTADO');
  hoja.getRange(numFila, C['NOMBRE_FINAL'] + 1).setValue(nombre);
  hoja.getRange(numFila, C['RESULTADO'] + 1)
      .setValue('Archivado en ' + carpeta.getName() + (decision.esNuevaVersion ? ' como versión ' + decision.version : ''));
  bitacora('ARCHIVADO', nombre, carpeta.getName());
}

/* ================= AUXILIARES ==================================== */

function extensionDe(nombre) {
  var m = String(nombre || '').match(/\.[A-Za-z0-9]{1,5}$/);
  return m ? m[0].toLowerCase() : '';
}

function moverA(file, carpeta) {
  var padres = file.getParents();
  while (padres.hasNext()) padres.next().removeFile(file);
  carpeta.addFile(file);
}

/** Carpeta del proceso dentro del archivo controlado; la crea si no existe. */
function carpetaDestino(c) {
  var raiz = DriveApp.getFolderById(CONFIG.ARCHIVO_ID);

  var nombreProc = PROCESOS[c.proceso].carpeta;
  var itProc = raiz.getFoldersByName(nombreProc);
  var proc = itProc.hasNext() ? itProc.next() : raiz.createFolder(nombreProc);

  /* normalizarTexto() quita tildes antes del reemplazo: \w es ASCII y
     convertiría "Política" en "Pol_tica". El + colapsa las repeticiones
     ("Registro / Evidencia" traía tres guiones bajos) y el segundo replace
     recorta los de los extremos. */
  var nombreTipo = c.tipo + '_' + normalizarTexto(TIPOS[c.tipo].nombre)
                                    .replace(/[^\w]+/g, '_')
                                    .replace(/^_+|_+$/g, '');
  var itTipo = proc.getFoldersByName(nombreTipo);
  var tipo = itTipo.hasNext() ? itTipo.next() : proc.createFolder(nombreTipo);

  var nombreNit = String(c.nit || '').trim() || 'PROPIO';
  var itNit = tipo.getFoldersByName(nombreNit);
  return itNit.hasNext() ? itNit.next() : tipo.createFolder(nombreNit);
}

/** Escribe la fila de aprobación. Es la interfaz humana del sistema. */
function encolar(file, c, propuesta, estado, notas, similares) {
  var ss = SpreadsheetApp.openById(CONFIG.INDEX_SHEET_ID);
  var hoja = ss.getSheetByName(CONFIG.QUEUE_SHEET_NAME);
  var ahora = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm');
  hoja.appendRow([
    ahora, file.getName(), file.getId(),
    c ? c.tipo : '', c ? c.proceso : '', c ? c.origen : '',
    c && c.nit ? (c.tipoId || 'NIT') : '', c ? (c.nit || '') : '',
    c ? c.razonSocial : '', c ? c.titulo : '', c ? c.fechaDocumento : '',
    propuesta ? propuesta.nombre : '', c ? c.confianza : '', c ? c.justificacion : '',
    c ? (c.huella || '') : '', notas, estado, '', '', ''
  ]);
}

function bitacora(evento, objeto, detalle) {
  try {
    var hoja = SpreadsheetApp.openById(CONFIG.INDEX_SHEET_ID).getSheetByName(CONFIG.LOG_SHEET_NAME);
    hoja.appendRow([Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss'),
                    evento, objeto, detalle]);
  } catch (e) {}
}

/* ---------- Etiquetas de Drive (opcional) ----------------------- */

function aplicarEtiqueta(fileId, c) {
  if (!CONFIG.LABEL_ID) return;   // no configurado: se omite en silencio
  try {
    var mods = {};
    if (CONFIG.LABEL_CAMPOS.estado)
      mods[CONFIG.LABEL_CAMPOS.estado] = { textValues: ['VIGENTE'] };
    if (CONFIG.LABEL_CAMPOS.proceso)
      mods[CONFIG.LABEL_CAMPOS.proceso] = { textValues: [PROCESOS[c.proceso].nombre] };
    if (CONFIG.LABEL_CAMPOS.retencion)
      mods[CONFIG.LABEL_CAMPOS.retencion] = { textValues: [retencionHasta(c)] };

    Drive.Files.modifyLabels(
      { labelModifications: [{ labelId: CONFIG.LABEL_ID,
          fieldModifications: Object.keys(mods).map(function (k) {
            return Object.assign({ fieldId: k }, mods[k]);
          }) }] },
      fileId
    );
  } catch (e) {
    bitacora('AVISO_ETIQUETA', fileId, String(e.message || e));
  }
}

/* ---------- Resumen diario por correo ---------------------------- */

function resumenDiario() {
  if (PAUSADO) return;
  cargarConfig();
  var hoja = SpreadsheetApp.openById(CONFIG.INDEX_SHEET_ID).getSheetByName(CONFIG.QUEUE_SHEET_NAME);
  var datos = hoja.getDataRange().getValues();
  var cab = datos[0], C = {}; cab.forEach(function (h, i) { C[h] = i; });
  var filas = datos.slice(1).filter(function (f) { return String(f[C['ESTADO']]) !== 'EJECUTADO'; });
  if (!filas.length) return;

  var pend = filas.filter(function (f) { return f[C['ESTADO']] === 'PENDIENTE'; }).length;
  var rev = filas.filter(function (f) { return f[C['ESTADO']] === 'REVISAR'; }).length;
  var otros = filas.length - pend - rev;

  MailApp.sendEmail({
    to: CONFIG.ALERT_EMAIL,
    subject: '[PSF GED] ' + filas.length + ' documento(s) esperando su aprobación',
    htmlBody:
      '<p>Buenos días, Diego.</p>' +
      '<p><b>' + pend + '</b> con clasificación confiable · <b>' + rev + '</b> que conviene revisar · <b>' + otros + '</b> con novedad.</p>' +
      '<p>Escriba <b>APROBADO</b> o <b>RECHAZADO</b> en la columna SU_DECISION:<br>' +
      '<a href="https://docs.google.com/spreadsheets/d/' + CONFIG.INDEX_SHEET_ID + '">Abrir hoja de aprobaciones</a></p>' +
      '<p style="color:#666;font-size:12px">Ningún archivo se ha modificado. El sistema sólo actúa sobre lo que usted apruebe.</p>'
  });
}
