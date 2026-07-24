/**
 * Convierte de forma segura el campo extra_data de un mensaje de orden
 * de string JSON a objeto de JS.
 */
function parseOrderMessage(row) {
  if (!row) return row;
  if (typeof row.extra_data === 'string') {
    try {
      row.extra_data = JSON.parse(row.extra_data);
    } catch (e) {
      row.extra_data = null;
    }
  }
  return row;
}

module.exports = parseOrderMessage;
