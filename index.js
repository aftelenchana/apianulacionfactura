const express = require('express');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer');
const chromium = require('chrome-aws-lambda');

const app = express();
app.use(bodyParser.json());

app.post('/login-sri', async (req, res) => {
    const { usuario, clave } = req.body;

    if (!usuario || !clave) {
        return res.status(400).json({
            success: false,
            message: 'Se requieren usuario y clave',
            error: 'Faltan credenciales'
        });
    }

    let browser;
    try {
        // Configuración adaptable para diferentes entornos
        const launchOptions = {
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage'
            ],
            headless: true,
            ignoreHTTPSErrors: true
        };

        // Intenta usar chrome-aws-lambda primero, luego falla a puppeteer
        if (process.env.AWS_LAMBDA_FUNCTION_VERSION) {
            launchOptions.executablePath = await chromium.executablePath;
            launchOptions.args = chromium.args;
            launchOptions.headless = chromium.headless;
            browser = await chromium.puppeteer.launch(launchOptions);
        } else {
            // Para desarrollo local
            browser = await puppeteer.launch(launchOptions);
        }

        const page = await browser.newPage();
        
        // Resto de tu código permanece igual...
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

        await page.goto("https://srienlinea.sri.gob.ec/sri-en-linea/contribuyente/perfil", {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        // ... resto del código de login

    } catch (error) {
        console.error("❌ Error en el login:", error);
        if (browser) await browser.close();
        
        return res.status(500).json({
            success: false,
            message: "Error durante la automatización",
            error: error.message,
            details: error.stack,
            screenshot: null,
            timestamp: new Date().toISOString()
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`API corriendo en http://localhost:${PORT}`);
});