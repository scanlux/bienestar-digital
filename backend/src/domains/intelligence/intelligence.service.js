const intelligenceRepository = require('./intelligence.repository');
const { BusinessError } = require('../../utils/errors');
const { logSecurityEvent } = require('../../utils/securityLogger');
const { generateProductTags } = require('../../utils/tagger');

class IntelligenceService {
  async getStopWords() {
    return await intelligenceRepository.findStopWords();
  }

  async createStopWords(user, word, req) {
    if (!word) {
      throw new BusinessError('Palabra requerida');
    }
    const wordsToProcess = word.split(/[ ,;]+/).filter(w => w.trim().length > 0);
    if (wordsToProcess.length === 0) {
      throw new BusinessError('No se detectaron palabras validas');
    }

    const values = wordsToProcess.map(w => [w.toLowerCase().trim()]);
    await intelligenceRepository.insertStopWords(values);

    await logSecurityEvent(
      user.id,
      'CREATE_STOP_WORD',
      'MEDIUM',
      req,
      { words: wordsToProcess },
      'stop_words',
      null
    );

    return { message: `${wordsToProcess.length} palabras procesadas correctamente` };
  }

  async deleteStopWord(user, id, req) {
    await intelligenceRepository.deleteStopWord(id);

    await logSecurityEvent(
      user.id,
      'DELETE_STOP_WORD',
      'MEDIUM',
      req,
      { stopWordId: id },
      'stop_words',
      null
    );

    return { message: 'Palabra eliminada de la lista negra' };
  }

  async getPopularityRanking() {
    return await intelligenceRepository.findProductPopularityRanking();
  }

  async triggerPopularity(user, req) {
    const sales = await intelligenceRepository.findSalesByProduct();
    for (const sale of sales) {
      await intelligenceRepository.upsertProductPopularity(sale.product_id, sale.total_sales);
    }
    return { message: 'Ranking actualizado correctamente' };
  }

  async generateTags(limit = 20, offset = 0) {
    const total = await intelligenceRepository.findProductTotalCount();
    const stopWordsList = await intelligenceRepository.findStopWordsList();
    const products = await intelligenceRepository.findProductsForTagging(Number(limit), Number(offset));

    let updatedCount = 0;
    for (const product of products) {
      const { id, nombre, descripcion_larga, categoria_nombre, commerce_nombre, existing_tags, es_vegetariano } = product;
      const fullDesc = `${descripcion_larga || ''}`;
      
      const newTags = generateProductTags(
        nombre,
        fullDesc,
        categoria_nombre || '',
        existing_tags || '',
        stopWordsList,
        !!es_vegetariano,
        commerce_nombre || '',
        ''
      );
      
      if (newTags !== existing_tags) {
        await intelligenceRepository.updateProductTags(id, newTags);
        updatedCount++;
      }
    }

    return { 
      processed: products.length, 
      updated: updatedCount,
      total,
      nextOffset: Number(offset) + products.length,
      isFinished: (Number(offset) + products.length) >= total
    };
  }

  async generateContent(user, promptData) {
    const { prompt } = promptData;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!prompt) {
      throw new BusinessError('Se requiere un prompt');
    }

    if (prompt.length > 2000) {
      throw new BusinessError('El prompt excede el límite de longitud permitido (2000 caracteres).');
    }

    if (!apiKey) {
      throw new Error('API Key no configurada en el servidor');
    }

    console.log(`[AI_Service] Consulta: ${prompt.substr(0, 50)}...`);

    const axios = require('axios');
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        contents: [{ parts: [{ text: prompt }] }]
      }
    );

    const result = response.data;
    const aiResponse = result?.candidates?.[0]?.content?.parts?.[0]?.text || 'No se pudo generar respuesta';

    return {
      success: true,
      response: aiResponse
    };
  }
}

module.exports = new IntelligenceService();
