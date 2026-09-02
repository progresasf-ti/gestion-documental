/**********************************************************************
 * PSF GED — Nomenclatura.gs
 *
 * PRINCIPIO DE DISEÑO: la IA NUNCA construye el nombre del archivo.
 * La IA sólo aporta materia prima (tipo, proceso, título, fecha, NIT).
 * El nombre lo arma este módulo con reglas fijas y verificables.
 * Así el resultado es reproducible y auditable ante el revisor fiscal.
 *
 * GRAMÁTICA
 *   Documento controlado del SGC (interno):
 *     {TIPO}-{PROCESO}-{NNN}_V{VV}_{Titulo-Kebab}_{AAAAMMDD}
 *     Ej: PR-OP-003_V02_Compra-De-Cartera-Con-Recurso_20260801
 *
 *   Registro o documento externo (de un tercero):
 *     {TIPO}-{PROCESO}-{ORIGEN}-{NIT}-{NNN}_V{VV}_{Titulo}_{AAAAMMDD}
 *     Ej: RG-GC-CLI-9001234561-012_V01_Certificado-Camara-Comercio_20260801
 **********************************************************************/

/* ---------- 1. NORMALIZACIÓN DE TEXTO --------------------------- */

/** Quita tildes, ñ y cualquier signo diacrítico. "Gestión" -> "Gestion" */
function normalizarTexto(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // marcas diacríticas
    .replace(/[ñÑ]/g, function (m) { return m === 'ñ' ? 'n' : 'N'; });
}

/**
 * Convierte un título libre en Kebab-Case-Titulado, seguro para Drive.
 * Trunca en frontera de palabra para no cortar a mitad.
 */
function aKebab(titulo, maxLen) {
  var max = maxLen || 60;
  var limpio = normalizarTexto(titulo)
    .replace(/[^\p{L}\p{N}\s\-]/gu, ' ')  // fuera signos, emojis, / \ : * ? " < > |
    .replace(/[\s\-]+/g, ' ')
    .trim();

  if (!limpio) return 'Sin-Titulo';

  var palabras = limpio.split(' ').map(function (p) {
    return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
  });

  var out = '';
  for (var i = 0; i < palabras.length; i++) {
    var cand = out ? out + '-' + palabras[i] : palabras[i];
    if (cand.length > max) break;
    out = cand;
  }
  // Si la primera palabra ya excede el máximo, se corta duro.
  if (!out) out = palabras[0].slice(0, max);
  return out;
}

/* ---------- 2. NIT ---------------------------------------------- */

/**
 * Deja la identificación en dígitos puros. Acepta 900.974.255-5, 71.234.567, etc.
 * El mínimo es 7 porque hay cédulas de 7 dígitos; antes era 9 y esas cédulas se
 * descartaban en silencio, con lo que el documento se archivaba como PROPIO.
 * Devuelve null si no parece una identificación (7 a 10 dígitos).
 */
function limpiarNIT(nit) {
  if (!nit) return null;
  var d = String(nit).replace(/\D/g, '');
  if (d.length < 7 || d.length > 10) return null;
  return d;
}

/**
 * FORMA CANÓNICA de la identificación. Existe porque el mismo tercero llegaba
 * unas veces como 901234567 y otras como 9012345677 (con DV), y eso lo partía
 * en dos series de numeración distintas, dos carpetas y dos claves lógicas.
 *
 *   NIT  → siempre 9 dígitos + DV = 10. Si vienen menos de 9 se rellena con
 *          ceros a la izquierda, como hace la DIAN.
 *   CC / CE / TI → se dejan intactas: no tienen DV y su longitud es variable.
 *
 * Es idempotente: canonizar dos veces da el mismo resultado.
 */
function canonizarIdentificacion(tipoId, numeroLimpio) {
  var n = String(numeroLimpio || '');
  if (!n) return null;
  var t = String(tipoId || 'NIT').trim().toUpperCase();
  var def = TIPOS_ID[t];
  /* Un tipo desconocido se trata como NIT, igual que hace el validador.
     Si aquí se tratara como cédula, el mismo número saldría canonizado de dos
     formas distintas según por dónde entrara. */
  if (def && !def.llevaDV) return n;                     // cédulas: tal cual
  if (n.length >= 10) return n;                          // ya trae DV
  var base = n.padStart(9, '0');
  return base + String(digitoVerificacion(base));
}

/** Calcula el dígito de verificación DIAN de un NIT de 9 dígitos. */
function digitoVerificacion(nit9) {
  var pesos = [41, 37, 29, 23, 19, 17, 13, 7, 3];
  var d = String(nit9).replace(/\D/g, '').padStart(9, '0').slice(-9);
  var suma = 0;
  for (var i = 0; i < 9; i++) suma += parseInt(d.charAt(i), 10) * pesos[i];
  var r = suma % 11;
  return (r === 0 || r === 1) ? r : 11 - r;
}

/** Verifica coherencia NIT + DV cuando vienen los 10 dígitos. */
function nitEsCoherente(nitLimpio) {
  if (!nitLimpio || nitLimpio.length !== 10) return null; // no verificable
  return digitoVerificacion(nitLimpio.slice(0, 9)) === parseInt(nitLimpio.charAt(9), 10);
}

/* ---------- 3. FECHAS ------------------------------------------- */

/**
 * Normaliza una fecha a AAAAMMDD. Acepta ISO, DD/MM/AAAA y AAAAMMDD.
 * Rechaza fechas imposibles, anteriores a 1990 o más de 1 día en el futuro.
 * Si falla, devuelve el fallback (fecha de creación del archivo).
 */
function normalizarFecha(valor, fallbackDate) {
  var fb = fallbackDate instanceof Date ? fallbackDate : new Date();
  var y, m, d, s = String(valor || '').trim();
  var mt;

  if ((mt = s.match(/^(\d{4})-(\d{2})-(\d{2})/))) {
    y = +mt[1]; m = +mt[2]; d = +mt[3];
  } else if ((mt = s.match(/^(\d{4})(\d{2})(\d{2})$/))) {
    y = +mt[1]; m = +mt[2]; d = +mt[3];
  } else if ((mt = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/))) {
    d = +mt[1]; m = +mt[2]; y = +mt[3];   // convención colombiana DD/MM/AAAA
  } else {
    return aAAAAMMDD(fb);
  }

  if (m < 1 || m > 12 || d < 1 || d > 31) return aAAAAMMDD(fb);

  var fecha = new Date(Date.UTC(y, m - 1, d));
  if (fecha.getUTCMonth() !== m - 1 || fecha.getUTCDate() !== d) return aAAAAMMDD(fb); // 31/02
  if (y < 1990) return aAAAAMMDD(fb);

  var manana = new Date(Date.now() + 24 * 3600 * 1000);
  if (fecha.getTime() > manana.getTime()) return aAAAAMMDD(fb);

  return aAAAAMMDD(fecha);
}

function aAAAAMMDD(fecha) {
  var y = fecha.getUTCFullYear();
  var m = String(fecha.getUTCMonth() + 1).padStart(2, '0');
  var d = String(fecha.getUTCDate()).padStart(2, '0');
  return '' + y + m + d;
}

/* ---------- 4. CONSTRUCCIÓN DEL NOMBRE -------------------------- */

/**
 * Arma el nombre técnico definitivo.
 * @param {Object} c  clasificación ya validada
 * @param {number} consecutivo  entero resuelto por el índice maestro
 * @param {number} version      entero, 1 si es nuevo
 * @param {string} extension    con punto, ej '.pdf'
 */
function construirNombre(c, consecutivo, version, extension) {
  var R = REGLAS;   // ámbito global compartido entre archivos .gs

  var vv = 'V' + String(version).padStart(2, '0');
  var titulo = aKebab(c.titulo, R.MAX_TITULO);
  var fecha = c.fechaDocumento;   // ya viene normalizada a AAAAMMDD
  var ext = extension || '';

  /* El código ES el prefijo del nombre: una sola definición, en codigoDe(). */
  var raiz = codigoDe(c, consecutivo);

  var nombre = raiz + '_' + vv + '_' + titulo + '_' + fecha + ext;

  // Blindaje final de longitud: se recorta el título, nunca el código.
  if (nombre.length > R.MAX_NOMBRE) {
    var sobra = nombre.length - R.MAX_NOMBRE;
    titulo = aKebab(c.titulo, Math.max(10, titulo.length - sobra));
    nombre = raiz + '_' + vv + '_' + titulo + '_' + fecha + ext;
  }
  return nombre;
}

/** Lee un nombre técnico y devuelve sus partes. null si no cumple la gramática. */
function parsearNombre(nombre) {
  var base = String(nombre || '').replace(/\.[A-Za-z0-9]{1,5}$/, '');
  var mExt = String(nombre || '').match(/\.[A-Za-z0-9]{1,5}$/);

  // Consecutivo hasta 6 dígitos: a 300 operaciones/mes la serie de registros
  // de factoring supera 10.000 en menos de tres años. Versión hasta 3 dígitos.
  var reTercero = /^([A-Z]{2})-([A-Z]{2})-([A-Z]{3})-(\d{7,10})-(\d{3,6})_V(\d{2,3})_(.+)_(\d{8})$/;
  var reInterno = /^([A-Z]{2})-([A-Z]{2})-(\d{3,6})_V(\d{2,3})_(.+)_(\d{8})$/;
  var m;

  if ((m = base.match(reTercero))) {
    return {
      tipo: m[1], proceso: m[2], origen: m[3], nit: m[4],
      consecutivo: parseInt(m[5], 10), version: parseInt(m[6], 10),
      titulo: m[7], fechaDocumento: m[8], extension: mExt ? mExt[0] : ''
    };
  }
  if ((m = base.match(reInterno))) {
    return {
      tipo: m[1], proceso: m[2], origen: null, nit: null,
      consecutivo: parseInt(m[3], 10), version: parseInt(m[4], 10),
      titulo: m[5], fechaDocumento: m[6], extension: mExt ? mExt[0] : ''
    };
  }
  return null;
}

/**
 * Clave de identidad lógica de un documento.
 * Dos archivos con la misma clave son VERSIONES del mismo documento,
 * no documentos distintos. Es lo que evita que el consecutivo se dispare
 * y lo que permite cumplir el control de versiones del numeral 7.5.3.
 */
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

if (typeof module !== 'undefined') {
  module.exports = {
    normalizarTexto: normalizarTexto, aKebab: aKebab,
    limpiarNIT: limpiarNIT, digitoVerificacion: digitoVerificacion,
    nitEsCoherente: nitEsCoherente, normalizarFecha: normalizarFecha,
    canonizarIdentificacion: canonizarIdentificacion,
    aAAAAMMDD: aAAAAMMDD, construirNombre: construirNombre,
    parsearNombre: parsearNombre, claveLogica: claveLogica
  };
}
