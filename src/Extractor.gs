/**********************************************************************
 * PSF GED — Extractor.gs
 * Saca el texto de cualquier archivo. Usa el OCR de Google, que ya viene
 * incluido en Workspace y no cuesta nada extra.
 * Requiere: Servicios → Drive API (servicio avanzado) activado.
 **********************************************************************/

/** Huella MD5 del contenido. Sirve para detectar el mismo archivo subido dos veces. */
function huellaDe(blob) {
  try {
    var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, blob.getBytes());
    return bytes.map(function (b) {
      return ((b < 0 ? b + 256 : b).toString(16)).padStart(2, '0');
    }).join('');
  } catch (e) {
    return '';
  }
}

/**
 * Devuelve { texto, paginas, metodo, huella }.
 * Nunca lanza excepción: si no puede leer, devuelve texto vacío y el
 * documento se irá a revisión manual, que es el comportamiento correcto.
 */
function extraerTexto(file) {
  var mime = file.getMimeType();
  var resultado = { texto: '', paginas: 0, metodo: 'ninguno', huella: '' };

  try { resultado.huella = huellaDe(file.getBlob()); } catch (e) {}

  try {
    /* Documentos nativos de Google */
    if (mime === MimeType.GOOGLE_DOCS) {
      resultado.texto = DocumentApp.openById(file.getId()).getBody().getText();
      resultado.metodo = 'docs';
      return resultado;
    }
    if (mime === MimeType.GOOGLE_SHEETS) {
      var ss = SpreadsheetApp.openById(file.getId());
      resultado.texto = ss.getSheets().slice(0, 3).map(function (h) {
        return h.getName() + '\n' + h.getDataRange().getDisplayValues()
          .slice(0, 60).map(function (f) { return f.join(' | '); }).join('\n');
      }).join('\n\n');
      resultado.metodo = 'sheets';
      return resultado;
    }
    if (mime === MimeType.PLAIN_TEXT || mime === MimeType.CSV) {
      resultado.texto = file.getBlob().getDataAsString('UTF-8');
      resultado.metodo = 'texto';
      return resultado;
    }

    /* PDF, imágenes y Office: se convierten temporalmente a Google Doc.
       Esa conversión aplica el OCR de Google sin costo adicional. */
    var copia = Drive.Files.copy(
      { title: '__ocr_temporal__' + Date.now(), mimeType: MimeType.GOOGLE_DOCS },
      file.getId(), { ocr: true, ocrLanguage: 'es', supportsAllDrives: true }
    );
    try {
      var doc = DocumentApp.openById(copia.id);
      resultado.texto = doc.getBody().getText();
      resultado.paginas = Math.max(1, Math.ceil(resultado.texto.length / 2800));
      resultado.metodo = 'ocr';
    } finally {
      try { DriveApp.getFileById(copia.id).setTrashed(true); } catch (e) {}
    }
  } catch (e) {
    resultado.error = String(e.message || e);
  }

  return resultado;
}

/** ¿Hay texto suficiente para que valga la pena llamar a la IA? */
function textoUtilizable(texto) {
  var t = String(texto || '').replace(/\s+/g, ' ').trim();
  if (t.length < 40) return false;
  // Un OCR fallido produce mucho símbolo y poca letra.
  var letras = (t.match(/[A-Za-zÁÉÍÓÚÑáéíóúñ]/g) || []).length;
  return (letras / t.length) > 0.5;
}
