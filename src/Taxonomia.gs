/**********************************************************************
 * PSF GED — Taxonomia.gs
 * Progresa Soluciones Financieras S.A.S. — NIT 900.974.255-5
 * Tabla maestra de clasificación documental ISO 9001:2015 (num. 7.5)
 *
 * Este archivo es DATOS, no lógica. Es el único lugar donde se
 * modifica la taxonomía. Si se agrega un tipo o un proceso aquí,
 * el clasificador, el validador y el prompt se actualizan solos.
 **********************************************************************/

/* ---------- TIPOS DOCUMENTALES ---------------------------------- */
const TIPOS = {
  MC: { nombre: 'Manual de Calidad',        iso: '7.5.1', controlado: true,  retencionAnios: 99 },
  PL: { nombre: 'Política',                 iso: '5.2',   controlado: true,  retencionAnios: 99 },
  CA: { nombre: 'Caracterización de Proceso', iso: '4.4', controlado: true,  retencionAnios: 99 },
  PR: { nombre: 'Procedimiento',            iso: '4.4',   controlado: true,  retencionAnios: 10 },
  IT: { nombre: 'Instructivo de Trabajo',   iso: '8.5.1', controlado: true,  retencionAnios: 10 },
  FT: { nombre: 'Formato',                  iso: '7.5.2', controlado: true,  retencionAnios: 10 },
  RG: { nombre: 'Registro / Evidencia',     iso: '7.5.3', controlado: false, retencionAnios: 10 },
  MZ: { nombre: 'Matriz',                   iso: '6.1',   controlado: true,  retencionAnios: 10 },
  DE: { nombre: 'Documento Externo',        iso: '7.5.3', controlado: false, retencionAnios: 10 },
  LG: { nombre: 'Documento Legal / Societario', iso: '7.5.3', controlado: false, retencionAnios: 99 }
};

/* ---------- PROCESOS -------------------------------------------- */
const PROCESOS = {
  GE: { nombre: 'Gestión Estratégica',        carpeta: '01_Gestion_Estrategica' },
  GC: { nombre: 'Gestión de Calidad',         carpeta: '02_Gestion_Calidad' },
  CM: { nombre: 'Comercial y Mercadeo',       carpeta: '03_Comercial' },
  OP: { nombre: 'Operaciones de Factoring',   carpeta: '04_Operaciones' },
  GR: { nombre: 'Gestión de Riesgos y SAGRILAFT', carpeta: '05_Riesgos_Cumplimiento' },
  GF: { nombre: 'Gestión Financiera y Contable', carpeta: '06_Financiera' },
  JR: { nombre: 'Jurídica y Societaria',      carpeta: '07_Juridica' },
  GH: { nombre: 'Gestión Humana',             carpeta: '08_Gestion_Humana' },
  TI: { nombre: 'Tecnología de la Información', carpeta: '09_Tecnologia' },
  CI: { nombre: 'Control Interno y Auditoría', carpeta: '10_Control_Interno' }
};

/* ---------- ORIGEN (relación con el TERCERO del NIT) ------------ *
 * OJO: el origen describe la relación de PSF con el tercero cuyo NIT
 * se registra en el documento, NO a quién lo expidió o lo firmó. Un
 * certificado de cámara de comercio sobre un cliente lleva CLI, porque
 * el NIT que se registra es el del cliente, no el de la cámara.       */
const ORIGENES = {
  PSF: 'Documento propio de Progresa Soluciones Financieras S.A.S.',
  EQM: 'Documento propio de EQUIMETRICA S.A.S.',
  PFI: 'Documento propio de Progresa Soluciones Financieras Internacionales S.A.',
  CLI: 'El tercero del NIT es un cliente (emisor / endosante de facturas)',
  PRV: 'El tercero del NIT es un proveedor de la compañía',
  PAG: 'El tercero del NIT es un pagador (deudor de la factura)',
  FON: 'El tercero del NIT es un fondeador / acreedor financiero',
  ENT: 'El tercero del NIT es una entidad pública o de control (DIAN, Supersociedades, etc.)'
};

/* ---------- TIPOS DE IDENTIFICACIÓN ----------------------------- *
 * Decide cómo se canoniza el número. Solo el NIT lleva dígito de
 * verificación; los documentos de persona natural se dejan tal cual
 * porque no lo tienen y su longitud es variable (7 a 10 dígitos).    */
const TIPOS_ID = {
  NIT: { nombre: 'NIT', llevaDV: true },
  CC:  { nombre: 'Cédula de ciudadanía', llevaDV: false },
  CE:  { nombre: 'Cédula de extranjería', llevaDV: false },
  TI:  { nombre: 'Tarjeta de identidad', llevaDV: false }
};

/* ---------- NITs PROPIOS ---------------------------------------- *
 * Las claves están en forma CANÓNICA: NIT de 9 dígitos + DV.        */
const NITS_PROPIOS = {
  '9009742555': 'PSF',
  '9020741441': 'EQM',
  '9999999999': 'PFI'
};

/* ---------- ORIGEN FIJO POR TERCERO (escotilla manual) ---------- *
 * Tiene prioridad sobre la herencia desde el Listado Maestro. Se usa
 * cuando el primer documento de un tercero fijó mal el origen y no se
 * quiere editar el MAESTRO a mano.
 * Clave = NIT sin dígito de verificación, igual que NITS_PROPIOS.      */
const ORIGENES_TERCEROS = {
  // '901234567': 'CLI',
};

/* ---------- ESTADOS DEL CICLO DE VIDA --------------------------- */
const ESTADOS = ['VIGENTE', 'EN_REVISION', 'OBSOLETO', 'ANULADO'];

/* ---------- REGLAS DE NEGOCIO ----------------------------------- */
const REGLAS = {
  // Tipos que SIEMPRE exigen origen + NIT en el nombre (son de terceros)
  TIPOS_EXIGEN_TERCERO: ['RG', 'DE'],
  // Confianza mínima del modelo para archivar sin excepción
  UMBRAL_CONFIANZA: 0.75,
  // Longitud máxima del título en kebab-case
  MAX_TITULO: 60,
  // Longitud máxima total del nombre de archivo (Drive admite 255)
  MAX_NOMBRE: 180
};

if (typeof module !== 'undefined') {
  module.exports = { TIPOS, PROCESOS, ORIGENES, ORIGENES_TERCEROS, NITS_PROPIOS, TIPOS_ID, ESTADOS, REGLAS };
}
