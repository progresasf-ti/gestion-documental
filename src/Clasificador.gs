/**********************************************************************
 * PSF GED — Clasificador.gs
 *
 * Responsabilidad única: convertir el TEXTO de un documento en un
 * objeto de clasificación validado. No renombra, no mueve, no escribe.
 *
 * La salida del modelo se fuerza con una "herramienta" (tool_use) de la
 * API de Anthropic. Eso obliga al modelo a devolver un JSON que cumple
 * el esquema; es mucho más confiable que pedirle "responde sólo JSON".
 **********************************************************************/

/* ---------- 1. ESQUEMA DE SALIDA -------------------------------- */

function esquemaClasificacion() {
  return {
    name: 'registrar_clasificacion',
    description: 'Registra la clasificación documental de un documento de PSF según ISO 9001:2015.',
    input_schema: {
      type: 'object',
      properties: {
        tipo: { type: 'string', enum: Object.keys(TIPOS),
          description: 'Código del tipo documental.' },
        proceso: { type: 'string', enum: Object.keys(PROCESOS),
          description: 'Proceso del SGC al que pertenece el documento.' },
        origen: { type: 'string', enum: Object.keys(ORIGENES),
          description: 'A quién pertenece el documento. PSF/EQM/PFI si es propio.' },
        tipoIdentificacion: { type: 'string', enum: ['NIT', 'RUC', 'CC', 'CE', 'TI'],
          description: 'Tipo de identificacion, tal como aparece en el documento: NIT para empresas colombianas, RUC para empresas extranjeras, CC para cedula de ciudadania, CE para cedula de extranjeria, TI para tarjeta de identidad. Si el documento no lo dice y el numero tiene 9 o mas digitos, usa NIT. Cadena vacia si no aparece ninguna identificacion.' },
        nit: { type: 'string',
          description: 'Numero de identificacion, solo digitos, SIN puntos ni guiones. Si es un NIT colombiano, SIN el digito de verificacion: de "NIT 901.234.567-7" transcribe 901234567. Un RUC NO tiene digito de verificacion de la DIAN: transcribelo COMPLETO, sin quitarle nada. Cadena vacia si no aparece.' },
        razonSocial: { type: 'string',
          description: 'Nombre o razón social del tercero tal como aparece. Cadena vacía si no aplica.' },
        titulo: { type: 'string',
          description: 'Nombre del ACTO O TRAMITE que el documento documenta, maximo 6 palabras, sin tildes. NO incluyas quien lo emite, ni la razon social o el NIT de la empresa o persona sobre la que trata (eso va en el campo razonSocial), ni calificativos variables como "comparativos", "consolidados" o "anual". NO empieces el titulo por "Formato", "Formulario" ni "Plantilla". Aplica estrictamente la regla 8. Ej: "Certificado de Existencia y Representacion Legal", NO "Certificado Camara Comercio".' },
        fechaDocumento: { type: 'string',
          description: 'Fecha del documento en formato AAAA-MM-DD. Cadena vacía si no se puede determinar.' },
        esNuevaVersion: { type: 'boolean',
          description: 'true si el texto indica explícitamente que reemplaza o actualiza una versión anterior.' },
        confianza: { type: 'number',
          description: 'Confianza en la clasificación, entre 0 y 1.' },
        justificacion: { type: 'string',
          description: 'Una frase corta explicando en qué se basó la clasificación. Queda en la traza de auditoría.' }
      },
      required: ['tipo', 'proceso', 'origen', 'titulo', 'confianza', 'justificacion']
    }
  };
}

/* ---------- 2. PROMPT ------------------------------------------- */

function construirPromptSistema() {
  var lineasTipos = Object.keys(TIPOS).map(function (k) {
    return '  ' + k + ' = ' + TIPOS[k].nombre + ' (ISO ' + TIPOS[k].iso + ')';
  }).join('\n');

  var lineasProcesos = Object.keys(PROCESOS).map(function (k) {
    return '  ' + k + ' = ' + PROCESOS[k].nombre;
  }).join('\n');

  var lineasOrigen = Object.keys(ORIGENES).map(function (k) {
    return '  ' + k + ' = ' + ORIGENES[k];
  }).join('\n');

  return [
    'Eres el clasificador documental del sistema de gestión de calidad de',
    'Progresa Soluciones Financieras S.A.S. (PSF), NIT 900.974.255-5, una compañía',
    'colombiana de factoring vigilada por la Superintendencia de Sociedades.',
    '',
    'Tu tarea es clasificar cada documento usando la herramienta registrar_clasificacion.',
    '',
    'TIPOS DOCUMENTALES:',
    lineasTipos,
    '',
    'PROCESOS:',
    lineasProcesos,
    '',
    'ORIGEN:',
    lineasOrigen,
    '',
    'CRITERIO DEL ORIGEN: describe la relacion de PSF con el TERCERO cuyo NIT',
    'registras en el campo nit, NO con quien expidio o firmo el documento. Un',
    'certificado expedido por una camara de comercio sobre un cliente lleva origen',
    'CLI, no ENT, porque el NIT que registras es el del cliente. Usa ENT solo cuando',
    'el NIT que registras sea el de la entidad publica. Si el documento es propio de',
    'PSF, EQM o PFI no lleva NIT de tercero y el origen es el de la compania.',
    '',
        'REGLAS DE DECISIÓN, en orden de prioridad:',
    '1. EL EMISOR DEFINE LA FAMILIA DE TIPOS. Si PSF no redactó el documento (lo emitió',
    '   una cámara de comercio, la DIAN, un banco, un cliente, un proveedor, una',
    '   aseguradora o un juzgado), SOLO puedes usar DE o RG. Nunca uses MC, PL, CA, PR,',
    '   IT, FT, MZ ni LG para un documento que PSF no redactó. Entre esos dos: usa DE si',
    '   el documento es normativo, de referencia, o acredita un estado o una condición;',
    '   usa RG si es evidencia de una operación concreta.',
    '2. Un FT es la plantilla en blanco. El mismo formato ya diligenciado es un RG.',
    '3. Van SIEMPRE al proceso GR, sin importar quien los firme: SAGRILAFT, SARLAFT,',
    '   PTEE, listas restrictivas, debida diligencia, conocimiento del cliente y los',
    '   ESTUDIOS DE CUPO (incluido el formato en blanco y el diligenciado). Esta lista es',
    '   CERRADA. No envies un documento a GR solo porque mencione la palabra "riesgo",',
    '   incluya un analisis de riesgos o lo firme el area de riesgos: casi todos los',
    '   documentos financieros lo hacen. Clasifica por lo que el documento ES, no por el',
    '   vocabulario que contiene. Un contrato de factoring o una factura NO pasan a GR',
    '   por mencionar riesgos. Los documentos contables o tributarios de un TERCERO si',
    '   van a GR, pero por la regla 6 (pertenecen al expediente de ese tercero), no por',
    '   el vocabulario que usan.',
    '4. Actas de junta, actas de asamblea, estatutos, poderes y contratos societarios',
    '   REDACTADOS POR PSF son tipo LG, proceso JR. Los documentos societarios de un',
    '   TERCERO (certificado de existencia y representación legal, certificado de cámara',
    '   de comercio, actas o estatutos de un cliente o proveedor) son tipo DE, proceso GR,',
    '   porque hacen parte del expediente de conocimiento de ese tercero. Esta regla aplica',
    '   aunque el documento no mencione vinculación, debida diligencia ni SAGRILAFT.',
    '5. Una factura, nota crédito, nota débito o cuenta de cobro emitida por un tercero es',
    '   SIEMPRE RG (evidencia de operación), nunca DE. Endosos, pagarés, cartas de',
    '   instrucción y contratos de factoring van al proceso OP. Los ESTUDIOS DE CUPO no:',
    '   van a GR por la regla 3, aunque acompañen una operación de factoring. Las',
    '   facturas negociadas en operaciones de factoring van al proceso OP; las facturas de',
    '   proveedores por gastos propios de PSF van al proceso GF.',
    '6. CONTABLES Y TRIBUTARIOS: estados financieros, declaraciones tributarias,',
    '   conciliaciones bancarias, libros contables, RUT y certificaciones de revisor',
    '   fiscal o de contador. Se parten segun DE QUIEN es el documento:',
    '   (a) De PSF, EQUIMETRICA o PFI: tipo RG, proceso GF.',
    '   (b) De un TERCERO: tipo DE, proceso GR, con su NIT. Van a DE porque acreditan',
    '   una condicion y no son evidencia de una operacion de PSF (regla 1), y van a GR',
    '   porque hacen parte del expediente de conocimiento de ese tercero, igual que sus',
    '   documentos societarios (regla 4).',
    '   Esto aplica AUNQUE el documento no mencione estudio de cupo, vinculacion ni',
    '   debida diligencia, y aunque no sepas para que se pidio. Decide de quien es el',
    '   documento, nunca para que se uso: el proposito no se puede leer en el documento.',
    '7. Son PROPIAS, no de terceros, estas tres identificaciones:',
    '   - NIT 900974255 = PROGRESA SOLUCIONES FINANCIERAS (PSF)',
    '   - NIT 902074144 = EQUIMETRICA (EQM)',
    '   - RUC 155709241 = PROGRESA SOLUCIONES FINANCIERAS INTERNACIONALES (PFI)',
    '   Para un NIT colombiano transcribe SIEMPRE los 9 digitos SIN el digito de',
    '   verificacion: de "900.974.255-5" escribe 900974255. El sistema agrega el',
    '   digito por su cuenta; si lo incluyes, el mismo tercero queda partido en dos',
    '   expedientes distintos.',
    '   El RUC de PFI es una identificacion EXTRANJERA y NO tiene digito de',
    '   verificacion: escribe 155709241 completo, sin quitarle el ultimo digito, y',
    '   pon RUC en el tipo de identificacion. Si le quitas un digito o lo marcas',
    '   como NIT, un documento propio de PFI se archivara como si fuera de un',
    '   tercero.',
    '8. TITULO: usa el nombre del ACTO O TRAMITE que el documento certifica, acredita o',
    '   documenta. El titulo describe lo que el documento ES, nunca quien lo emite ni',
    '   sobre quien trata.',
    '   (a) PROHIBIDO usar el nombre de la entidad emisora (camara de comercio, DIAN,',
    '   banco, notaria, aseguradora), la ciudad, la fecha o el numero de radicado.',
    '   Ejemplo: un documento expedido por una camara de comercio que acredita la',
    '   existencia y representacion legal de una sociedad se titula "Certificado de',
    '   Existencia y Representacion Legal", NUNCA "Certificado Camara de Comercio".',
    '   (b) PROHIBIDO usar el nombre, la razon social o el NIT de la empresa o persona',
    '   SOBRE la que trata el documento, aunque aparezcan en el cuerpo del texto. Ese',
    '   dato va en el campo razonSocial, no en el titulo: el tercero ya queda',
    '   identificado por el NIT dentro del codigo del documento. Ejemplo: un estudio de',
    '   cupo diligenciado a nombre de una sociedad se titula "Estudio de Cupo", NUNCA',
    '   "Estudio de Cupo Distribuidora Andina". COMPROBACION: si al borrar los datos',
    '   diligenciados del documento el titulo cambiaria, el titulo esta mal.',
    '   (c) NO empieces el titulo con "Formato", "Formulario" ni "Plantilla": el tipo',
    '   documental ya lo indica el codigo. Escribe solo el nombre del acto.',
    '   (d) NO agregues calificativos de alcance o periodicidad que puedan cambiar',
    '   de un ejercicio a otro: comparativos, individuales, consolidados, mensual,',
    '   trimestral, anual, preliminar, definitivo. Unos estados financieros se',
    '   titulan "Estados Financieros", NUNCA "Estados Financieros Comparativos".',
    '   Maximo 6 palabras, sin tildes ni signos. El mismo documento debe producir SIEMPRE',
    '   el mismo titulo: no lo varies segun la fecha de expedicion, el numero de recibo',
    '   ni ningun otro dato variable del contenido.',
    '9. MANUAL, POLITICAS Y CARACTERIZACIONES (tipos MC, PL, CA): van al proceso del',
    '   que TRATA el documento, nunca al del area que lo emite, lo revisa o lo aprueba.',
    '   (a) MC (Manual de Calidad): siempre GC.',
    '   (b) PL: al proceso que la politica gobierna. Politica de Calidad va a GC;',
    '   politica SAGRILAFT, SARLAFT, PTEE o de riesgos va a GR; politica de seguridad',
    '   de la informacion o de datos personales va a TI; politica de talento humano o',
    '   de seleccion va a GH; politica de cartera o de gastos va a GF.',
    '   (c) CA: al proceso que caracteriza. La caracterizacion del proceso de',
    '   Operaciones de Factoring va a OP; la del proceso de Gestion Humana va a GH.',
    '   Que el documento lo apruebe la Alta Direccion, la Gerencia o la Junta NO lo',
    '   envia a GE: casi todas las politicas y manuales se aprueban ahi. GE es solo',
    '   para documentos cuyo TEMA es el direccionamiento estrategico (plan estrategico,',
    '   objetivos corporativos, gobierno corporativo).',
    '10. Ante duda entre dos combinaciones válidas, prefiere la que resulte de la regla de',
    '   MENOR número. La consistencia entre documentos iguales importa más que el matiz.',
    '',
    'HONESTIDAD SOBRE LA CONFIANZA: si el texto está incompleto, ilegible, es un OCR pobre,',
    'o no logras determinar con seguridad el proceso, asigna confianza por debajo de 0.75.',
    'El sistema enviará ese documento a revisión humana, que es el resultado correcto.',
    'Es preferible una confianza baja y honesta a una clasificación inventada.'
  ].join('\n');
}

function construirPromptUsuario(ctx) {
  var texto = String(ctx.texto || '');
  var recorte = texto.length > 12000
    ? texto.slice(0, 9000) + '\n\n[...texto intermedio omitido...]\n\n' + texto.slice(-3000)
    : texto;

  return [
    'Nombre original del archivo: ' + (ctx.nombreOriginal || '(sin nombre)'),
    'Fecha de carga a la bandeja: ' + (ctx.fechaCarga || '(desconocida)'),
    'Número de páginas: ' + (ctx.paginas || '(desconocido)'),
    '',
    '--- TEXTO DEL DOCUMENTO ---',
    recorte,
    '--- FIN DEL TEXTO ---',
    '',
    'Clasifica este documento con la herramienta registrar_clasificacion.'
  ].join('\n');
}

/* ---------- 3. LLAMADA A LA API (sólo Apps Script) -------------- */

function clasificarConIA(ctx) {
  var apiKey = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
  if (!apiKey) throw new Error('Falta ANTHROPIC_API_KEY en Propiedades del script.');

  var payload = {
    model: CONFIG.MODELO,
    max_tokens: 1024,
    system: construirPromptSistema(),
    tools: [esquemaClasificacion()],
    tool_choice: { type: 'tool', name: 'registrar_clasificacion' },
    messages: [{ role: 'user', content: construirPromptUsuario(ctx) }]
  };

  var resp = fetchConReintento('https://api.anthropic.com/v1/messages', {
    method: 'post',
    contentType: 'application/json',
    muteHttpExceptions: true,
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    payload: JSON.stringify(payload)
  });

  var data = JSON.parse(resp.getContentText());
  if (data.error) throw new Error('API Anthropic: ' + data.error.message);

  var bloque = (data.content || []).filter(function (b) {
    return b.type === 'tool_use' && b.name === 'registrar_clasificacion';
  })[0];

  if (!bloque) {
    // Plan B: el modelo respondió texto en vez de usar la herramienta.
    var textoResp = (data.content || []).map(function (b) { return b.text || ''; }).join('\n');
    return extraerJSON(textoResp);
  }
  return bloque.input;
}

/** Reintento con espera creciente para 429 y 5xx. */
function fetchConReintento(url, opciones, maxIntentos) {
  var max = maxIntentos || 4;
  var ultimo;
  for (var i = 0; i < max; i++) {
    ultimo = UrlFetchApp.fetch(url, opciones);
    var code = ultimo.getResponseCode();
    if (code < 400) return ultimo;
    if (code !== 429 && code < 500) return ultimo;   // error del cliente: no reintentar
    Utilities.sleep(Math.pow(2, i) * 1000 + Math.floor(Math.random() * 500));
  }
  return ultimo;
}

/* ---------- 4. RESCATE DE JSON ---------------------------------- */

/** Extrae el primer objeto JSON de un texto con preámbulo o vallas ```. */
function extraerJSON(texto) {
  var s = String(texto || '');
  s = s.replace(/```(?:json)?/gi, '');
  var ini = s.indexOf('{');
  if (ini === -1) return null;

  var prof = 0, enCadena = false, escape = false;
  for (var i = ini; i < s.length; i++) {
    var ch = s.charAt(i);
    if (escape) { escape = false; continue; }
    if (ch === '\\') { escape = true; continue; }
    if (ch === '"') { enCadena = !enCadena; continue; }
    if (enCadena) continue;
    if (ch === '{') prof++;
    else if (ch === '}') {
      prof--;
      if (prof === 0) {
        var frag = s.slice(ini, i + 1).replace(/,\s*([}\]])/g, '$1'); // comas colgantes
        try { return JSON.parse(frag); } catch (e) { return null; }
      }
    }
  }
  return null;
}

/* ---------- 5. VALIDADOR DEFENSIVO ------------------------------ */

/**
 * Convierte la salida cruda del modelo en una clasificación confiable.
 * Nunca lanza excepción: siempre devuelve un veredicto con motivos.
 */
function validarClasificacion(bruto, ctx) {
  var errores = [], avisos = [];
  var c = {};
  var ctxSeguro = ctx || {};

  if (!bruto || typeof bruto !== 'object') {
    return { ok: false, requiereRevision: true, clasificacion: null,
             errores: ['El modelo no devolvió un objeto de clasificación.'], avisos: avisos };
  }

  /* tipo */
  c.tipo = String(bruto.tipo || '').trim().toUpperCase();
  if (!TIPOS[c.tipo]) errores.push('Tipo documental desconocido: "' + bruto.tipo + '".');

  /* proceso */
  c.proceso = String(bruto.proceso || '').trim().toUpperCase();
  if (!PROCESOS[c.proceso]) errores.push('Proceso desconocido: "' + bruto.proceso + '".');

  /* nit */
  /* tipo de identificación: decide cómo se canoniza el número. */
  c.tipoId = String(bruto.tipoIdentificacion || '').trim().toUpperCase();
  if (!TIPOS_ID[c.tipoId]) c.tipoId = 'NIT';

  /* La identificación se lleva SIEMPRE a forma canónica. Sin esto el mismo
     tercero llega unas veces con DV y otras sin él, y se parte en dos series. */
  var idCruda = limpiarNIT(bruto.nit);
  c.nit = canonizarIdentificacion(c.tipoId, idCruda);
  if (bruto.nit && !c.nit) avisos.push('La identificación "' + bruto.nit + '" no tiene forma válida; se ignora.');
  var coherente = c.tipoId === 'NIT' ? nitEsCoherente(c.nit) : null;
  if (coherente === false) avisos.push('El dígito de verificación del NIT ' + c.nit + ' no cuadra.');

  /* origen — la identificación propia manda sobre lo que diga el modelo */
  c.origen = String(bruto.origen || '').trim().toUpperCase();

  /* Se busca por la forma CANÓNICA y también por la CRUDA. Las claves de
     NITS_PROPIOS ya no comparten forma: el NIT colombiano va con DV (10 dígitos)
     y el RUC de PFI sin él (9). Si el modelo se equivoca de TIPO_ID, la
     canonización se va por la otra rama y la coincidencia se perdería EN
     SILENCIO: un documento propio de PFI marcado como NIT saldría archivado como
     de tercero, con un DV de la DIAN inventado en el nombre del archivo.
     Es el mismo fallo que en agosto partió a un tercero en dos expedientes,
     esta vez por la puerta del tipo de identificación en vez de la del número. */
  var propio = (c.nit && NITS_PROPIOS[c.nit]) || (idCruda && NITS_PROPIOS[idCruda]) || null;
  if (propio) {
    if (c.origen !== propio) avisos.push('Origen corregido de ' + (c.origen || '?') + ' a ' + propio + ' por identificación propia.');
    c.origen = propio;
    c.nit = null;   // los documentos propios no llevan identificación en el nombre
  }
  if (!ORIGENES[c.origen]) {
    avisos.push('Origen "' + bruto.origen + '" no reconocido; se asume PSF.');
    c.origen = 'PSF';
  }

  /* HERENCIA POR TERCERO. El origen describe la RELACIÓN con el tercero, y esa
     relación no cambia según qué papel llegue. Una vez fijada para un NIT, todos
     sus documentos la heredan y se ignora lo que proponga el modelo.
     Solo se aplica si se recibió el índice: sin él la función sigue siendo pura
     y las pruebas locales no cambian. */
  if (c.nit && !NITS_PROPIOS[c.nit] && ctxSeguro.indice) {
    var fijo = ORIGENES_TERCEROS[c.nit];
    var heredado = fijo || origenRegistrado(c.nit, ctxSeguro.indice);
    if (heredado && ORIGENES[heredado] && heredado !== c.origen) {
      avisos.push('ORIGEN ajustado a ' + heredado + ' (' +
        (fijo ? 'fijado en ORIGENES_TERCEROS' : 'ya registrado para este tercero') +
        '); el clasificador había propuesto ' + c.origen + '.');
      c.origen = heredado;
    }
  }

  /* coherencia tipo <-> tercero */
  var esDeTercero = REGLAS.TIPOS_EXIGEN_TERCERO.indexOf(c.tipo) !== -1;
  var origenTercero = ['CLI', 'PRV', 'PAG', 'FON', 'ENT'].indexOf(c.origen) !== -1;
  var origenPropio = ['PSF', 'EQM', 'PFI'].indexOf(c.origen) !== -1;
  if (origenTercero && !c.nit) {
    avisos.push('Documento de tercero sin NIT identificable: requiere revisión humana.');
  }
  /* Guarda SIMÉTRICA de la anterior: origen propio con un NIT que no está en
     NITS_PROPIOS. El campo debe describir la relación con el tercero, y "PSF"
     no dice nada ahí. */
  if (origenPropio && c.nit) {
    avisos.push('Origen ' + c.origen + ' es propio pero el NIT ' + c.nit +
                ' es de un tercero: corrija a CLI, PRV, PAG, FON o ENT.');
  }
  if (!esDeTercero && origenTercero) {
    avisos.push('Tipo controlado ' + c.tipo + ' con origen ' + c.origen + ': combinación inusual.');
  }

  /* titulo */
  var titulo = String(bruto.titulo || '').trim();
  if (!titulo) { errores.push('El modelo no devolvió título.'); }
  else if (titulo.length < 3) { avisos.push('Título demasiado corto: "' + titulo + '".'); }
  c.titulo = titulo;
  c.tituloKebab = aKebab(titulo, REGLAS.MAX_TITULO);

  /* fecha */
  var fbRaw = ctxSeguro.fechaCarga;
  var fb = fbRaw ? new Date(fbRaw) : new Date();
  if (isNaN(fb.getTime())) fb = new Date();
  c.fechaDocumento = normalizarFecha(bruto.fechaDocumento, fb);
  if (!bruto.fechaDocumento) avisos.push('Sin fecha en el documento; se usa la fecha de carga.');

  /* confianza */
  var conf = Number(bruto.confianza);
  if (isNaN(conf)) { conf = 0; avisos.push('Confianza no numérica; se asume 0.'); }
  c.confianza = Math.max(0, Math.min(1, conf));

  /* metadatos de traza */
  c.razonSocial = String(bruto.razonSocial || '').trim();
  c.justificacion = String(bruto.justificacion || '').trim();
  c.esNuevaVersion = bruto.esNuevaVersion === true;
  c.estado = 'VIGENTE';
  c.retencionAnios = TIPOS[c.tipo] ? TIPOS[c.tipo].retencionAnios : 10;
  c.clausulaISO = TIPOS[c.tipo] ? TIPOS[c.tipo].iso : '7.5.3';

  var ok = errores.length === 0;
  var requiereRevision = !ok
    || c.confianza < REGLAS.UMBRAL_CONFIANZA
    || (origenTercero && !c.nit)
    || (origenPropio && !!c.nit)
    || coherente === false;

  return { ok: ok, requiereRevision: requiereRevision, clasificacion: ok ? c : null,
           errores: errores, avisos: avisos };
}

if (typeof module !== 'undefined') {
  module.exports = {
    esquemaClasificacion: esquemaClasificacion,
    construirPromptSistema: construirPromptSistema,
    construirPromptUsuario: construirPromptUsuario,
    extraerJSON: extraerJSON,
    validarClasificacion: validarClasificacion
  };
}
