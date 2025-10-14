const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');

// --- Reusable Puppeteer Browser Instance ---
let browserInstance = null;
const getBrowserInstance = async () => {
    if (browserInstance && browserInstance.isConnected()) {
        return browserInstance;
    }
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || puppeteer.executablePath();
    browserInstance = await puppeteer.launch({
        headless: "new",
        executablePath,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ],
    });
    return browserInstance;
};


// --- Helper function to get TCGplayer market price ---
const getMarketPrice = async (cardName) => {
    let page = null;
    try {
        const browser = await getBrowserInstance();
        page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

        const formattedCardName = encodeURIComponent(String(cardName).trim());
        const searchUrl = `https://www.tcgplayer.com/search/tcg/product?productLineName=tcg&q=${formattedCardName}&view=grid`;

        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        const priceElement = await page.waitForSelector('.product-card__market-price--value', { timeout: 15000 });

        if (priceElement) {
            const priceText = await page.evaluate(el => el.textContent, priceElement);
            const price = parseFloat(priceText.replace(/[^0-9.-]+/g, ""));
            if (!isNaN(price)) {
                return { cardName, price };
            }
        }
        return { cardName, price: null };
    } catch (error) {
        console.error(`Failed to fetch card price for "${cardName}":`, error.message);
        return { cardName, price: null };
    } finally {
        if (page) {
            await page.close();
        }
    }
};

// --- Helper to fetch card image from Yugipedia ---
const getCardImageFromYugipedia = async (cardName) => {
    try {
        const formattedCardName = encodeURIComponent(String(cardName).trim().replace(/ /g, '_'));
        const wikiUrl = `https://yugipedia.com/wiki/${formattedCardName}`;

        const { data: html } = await axios.get(wikiUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
            },
            timeout: 10000
        });

        const $ = cheerio.load(html);
        let imageUrl = ($('td.cardtable-cardimage a img').attr('src') || '').trim();

        if (imageUrl && !imageUrl.startsWith('http')) {
            imageUrl = `https://yugipedia.com${imageUrl}`;
        }

        return imageUrl || null;
    } catch (error) {
        console.error(`Error scraping Yugipedia for card "${cardName}":`, error.message);
        try {
            const nameParam = encodeURIComponent(String(cardName).trim());
            const { data } = await axios.get(`https://db.ygoprodeck.com/api/v7/cardinfo.php?name=${nameParam}`, { timeout: 10000 });
            return data?.data?.[0]?.card_images?.[0]?.image_url || null;
        } catch (fallbackErr) {
            console.error('Fallback to YGOPRODeck API failed:', fallbackErr.message);
            return null;
        }
    }
};

module.exports = { getMarketPrice, getCardImageFromYugipedia };
