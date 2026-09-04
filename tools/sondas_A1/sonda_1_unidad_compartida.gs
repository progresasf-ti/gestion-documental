/**********************************************************************
 * SONDA A1 — parentesco de archivos en una unidad compartida
 *
 * NO es codigo del sistema. Va en un proyecto de Apps Script NUEVO y
 * DESECHABLE, no en el de PSF GED. No toca nada del archivo documental.
 *
 * Responde cuatro preguntas que hoy estan supuestas y no medidas:
 *   1. removeFile/addFile (API vieja)  Mi unidad -> unidad compartida
 *   2. moveTo()                        Mi unidad -> unidad compartida
 *   3. removeFile/addFile              dentro de la unidad compartida
 *   4. moveTo()                        dentro de la unidad compartida
 *
 * La 3 y la 4 son las que mas pesan: una vez instalado alla, casi todos
 * los movimientos de moverA() son de carpeta a carpeta DENTRO de la
 * unidad compartida. Si la 3 pasa y la 4 falla, la premisa de A1 estaba
 * al reves y hay que parar.
 *
 * INSTRUCCIONES
 *   1. Cree una carpeta cualquiera dentro de la unidad compartida de prueba.
 *   2. Abrala y copie el ID de la URL:
 *        .../folders/ESTO_ES_EL_ID
 *   3. Peguelo abajo, ejecute sondaA1() y copie el registro completo.
 **********************************************************************/

var CARPETA_PRUEBA = 'PEGUE_AQUI_EL_ID';

function sondaA1() {
  var salida = [];
  function decir(t) { salida.push(t); Logger.log(t); }

  var basura = [];   // todo lo creado, para borrarlo al final

  decir('===== SONDA A1 =====');

  var destino;
  try {
    destino = DriveApp.getFolderById(CARPETA_PRUEBA);
    decir('Carpeta de prueba: "' + destino.getName() + '"');
  } catch (e) {
    decir('NO SE PUDO ABRIR LA CARPETA: ' + (e.message || e));
    decir('Revise el ID y que la cuenta tenga acceso a la unidad compartida.');
    return salida.join('\n');
  }

  /* Subcarpeta dentro de la unidad compartida, para las pruebas 3 y 4. */
  var sub;
  try {
    sub = destino.createFolder('SONDA_subcarpeta_' + Date.now());
    basura.push(sub);
    decir('Subcarpeta creada dentro de la unidad compartida: OK');
  } catch (e) {
    decir('NO SE PUDO CREAR SUBCARPETA: ' + (e.message || e));
    return salida.join('\n');
  }

  /* ---- Prueba 1: API vieja, Mi unidad -> unidad compartida ---- */
  decir('');
  decir('--- 1. removeFile/addFile : Mi unidad -> unidad compartida ---');
  try {
    var f1 = DriveApp.createFile('SONDA_1_' + Date.now() + '.txt', 'sonda');
    basura.push(f1);
    var p1 = f1.getParents();
    while (p1.hasNext()) p1.next().removeFile(f1);
    destino.addFile(f1);
    decir('RESULTADO: no lanzo error.');
    decir('  padre real quedo en: ' + nombrePadres(f1));
  } catch (e) {
    decir('RESULTADO: FALLA -> ' + (e.message || e));
  }

  /* ---- Prueba 2: moveTo, Mi unidad -> unidad compartida ---- */
  decir('');
  decir('--- 2. moveTo() : Mi unidad -> unidad compartida ---');
  try {
    var f2 = DriveApp.createFile('SONDA_2_' + Date.now() + '.txt', 'sonda');
    basura.push(f2);
    f2.moveTo(destino);
    decir('RESULTADO: no lanzo error.');
    decir('  padre real quedo en: ' + nombrePadres(f2));
  } catch (e) {
    decir('RESULTADO: FALLA -> ' + (e.message || e));
  }

  /* ---- Prueba 3: API vieja, dentro de la unidad compartida ---- */
  decir('');
  decir('--- 3. removeFile/addFile : dentro de la unidad compartida ---');
  try {
    var f3 = destino.createFile('SONDA_3_' + Date.now() + '.txt', 'sonda');
    basura.push(f3);
    var p3 = f3.getParents();
    while (p3.hasNext()) p3.next().removeFile(f3);
    sub.addFile(f3);
    decir('RESULTADO: no lanzo error.');
    decir('  padre real quedo en: ' + nombrePadres(f3));
  } catch (e) {
    decir('RESULTADO: FALLA -> ' + (e.message || e));
  }

  /* ---- Prueba 4: moveTo, dentro de la unidad compartida ---- */
  decir('');
  decir('--- 4. moveTo() : dentro de la unidad compartida ---');
  try {
    var f4 = destino.createFile('SONDA_4_' + Date.now() + '.txt', 'sonda');
    basura.push(f4);
    f4.moveTo(sub);
    decir('RESULTADO: no lanzo error.');
    decir('  padre real quedo en: ' + nombrePadres(f4));
  } catch (e) {
    decir('RESULTADO: FALLA -> ' + (e.message || e));
  }

  /* ---- Prueba 5: el camino de crearHoja() ---- */
  decir('');
  decir('--- 5. SpreadsheetApp.create() + moveTo : el camino del instalador ---');
  try {
    var ss = SpreadsheetApp.create('SONDA_5_hoja_' + Date.now());
    var fss = DriveApp.getFileById(ss.getId());
    basura.push(fss);
    decir('  la hoja nacio en: ' + nombrePadres(fss));
    fss.moveTo(destino);
    decir('RESULTADO: no lanzo error.');
    decir('  padre real quedo en: ' + nombrePadres(fss));
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

/** Nombres de todos los padres del archivo, para ver donde quedo de verdad. */
function nombrePadres(f) {
  try {
    var n = [], it = f.getParents();
    while (it.hasNext()) n.push(it.next().getName());
    return n.length ? n.join(' + ') + ' (' + n.length + ' padre/s)' : 'SIN PADRE';
  } catch (e) {
    return 'no se pudo leer: ' + (e.message || e);
  }
}
