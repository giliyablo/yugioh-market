const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');

// --- Helper function to get TCGplayer market price ---
const getMarketPrice = async (cardName, browserInstance = null) => {
    let browser = browserInstance;
    let page = null;
    try {
        if (!browser) {
            browser = await puppeteer.launch({ 
                headless: "new",
                executablePath: '/usr/bin/chromium-browser',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu'
                ]
            });
        }
        page = await browser.newPage();

        const formattedCardName = encodeURIComponent(String(cardName).trim());
        const searchUrl = `https://www.tcgplayer.com/search/tcg/product?productLineName=tcg&q=${formattedCardName}&view=grid`;
        await page.goto(searchUrl, { waitUntil: 'networkidle2' });

        const priceSelector = 'span.product-card__market-price--value';
        await page.waitForSelector(priceSelector, { timeout: 15000 });
        const priceElementText = await page.$eval(priceSelector, el => el.textContent);
        const price = parseFloat(priceElementText.replace(/[^0-9.-]+/g, ""));

        if (!isNaN(price)) {
            return { cardName, price };
        }

        return { cardName, price: null };
    } catch (error) {
        console.error(`Failed to fetch card price from TCGplayer for "${cardName}":`, error.message);
        return { cardName, price: null };
    } finally {
        if (page) {
            await page.close();
        }
        if (!browserInstance && browser) {
            await browser.close();
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


