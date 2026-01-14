import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promises as fs } from 'node:fs';
import { chromium, devices } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const docsDir = path.resolve(__dirname, '..', 'docs');
const screenshotsDir = path.resolve(__dirname, '..', 'screenshots');
const basePath = '/shopping-spree';

const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.json': 'application/json; charset=utf-8',
    '.webmanifest': 'application/manifest+json; charset=utf-8',
    '.ico': 'image/x-icon'
};

const ensureBuildExists = async () => {
    const indexPath = path.join(docsDir, 'index.html');
    try {
        await fs.access(indexPath);
    } catch {
        throw new Error('docs build not found. Run `npm run deploy` before updating screenshots.');
    }
};

const serveStatic = (req, res) => {
    const requestUrl = new URL(req.url ?? '/', `http://${req.headers.host}`);
    let pathname = decodeURIComponent(requestUrl.pathname);

    if (pathname === '/') {
        res.writeHead(302, { Location: `${basePath}/` });
        res.end();
        return;
    }

    if (!pathname.startsWith(basePath)) {
        res.writeHead(404);
        res.end('Not found');
        return;
    }

    pathname = pathname.slice(basePath.length);
    if (!pathname || pathname === '/') {
        pathname = '/index.html';
    }

    const normalizedPath = path.normalize(pathname).replace(/^\\+/, '/');
    if (normalizedPath.startsWith('..')) {
        res.writeHead(400);
        res.end('Invalid path');
        return;
    }

    const filePath = path.join(docsDir, normalizedPath);
    fs.stat(filePath)
        .then((stats) => {
            if (stats.isDirectory()) {
                return fs.readFile(path.join(filePath, 'index.html'));
            }
            return fs.readFile(filePath);
        })
        .then((contents) => {
            const ext = path.extname(filePath).toLowerCase();
            const contentType = mimeTypes[ext] ?? 'application/octet-stream';
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(contents);
        })
        .catch(() => {
            res.writeHead(404);
            res.end('Not found');
        });
};

const launchServer = async () => {
    const server = http.createServer(serveStatic);
    await new Promise((resolve) => server.listen(0, resolve));
    const { port } = server.address();
    return { server, port };
};

const captureDesktopScreenshots = async (browser, baseUrl) => {
    const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 2
    });
    const page = await context.newPage();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.getByRole('link', { name: 'Shop' }).waitFor();
    await page.waitForTimeout(500);

    await page.screenshot({
        path: path.join(screenshotsDir, 'desktop_view.png'),
        fullPage: true
    });

    const budgetButton = page.locator('header button').first();
    await budgetButton.click();
    await page.getByText('Budget History').waitFor();
    await page.waitForTimeout(300);

    await page.screenshot({
        path: path.join(screenshotsDir, 'desktop_view_expanded.png'),
        fullPage: true
    });

    await context.close();
};

const captureMobileScreenshot = async (browser, baseUrl, deviceName, fileName) => {
    const device = devices[deviceName];
    if (!device) {
        throw new Error(`Unknown device preset: ${deviceName}`);
    }

    const context = await browser.newContext({
        ...device
    });
    const page = await context.newPage();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.getByRole('link', { name: 'Shop' }).waitFor();
    await page.waitForTimeout(500);

    await page.screenshot({
        path: path.join(screenshotsDir, fileName),
        fullPage: true
    });

    await context.close();
};

const main = async () => {
    await ensureBuildExists();

    const { server, port } = await launchServer();
    const baseUrl = `http://127.0.0.1:${port}${basePath}/`;

    let browser;

    try {
        browser = await chromium.launch();
        await captureDesktopScreenshots(browser, baseUrl);
        await captureMobileScreenshot(browser, baseUrl, 'Pixel 5', 'mobile_android.png');
        await captureMobileScreenshot(browser, baseUrl, 'iPhone 14', 'mobile_iphone.png');
    } finally {
        if (browser) {
            await browser.close();
        }
        await new Promise((resolve) => server.close(resolve));
    }

    console.log('Screenshots updated.');
};

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
