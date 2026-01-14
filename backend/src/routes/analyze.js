const express = require('express');
const router = express.Router();

// Mock database of comments
const MOCK_COMMENTS = [
    { id: 1, text: "Hola, soy Carlos y necesito ayuda con mi pedido", selected: false },
    { id: 2, text: "Excelente servicio, muy rápido", selected: false },
    { id: 3, text: "¿Tienen envíos a Canarias?", selected: false },
    { id: 4, text: "El producto llegó dañado, quiero una devolución", selected: false },
    { id: 5, text: "Me encanta la nueva interfaz", selected: false },
    { id: 6, text: "¿Cuál es el horario de atención?", selected: false },
    { id: 7, text: "No puedo iniciar sesión en mi cuenta", selected: false },
    { id: 8, text: "¿Cuándo reponen stock del modelo X?", selected: false },
    { id: 9, text: "Gracias por la rápida respuesta", selected: false },
    { id: 10, text: "El cupón de descuento no funciona", selected: false }
];

const { chromium } = require('playwright');

// POST /analyze
router.post('/analyze', async (req, res) => {
    const { url, selector } = req.body;

    console.log(`[Backend] Analyzing URL: ${url} with selector: ${selector}`);

    if (!url || !selector) {
        return res.status(400).json({ success: false, error: 'URL and selector are required' });
    }

    let browser;
    try {
        browser = await chromium.launch();
        const context = await browser.newContext();
        const page = await context.newPage();

        console.log(`[Backend] Navigating to ${url}...`);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

        console.log(`[Backend] Waiting for selector: ${selector}...`);
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

        console.log(`[Backend] Extracted ${comments.length} comments`);
        res.json({ success: true, data: comments });

    } catch (error) {
        console.error('[Backend] Error during scraping:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error analyzing the page'
        });
    } finally {
        if (browser) {
            await browser.close();
        }
    }
});

// POST /respond
router.post('/respond', (req, res) => {
    const { comments } = req.body;

    console.log(`[Backend] Responding to ${comments ? comments.length : 0} comments`);

    // Simulate processing delay
    setTimeout(() => {
        res.json({
            success: true,
            message: "Respuestas enviadas correctamente",
            respondedCount: comments ? comments.length : 0
        });
    }, 1000);
});

module.exports = router;
