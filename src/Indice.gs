/**********************************************************************
 * PSF GED — Indice.gs
 * Listado Maestro de Documentos (código FT-GC-001)
 *
 * Es la fuente única de verdad del sistema. El consecutivo NO se calcula
 * contando archivos en una carpeta (eso se rompe si alguien borra o mueve
 * un archivo, y produce números repetidos). Se calcula sobre el índice,
 * que es un registro histórico que nunca se borra.
 *
 * DECISIÓN DE DISEÑO — series de numeración:
 *   Documentos propios: la serie es TIPO-PROCESO.
 *     PR-OP-001, PR-OP-002, ...
 *   Documentos de terceros: la serie es TIPO-PROCESO-ORIGEN-NIT.
 *     Cada tercero tiene su propia numeración, empezando en 001.
 *     El código completo sigue siendo único porque el NIT hace parte de él,
 *     y así se lee de inmediato "el tercer documento de este cliente".
 **********************************************************************/

/** Columnas del Listado Maestro, en orden. No reordenar sin migrar la hoja. */
const COLUMNAS_INDICE = [
  'CODIGO', 'TIPO', 'PROCESO', 'ORIGEN', 'TIPO_ID', 'NIT', 'RAZON_SOCIAL',
  'CONSECUTIVO', 'VERSION', 'TITULO', 'NOMBRE_ARCHIVO', 'FECHA_DOCUMENTO',
  'ESTADO', 'CLAUSULA_ISO', 'RETENCION_HASTA', 'CLAVE_LOGICA',
  'FILE_ID', 'CARPETA', 'HUELLA', 'CONFIANZA', 'JUSTIFICACION',
  'APROBADO_POR', 'FECHA_APROBACION', 'FECHA_REGISTRO'
];

/** ¿Este documento numera por tercero? Condición compartida por la serie,
 *  el código y el nombre del archivo; estaba repetida en los tres. */
function esSerieDeTercero(c) {
  return REGLAS.TIPOS_EXIGEN_TERCERO.indexOf(c.tipo) !== -1 && !!c.nit;
}

/** Serie de numeración. NO lleva ORIGEN: el origen es atributo del TERCERO,
 *  no del documento. Incluirlo hacía que un mismo NIT reiniciara en 001 por
 *  cada origen que el modelo le asignara. */
function serieDe(c) {
  if (esSerieDeTercero(c)) return [c.tipo, c.proceso, c.nit].join('-');
  return [c.tipo, c.proceso].join('-');
}

/**
 * Decide qué consecutivo y qué versión le corresponden a un documento.
 * Función PURA: recibe el índice como arreglo de objetos y no toca nada.
 *
 * @param {Object} c        clasificación validada
 * @param {Array}  indice   filas del listado maestro
 * @returns {Object} { consecutivo, version, esNuevaVersion, obsoletar[], serie, clave }
 */
function resolverConsecutivoYVersion(c, indice) {
  var filas = indice || [];
  var clave = claveLogica(c);
  var serie = serieDe(c);

  // ¿Ya existe este mismo documento lógico? Entonces es una versión nueva.
  var mismas = filas.filter(function (f) {
    return f.CLAVE_LOGICA === clave && f.ESTADO !== 'ANULADO';
  });

  if (mismas.length > 0) {
    var maxV = 0, consec = null;
    for (var i = 0; i < mismas.length; i++) {
      var v = parseInt(mismas[i].VERSION, 10) || 0;
      if (v > maxV) maxV = v;
      var k = parseInt(mismas[i].CONSECUTIVO, 10);
      if (!isNaN(k) && (consec === null || k < consec)) consec = k;
    }
    return {
      consecutivo: consec === null ? 1 : consec,
      version: maxV + 1,
      esNuevaVersion: true,
      // Las versiones anteriores VIGENTES quedan obsoletas: exigencia del 7.5.3.
      obsoletar: mismas.filter(function (f) { return f.ESTADO === 'VIGENTE'; })
                       .map(function (f) { return f.FILE_ID; })
                       .filter(function (id) { return !!id; }),
      serie: serie, clave: clave
    };
  }

  // Documento nuevo: siguiente número de la serie. Nunca se reutilizan huecos.
  var max = 0;
  for (var j = 0; j < filas.length; j++) {
    if (filas[j].SERIE_CALC !== undefined ? filas[j].SERIE_CALC === serie : serieDeFila(filas[j]) === serie) {
      var n = parseInt(filas[j].CONSECUTIVO, 10);
      if (!isNaN(n) && n > max) max = n;
    }
  }
  return { consecutivo: max + 1, version: 1, esNuevaVersion: false,
           obsoletar: [], serie: serie, clave: clave };
}

/** Reconstruye la serie a partir de una fila ya registrada. */
function serieDeFila(f) {
  return serieDe({ tipo: f.TIPO, proceso: f.PROCESO, nit: f.NIT || null });
}

/** Código corto del documento, sin versión ni título. Va en la columna CODIGO.
 *  SÍ lleva ORIGEN: la nomenclatura no cambia. Ya no se deriva de serieDe():
 *  son dos cosas distintas que hasta ahora coincidían por accidente. */
function codigoDe(c, consecutivo) {
  var partes = esSerieDeTercero(c)
    ? [c.tipo, c.proceso, c.origen, c.nit]
    : [c.tipo, c.proceso];
  partes.push(String(consecutivo).padStart(3, '0'));
  return partes.join('-');
}

/** Año hasta el cual debe conservarse, según la tabla de retención. */
function retencionHasta(c) {
  var anio = parseInt(String(c.fechaDocumento).slice(0, 4), 10);
  return String(anio + (c.retencionAnios || 10));
}

/* ---------- Similitud de títulos ------------------------------- *
 * El modelo puede titular el mismo documento de dos formas distintas
 * ("Certificado Camara Comercio" vs "Certificado de Camara de Comercio").
 * Sin esto, el segundo entraría como documento nuevo en vez de versión.
 * No se decide automáticamente: se le muestra la coincidencia al aprobador.
 */

var PALABRAS_VACIAS = ['de','del','la','el','los','las','y','a','en','para','por','con','un','una'];

function tokensDe(titulo) {
  return normalizarTexto(String(titulo || ''))
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(function (t) { return t.length > 1 && PALABRAS_VACIAS.indexOf(t) === -1; });
}

/** Índice de Jaccard entre dos títulos: 0 = nada en común, 1 = idénticos. */
function similitudTitulos(a, b) {
  var ta = tokensDe(a), tb = tokensDe(b);
  if (!ta.length || !tb.length) return 0;
  var setA = {}, inter = 0, union = {};
  ta.forEach(function (t) { setA[t] = 1; union[t] = 1; });
  tb.forEach(function (t) { if (setA[t]) inter++; union[t] = 1; });
  return inter / Object.keys(union).length;
}

/**
 * Busca en el índice documentos que probablemente sean el mismo, aunque
 * el título no coincida exactamente. Se usa para advertir al aprobador.
 */
function documentosSimilares(c, indice, umbral) {
  var u = umbral === undefined ? 0.6 : umbral;
  var clave = claveLogica(c);
  return (indice || [])
    .filter(function (f) {
      if (f.ESTADO === 'ANULADO') return false;
      if (f.CLAVE_LOGICA === clave) return false;          // ya es coincidencia exacta
      if (f.TIPO !== c.tipo || f.PROCESO !== c.proceso) return false;
      if (String(f.NIT || '') !== String(c.nit || '')) return false;
      return similitudTitulos(f.TITULO, c.titulo) >= u;
    })
    .map(function (f) {
      return { codigo: f.CODIGO, titulo: f.TITULO, version: f.VERSION,
               fileId: f.FILE_ID, similitud: Math.round(similitudTitulos(f.TITULO, c.titulo) * 100) / 100 };
    })
    .sort(function (a, b) { return b.similitud - a.similitud; });
}

/**
 * CASI-COLISIÓN: documentos del MISMO tercero con título equivalente, pero
 * clasificados con distinto TIPO o distinto PROCESO.
 *
 * Por qué existe: la clave lógica es TIPO|PROCESO|NIT|TITULO. Si el
 * clasificador cambia de opinión sobre el tipo o el proceso entre dos
 * versiones del mismo documento, la clave no coincide y el sistema crea un
 * documento nuevo EN SILENCIO: no versiona y no marca obsoleta la anterior.
 *
 * `documentosSimilares()` no cubre este caso porque exige que tipo y proceso
 * coincidan; sirve para variaciones de TÍTULO dentro de una misma
 * clasificación. Esta función es su complemento: variaciones de
 * CLASIFICACIÓN con un mismo título.
 *
 * No decide nada: devuelve los conflictos para que el aprobador los vea.
 *
 * @param {Object} c       clasificación validada
 * @param {Array}  indice  filas del listado maestro
 * @param {number} umbral  similitud mínima de título (por defecto 0.7)
 * @returns {Array} conflictos, del más parecido al menos
 */
function casiColisiones(c, indice, umbral) {
  var u = umbral === undefined ? 0.7 : umbral;
  var clave = claveLogica(c);
  var nitC = String(c.nit || '');

  return (indice || [])
    .filter(function (f) {
      if (f.ESTADO === 'ANULADO') return false;
      if (f.CLAVE_LOGICA === clave) return false;      // coincidencia exacta: ya versiona bien
      if (String(f.NIT || '') !== nitC) return false;  // debe ser el mismo tercero
      // El conflicto es justamente que tipo o proceso NO coincidan.
      if (f.TIPO === c.tipo && f.PROCESO === c.proceso) return false;
      return similitudTitulos(f.TITULO, c.titulo) >= u;
    })
    .map(function (f) {
      var difs = [];
      if (f.TIPO !== c.tipo) difs.push('TIPO ' + f.TIPO + ' vs ' + c.tipo);
      if (f.PROCESO !== c.proceso) difs.push('PROCESO ' + f.PROCESO + ' vs ' + c.proceso);
      return {
        codigo: f.CODIGO, titulo: f.TITULO, version: f.VERSION, estado: f.ESTADO,
        tipo: f.TIPO, proceso: f.PROCESO, fileId: f.FILE_ID,
        similitud: Math.round(similitudTitulos(f.TITULO, c.titulo) * 100) / 100,
        motivo: difs.join('; ')
      };
    })
    .sort(function (a, b) { return b.similitud - a.similitud; });
}

/**
 * ORIGEN ya registrado para un tercero. Gana la fila MÁS ANTIGUA: el primer
 * documento fija el origen. Se prefiere sobre "el más frecuente" porque este
 * último cambia de respuesta según lo que llegue después, que es justo la
 * inestabilidad que se quiere eliminar.
 *
 * Se consideran TODAS las filas, incluidas OBSOLETO y ANULADO: el código con
 * ese origen ya se emitió y puede existir en Drive; la coherencia histórica
 * pesa más que el estado del ciclo de vida.
 */
function origenRegistrado(nit, indice) {
  var n = String(nit || '');
  if (!n) return null;
  var filas = indice || [];
  for (var i = 0; i < filas.length; i++) {
    if (String(filas[i].NIT || '') !== n) continue;
    var o = String(filas[i].ORIGEN || '').trim().toUpperCase();
    if (o && ORIGENES[o]) return o;
  }
  return null;
}

/** Detecta si un archivo idéntico ya fue registrado (mismo hash de contenido). */
function yaRegistrado(indice, huella) {
  if (!huella) return null;
  var filas = indice || [];
  for (var i = 0; i < filas.length; i++) {
    if (filas[i].HUELLA && filas[i].HUELLA === huella) return filas[i];
  }
  return null;
}

/* ---------- Envoltorios de Google Sheets (sólo Apps Script) ------ */

function leerIndice() {
  var hoja = SpreadsheetApp.openById(CONFIG.INDEX_SHEET_ID)
                           .getSheetByName(CONFIG.INDEX_SHEET_NAME);
  var datos = hoja.getDataRange().getValues();
  if (datos.length < 2) return [];
  var cab = datos[0];
  return datos.slice(1).map(function (fila) {
    var o = {};
    for (var i = 0; i < cab.length; i++) o[cab[i]] = fila[i];
    return o;
  });
}

/**
 * Registra un documento aprobado. Usa LockService porque dos ejecuciones
 * simultáneas del disparador podrían pedir el mismo consecutivo.
 * Sin este bloqueo, dos documentos distintos quedarían con el mismo código.
 */
function registrarEnIndice(c, decision, nombreArchivo, fileId, carpeta, aprobadoPor) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error('No se pudo obtener el bloqueo del índice; se reintentará.');
  try {
    var hoja = SpreadsheetApp.openById(CONFIG.INDEX_SHEET_ID)
                             .getSheetByName(CONFIG.INDEX_SHEET_NAME);
    var ahora = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
    var fila = [
      codigoDe(c, decision.consecutivo), c.tipo, c.proceso, c.origen,
      c.nit ? (c.tipoId || 'NIT') : '', c.nit || '',
      c.razonSocial || '', decision.consecutivo, decision.version, c.titulo,
      nombreArchivo, c.fechaDocumento, 'VIGENTE', c.clausulaISO, retencionHasta(c),
      decision.clave, fileId, carpeta, c.huella || '', c.confianza, c.justificacion,
      aprobadoPor || '', ahora, ahora
    ];
    hoja.appendRow(fila);
    return fila;
  } finally {
    lock.releaseLock();
  }
}

/** Marca como OBSOLETO el registro de las versiones anteriores.
 *  @param {string} [reemplazadoPor] nombre del archivo que las reemplaza,
 *         solo para que quede en BITACORA; no afecta la lógica. */
function marcarObsoletos(fileIds, reemplazadoPor) {
  if (!fileIds || !fileIds.length) return 0;

  var hoja = SpreadsheetApp.openById(CONFIG.INDEX_SHEET_ID)
                           .getSheetByName(CONFIG.INDEX_SHEET_NAME);
  var datos = hoja.getDataRange().getValues();
  var colFile = datos[0].indexOf('FILE_ID');
  var colEst = datos[0].indexOf('ESTADO');
  var colCod = datos[0].indexOf('CODIGO');
  var n = 0;

  for (var i = 1; i < datos.length; i++) {
    if (fileIds.indexOf(datos[i][colFile]) === -1) continue;
    if (datos[i][colEst] !== 'VIGENTE') continue;

    // 1) La marca en la hoja va PRIMERO: es la fuente de verdad y no debe
    //    perderse si Drive falla.
    hoja.getRange(i + 1, colEst + 1).setValue('OBSOLETO');
    n++;
    /* Antes solo ERROR quedaba en BITACORA; el caso normal (éxito) no dejaba
       rastro y solo era reconstruible mirando LISTADO_MAESTRO. */
    bitacora('OBSOLETO', String(datos[i][colCod] || datos[i][colFile]),
      reemplazadoPor ? 'Reemplazado por ' + reemplazadoPor + '.' : '');

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

if (typeof module !== 'undefined') {
  module.exports = {
    COLUMNAS_INDICE: COLUMNAS_INDICE, serieDe: serieDe,
    esSerieDeTercero: esSerieDeTercero, origenRegistrado: origenRegistrado,
    tokensDe: tokensDe, similitudTitulos: similitudTitulos,
    documentosSimilares: documentosSimilares,
    casiColisiones: casiColisiones,
    resolverConsecutivoYVersion: resolverConsecutivoYVersion,
    codigoDe: codigoDe, retencionHasta: retencionHasta, yaRegistrado: yaRegistrado
  };
}
