const express = require('express');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer');

const app = express();
app.use(bodyParser.json());

// Endpoint para login en SRI
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
        // Configuración de Puppeteer para Render.com
        browser = await puppeteer.launch({
            headless: true, // Modo headless para servidor
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-gpu'
            ],
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || puppeteer.executablePath()
        });

        const page = await browser.newPage();
        
        // Configurar el user-agent para parecer un navegador normal
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

        // Paso 1: Ir a la página de login
        console.log("🚀 Cargando la página de login...");
        await page.goto("https://srienlinea.sri.gob.ec/sri-en-linea/contribuyente/perfil", {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        // Esperar y escribir en el campo de usuario
        await page.waitForSelector("#usuario", { visible: true, timeout: 30000 });
        await page.type("#usuario", usuario, { delay: 100 });

        // Esperar y escribir en el campo de contraseña
        await page.waitForSelector("#password", { visible: true, timeout: 30000 });
        await page.type("#password", clave, { delay: 100 });

        // Hacer clic en el botón de login
        await page.click("#kc-login");
        console.log("✅ Botón de login clickeado");

        // Esperar a que la navegación se complete
        try {
            await page.waitForNavigation({ 
                waitUntil: "networkidle2",
                timeout: 60000
            });
        } catch (e) {
            console.log("⚠️ Tiempo de espera agotado, verificando estado actual...");
        }

        // Verificar si el login fue exitoso
        const currentUrl = page.url();
        let loginExitoso = currentUrl.includes("perfil");
        
        // Tomar screenshot como evidencia (en base64 para no usar filesystem)
        const screenshotBuffer = await page.screenshot({ fullPage: true });
        const screenshotBase64 = screenshotBuffer.toString('base64');

        // Cerrar el navegador
        await browser.close();

        if (loginExitoso) {
            console.log("✅ Login exitoso");
            return res.json({ 
                success: true,
                message: 'Login exitoso en SRI',
                url: currentUrl,
                screenshot: screenshotBase64,
                timestamp: new Date().toISOString()
            });
        } else {
            console.log("❌ Login fallido");
            return res.status(401).json({ 
                success: false,
                message: 'Login fallido en SRI',
                error: 'Credenciales incorrectas o página no redirigió correctamente',
                url: currentUrl,
                screenshot: screenshotBase64,
                timestamp: new Date().toISOString()
            });
        }

    } catch (error) {
        console.error('Error durante la automatización:', error);
        
        // Tomar screenshot del error si el browser está disponible
        let screenshotBase64 = null;
        if (browser) {
            try {
                const page = await browser.newPage();
                const screenshotBuffer = await page.screenshot({ fullPage: true });
                screenshotBase64 = screenshotBuffer.toString('base64');
                await browser.close();
            } catch (e) {
                console.error('Error al tomar screenshot:', e);
            }
        }

        return res.status(500).json({ 
            success: false,
            message: 'Error durante la automatización',
            error: error.message,
            details: error.stack,
            screenshot: screenshotBase64,
            timestamp: new Date().toISOString()
        });
    }
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`API de automatización SRI corriendo en http://localhost:${PORT}`);
});