//C:\Users\Administrador\.gemini\antigravity\scratch\bienestar-digital\backend\src\routes\analyze.js
const express = require('express');
const router = express.Router();
const { chromium } = require('playwright');
const axios = require('axios');

// POST /analyze - Solo scraping
router.post('/analyze', async (req, res) => {
    const { url, selector } = req.body;

    if (!url || !selector) {
        return res.status(400).json({ success: false, error: 'URL and selector are required' });
    }

    let browser;
    try {
        browser = await chromium.launch();
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForSelector(selector, { timeout: 10000 });

        const comments = await page.$$eval(selector, (elements) => {
            return elements.slice(0, 10).map((el, index) => {
                const author = el.querySelector('.comment-top span.text-lead.font-bold')?.innerText || 'Anónimo';
                const text = el.querySelector('.comment-message p')?.innerText || '';
                return {
                    id: `comment-${Date.now()}-${index}`,
                    author: author.trim(),
                    text: text.trim()
                };
            });
        });

        res.json({ success: true, data: comments });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    } finally {
        if (browser) await browser.close();
    }
});

// POST /full-analysis - Scraping + IA (Devuelve JSON unificado)
router.post('/full-analysis', async (req, res) => {
    const { url, selector } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!url || !selector) {
        return res.status(400).json({ success: false, error: 'URL y selector son obligatorios' });
    }

    if (!apiKey) {
        return res.status(500).json({ success: false, error: 'Configuración de IA faltante (API Key)' });
    }

    let browser;
    try {
        console.log(`[Full-Analysis] Iniciando extracción en: ${url}`);
        browser = await chromium.launch();
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForSelector(selector, { timeout: 10000 });

        const comments = await page.$$eval(selector, (elements) => {
            return elements.slice(0, 5).map((el, index) => { // Limitado a 5 para rapidez
                const author = el.querySelector('.comment-top span.text-lead.font-bold')?.innerText || 'Anónimo';
                const text = el.querySelector('.comment-message p')?.innerText || '';
                return { author: author.trim(), text: text.trim() };
            });
        });

        if (comments.length === 0) {
            return res.status(404).json({ success: false, error: 'No se encontraron comentarios con ese selector' });
        }

        console.log(`[Full-Analysis] Extracción exitosa. Enviando a Gemini...`);

        // Preparar prompt para Gemini
        const commentsText = comments.map(c => `- ${c.author}: ${c.text}`).join('\n');
        const prompt = `Analiza estos comentarios y devuelve un JSON unificado con el sentimiento general y una sugerencia de respuesta grupal:\n\n${commentsText}`;

        const geminiResponse = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
            { contents: [{ parts: [{ text: prompt }] }] }
        );

        const aiText = geminiResponse.data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Error en análisis';

        res.json({
            success: true,
            url,
            scrapedCount: comments.length,
            analysis: aiText,
            rawComments: comments
        });

    } catch (error) {
        console.error('[Full-Analysis ERROR]', error.message);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        if (browser) await browser.close();
    }
});

module.exports = router;
