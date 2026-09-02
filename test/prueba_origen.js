/* Pruebas locales del parche de ORIGEN (4.1 + 4.2). Solo Node. */
const fs = require('fs');
const path = require('path');

// Se cargan los .gs en un mismo ámbito, como hace Apps Script.
const orden = ['Taxonomia.gs', 'Nomenclatura.gs', 'Indice.gs', 'Clasificador.gs'];
const fuente = orden
  .map(f => fs.readFileSync(path.join(__dirname, '../src', f), 'utf8'))
  .join('\n');
eval(fuente + '\nglobalThis.__TAX = { ORIGENES_TERCEROS: ORIGENES_TERCEROS, NITS_PROPIOS: NITS_PROPIOS, TIPOS_ID: TIPOS_ID };');
const TAX = globalThis.__TAX;

let ok = 0, fail = 0;
function t(nombre, real, esperado) {
  const a = JSON.stringify(real), b = JSON.stringify(esperado);
  if (a === b) { ok++; console.log('  ok   ' + nombre); }
  else { fail++; console.log('  FALLA ' + nombre + '\n         esperado: ' + b + '\n         obtenido: ' + a); }
}
function tv(nombre, cond) { t(nombre, !!cond, true); }

const C = (o) => Object.assign({
  tipo: 'DE', proceso: 'GR', origen: 'ENT', nit: '9012345677',
  titulo: 'Certificado de Existencia y Representacion Legal',
  fechaDocumento: '20260312'
}, o);

console.log('\n1. SERIE ignora el origen, CODIGO lo conserva');
t('serie ENT', serieDe(C({ origen: 'ENT' })), 'DE-GR-9012345677');
t('serie FON', serieDe(C({ origen: 'FON' })), 'DE-GR-9012345677');
tv('serie identica con distinto origen',
   serieDe(C({ origen: 'ENT' })) === serieDe(C({ origen: 'FON' })));
t('codigo conserva ENT', codigoDe(C({ origen: 'ENT' }), 1), 'DE-GR-ENT-9012345677-001');
t('codigo conserva FON', codigoDe(C({ origen: 'FON' }), 7), 'DE-GR-FON-9012345677-007');
t('serie interna', serieDe(C({ tipo: 'PR', proceso: 'OP', nit: null })), 'PR-OP');
t('codigo interno', codigoDe(C({ tipo: 'PR', proceso: 'OP', nit: null }), 3), 'PR-OP-003');
t('MZ con NIT no numera por tercero', serieDe(C({ tipo: 'MZ' })), 'MZ-GR');
t('codigo MZ con NIT', codigoDe(C({ tipo: 'MZ' }), 2), 'MZ-GR-002');

console.log('\n2. El nombre del archivo NO cambia (regresion)');
t('nombre tercero',
  construirNombre(C({}), 1, 1, '.pdf'),
  'DE-GR-ENT-9012345677-001_V01_Certificado-De-Existencia-Y-Representacion-Legal_20260312.pdf');
t('nombre interno',
  construirNombre(C({ tipo: 'PR', proceso: 'OP', nit: null, titulo: 'Vinculacion de Clientes' }), 3, 2, '.pdf'),
  'PR-OP-003_V02_Vinculacion-De-Clientes_20260312.pdf');
const p = parsearNombre(construirNombre(C({}), 12, 1, '.pdf'));
t('ida y vuelta: origen', p && p.origen, 'ENT');
t('ida y vuelta: nit', p && p.nit, '9012345677');
t('ida y vuelta: consecutivo', p && p.consecutivo, 12);

console.log('\n3. El consecutivo ya no reinicia al cambiar de origen');
const idx = [{
  CODIGO: 'DE-GR-ENT-9012345677-001', TIPO: 'DE', PROCESO: 'GR', ORIGEN: 'ENT',
  NIT: '9012345677', CONSECUTIVO: 1, VERSION: 1, ESTADO: 'VIGENTE',
  TITULO: 'Certificado de Existencia y Representacion Legal',
  CLAVE_LOGICA: claveLogica(C({})), FILE_ID: 'f1'
}];
const nuevo = C({ origen: 'FON', titulo: 'Certificacion Bancaria' });
t('segundo doc del mismo tercero, otro origen -> 002',
  resolverConsecutivoYVersion(nuevo, idx).consecutivo, 2);
t('mismo doc, otro origen -> versiona con consecutivo 001',
  (function () {
    const d = resolverConsecutivoYVersion(C({ origen: 'FON' }), idx);
    return [d.consecutivo, d.version, d.esNuevaVersion];
  })(), [1, 2, true]);

console.log('\n4. origenRegistrado: gana la fila mas antigua');
const idx2 = [
  { NIT: '9012345677', ORIGEN: 'ENT' },
  { NIT: '9012345677', ORIGEN: 'FON' },
  { NIT: '9012345677', ORIGEN: 'FON' }
];
t('mas antigua, no la mas frecuente', origenRegistrado('9012345677', idx2), 'ENT');
t('tercero desconocido', origenRegistrado('800111222', idx2), null);
t('sin nit', origenRegistrado('', idx2), null);
t('indice vacio', origenRegistrado('9012345677', []), null);
t('ignora origen basura', origenRegistrado('9012345677', [{ NIT: '9012345677', ORIGEN: 'XXX' }, { NIT: '9012345677', ORIGEN: 'CLI' }]), 'CLI');

console.log('\n5. Herencia dentro del validador');
const bruto = {
  tipo: 'DE', proceso: 'GR', origen: 'FON', nit: '901234567',
  titulo: 'Certificacion Bancaria', confianza: 0.95, justificacion: 'x'
};
const conIdx = validarClasificacion(bruto, { indice: idx2 });
t('hereda ENT', conIdx.clasificacion.origen, 'ENT');
tv('avisa del ajuste', conIdx.avisos.some(a => a.indexOf('ORIGEN ajustado a ENT') !== -1));

const sinIdx = validarClasificacion(bruto, {});
t('sin indice no hereda (pureza)', sinIdx.clasificacion.origen, 'FON');
tv('sin indice no avisa', !sinIdx.avisos.some(a => a.indexOf('ORIGEN ajustado') !== -1));

const primero = validarClasificacion(bruto, { indice: [] });
t('tercero nuevo conserva lo propuesto', primero.clasificacion.origen, 'FON');

TAX.ORIGENES_TERCEROS['9012345677'] = 'CLI';
const conTabla = validarClasificacion(bruto, { indice: idx2 });
t('ORIGENES_TERCEROS manda sobre la herencia', conTabla.clasificacion.origen, 'CLI');
tv('avisa que viene de la tabla',
   conTabla.avisos.some(a => a.indexOf('ORIGENES_TERCEROS') !== -1));
delete TAX.ORIGENES_TERCEROS['9012345677'];

const propio = validarClasificacion(
  { tipo: 'PR', proceso: 'GR', origen: 'CLI', nit: '9009742555', titulo: 'Vinculacion', confianza: 0.9, justificacion: 'x' },
  { indice: idx2 });
t('NIT propio sigue mandando', propio.clasificacion.origen, 'PSF');
t('NIT propio se anula', propio.clasificacion.nit, null);

console.log('\n6. Guarda simetrica 4.2');
const g = validarClasificacion(
  { tipo: 'RG', proceso: 'GR', origen: 'PSF', nit: '901234567', titulo: 'Estudio de Cupo', confianza: 0.95, justificacion: 'x' },
  {});
tv('avisa origen propio con NIT de tercero',
   g.avisos.some(a => a.indexOf('es propio pero el NIT') !== -1));
t('fuerza revision', g.requiereRevision, true);
t('no lo vuelve error', g.ok, true);

const limpio = validarClasificacion(
  { tipo: 'RG', proceso: 'GR', origen: 'CLI', nit: '901234567', titulo: 'Estudio de Cupo', confianza: 0.95, justificacion: 'x' },
  {});
t('caso correcto no dispara revision', limpio.requiereRevision, false);

const interno = validarClasificacion(
  { tipo: 'PR', proceso: 'GR', origen: 'PSF', nit: '', titulo: 'Vinculacion', confianza: 0.9, justificacion: 'x' },
  {});
t('documento propio sin NIT no dispara', interno.requiereRevision, false);

console.log('\n7. Forma canonica de la identificacion');
t('NIT 9 digitos recibe DV', canonizarIdentificacion('NIT', '901234567'), '9012345677');
t('NIT 10 digitos no se toca', canonizarIdentificacion('NIT', '9012345677'), '9012345677');
tv('es idempotente',
   canonizarIdentificacion('NIT', canonizarIdentificacion('NIT', '901234567')) === '9012345677');
tv('las dos formas colapsan',
   canonizarIdentificacion('NIT', '901234567') === canonizarIdentificacion('NIT', '9012345677'));
t('NIT de PSF cuadra con NITS_PROPIOS', canonizarIdentificacion('NIT', '900974255'), '9009742555');
tv('y la tabla lo reconoce', !!TAX.NITS_PROPIOS[canonizarIdentificacion('NIT', '900974255')]);
t('cedula de 7 digitos intacta', canonizarIdentificacion('CC', '1234567'), '1234567');
t('cedula de 8 digitos intacta', canonizarIdentificacion('CC', '71234567'), '71234567');
t('cedula de 10 digitos NO recibe DV', canonizarIdentificacion('CC', '1012345678'), '1012345678');
t('tipo desconocido se trata como NIT', canonizarIdentificacion('XX', '901234567'), '9012345677');
t('vacio', canonizarIdentificacion('NIT', ''), null);
t('limpiarNIT acepta 7 digitos', limpiarNIT('1.234.567'), '1234567');
t('limpiarNIT rechaza 6', limpiarNIT('123456'), null);
t('limpiarNIT rechaza 11', limpiarNIT('12345678901'), null);

console.log('\n8. El mismo tercero no se parte en dos series');
const brutoA = { tipo: 'DE', proceso: 'GR', origen: 'CLI', nit: '901234567',
                 titulo: 'Certificado', confianza: 0.9, justificacion: 'x' };
const brutoB = Object.assign({}, brutoA, { nit: '901.234.567-7' });
const cA = validarClasificacion(brutoA, {}).clasificacion;
const cB = validarClasificacion(brutoB, {}).clasificacion;
t('con y sin DV dan el mismo nit', [cA.nit, cB.nit], ['9012345677', '9012345677']);
t('misma serie', serieDe(cA), serieDe(cB));
t('misma clave logica', claveLogica(cA), claveLogica(cB));
tv('el nombre se reparsea con 10 digitos',
   !!parsearNombre(construirNombre(cA, 1, 1, '.pdf')));
const cCC = validarClasificacion(
  Object.assign({}, brutoA, { tipoIdentificacion: 'CC', nit: '1234567' }), {}).clasificacion;
t('cedula corta sobrevive', cCC.nit, '1234567');
tv('y su nombre se reparsea',
   !!parsearNombre(construirNombre(cCC, 1, 1, '.pdf')));

console.log('\n9. RUC de PFI: identificacion extranjera, sin DV de la DIAN');
/* PFI se identifica con un RUC, no con un NIT colombiano. Antes de este cambio
   canonizarIdentificacion le calculaba un DV de la DIAN y lo convertia en
   1557092416, un numero que no existe en ningun registro. */
t('el RUC no recibe DV', canonizarIdentificacion('RUC', '155709241'), '155709241');
t('un NIT de 9 digitos si lo recibe', canonizarIdentificacion('NIT', '155709241'), '1557092416');
tv('RUC es un tipo reconocido', !!TAX.TIPOS_ID['RUC']);
tv('y no lleva DV', TAX.TIPOS_ID['RUC'].llevaDV === false);
t('canonizar el RUC es idempotente',
  canonizarIdentificacion('RUC', canonizarIdentificacion('RUC', '155709241')), '155709241');

const pfi = (o) => validarClasificacion(Object.assign({
  tipo: 'RG', proceso: 'GF', origen: 'PFI', tipoIdentificacion: 'RUC',
  nit: '155709241', titulo: 'Estados Financieros', confianza: 0.9, justificacion: 'x'
}, o), {}).clasificacion;

t('PFI bien marcado -> origen PFI', pfi({}).origen, 'PFI');
t('PFI bien marcado -> sin nit en el nombre', pfi({}).nit, null);
/* La guarda: si el modelo marca el RUC como NIT, la canonizacion se va por la
   rama del DV y la clave de NITS_PROPIOS deja de coincidir. Sin la busqueda por
   la forma cruda, este documento propio se archivaria como de tercero. */
t('PFI marcado como NIT -> sigue siendo propio', pfi({ tipoIdentificacion: 'NIT' }).origen, 'PFI');
t('PFI marcado como NIT -> sin nit en el nombre', pfi({ tipoIdentificacion: 'NIT' }).nit, null);
t('PFI propuesto como tercero -> corregido',
  pfi({ origen: 'CLI', tipo: 'DE', proceso: 'GR' }).origen, 'PFI');
t('PSF sigue reconociendose (regresion)',
  pfi({ tipoIdentificacion: 'NIT', nit: '900974255', origen: 'PSF' }).origen, 'PSF');
tv('el RUC llega al prompt', construirPromptSistema().indexOf('155709241') !== -1);
tv('RUC esta en el enum del esquema',
   JSON.stringify(esquemaClasificacion()).indexOf('"RUC"') !== -1);

console.log('\n' + ok + ' ok, ' + fail + ' fallas\n');
process.exit(fail ? 1 : 0);
