/**
 * PSF GED — Cotejo entre src/ (local) y el proyecto de Apps Script.
 *
 *   node tools/cotejo.js              baja el editor, compara y borra la copia
 *   node tools/cotejo.js --conservar  igual, pero deja la copia en cotejo/
 *   node tools/cotejo.js <carpeta>    compara contra una carpeta ya existente
 *
 * Existe por el hallazgo del 1-sep: src/ y el editor son dos copias sin nadie
 * que las concilie, y ya divergieron una vez (PAUSADO) sin que nadie lo notara
 * durante una sesion entera.
 *
 * POR QUE SE BORRA LA COPIA AL TERMINAR
 * -------------------------------------
 * .clasp.json apunta rootDir a cotejo/ y NO a src/, para que ningun comando de
 * clasp pueda pisar el codigo bueno. Pero queda un filo: si cotejo/ se deja
 * llena con una copia vieja y alguien corre `clasp push`, subiria ESA copia al
 * editor y revertiria los cambios posteriores. Dejarla vacia lo desactiva:
 * `clasp push` recorre los archivos LOCALES, y sin ninguno no llama a la API
 * (guarda `files.length === 0` en core/files.js). Verificado leyendo el codigo
 * de clasp 3.4.1, no probandolo: si la lectura fuera errada, la prueba habria
 * vaciado el proyecto.
 *
 * OJO: ese no-op es SILENCIOSO. `clasp push` con la carpeta vacia no protesta,
 * asi que no espere un error como senal de que algo va mal.
 */

var fs = require('fs');
var path = require('path');
var execSync = require('child_process').execSync;

var RAIZ = path.join(__dirname, '..');
var SRC = path.join(RAIZ, 'src');
var COTEJO = path.join(RAIZ, 'cotejo');

/* Los .gs bajan como .js; el manifiesto conserva su nombre. */
var ARCHIVOS = ['Config.gs', 'Taxonomia.gs', 'Nomenclatura.gs', 'Indice.gs',
                'Clasificador.gs', 'Motor.gs', 'Extractor.gs', 'Instalador.gs',
                'appsscript.json'];

/* Marcadores de los cambios del 28-ago y el 1-sep. Si alguno falta en el
   editor, ese cambio nunca llego alla. El diff completo ya lo detectaria, pero
   estos ponen nombre al hallazgo en vez de dejar un bloque de lineas sueltas. */
var MARCADORES = [
  /* Sin el valor: PAUSADO vale true durante un mantenimiento, que es justo
     cuando mas se corre este cotejo. Buscar "= false" daria deriva falsa. */
  ['Config.gs',       'const PAUSADO',                    'interruptor de mantenimiento'],
  ['Taxonomia.gs',    'const ORIGENES_TERCEROS',          'escotilla manual de origen'],
  ['Taxonomia.gs',    'const TIPOS_ID',                   'tipos de identificacion'],
  ['Taxonomia.gs',    "'9009742555': 'PSF'",              'NITS_PROPIOS en 10 digitos'],
  ['Nomenclatura.gs', 'function canonizarIdentificacion', 'forma canonica del NIT'],
  ['Nomenclatura.gs', 'codigoDe(c, consecutivo)',         'construirNombre reusa codigoDe'],
  ['Indice.gs',       'function esSerieDeTercero',        'condicion compartida'],
  ['Indice.gs',       'function origenRegistrado',        'herencia del ORIGEN'],
  ['Indice.gs',       'function casiColisiones',          'deteccion de casi-colision'],
  ['Indice.gs',       '_OBSOLETOS',                       'obsoletos se mueven y renombran'],
  ['Indice.gs',       'TIPO_ID',                          'columna TIPO_ID en el indice'],
  ['Clasificador.gs', 'origenRegistrado',                 'herencia dentro del validador'],
  ['Clasificador.gs', 'CONFIG.MODELO',                    'CONFIG.MODELO si se usa'],
  ['Motor.gs',        'if (PAUSADO) return;',             'guarda de pausa'],
  ['Motor.gs',        'normalizarTexto',                  'carpetas sin tildes rotas'],
  ['Motor.gs',        'casiColisiones',                   'conflicto cableado'],
  ['Instalador.gs',   'TIPO_ID',                          'columna TIPO_ID en las hojas']
];

var args = process.argv.slice(2);
var conservar = args.indexOf('--conservar') !== -1;
var carpetaDada = args.filter(function (a) { return a.indexOf('--') !== 0; })[0];
var dir = carpetaDada ? path.resolve(carpetaDada) : COTEJO;
var bajamosNosotros = !carpetaDada;

/* Ignora fin de linea y espacios al final: el editor de Apps Script normaliza
   esas dos cosas al pegar, asi que una diferencia ahi seria ruido. */
function norm(s) {
  return s.replace(/\r\n/g, '\n')
          .split('\n').map(function (l) { return l.replace(/[ \t]+$/, ''); })
          .join('\n').replace(/\n+$/, '');
}

function leer(dirBase, nombre) {
  var candidatos = [nombre, nombre.replace(/\.gs$/, '.js')];
  for (var i = 0; i < candidatos.length; i++) {
    try { return fs.readFileSync(path.join(dirBase, candidatos[i]), 'utf8'); }
    catch (e) { /* siguiente */ }
  }
  return null;
}

function pad(s) { return (s + '                    ').slice(0, 20); }

if (bajamosNosotros) {
  console.log('\nBajando el proyecto de Apps Script a cotejo/ ...\n');
  try {
    execSync('clasp pull', { cwd: RAIZ, stdio: 'inherit' });
  } catch (e) {
    console.log('\n  No se pudo bajar el proyecto.');
    console.log('  Revise que `clasp login` siga vigente y que la API de Apps');
    console.log('  Script este habilitada en script.google.com/home/usersettings\n');
    process.exit(1);
  }
}

console.log('\n' + '='.repeat(72));
console.log('COTEJO   src/  vs  proyecto de Apps Script');
console.log('='.repeat(72) + '\n');

var iguales = 0, distintos = 0, ausentes = 0;
var difieren = [];

ARCHIVOS.forEach(function (f) {
  var a = leer(SRC, f);
  var b = leer(dir, f);

  if (a === null) { console.log('  ??  ' + pad(f) + 'no esta en src/'); ausentes++; return; }
  if (b === null) { console.log('  ??  ' + pad(f) + 'no esta en el editor'); ausentes++; return; }

  var na = norm(a), nb = norm(b);
  if (na === nb) {
    console.log('  ok  ' + pad(f) + 'identicos');
    iguales++;
  } else {
    console.log('  XX  ' + pad(f) + 'DIFIEREN');
    distintos++;
    difieren.push([f, na.split('\n'), nb.split('\n')]);
  }
});

difieren.forEach(function (d) {
  var f = d[0], la = d[1], lb = d[2];
  console.log('\n' + '-'.repeat(72));
  console.log('DETALLE — ' + f);
  console.log('-'.repeat(72));
  muestra('  Solo en LOCAL (falta pegar en el editor):',
          la.filter(function (l) { return l.trim() && lb.indexOf(l) === -1; }));
  muestra('  Solo en EDITOR (se hizo alla y nunca bajo):',
          lb.filter(function (l) { return l.trim() && la.indexOf(l) === -1; }));
});

function muestra(titulo, lineas) {
  console.log('\n' + titulo + '  [' + lineas.length + ']');
  if (!lineas.length) { console.log('    (ninguna)'); return; }
  lineas.slice(0, 40).forEach(function (l) { console.log('    | ' + l.slice(0, 100)); });
  if (lineas.length > 40) console.log('    ... y ' + (lineas.length - 40) + ' mas');
}

console.log('\n' + '-'.repeat(72));
console.log('MARCADORES DE CAMBIO EN EL EDITOR');
console.log('-'.repeat(72) + '\n');

var faltan = 0;
MARCADORES.forEach(function (m) {
  var txt = leer(dir, m[0]);
  if (txt === null) { console.log('  ??  ' + pad(m[0]) + m[2] + ' (archivo ausente)'); faltan++; return; }
  if (txt.indexOf(m[1]) !== -1) {
    console.log('  ok  ' + pad(m[0]) + m[2]);
  } else {
    console.log('  XX  ' + pad(m[0]) + 'FALTA: ' + m[2] + '  <- ' + m[1]);
    faltan++;
  }
});

/* Limpieza: ver la nota de la cabecera. */
var limpiada = false;
if (bajamosNosotros && !conservar) {
  fs.readdirSync(dir).forEach(function (f) { fs.unlinkSync(path.join(dir, f)); });
  limpiada = true;
}

console.log('\n' + '='.repeat(72));
console.log('  Identicos: ' + iguales + '   Difieren: ' + distintos +
            '   Ausentes: ' + ausentes + '   Marcadores faltantes: ' + faltan);
if (distintos === 0 && ausentes === 0 && faltan === 0) {
  console.log('  >> src/ y el editor estan conciliados.');
} else {
  console.log('  >> HAY DERIVA. No pegue nada en corporativo sin resolverla.');
}
if (limpiada) console.log('  (copia de cotejo/ borrada; use --conservar para dejarla)');
console.log('='.repeat(72) + '\n');

process.exit(distintos === 0 && ausentes === 0 && faltan === 0 ? 0 : 1);
