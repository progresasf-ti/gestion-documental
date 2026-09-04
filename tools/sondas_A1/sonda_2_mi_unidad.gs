/**********************************************************************
 * SONDA A1 (parte 2) — Mi unidad, que es donde el sistema corre HOY
 *
 * Va en el MISMO proyecto desechable de sonda_A1.gs, como archivo aparte.
 * Reusa nombrePadres() de ese archivo. No necesita ningun ID: trabaja en
 * carpetas temporales que crea y borra.
 *
 * POR QUE
 * -------
 * La sonda 1 midio los cuatro casos de unidad compartida, pero el sistema
 * en produccion vive HOY en Mi unidad y va a seguir ahi hasta que se
 * complete la mudanza. moveTo() tambien cambia ESE camino, y no se ha
 * medido. Esto lo mide antes de empujar a un sistema vivo.
 *
 * El caso 7 es el real de produccion: moverA() casi siempre mueve de
 * subcarpeta a subcarpeta (00_BANDEJA_ENTRADA -> 01_EN_REVISION ->
 * 02_ARCHIVO_CONTROLADO/...), no desde la raiz de Mi unidad.
 *
 * Ejecutar sondaMiUnidad() y copiar el registro.
 **********************************************************************/

function sondaMiUnidad() {
  var salida = [];
  function decir(t) { salida.push(t); Logger.log(t); }

  var basura = [];

  decir('===== SONDA A1 — parte 2: Mi unidad =====');

  var raiz = DriveApp.getRootFolder();
  var marca = Date.now();

  var A, B;
  try {
    A = raiz.createFolder('SONDA2_origen_' + marca);
    B = raiz.createFolder('SONDA2_destino_' + marca);
    basura.push(A, B);
    decir('Carpetas temporales creadas en Mi unidad: OK');
  } catch (e) {
    decir('NO SE PUDIERON CREAR LAS CARPETAS: ' + (e.message || e));
    return salida.join('\n');
  }

  /* ---- 6a: raiz de Mi unidad -> subcarpeta, API vieja ---- */
  decir('');
  decir('--- 6a. removeFile/addFile : raiz de Mi unidad -> subcarpeta ---');
  try {
    var f6a = DriveApp.createFile('SONDA2_6a_' + marca + '.txt', 'sonda');
    basura.push(f6a);
    var p6a = f6a.getParents();
    while (p6a.hasNext()) p6a.next().removeFile(f6a);
    B.addFile(f6a);
    decir('RESULTADO: no lanzo error.');
    decir('  padre real quedo en: ' + nombrePadres(f6a));
  } catch (e) {
    decir('RESULTADO: FALLA -> ' + (e.message || e));
  }

  /* ---- 6b: raiz de Mi unidad -> subcarpeta, moveTo ---- */
  decir('');
  decir('--- 6b. moveTo() : raiz de Mi unidad -> subcarpeta ---');
  try {
    var f6b = DriveApp.createFile('SONDA2_6b_' + marca + '.txt', 'sonda');
    basura.push(f6b);
    f6b.moveTo(B);
    decir('RESULTADO: no lanzo error.');
    decir('  padre real quedo en: ' + nombrePadres(f6b));
  } catch (e) {
    decir('RESULTADO: FALLA -> ' + (e.message || e));
  }

  /* ---- 7a: subcarpeta -> subcarpeta, API vieja  (EL CASO DE PRODUCCION) ---- */
  decir('');
  decir('--- 7a. removeFile/addFile : subcarpeta -> subcarpeta  <== produccion hoy ---');
  try {
    var f7a = A.createFile('SONDA2_7a_' + marca + '.txt', 'sonda');
    basura.push(f7a);
    decir('  nacio en: ' + nombrePadres(f7a));
    var p7a = f7a.getParents();
    while (p7a.hasNext()) p7a.next().removeFile(f7a);
    B.addFile(f7a);
    decir('RESULTADO: no lanzo error.');
    decir('  padre real quedo en: ' + nombrePadres(f7a));
  } catch (e) {
    decir('RESULTADO: FALLA -> ' + (e.message || e));
  }

  /* ---- 7b: subcarpeta -> subcarpeta, moveTo  (EL REEMPLAZO) ---- */
  decir('');
  decir('--- 7b. moveTo() : subcarpeta -> subcarpeta  <== el reemplazo ---');
  try {
    var f7b = A.createFile('SONDA2_7b_' + marca + '.txt', 'sonda');
    basura.push(f7b);
    decir('  nacio en: ' + nombrePadres(f7b));
    f7b.moveTo(B);
    decir('RESULTADO: no lanzo error.');
    decir('  padre real quedo en: ' + nombrePadres(f7b));
  } catch (e) {
    decir('RESULTADO: FALLA -> ' + (e.message || e));
  }

  /* ---- 8: makeCopy hacia una subcarpeta (el camino de CONSERVAR_ORIGINAL) ---- */
  decir('');
  decir('--- 8. makeCopy(nombre, carpeta) : el camino de CONSERVAR_ORIGINAL ---');
  try {
    var orig = A.createFile('SONDA2_8_original_' + marca + '.txt', 'sonda');
    basura.push(orig);
    var copia = orig.makeCopy('SONDA2_8_copia_' + marca + '.txt', B);
    basura.push(copia);
    decir('RESULTADO: no lanzo error.');
    decir('  la copia quedo en: ' + nombrePadres(copia));
    decir('  el original sigue en: ' + nombrePadres(orig));
  } catch (e) {
    decir('RESULTADO: FALLA -> ' + (e.message || e));
  }

  /* ---- Limpieza ---- */
  decir('');
  decir('--- limpieza ---');
  var borrados = 0, fallos = 0;
  for (var i = basura.length - 1; i >= 0; i--) {
    try { basura[i].setTrashed(true); borrados++; } catch (e) { fallos++; }
  }
  decir('Enviados a la papelera: ' + borrados + (fallos ? ' (no se pudo con ' + fallos + ')' : ''));

  decir('');
  decir('===== FIN =====');
  return salida.join('\n');
}
