const express = require('express');
const bodyParser = require('body-parser');
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
        // Usamos chromium.puppeteer para entornos como Render
        browser = await chromium.puppeteer.launch({
            args: chromium.args,
            executablePath: await chromium.executablePath,
            headless: chromium.headless,
        });

        const page = await browser.newPage();

        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

        await page.goto("https://srienlinea.sri.gob.ec/sri-en-linea/contribuyente/perfil", {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        await page.waitForSelector("#usuario", { visible: true, timeout: 30000 });
        await page.type("#usuario", usuario, { delay: 100 });

        await page.waitForSelector("#password", { visible: true, timeout: 30000 });
        await page.type("#password", clave, { delay: 100 });

        await page.click("#kc-login");

        try {
            await page.waitForNavigation({
                waitUntil: "networkidle2",
                timeout: 60000
            });
        } catch (e) {
            console.log("⚠️ Tiempo de espera agotado, verificando estado actual...");
        }

        const currentUrl = page.url();
        const loginExitoso = currentUrl.includes("perfil");

        const screenshotBuffer = await page.screenshot({ fullPage: true });
        const screenshotBase64 = screenshotBuffer.toString('base64');

        await browser.close();

        if (loginExitoso) {
            return res.json({
                success: true,
                message: 'Login exitoso en SRI',
                url: currentUrl,
                screenshot: screenshotBase64,
                timestamp: new Date().toISOString()
            });
        } else {
            return res.status(401).json({
                success: false,
                message: 'Login fallido',
                error: 'Credenciales incorrectas o no redirigió',
                url: currentUrl,
                screenshot: screenshotBase64,
                timestamp: new Date().toISOString()
            });
        }

    } catch (error) {
        console.error("❌ Error en el login:", error);
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
