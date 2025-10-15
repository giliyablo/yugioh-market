// giliyablo/yugioh-market/yugioh-market-e6759367203882ac287f720598e236db05239e5f/worker/cardData.js
const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');

let browserInstance = null;
const getBrowserInstance = async () => {
    if (browserInstance && browserInstance.isConnected()) {
        return browserInstance;
    }
    const executablePath = '/usr/bin/chromium';

    console.log('Launching new browser instance...');
    try {
        browserInstance = await puppeteer.launch({
            headless: "new",
            executablePath: executablePath,
            // Dump browser process stdout and stderr into the Node.js process
            dumpio: true, 
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
        console.log('Browser instance launched successfully.');
        return browserInstance;
    } catch (launchError) {
        console.error("Critical: Failed to launch browser instance:", launchError);
        throw launchError; // Re-throw the error to ensure it's not swallowed
    }
};

const getMarketPrice = async (cardName) => {
    let page = null;
    try {
        const browser = await getBrowserInstance();
        page = await browser.newPage();

        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });

        await page.setViewport({ width: 1280, height: 800 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

        const formattedCardName = encodeURIComponent(String(cardName).trim());
        const searchUrl = `https://www.tcgplayer.com/search/tcg/product?productLineName=tcg&q=${formattedCardName}&view=grid`;

        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        const priceElement = await page.waitForSelector('.product-card__market-price--value', { timeout: 15000 });

        if (priceElement) {
            const priceText = await page.evaluate(el => el.textContent, priceElement);
            const price = parseFloat(priceText.replace(/[^0-9.-]+/g, ""));
            return !isNaN(price) ? { cardName, price } : { cardName, price: null };
        }
        return { cardName, price: null };
    } catch (error) {
        console.error(`Error in getMarketPrice for "${cardName}":`, error.message);
        // Important: Re-throw the error so the job can be marked as failed.
        throw error;
    } finally {
        if (page) await page.close();
    }
};

// --- getCardImageFromYugipedia (no changes needed) ---
const getCardImageFromYugipedia = async (cardName) => {
    try {
        const formattedCardName = encodeURIComponent(String(cardName).trim().replace(/ /g, '_'));
        const wikiUrl = `https://yugipedia.com/wiki/${formattedCardName}`;
        const { data: html } = await axios.get(wikiUrl, { timeout: 10000 });
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
