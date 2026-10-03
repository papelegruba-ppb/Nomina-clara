/**
 * Nómina Clara — recepción de leads en Google Sheets
 *
 * INSTALACIÓN (5 minutos, gratis):
 * 1. Crea una hoja de cálculo en Google Sheets (nómbrala "Leads Nómina Clara").
 * 2. Extensiones → Apps Script. Borra lo que haya y pega este archivo entero.
 * 3. (Opcional) Rellena NOTIFY_EMAIL para recibir un correo por cada lead.
 * 4. Implementar → Nueva implementación → tipo "Aplicación web".
 *      - Ejecutar como: Yo
 *      - Quién tiene acceso: Cualquier usuario
 *    Autoriza los permisos cuando lo pida.
 * 5. Copia la URL que termina en /exec y pégala en index.html:
 *      window.NC_CONFIG = { ..., SHEETS_URL: 'https://script.google.com/macros/s/XXXX/exec' }
 * 6. Si cambias este código, vuelve a implementar ("Gestionar implementaciones" → editar → nueva versión).
 */

const SHEET_NAME   = 'Leads';
const NOTIFY_EMAIL = '';   // p. ej. 'tucorreo@gmail.com'. Vacío = sin aviso por correo.
const FORMS        = ['neto', 'autonomo', 'empleador', 'empleado'];
const HEADERS      = ['Fecha', 'Formulario', 'Nombre', 'Teléfono', 'Provincia', 'Situación',
                      'Consentimiento', 'utm_source', 'utm_medium', 'utm_campaign', 'Idioma', 'Página'];

function limpiar_(v, max) {
  let s = String(v == null ? '' : v).trim().slice(0, max);
  // Evita que Sheets interprete el texto como fórmula (=, +, -, @)
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const d = JSON.parse(e.postData.contents);

    if (FORMS.indexOf(d.id_formulario) === -1) throw new Error('formulario no válido');
    if (d.consentimiento !== 'Sí') throw new Error('sin consentimiento');
    if (!d.nombre || !d.telefono) throw new Error('faltan datos');

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
    if (sh.getLastRow() === 0) {
      sh.appendRow(HEADERS);
      sh.setFrozenRows(1);
      sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    }

    const fila = [
      limpiar_(d.fecha, 40),
      limpiar_(d.id_formulario, 20),
      limpiar_(d.nombre, 100),
      limpiar_(d.telefono, 30),
      limpiar_(d.provincia, 60),
      limpiar_(d.situacion, 150),
      limpiar_(d.consentimiento, 5),
      limpiar_(d.utm_source, 80),
      limpiar_(d.utm_medium, 80),
      limpiar_(d.utm_campaign, 80),
      limpiar_(d.idioma, 20),
      limpiar_(d.pagina, 120)
    ];
    sh.appendRow(fila);

    if (NOTIFY_EMAIL) {
      MailApp.sendEmail(NOTIFY_EMAIL, 'Nuevo lead Nómina Clara (' + fila[1] + ')',
        'Nombre: ' + fila[2] + '\nTeléfono: ' + fila[3] + '\nProvincia: ' + fila[4] +
        '\nSituación: ' + fila[5] + '\nFormulario: ' + fila[1] + '\nFecha: ' + fila[0]);
    }
    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

function doGet() {
  return ContentService.createTextOutput('Nómina Clara: endpoint activo');
}
