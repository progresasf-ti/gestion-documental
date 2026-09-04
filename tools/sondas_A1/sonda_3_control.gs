/**********************************************************************
 * SONDA A1 (parte 3) — CONTROL DE LA PROPIA SONDA
 *
 * Va en el MISMO proyecto desechable, como tercer archivo.
 * Ejecutar sondaControl(). Necesita el mismo ID de la unidad compartida.
 *
 * POR QUE EXISTE
 * --------------
 * Las sondas 1 y 2 leyeron los padres sobre EL MISMO objeto File que se
 * uso para mover. Apps Script cachea esos objetos: moveTo() actualiza el
 * objeto en memoria, pero addFile() actua sobre la CARPETA y puede dejar
 * el File con el padre viejo en cache aunque el archivo si se haya movido.
 *
 * Si ese es el caso, los resultados 1, 6a y 7a midieron una cache y no un
 * movimiento, y la conclusion seria la contraria a la que parecian dar.
 *
 * Esta sonda comprueba cada movimiento de TRES formas independientes:
 *   (a) el objeto viejo, que es lo que hicieron las sondas anteriores
 *   (b) un objeto RECIEN traido por getFileById()  <- la verdad
 *   (c) preguntandole a las CARPETAS quien tiene el archivo  <- la verdad
 *
 * Si (a) discrepa de (b) y (c), la sonda anterior estaba mal, no el codigo.
 **********************************************************************/

var CARPETA_PRUEBA_CONTROL = 'PEGUE_AQUI_EL_MISMO_ID';

function sondaControl() {
  var salida = [];
  function decir(t) { salida.push(t); Logger.log(t); }

  var basura = [];
  var marca = Date.now();

  decir('===== SONDA A1 — parte 3: control de la medicion =====');

  var raiz = DriveApp.getRootFolder();
  var A, B;
  try {
    A = raiz.createFolder('SONDA3_origen_' + marca);
    B = raiz.createFolder('SONDA3_destino_' + marca);
    basura.push(A, B);
  } catch (e) {
    decir('NO SE PUDIERON CREAR CARPETAS: ' + (e.message || e));
    return salida.join('\n');
  }

  /* ---------- CASO 1: Mi unidad, subcarpeta -> subcarpeta, API vieja ---------- */
  decir('');
  decir('--- A. removeFile/addFile : subcarpeta -> subcarpeta (Mi unidad) ---');
  probar(decir, basura, A, B, marca, 'A', function (f, destino) {
    var p = f.getParents();
    while (p.hasNext()) p.next().removeFile(f);
    destino.addFile(f);
  });

  /* ---------- CASO 2: Mi unidad, subcarpeta -> subcarpeta, moveTo ---------- */
  decir('');
  decir('--- B. moveTo() : subcarpeta -> subcarpeta (Mi unidad) ---');
  probar(decir, basura, A, B, marca, 'B', function (f, destino) {
    f.moveTo(destino);
  });

  /* ---------- CASO 3: Mi unidad -> unidad compartida, API vieja ---------- */
  decir('');
  decir('--- C. removeFile/addFile : Mi unidad -> unidad compartida ---');
  var compartida = null;
  try {
    compartida = DriveApp.getFolderById(CARPETA_PRUEBA_CONTROL);
    decir('  destino: unidad compartida "' + compartida.getName() + '"');
  } catch (e) {
    decir('  NO SE PUDO ABRIR LA UNIDAD COMPARTIDA: ' + (e.message || e));
  }
  if (compartida) {
    probar(decir, basura, A, compartida, marca, 'C', function (f, destino) {
      var p = f.getParents();
      while (p.hasNext()) p.next().removeFile(f);
      destino.addFile(f);
    });

    decir('');
    decir('--- D. moveTo() : Mi unidad -> unidad compartida ---');
    probar(decir, basura, A, compartida, marca, 'D', function (f, destino) {
      f.moveTo(destino);
    });
  }

  /* ---------- Limpieza ---------- */
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

/**
 * Crea un archivo en `origen`, le aplica `mover`, y verifica el resultado
 * de tres formas independientes.
 */
function probar(decir, basura, origen, destino, marca, etiqueta, mover) {
  var nombre = 'SONDA3_' + etiqueta + '_' + marca + '.txt';
  var f, id;
  try {
    f = origen.createFile(nombre, 'sonda');
    id = f.getId();
    basura.push(f);
  } catch (e) {
    decir('  no se pudo crear el archivo: ' + (e.message || e));
    return;
  }

  try {
    mover(f, destino);
    decir('  la operacion no lanzo error.');
  } catch (e) {
    decir('  la operacion FALLO -> ' + (e.message || e));
    // aun asi verificamos donde quedo
  }

  /* (a) objeto viejo — lo que midieron las sondas 1 y 2 */
  decir('  (a) objeto en cache   : ' + padresDe(f));

  /* (b) objeto recien traido por ID — la verdad */
  try {
    decir('  (b) releido por ID    : ' + padresDe(DriveApp.getFileById(id)));
  } catch (e) {
    decir('  (b) releido por ID    : no se pudo -> ' + (e.message || e));
  }

  /* (c) preguntando a las carpetas — la verdad, por el otro lado */
  decir('  (c) esta en ORIGEN?   : ' + tiene(origen, nombre));
  decir('  (c) esta en DESTINO?  : ' + tiene(destino, nombre));
}

function padresDe(f) {
  try {
    var n = [], it = f.getParents();
    while (it.hasNext()) n.push(it.next().getName());
    return n.length ? n.join(' + ') + ' (' + n.length + ')' : 'SIN PADRE';
  } catch (e) { return 'error: ' + (e.message || e); }
}

function tiene(carpeta, nombre) {
  try { return carpeta.getFilesByName(nombre).hasNext() ? 'SI' : 'no'; }
  catch (e) { return 'error: ' + (e.message || e); }
}
