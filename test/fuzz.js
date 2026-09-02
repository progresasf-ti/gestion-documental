/* Prueba de esfuerzo PSF GED — node test/fuzz.js */
const fs = require('fs'), vm = require('vm'), path = require('path');
const ctx = vm.createContext({ console, Date, JSON, Math, Number, String, Object, Array, parseInt, isNaN, RegExp });
['Taxonomia.gs', 'Nomenclatura.gs', 'Clasificador.gs', 'Indice.gs'].forEach(f => {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../src', f), 'utf8')
    .replace(/if \(typeof module[\s\S]*$/, ''), ctx, { filename: f });
});
const g = n => vm.runInContext(n, ctx);
const TIPOS = Object.keys(g('TIPOS')), PROCESOS = Object.keys(g('PROCESOS')), ORIGENES = Object.keys(g('ORIGENES'));

const BASURA = ['', null, undefined, 0, -1, 3.7, NaN, Infinity, true, false, [], {}, 'null',
  '../../etc/passwd', 'C:\\Windows\\System32', '<script>alert(1)</script>', '＄＄＄',
  '\u0000\u0007', '  ', '💥🔥', 'Ñoño', 'a'.repeat(5000), '"; DROP TABLE--',
  '=HYPERLINK("http://x")', '\n\r\t', '../..', 'file:///', '{"a":1}'];
const pick = a => a[Math.floor(Math.random() * a.length)];
const quizas = (v, p) => Math.random() < (p || 0.75) ? v : pick(BASURA);

const ILEGALES = /[\/\\:*?"<>|\u0000-\u001f]/;
let excepciones = [], violaciones = [], N = 20000;

for (let i = 0; i < N; i++) {
  const bruto = {
    tipo: quizas(pick(TIPOS)), proceso: quizas(pick(PROCESOS)), origen: quizas(pick(ORIGENES)),
    nit: quizas(String(900000000 + i) + (i % 10), 0.6),
    razonSocial: quizas('Comercializadora Ñandú S.A.S.'),
    titulo: quizas(pick(['Certificado de Cámara', 'Acta N° 019 — Junta Directiva',
      'Estados Financieros 2025/2026', 'RUT', 'a', 'x'.repeat(300), 'Póliza 12*34'])),
    fechaDocumento: quizas(pick(['2026-03-15', '15/03/2026', '2026-99-99', 'ayer', '20260315'])),
    confianza: quizas(Math.random()), justificacion: quizas('porque sí'),
    esNuevaVersion: quizas(Math.random() < 0.5)
  };
  const contexto = quizas({ fechaCarga: '2026-08-01', nombreOriginal: 'x.pdf' }, 0.8);

  let v;
  try { v = ctx.validarClasificacion(bruto, contexto); }
  catch (e) { excepciones.push({ fase: 'validar', e: e.message, bruto }); continue; }

  if (typeof v.ok !== 'boolean') violaciones.push('ok no booleano');
  if (!v.ok) continue;

  const c = v.clasificacion;
  let dec, nombre;
  try {
    dec = ctx.resolverConsecutivoYVersion(c, []);
    nombre = ctx.construirNombre(c, dec.consecutivo, dec.version, '.pdf');
  } catch (e) { excepciones.push({ fase: 'nombrar', e: e.message, c }); continue; }

  if (ILEGALES.test(nombre)) violaciones.push('caracter ilegal en: ' + JSON.stringify(nombre));
  if (nombre.length > g('REGLAS').MAX_NOMBRE) violaciones.push('excede largo: ' + nombre.length);
  if (/\s/.test(nombre)) violaciones.push('espacio en: ' + nombre);

  const p = ctx.parsearNombre(nombre);
  if (!p) violaciones.push('no reparseable: ' + nombre);
  else if (p.tipo !== c.tipo || p.proceso !== c.proceso ||
           p.consecutivo !== dec.consecutivo || p.version !== dec.version ||
           p.fechaDocumento !== c.fechaDocumento) {
    violaciones.push('ida y vuelta inconsistente: ' + nombre);
  }
  if (!/^\d{8}$/.test(c.fechaDocumento)) violaciones.push('fecha mal formada: ' + c.fechaDocumento);
}

// El rescatador de JSON contra texto arbitrario
for (let i = 0; i < 5000; i++) {
  const s = Array.from({ length: 40 }, () => pick(['{', '}', '"', '\\', ':', ',', 'a', '1', '\n', '```'])).join('');
  try { ctx.extraerJSON(s); } catch (e) { excepciones.push({ fase: 'extraerJSON', e: e.message, s }); }
}

console.log('\n══════ PRUEBA DE ESFUERZO ══════\n');
console.log(`  Casos ejecutados: ${N} clasificaciones + 5000 textos basura`);
console.log(`  Excepciones no controladas: ${excepciones.length}`);
console.log(`  Invariantes violados: ${violaciones.length}\n`);
if (excepciones.length) console.log('EXCEPCIONES:\n' + JSON.stringify(excepciones.slice(0, 5), null, 2));
if (violaciones.length) console.log('VIOLACIONES:\n' + [...new Set(violaciones)].slice(0, 10).join('\n'));
process.exit(excepciones.length || violaciones.length ? 1 : 0);
