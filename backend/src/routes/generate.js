const express = require('express');
const router = express.Router();
const axios = require('axios');

// POST /api/generate
router.post('/', async (req, res) => {
    const { prompt } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!prompt) {
        return res.status(400).json({ success: false, error: 'Se requiere un prompt' });
    }

    if (!apiKey) {
        return res.status(500).json({ success: false, error: 'API Key no configurada en el servidor' });
    }

    console.log(`[AI_Service] Consulta: ${prompt.substr(0, 50)}...`);

    try {
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
            {
                contents: [{ parts: [{ text: prompt }] }]
            }
        );

        const result = response.data;
        const aiResponse = result?.candidates?.[0]?.content?.parts?.[0]?.text || 'No se pudo generar respuesta';

        res.json({
            success: true,
            response: aiResponse
        });

    } catch (error) {
        console.error('[AI_ERROR]', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            error: error.response?.data?.error?.message || error.message
        });
    }
});

module.exports = router;
