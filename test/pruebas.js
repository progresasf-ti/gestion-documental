/* Banco de pruebas PSF GED — ejecuta con: node test/pruebas.js */
const fs = require('fs');
const vm = require('vm');
const path = require('path');

// Apps Script comparte un único ámbito global entre todos los .gs.
// Replicamos exactamente eso para que las pruebas reflejen el runtime real.
const ctx = vm.createContext({ console, Date, JSON, Math, Number, String, Object, Array, parseInt, isNaN, RegExp });
['Taxonomia.gs', 'Nomenclatura.gs', 'Clasificador.gs', 'Indice.gs'].forEach(f => {
  const code = fs.readFileSync(path.join(__dirname, '../src', f), 'utf8')
    .replace(/if \(typeof module[\s\S]*$/, '');   // quitar el bloque module.exports
  vm.runInContext(code, ctx, { filename: f });
});

let pasadas = 0, fallidas = 0;
const fallos = [];

function chk(nombre, real, esperado) {
  const r = JSON.stringify(real), e = JSON.stringify(esperado);
  if (r === e) { pasadas++; }
  else { fallidas++; fallos.push(`  ✗ ${nombre}\n      esperado: ${e}\n      obtenido: ${r}`); }
}
function chkV(nombre, cond, detalle) {
  if (cond) pasadas++;
  else { fallidas++; fallos.push(`  ✗ ${nombre}${detalle ? '\n      ' + detalle : ''}`); }
}
const run = (fn, ...a) => vm.runInContext(`(${fn})`, ctx)(...a);
const call = (nombre, ...args) => ctx[nombre](...args);
// const/let no se exponen en el objeto de contexto; se leen evaluando su nombre.
const g = (nombre) => vm.runInContext(nombre, ctx);

console.log('\n══════ PSF GED — BANCO DE PRUEBAS ══════\n');

/* ─────────── 1. NORMALIZACIÓN Y KEBAB ─────────── */
console.log('1. Normalización de títulos');
chk('tildes', call('aKebab', 'Gestión de Operación'), 'Gestion-De-Operacion');
chk('eñe', call('aKebab', 'Diseño de Cañería'), 'Diseno-De-Caneria');
chk('caracteres ilegales de Drive', call('aKebab', 'Factura 12/34 *urgente*'), 'Factura-12-34-Urgente');
chk('título vacío', call('aKebab', ''), 'Sin-Titulo');
chk('título nulo', call('aKebab', null), 'Sin-Titulo');
chk('sólo signos', call('aKebab', '¿¡...!?'), 'Sin-Titulo');
chk('emojis', call('aKebab', 'Acta 📄 Junta ✅'), 'Acta-Junta');
chk('espacios múltiples', call('aKebab', '  Acta    de   Junta  '), 'Acta-De-Junta');
chk('trunca en palabra', call('aKebab', 'Certificado de Existencia y Representacion Legal Camara', 30), 'Certificado-De-Existencia-Y');
chkV('nunca excede el máximo', call('aKebab', 'a'.repeat(200), 40).length <= 40);
chk('palabra única gigante', call('aKebab', 'Supercalifragilisticoespialidoso', 10).length, 10);

/* ─────────── 2. NIT ─────────── */
console.log('2. NIT y dígito de verificación');
chk('NIT con puntos y guion', call('limpiarNIT', '900.974.255-5'), '9009742555');
chk('NIT limpio 9 dígitos', call('limpiarNIT', '900974255'), '900974255');
chk('NIT muy corto', call('limpiarNIT', '12345'), null);
chk('NIT muy largo', call('limpiarNIT', '12345678901234'), null);
chk('NIT vacío', call('limpiarNIT', ''), null);
chk('DV de PSF 900974255', call('digitoVerificacion', '900974255'), 5);
chk('DV de EQUIMETRICA 902074144', call('digitoVerificacion', '902074144'), 1);
chk('NIT PSF coherente', call('nitEsCoherente', '9009742555'), true);
chk('NIT con DV errado', call('nitEsCoherente', '9009742559'), false);
chk('sin DV no verificable', call('nitEsCoherente', '900974255'), null);

/* ─────────── 3. FECHAS ─────────── */
console.log('3. Normalización de fechas');
const fb = new Date(Date.UTC(2026, 7, 1));
chk('ISO', call('normalizarFecha', '2026-03-15', fb), '20260315');
chk('colombiana DD/MM/AAAA', call('normalizarFecha', '15/03/2026', fb), '20260315');
chk('compacta', call('normalizarFecha', '20260315', fb), '20260315');
chk('DD-MM-AAAA', call('normalizarFecha', '15-03-2026', fb), '20260315');
chk('mes 13 inválido', call('normalizarFecha', '2026-13-01', fb), '20260801');
chk('31 de febrero', call('normalizarFecha', '2026-02-31', fb), '20260801');
chk('año absurdo 1789', call('normalizarFecha', '1789-01-01', fb), '20260801');
chk('fecha futura', call('normalizarFecha', '2031-01-01', fb), '20260801');
chk('texto basura', call('normalizarFecha', 'sin fecha', fb), '20260801');
chk('vacío', call('normalizarFecha', '', fb), '20260801');
chk('bisiesto válido', call('normalizarFecha', '2024-02-29', fb), '20240229');
chk('no bisiesto', call('normalizarFecha', '2026-02-29', fb), '20260801');

/* ─────────── 4. CONSTRUCCIÓN DE NOMBRES ─────────── */
console.log('4. Construcción de nombres');
const interno = { tipo: 'PR', proceso: 'OP', origen: 'PSF', nit: null,
  titulo: 'Compra de Cartera con Recurso', fechaDocumento: '20260801' };
chk('interno', call('construirNombre', interno, 3, 2, '.pdf'),
  'PR-OP-003_V02_Compra-De-Cartera-Con-Recurso_20260801.pdf');

const tercero = { tipo: 'RG', proceso: 'GC', origen: 'CLI', nit: '9001234561',
  titulo: 'Certificado Camara de Comercio', fechaDocumento: '20260801' };
chk('tercero con NIT', call('construirNombre', tercero, 12, 1, '.pdf'),
  'RG-GC-CLI-9001234561-012_V01_Certificado-Camara-De-Comercio_20260801.pdf');

chk('consecutivo 4 dígitos', call('construirNombre', interno, 1024, 1, '.pdf').slice(0, 12), 'PR-OP-1024_V');
chk('sin extensión', call('construirNombre', interno, 1, 1, ''),
  'PR-OP-001_V01_Compra-De-Cartera-Con-Recurso_20260801');
chkV('respeta longitud máxima',
  call('construirNombre', { tipo: 'RG', proceso: 'OP', origen: 'CLI', nit: '9001234561',
    titulo: 'x'.repeat(400), fechaDocumento: '20260801' }, 1, 1, '.pdf').length <= 180);

/* ─────────── 5. PARSEO INVERSO (ida y vuelta) ─────────── */
console.log('5. Parseo inverso');
const n1 = call('construirNombre', interno, 3, 2, '.pdf');
const p1 = call('parsearNombre', n1);
chk('parseo interno', [p1.tipo, p1.proceso, p1.consecutivo, p1.version, p1.fechaDocumento],
  ['PR', 'OP', 3, 2, '20260801']);
const n2 = call('construirNombre', tercero, 12, 1, '.pdf');
const p2 = call('parsearNombre', n2);
chk('parseo tercero', [p2.tipo, p2.origen, p2.nit, p2.consecutivo], ['RG', 'CLI', '9001234561', 12]);
chk('nombre ajeno al sistema', call('parsearNombre', 'Escaneo 2026 (1).pdf'), null);
chk('nombre casi válido', call('parsearNombre', 'PR-OP-3_V2_Algo_20260801.pdf'), null);

/* ─────────── 6. RESCATE DE JSON ─────────── */
console.log('6. Rescate de JSON del modelo');
chk('JSON limpio', call('extraerJSON', '{"tipo":"PR"}'), { tipo: 'PR' });
chk('con vallas markdown', call('extraerJSON', '```json\n{"tipo":"PR"}\n```'), { tipo: 'PR' });
chk('con preámbulo', call('extraerJSON', 'Claro, aquí está:\n{"tipo":"PR"}\nEspero sirva.'), { tipo: 'PR' });
chk('anidado', call('extraerJSON', 'x {"a":{"b":1},"c":2} y'), { a: { b: 1 }, c: 2 });
chk('llave dentro de cadena', call('extraerJSON', '{"t":"dice } aqui","u":1}'), { t: 'dice } aqui', u: 1 });
chk('coma colgante', call('extraerJSON', '{"a":1,}'), { a: 1 });
chk('sin JSON', call('extraerJSON', 'No pude clasificarlo.'), null);
chk('JSON roto', call('extraerJSON', '{"a":'), null);

/* ─────────── 7. VALIDADOR ─────────── */
console.log('7. Validador defensivo');
const ctxDoc = { fechaCarga: '2026-08-01', nombreOriginal: 'escaneo.pdf' };

let v = call('validarClasificacion', { tipo: 'PR', proceso: 'OP', origen: 'PSF',
  titulo: 'Compra de Cartera', fechaDocumento: '2026-07-15', confianza: 0.95,
  justificacion: 'Encabezado dice Procedimiento' }, ctxDoc);
chk('caso feliz ok', [v.ok, v.requiereRevision], [true, false]);
chk('fecha normalizada', v.clasificacion.fechaDocumento, '20260715');
chk('cláusula ISO derivada', v.clasificacion.clausulaISO, '4.4');

v = call('validarClasificacion', { tipo: 'XX', proceso: 'OP', origen: 'PSF',
  titulo: 'Algo', confianza: 0.9, justificacion: '' }, ctxDoc);
chk('tipo inválido rechazado', [v.ok, v.requiereRevision], [false, true]);

v = call('validarClasificacion', { tipo: 'PR', proceso: 'ZZ', origen: 'PSF',
  titulo: 'Algo', confianza: 0.9, justificacion: '' }, ctxDoc);
chkV('proceso inválido rechazado', v.ok === false);

v = call('validarClasificacion', { tipo: 'PR', proceso: 'OP', origen: 'PSF',
  titulo: 'Algo', confianza: 0.40, justificacion: '' }, ctxDoc);
chk('confianza baja va a revisión', [v.ok, v.requiereRevision], [true, true]);

v = call('validarClasificacion', { tipo: 'RG', proceso: 'GF', origen: 'CLI',
  nit: '900.974.255-5', titulo: 'Estados Financieros', confianza: 0.9,
  justificacion: '' }, ctxDoc);
chk('NIT propio corrige el origen', [v.clasificacion.origen, v.clasificacion.nit], ['PSF', null]);
chkV('avisa la corrección', v.avisos.some(a => /Origen corregido/.test(a)));

v = call('validarClasificacion', { tipo: 'RG', proceso: 'GC', origen: 'CLI',
  nit: '', titulo: 'Certificado', confianza: 0.95, justificacion: '' }, ctxDoc);
chk('tercero sin NIT va a revisión', v.requiereRevision, true);

v = call('validarClasificacion', { tipo: 'RG', proceso: 'GC', origen: 'CLI',
  nit: '9001234569', titulo: 'Certificado', confianza: 0.95, justificacion: '' }, ctxDoc);
chkV('DV incoherente va a revisión', v.requiereRevision === true);

v = call('validarClasificacion', { tipo: 'pr', proceso: 'op', origen: 'psf',
  titulo: 'Algo Valido', confianza: 0.9, justificacion: '' }, ctxDoc);
chk('acepta minúsculas', [v.ok, v.clasificacion.tipo, v.clasificacion.proceso], [true, 'PR', 'OP']);

v = call('validarClasificacion', { tipo: 'PR', proceso: 'OP', origen: 'PSF',
  titulo: '', confianza: 0.9, justificacion: '' }, ctxDoc);
chkV('título vacío rechazado', v.ok === false);

v = call('validarClasificacion', { tipo: 'PR', proceso: 'OP', origen: 'PSF',
  titulo: 'Algo', confianza: 'muy alta', justificacion: '' }, ctxDoc);
chk('confianza no numérica -> 0', v.clasificacion.confianza, 0);

v = call('validarClasificacion', { tipo: 'PR', proceso: 'OP', origen: 'PSF',
  titulo: 'Algo', confianza: 7.5, justificacion: '' }, ctxDoc);
chk('confianza fuera de rango se acota', v.clasificacion.confianza, 1);

chkV('null no revienta', call('validarClasificacion', null, ctxDoc).ok === false);
chkV('string no revienta', call('validarClasificacion', 'error', ctxDoc).ok === false);
chkV('sin contexto no revienta', call('validarClasificacion', { tipo: 'PR', proceso: 'OP',
  origen: 'PSF', titulo: 'Algo', confianza: 0.9 }, null).ok === true);

/* ─────────── 8. CLAVE LÓGICA / VERSIONES ─────────── */
console.log('8. Identidad lógica y versiones');
const a = { tipo: 'PR', proceso: 'OP', nit: null, titulo: 'Compra de Cartera' };
const b = { tipo: 'PR', proceso: 'OP', nit: null, titulo: 'COMPRA DE CARTERA' };
const c2 = { tipo: 'PR', proceso: 'OP', nit: null, titulo: 'Compra de Cartera Sin Recurso' };
chk('mismo doc con otra grafía = misma clave',
  call('claveLogica', a) === call('claveLogica', b), true);
chk('doc distinto = clave distinta',
  call('claveLogica', a) === call('claveLogica', c2), false);
chk('mismo título, distinto cliente = clave distinta',
  call('claveLogica', { tipo: 'RG', proceso: 'GC', nit: '111', titulo: 'Camara' }) ===
  call('claveLogica', { tipo: 'RG', proceso: 'GC', nit: '222', titulo: 'Camara' }), false);

/* ─────────── 9. PROMPT ─────────── */
console.log('9. Prompt y esquema');
const sys = call('construirPromptSistema');
chkV('el prompt lista los 10 tipos', Object.keys(g('TIPOS')).every(t => sys.includes(t + ' = ')));
chkV('el prompt lista los 10 procesos', Object.keys(g('PROCESOS')).every(p => sys.includes(p + ' = ')));
chkV('el prompt instruye confianza honesta', /confianza por debajo de 0\.75/.test(sys));
const esq = call('esquemaClasificacion');
chk('enum de tipos sincronizado', esq.input_schema.properties.tipo.enum, Object.keys(g('TIPOS')));
chk('enum de procesos sincronizado', esq.input_schema.properties.proceso.enum, Object.keys(g('PROCESOS')));
chkV('texto largo se recorta',
  call('construirPromptUsuario', { texto: 'z'.repeat(50000) }).length < 15000);
chkV('texto corto no se toca',
  call('construirPromptUsuario', { texto: 'hola' }).includes('hola'));


/* ─────────── 10. CONSECUTIVOS Y VERSIONES ─────────── */
console.log('10. Consecutivos y versiones');

const mkFila = (o) => Object.assign({
  TIPO:'PR', PROCESO:'OP', ORIGEN:'PSF', NIT:'', CONSECUTIVO:1, VERSION:1,
  ESTADO:'VIGENTE', FILE_ID:'id-'+Math.random().toString(36).slice(2,8)
}, o);

const cPR = { tipo:'PR', proceso:'OP', origen:'PSF', nit:null, titulo:'Compra de Cartera' };
const claveCPR = call('claveLogica', cPR);

// Índice vacío
let d = call('resolverConsecutivoYVersion', cPR, []);
chk('índice vacío -> 001 V01', [d.consecutivo, d.version, d.esNuevaVersion], [1, 1, false]);

// Serie con documentos previos
let idx = [
  mkFila({CONSECUTIVO:1, CLAVE_LOGICA:'PR|OP|PROPIO|OTRA-COSA'}),
  mkFila({CONSECUTIVO:2, CLAVE_LOGICA:'PR|OP|PROPIO|OTRA-MAS'}),
];
d = call('resolverConsecutivoYVersion', cPR, idx);
chk('siguiente de la serie', [d.consecutivo, d.version], [3, 1]);

// Hueco por documento borrado: no se reutiliza el número
idx = [ mkFila({CONSECUTIVO:1, CLAVE_LOGICA:'x'}), mkFila({CONSECUTIVO:5, CLAVE_LOGICA:'y'}) ];
d = call('resolverConsecutivoYVersion', cPR, idx);
chk('no reutiliza huecos', d.consecutivo, 6);

// Mismo documento -> versión 2, conserva consecutivo
idx = [ mkFila({CONSECUTIVO:7, VERSION:1, CLAVE_LOGICA:claveCPR, FILE_ID:'A'}) ];
d = call('resolverConsecutivoYVersion', cPR, idx);
chk('mismo doc -> V02 mismo consecutivo', [d.consecutivo, d.version, d.esNuevaVersion], [7, 2, true]);
chk('obsoleta la versión anterior', d.obsoletar, ['A']);

// Tercera versión
idx.push(mkFila({CONSECUTIVO:7, VERSION:2, CLAVE_LOGICA:claveCPR, FILE_ID:'B'}));
d = call('resolverConsecutivoYVersion', cPR, idx);
chk('tercera versión', d.version, 3);

// Sólo se obsoletan las VIGENTES
idx = [ mkFila({CONSECUTIVO:7, VERSION:1, CLAVE_LOGICA:claveCPR, FILE_ID:'A', ESTADO:'OBSOLETO'}),
        mkFila({CONSECUTIVO:7, VERSION:2, CLAVE_LOGICA:claveCPR, FILE_ID:'B', ESTADO:'VIGENTE'}) ];
d = call('resolverConsecutivoYVersion', cPR, idx);
chk('sólo obsoleta las vigentes', d.obsoletar, ['B']);
chk('versión 3 tras una obsoleta', d.version, 3);

// Un ANULADO no cuenta como versión previa
idx = [ mkFila({CONSECUTIVO:7, VERSION:1, CLAVE_LOGICA:claveCPR, FILE_ID:'A', ESTADO:'ANULADO'}) ];
d = call('resolverConsecutivoYVersion', cPR, idx);
chk('anulado no genera versión', [d.version, d.esNuevaVersion], [1, false]);

// Series independientes por proceso
idx = [ mkFila({TIPO:'PR', PROCESO:'GF', CONSECUTIVO:9, CLAVE_LOGICA:'z'}) ];
d = call('resolverConsecutivoYVersion', cPR, idx);
chk('otra serie no contamina', d.consecutivo, 1);

// Series independientes por tercero
const cCLI1 = { tipo:'RG', proceso:'GC', origen:'CLI', nit:'9001234561', titulo:'Camara Comercio' };
const cCLI2 = { tipo:'RG', proceso:'GC', origen:'CLI', nit:'9007654321', titulo:'Camara Comercio' };
idx = [ mkFila({TIPO:'RG', PROCESO:'GC', ORIGEN:'CLI', NIT:'9001234561', CONSECUTIVO:4,
                CLAVE_LOGICA:'otra'}) ];
chk('serie del cliente A avanza', call('resolverConsecutivoYVersion', cCLI1, idx).consecutivo, 5);
chk('serie del cliente B arranca en 1', call('resolverConsecutivoYVersion', cCLI2, idx).consecutivo, 1);
chk('mismo título, distinto NIT, no es versión',
    call('resolverConsecutivoYVersion', cCLI2, idx).esNuevaVersion, false);

// Datos sucios en la hoja
idx = [ mkFila({CONSECUTIVO:'', CLAVE_LOGICA:'a'}), mkFila({CONSECUTIVO:'abc', CLAVE_LOGICA:'b'}),
        mkFila({CONSECUTIVO:3, CLAVE_LOGICA:'c'}) ];
chk('ignora consecutivos corruptos', call('resolverConsecutivoYVersion', cPR, idx).consecutivo, 4);

idx = [ mkFila({CONSECUTIVO:'8', VERSION:'2', CLAVE_LOGICA:claveCPR, FILE_ID:'A'}) ];
d = call('resolverConsecutivoYVersion', cPR, idx);
chk('acepta números como texto (Sheets)', [d.consecutivo, d.version], [8, 3]);

// Código y retención
chk('código propio', call('codigoDe', cPR, 3), 'PR-OP-003');
chk('código de tercero', call('codigoDe', cCLI1, 5), 'RG-GC-CLI-9001234561-005');
chk('retención', call('retencionHasta', {fechaDocumento:'20260801', retencionAnios:10}), '2036');
chk('retención permanente', call('retencionHasta', {fechaDocumento:'20260801', retencionAnios:99}), '2125');

// Duplicado exacto por huella
const idxH = [ mkFila({HUELLA:'abc123', CONSECUTIVO:1}) ];
chkV('detecta duplicado por huella', call('yaRegistrado', idxH, 'abc123') !== null);
chk('huella distinta no es duplicado', call('yaRegistrado', idxH, 'zzz'), null);
chk('sin huella no compara', call('yaRegistrado', idxH, ''), null);


/* ─────────── 11. LÍMITES DE CRECIMIENTO ─────────── */
console.log('11. Límites de crecimiento');
const cLim = { tipo:'PR', proceso:'OP', origen:'PSF', nit:null, titulo:'Algo', fechaDocumento:'20260801' };
[999, 1000, 9999, 10000, 99999, 999999].forEach(k => {
  const n = call('construirNombre', cLim, k, 1, '.pdf');
  const p = call('parsearNombre', n);
  chkV('consecutivo ' + k + ' reparseable', p !== null && p.consecutivo === k, n);
});
[1, 9, 99, 100, 999].forEach(v => {
  const n = call('construirNombre', cLim, 1, v, '.pdf');
  const p = call('parsearNombre', n);
  chkV('versión ' + v + ' reparseable', p !== null && p.version === v, n);
});
const cLimT = { tipo:'RG', proceso:'OP', origen:'CLI', nit:'9001234561', titulo:'Factura', fechaDocumento:'20260801' };
[10000, 250000].forEach(k => {
  const n = call('construirNombre', cLimT, k, 1, '.pdf');
  chkV('tercero consecutivo ' + k + ' reparseable', call('parsearNombre', n) !== null, n);
});
chk('un consecutivo de 7 dígitos sí se rechaza',
    call('parsearNombre', 'PR-OP-1234567_V01_Algo_20260801.pdf'), null);


/* ─────────── 12. SIMILITUD Y DUPLICADOS ─────────── */
console.log('12. Similitud de títulos y duplicados');
const sim = (a,b) => call('similitudTitulos', a, b);
chkV('idénticos = 1', sim('Certificado Camara Comercio','Certificado Camara Comercio') === 1);
chkV('ignora palabras vacías', sim('Certificado de Camara de Comercio','Certificado Camara Comercio') === 1);
chkV('ignora tildes y mayúsculas', sim('Póliza de Cumplimiento','poliza cumplimiento') === 1);
chkV('parecidos > 0.6', sim('Estados Financieros 2025','Estados Financieros Consolidados 2025') >= 0.6);
chkV('distintos < 0.3', sim('Acta de Junta Directiva','Factura de Venta 4471') < 0.3, 'val='+sim('Acta de Junta Directiva','Factura de Venta 4471'));
chkV('vacío = 0', sim('', 'Algo') === 0);
chkV('sólo palabras vacías = 0', sim('de la el', 'Algo') === 0);

const fSim = (o) => Object.assign({TIPO:'PR',PROCESO:'OP',NIT:'',ESTADO:'VIGENTE',
  CODIGO:'PR-OP-001',VERSION:1,TITULO:'Compra de Cartera con Recurso',CLAVE_LOGICA:'distinta'}, o);
const cSim = {tipo:'PR',proceso:'OP',origen:'PSF',nit:null,titulo:'Compra Cartera Recurso'};
let sims = call('documentosSimilares', cSim, [fSim({})]);
chkV('detecta el mismo doc titulado distinto', sims.length === 1 && sims[0].similitud >= 0.6,
     JSON.stringify(sims));
chk('no alerta si es otro proceso', call('documentosSimilares', cSim, [fSim({PROCESO:'GF'})]).length, 0);
chk('no alerta si es otro tercero', call('documentosSimilares',
     {tipo:'RG',proceso:'GC',nit:'111',titulo:'Camara Comercio'},
     [fSim({TIPO:'RG',PROCESO:'GC',NIT:'222',TITULO:'Camara Comercio'})]).length, 0);
chk('no alerta sobre anulados', call('documentosSimilares', cSim, [fSim({ESTADO:'ANULADO'})]).length, 0);
chk('no duplica la coincidencia exacta', call('documentosSimilares', cSim,
     [fSim({CLAVE_LOGICA: call('claveLogica', cSim)})]).length, 0);
chk('documentos sin relación no alertan', call('documentosSimilares', cSim,
     [fSim({TITULO:'Manual de Convivencia Laboral'})]).length, 0);
chkV('ordena por similitud descendente', (() => {
  const r = call('documentosSimilares', cSim, [fSim({TITULO:'Compra Cartera'}), fSim({TITULO:'Compra de Cartera con Recurso'})]);
  return r.length === 2 && r[0].similitud >= r[1].similitud;
})());
chk('columna HUELLA presente en el índice', g('COLUMNAS_INDICE').indexOf('HUELLA') > -1, true);


/* ─────────── 13. INTEGRIDAD DE COLUMNAS ─────────── */
console.log('13. Integridad de columnas de las hojas');
const fsx = require('fs');
const motor = fsx.readFileSync(__dirname + '/../src/Motor.gs', 'utf8');
const inst  = fsx.readFileSync(__dirname + '/../src/Instalador.gs', 'utf8');
const indg  = fsx.readFileSync(__dirname + '/../src/Indice.gs', 'utf8');

// Cabeceras de APROBACIONES declaradas en el instalador
const cabAprob = inst.match(/QUEUE_SHEET_NAME, \[([\s\S]*?)\], '#/)[1]
  .match(/'[A-Z_]+'/g).map(x => x.replace(/'/g, ''));
// Valores escritos por encolar()
const valores = motor.match(/function encolar[\s\S]*?appendRow\(\[([\s\S]*?)\]\);/)[1];
const nVal = valores.split(/,(?![^(]*\))/).filter(x => x.trim()).length;
chk('APROBACIONES: columnas escritas = cabeceras', nVal, cabAprob.length);

// SU_DECISION debe estar en la columna que usa la validación de datos
const colDecision = cabAprob.indexOf('SU_DECISION') + 1;
const colUsada = parseInt(inst.match(/var col = (\d+);\s*\/\/ SU_DECISION/)[1], 10);
chk('la lista desplegable apunta a SU_DECISION', colUsada, colDecision);

// El formato condicional usa la letra de la columna ESTADO
const letraEstado = String.fromCharCode(64 + cabAprob.indexOf('ESTADO') + 1);
chkV('el formato condicional apunta a ESTADO (' + letraEstado + ')',
     inst.includes('$' + letraEstado + '2="REVISAR"'));

// LISTADO_MAESTRO: la fila escrita debe tener tantos campos como COLUMNAS_INDICE
const filaIdx = indg.match(/var fila = \[([\s\S]*?)\];/)[1];
const nIdx = filaIdx.split(/,(?![^(]*\))/).filter(x => x.trim()).length;
chk('LISTADO_MAESTRO: campos escritos = columnas', nIdx, g('COLUMNAS_INDICE').length);

// Toda columna leída en Motor.gs debe existir en las cabeceras
const leidas = [...motor.matchAll(/C\['([A-Z_]+)'\]/g)].map(m => m[1]);
const faltantes = [...new Set(leidas)].filter(x => cabAprob.indexOf(x) === -1);
chk('Motor no lee columnas inexistentes', faltantes, []);

/* ─────────── RESULTADO ─────────── */
console.log('\n───────────────────────────────────────');
if (fallos.length) { console.log('FALLOS:\n' + fallos.join('\n')); }
console.log(`\n  Pasadas: ${pasadas}   Fallidas: ${fallidas}\n`);
process.exit(fallidas ? 1 : 0);
