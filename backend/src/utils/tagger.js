/**
 * Motor de Auto-Tagging Semántico
 * Extrae información relevante de nombres y descripciones eliminando ruido.
 */

const STOP_WORDS = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 
  'con', 'de', 'del', 'para', 'por', 'en', 'y', 'e', 'o', 'u',
  'delicioso', 'rico', 'exquisito', 'mejor', 'calidad', 'fresco', 'frescos',
  'preparado', 'seleccionado', 'garantizar', 'nuestro', 'vuestra',
  'instante', 'ingredientes', 'preparados', 'casa', 'casero', 'especial',
  'sobre', 'entre', 'esta', 'este', 'estos', 'estas', 'desde', 'hasta'
]);

/**
 * Genera un string de etiquetas optimizado para el buscador y el ranking.
 * Limpia y unifica el nombre, descripción, categoría y etiquetas manuales.
 * @param {string} name - Nombre del producto
 * @param {string} desc - Descripción del producto (larga)
 * @param {string} categoryName - Nombre de la categoría
 * @param {string} manualTags - Etiquetas ingresadas manualmente por el usuario
 * @param {string[]|null} customStopWords - Lista opcional de palabras prohibidas de la DB
 * @param {boolean} isVegetarian - Indica si el producto es apto para vegetarianos
 * @param {string} commerceName - Nombre del comercio
 * @param {string} branchName - Nombre de la sucursal (sede)
 * @returns {string} - String de tags unificados en minúsculas y sin ruidos
 */
function generateProductTags(name = '', desc = '', categoryName = '', manualTags = '', customStopWords = null, isVegetarian = false, commerceName = '', branchName = '') {
  // Usar palabras personalizadas si vienen, si no usar el Set por defecto
  const stopWordsToUse = customStopWords ? new Set(customStopWords.map(w => w.toLowerCase().trim())) : STOP_WORDS;

  const uniqueTags = new Set();
  
  // Función auxiliar para limpiar tokens (quitar puntuación y acentos)
  const cleanTokens = (text) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
    .split(/\s+/)
    .map(t => t.trim())
    .filter(t => t.length > 2);

  // 1. PROCESAR CATEGORÍA (EXCEPCIÓN: No se filtra por lista negra)
  cleanTokens(categoryName).forEach(token => uniqueTags.add(token));

  // 2. PROCESAR NOMBRE DEL PRODUCTO (EXCEPCIÓN: No se filtra por lista negra)
  cleanTokens(name).forEach(token => uniqueTags.add(token));

  // 3. PROCESAR NOMBRE DEL COMERCIO (NUEVO: Tercera prioridad, sin filtros)
  cleanTokens(commerceName).forEach(token => uniqueTags.add(token));

  // 4. PROCESAR DESCRIPCIÓN Y TAGS MANUALES (SI se filtran por lista negra)
  const secondaryText = `${desc} ${manualTags}`;
  cleanTokens(secondaryText).forEach(token => {
    if (!stopWordsToUse.has(token)) {
      uniqueTags.add(token);
    }
  });

  // 5. Inyectar tags de dieta si aplica
  if (isVegetarian) {
    if (!stopWordsToUse.has('vegetariano')) uniqueTags.add('vegetariano');
    if (!stopWordsToUse.has('vegetariana')) uniqueTags.add('vegetariana');
  }

  // 6. PROCESAR NOMBRE DE LA SEDE (ÚLTIMA PRIORIDAD)
  cleanTokens(branchName).forEach(token => uniqueTags.add(token));

  return Array.from(uniqueTags).join(' ');
}

module.exports = { generateProductTags };
