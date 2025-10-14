const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');

// --- Helper function to get TCGplayer market price ---
const getMarketPrice = async (cardName, browserInstance = null, retryCount = 0) => {
    const maxRetries = 2;
    let browser = browserInstance;
    let page = null;

    console.log(`Fetching price for "${cardName}" (attempt ${retryCount + 1}/${maxRetries + 1})`);

    const operationTimeout = setTimeout(() => {
        console.log(`Operation timeout reached for "${cardName}"`);
    }, 120000);

    const cleanup = () => {
        clearTimeout(operationTimeout);
        if (page && !page.isClosed()) {
            page.close().catch(() => {});
        }
        if (!browserInstance && browser && browser.isConnected()) {
            browser.close().catch(() => {});
        }
    };

    process.on('SIGTERM', cleanup);
    process.on('SIGINT', cleanup);

    try {
        if (!browser) {
            let resolvedExecutablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
            if (!resolvedExecutablePath) {
                try {
                    resolvedExecutablePath = puppeteer.executablePath();
                } catch (_) {
                    const commonPaths = [
                        '/usr/bin/chromium-browser',
                        '/usr/bin/chromium',
                        '/usr/bin/google-chrome',
                        '/usr/bin/google-chrome-stable',
                        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
                        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
                        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
                    ];
                    const fs = require('fs');
                    for (const path of commonPaths) {
                        if (fs.existsSync(path)) {
                            resolvedExecutablePath = path;
                            console.log(`Found browser executable at: ${path}`);
                            break;
                        }
                    }
                }
            }

            const launchOptions = {
                headless: "new",
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor',
                    '--single-process',
                ],
                timeout: 60000,
            };

            if (resolvedExecutablePath) {
                launchOptions.executablePath = resolvedExecutablePath;
            }

            browser = await puppeteer.launch(launchOptions);
        }

        page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

        const formattedCardName = encodeURIComponent(String(cardName).trim());
        const searchUrl = `https://www.tcgplayer.com/search/tcg/product?productLineName=tcg&q=${formattedCardName}&view=grid`;

        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForSelector('.product-card__market-price--value, .search-results', { timeout: 15000 });

        let priceElementText = null;
        const element = await page.$('span.product-card__market-price--value');
        if (element) {
            const display = await page.evaluate(el => window.getComputedStyle(el).display, element);
            const visibility = await page.evaluate(el => window.getComputedStyle(el).visibility, element);
            const opacity = await page.evaluate(el => window.getComputedStyle(el).opacity, element);

            if (display === 'none' || visibility === 'hidden' || opacity === '0') {
                console.log('Element is hidden.');
            } else {
                const text = await page.evaluate(el => el.textContent, element);
                console.log('Text content:', text);
                priceElementText = text;
            }
        } else {
            console.log('Element not found.');
        }

        if (!priceElementText) {
            throw new Error('Price element not found or is not visible.');
        }

        const price = parseFloat(priceElementText.replace(/[^0-9.-]+/g, ""));

        if (!isNaN(price)) {
            return { cardName, price };
        }

        return { cardName, price: null };

    } catch (error) {
        console.error(`Failed to fetch card price for "${cardName}":`, error.message);
        if (retryCount < maxRetries) {
            console.log(`Retrying price fetch for "${cardName}"...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            // Important: Close the potentially problematic browser instance before retrying
            if (browser) await browser.close().catch(() => {});
            return getMarketPrice(cardName, null, retryCount + 1);
        }
        return { cardName, price: null };
    } finally {
        clearTimeout(operationTimeout);
        process.removeListener('SIGTERM', cleanup);
        process.removeListener('SIGINT', cleanup);
        if (page && !page.isClosed()) {
            await page.close().catch(()=>{});
        }
        if (!browserInstance && browser) {
            await browser.close().catch(()=>{});
        }
    }
};


// --- Helper to fetch card image from Yugipedia ---
const getCardImageFromYugipedia = async (cardName) => {
    try {
        const formattedCardName = encodeURIComponent(String(cardName).trim().replace(/ /g, '_'));
        const wikiUrl = `https://yugipedia.com/wiki/${formattedCardName}`;

        const requestConfig = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://yugipedia.com/'
            },
            timeout: 10000
        };

        let html;
        try {
            const res = await axios.get(wikiUrl, requestConfig);
            html = res.data;
        } catch (err) {
            const altUrl = `https://yugipedia.com/index.php?title=${formattedCardName}`;
            const res2 = await axios.get(altUrl, requestConfig);
            html = res2.data;
        }

        const $ = cheerio.load(html);
        const img = $('td.cardtable-cardimage a img');
        let imageUrl = '';

        if (img.attr('srcset')) {
            const entries = String(img.attr('srcset')).split(',').map(s => s.trim());
            const urls = entries.map(e => e.split(' ')[0]);
            const preferred = urls.find(u => /\/thumb\//.test(u) && /\/300px-/.test(u))
                || urls.find(u => /\/thumb\//.test(u))
                || urls[0];
            if (preferred) imageUrl = preferred;
        }

        if (!imageUrl) {
            imageUrl = img.attr('src') || img.attr('data-src') || '';
        }

        if (!imageUrl) {
            const og = $('meta[property="og:image"]').attr('content');
            if (og) imageUrl = og;
        }

        if (imageUrl) {
            if (imageUrl.startsWith('//')) {
                imageUrl = `https:${imageUrl}`;
            }
            if (imageUrl.startsWith('/')) {
                imageUrl = `https://yugipedia.com${imageUrl}`;
            }
            return imageUrl;
        }
        return null;
    } catch (error) {
        console.error(`Error scraping Yugipedia for card "${cardName}":`, error.message);
        try {
            const nameParam = encodeURIComponent(String(cardName).trim());
            const resp = await axios.get(`https://db.ygoprodeck.com/api/v7/cardinfo.php?name=${nameParam}`, { timeout: 10000 });
            const img = resp?.data?.data?.[0]?.card_images?.[0]?.image_url_small
                || resp?.data?.data?.[0]?.card_images?.[0]?.image_url
                || null;
            return img;
        } catch (fallbackErr) {
            console.error('Fallback YGOPRODeck failed:', fallbackErr.message);
            return null;
        }
    }
};

module.exports = { getMarketPrice, getCardImageFromYugipedia };
