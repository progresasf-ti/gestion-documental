/**********************************************************************
 * PSF GED — Instalador.gs
 * Ejecute instalarSistema() UNA sola vez. Crea todo y no toca nada de
 * lo que ya existe en su Drive. Si la vuelve a ejecutar, reutiliza lo
 * que ya creó en lugar de duplicarlo.
 **********************************************************************/

function instalarSistema() {
  var raiz = obtenerOCrear(carpetaBase(), 'PSF GED - Gestion Documental ISO 9001');
  guardarConfig('RAIZ_ID', raiz.getId());

  var mapa = {
    INBOX_ID      : '00_BANDEJA_ENTRADA',
    REVISION_ID   : '01_EN_REVISION',
    ARCHIVO_ID    : '02_ARCHIVO_CONTROLADO',
    MANUAL_ID     : '98_REVISION_MANUAL',
    ORIGINALES_ID : '99_ORIGINALES'
  };
  Object.keys(mapa).forEach(function (k) {
    guardarConfig(k, obtenerOCrear(raiz, mapa[k]).getId());
  });

  /* Subcarpetas por proceso dentro del archivo controlado */
  var arch = DriveApp.getFolderById(CONFIG.ARCHIVO_ID);
  Object.keys(PROCESOS).forEach(function (p) { obtenerOCrear(arch, PROCESOS[p].carpeta); });

  /* Hoja de cálculo: Listado Maestro + Aprobaciones + Bitácora */
  var ss = crearHoja(raiz);
  guardarConfig('INDEX_SHEET_ID', ss.getId());

  crearDisparadores();

  var msg = 'PSF GED instalado.\n\n' +
    'Carpeta raíz: ' + raiz.getUrl() + '\n' +
    'Hoja de control: ' + ss.getUrl() + '\n\n' +
    'Deje sus documentos en 00_BANDEJA_ENTRADA. Cada 15 minutos el sistema los\n' +
    'analiza y propone un nombre en la hoja APROBACIONES. Nada se archiva\n' +
    'hasta que usted escriba APROBADO.';
  Logger.log(msg);
  try { MailApp.sendEmail(CONFIG.ALERT_EMAIL, '[PSF GED] Sistema instalado', msg); } catch (e) {}
  return msg;
}

/**
 * Dónde se planta el árbol. Sin CONFIG.CARPETA_INSTALACION, Mi unidad de quien
 * ejecuta — que es lo que hacía el sistema antes de septiembre de 2026. Con
 * ella, esa carpeta, que puede vivir en una unidad compartida.
 *
 * Si el ID está pero no sirve, ESTO REVIENTA a propósito. Caer de vuelta a Mi
 * unidad sería peor que fallar: la instalación se vería correcta —carpetas
 * creadas, hoja creada, correo enviado— y el archivo documental quedaría como
 * propiedad personal de un empleado. Ese es exactamente el riesgo que la
 * decisión A1 existe para eliminar, y llegaría disfrazado de éxito.
 */
function carpetaBase() {
  var id = String(CONFIG.CARPETA_INSTALACION || '').trim();
  if (!id) return DriveApp.getRootFolder();
  try {
    return DriveApp.getFolderById(id);
  } catch (e) {
    throw new Error(
      'CARPETA_INSTALACION no es una carpeta accesible: "' + id + '". Revise que el ' +
      'ID sea el que aparece en la URL de la carpeta (.../folders/ESTO_ES_EL_ID) y ' +
      'que la cuenta que instala tenga acceso a ella. Detalle: ' + (e.message || e));
  }
}

function obtenerOCrear(padre, nombre) {
  var it = padre.getFoldersByName(nombre);
  return it.hasNext() ? it.next() : padre.createFolder(nombre);
}

function crearHoja(raiz) {
  var existentes = raiz.getFilesByName('FT-GC-001 Listado Maestro de Documentos');
  var ss = existentes.hasNext()
    ? SpreadsheetApp.openById(existentes.next().getId())
    : SpreadsheetApp.create('FT-GC-001 Listado Maestro de Documentos');

  try {
    moverA(DriveApp.getFileById(ss.getId()), raiz);
  } catch (e) {}

  hojaCon(ss, CONFIG.INDEX_SHEET_NAME, COLUMNAS_INDICE, '#1a3a5c');
  hojaCon(ss, CONFIG.QUEUE_SHEET_NAME, [
    'FECHA_ANALISIS', 'NOMBRE_ORIGINAL', 'FILE_ID', 'TIPO', 'PROCESO', 'ORIGEN',
    'TIPO_ID', 'NIT',
    'RAZON_SOCIAL', 'TITULO_PROPUESTO', 'FECHA_DOCUMENTO', 'NOMBRE_PROPUESTO',
    'CONFIANZA', 'JUSTIFICACION', 'HUELLA', 'NOTAS', 'ESTADO',
    'SU_DECISION', 'NOMBRE_FINAL', 'RESULTADO'
  ], '#7a4a00');
  hojaCon(ss, CONFIG.LOG_SHEET_NAME, ['FECHA', 'EVENTO', 'OBJETO', 'DETALLE'], '#444444');

  var hojaAprob = ss.getSheetByName(CONFIG.QUEUE_SHEET_NAME);
  formatearAprobaciones(hojaAprob);

  var d = ss.getSheetByName('Hoja 1') || ss.getSheetByName('Sheet1');
  if (d && ss.getSheets().length > 1) ss.deleteSheet(d);
  return ss;
}

function hojaCon(ss, nombre, cabeceras, color) {
  var h = ss.getSheetByName(nombre) || ss.insertSheet(nombre);
  if (h.getLastRow() === 0) {
    h.getRange(1, 1, 1, cabeceras.length).setValues([cabeceras])
      .setFontWeight('bold').setFontColor('#ffffff').setBackground(color);
    h.setFrozenRows(1);
    h.autoResizeColumns(1, cabeceras.length);
  }
  return h;
}

/** Menú desplegable y colores en la columna de decisión, para que no haya errores de dedo. */
function formatearAprobaciones(h) {
  var col = 18;  // SU_DECISION
  var regla = SpreadsheetApp.newDataValidation()
    .requireValueInList(['APROBADO', 'RECHAZADO'], true)
    .setAllowInvalid(true)
    .setHelpText('APROBADO archiva el documento. RECHAZADO lo envía a revisión manual.')
    .build();
  h.getRange(2, col, 2000, 1).setDataValidation(regla);

  var rango = h.getRange(2, 1, 2000, 20);
  var reglas = [
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=$Q2="REVISAR"').setBackground('#fff3cd').setRanges([rango]).build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=$Q2="EJECUTADO"').setBackground('#d4edda').setRanges([rango]).build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=OR($Q2="SIN_TEXTO",$Q2="NO_CLASIFICADO",$Q2="DUPLICADO")')
      .setBackground('#f8d7da').setRanges([rango]).build()
  ];
  h.setConditionalFormatRules(reglas);
}

function crearDisparadores() {
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('analizarBandeja').timeBased().everyMinutes(15).create();
  ScriptApp.newTrigger('ejecutarDecisiones').timeBased().everyMinutes(15).create();
  ScriptApp.newTrigger('resumenDiario').timeBased().atHour(7).everyDays(1)
    .inTimezone(CONFIG.TIMEZONE).create();
}

/* ---------- Diagnóstico ----------------------------------------- */

/** Ejecute esto si algo no funciona: revisa las 6 cosas que suelen fallar. */
function diagnostico() {
  cargarConfig();
  var r = [];
  var key = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
  r.push((key ? '✓' : '✗') + ' Clave ANTHROPIC_API_KEY ' + (key ? 'configurada' : 'FALTA'));
  ['RAIZ_ID','INBOX_ID','ARCHIVO_ID','INDEX_SHEET_ID'].forEach(function (k) {
    r.push((CONFIG[k] ? '✓' : '✗') + ' ' + k + ' ' + (CONFIG[k] ? 'ok' : 'FALTA — ejecute instalarSistema()'));
  });
  try { Drive.Files; r.push('✓ Servicio avanzado Drive API activo'); }
  catch (e) { r.push('✗ Falta activar Drive API en Servicios'); }
  try {
    var n = ScriptApp.getProjectTriggers().length;
    r.push((n >= 3 ? '✓' : '✗') + ' Disparadores: ' + n + ' de 3');
  } catch (e) { r.push('✗ No se pudieron leer los disparadores'); }
  try {
    var res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
      method: 'post', contentType: 'application/json', muteHttpExceptions: true,
      headers: { 'x-api-key': key || 'x', 'anthropic-version': '2023-06-01' },
      payload: JSON.stringify({ model: CONFIG.MODELO, max_tokens: 16,
        messages: [{ role: 'user', content: 'ok' }] })
    });
    r.push((res.getResponseCode() === 200 ? '✓' : '✗') + ' API Anthropic responde ' + res.getResponseCode());
  } catch (e) { r.push('✗ No se pudo contactar la API: ' + e.message); }

  var texto = r.join('\n');
  Logger.log(texto);
  return texto;
}
