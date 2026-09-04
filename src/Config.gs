/**********************************************************************
 * PSF GED — Config.gs
 * ÚNICO archivo que usted edita a mano. Todo lo demás se queda igual.
 * Los IDs los llena solo el instalador; sólo revise el correo y el modelo.
 **********************************************************************/

 /* Interruptor de mantenimiento. En true, los disparadores salen sin hacer
   nada. Volver a false al terminar. */
const PAUSADO = false;

const CONFIG = {
  /* ---------- LO ÚNICO QUE SE LLENA A MANO ANTES DE INSTALAR ----------
     Dónde se planta el árbol de carpetas.

       vacío  = Mi unidad de quien ejecute instalarSistema()
       con ID = esa carpeta, que puede estar en una unidad compartida

     El ID sale de la URL de la carpeta:  .../folders/ESTO_ES_EL_ID
     La raíz de una unidad compartida sirve como carpeta.

     ⚠️ Dejarlo vacío deja el archivo documental como propiedad personal de
     un empleado: si su cuenta se suspende, el archivo se va con ella. Es
     justo el riesgo que la decisión A1 existe para eliminar.

     Sólo se lee al instalar. Después manda RAIZ_ID, y cambiar esto NO mueve
     una instalación que ya existe: crearía un árbol nuevo y vacío. */
  CARPETA_INSTALACION : '',

  /* Se llenan automáticamente al ejecutar instalarSistema(). */
  RAIZ_ID          : '',   // carpeta raíz "PSF GED"
  INBOX_ID         : '',   // 00_BANDEJA_ENTRADA
  REVISION_ID      : '',   // 01_EN_REVISION
  ARCHIVO_ID       : '',   // 02_ARCHIVO_CONTROLADO
  MANUAL_ID        : '',   // 98_REVISION_MANUAL
  ORIGINALES_ID    : '',   // 99_ORIGINALES
  INDEX_SHEET_ID   : '',   // Listado Maestro FT-GC-001

  INDEX_SHEET_NAME : 'LISTADO_MAESTRO',
  QUEUE_SHEET_NAME : 'APROBACIONES',
  LOG_SHEET_NAME   : 'BITACORA',

  /* Operación */
  MODELO           : 'claude-haiku-4-5-20251001',
  MAX_LOTE         : 15,     // archivos por ejecución (tope de 6 min de Apps Script)
  MINUTOS_TRIGGER  : 15,
  ALERT_EMAIL      : 'diego@progresasf.com',
  TIMEZONE         : 'America/Bogota',

  /* Etiquetas de Drive: se llenan si usa Drive Labels (opcional) */
  LABEL_ID         : '',
  LABEL_CAMPOS     : { estado: '', proceso: '', retencion: '' },

  /* Modo seguro: true = copia el archivo y conserva el original intacto.
     Déjelo en true durante los primeros meses. */
  CONSERVAR_ORIGINAL : true
};

/** Lee y escribe los IDs en Propiedades del script para que sobrevivan. */
function cargarConfig() {
  var props = PropertiesService.getScriptProperties().getProperties();
  ['RAIZ_ID','INBOX_ID','REVISION_ID','ARCHIVO_ID','MANUAL_ID','ORIGINALES_ID',
   'INDEX_SHEET_ID','LABEL_ID'].forEach(function (k) {
    if (props[k]) CONFIG[k] = props[k];
  });
  return CONFIG;
}

function guardarConfig(clave, valor) {
  PropertiesService.getScriptProperties().setProperty(clave, valor);
  CONFIG[clave] = valor;
}
