const Post = require('../models/Post');
const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { io } = require('../server'); // Import the initialized Socket.IO instance

// --- Main function to orchestrate background fetching ---
const initiatePriceAndImageFetch = async (postId, cardName, fetchPrice = true) => {
    console.log(`Starting background job for post ${postId} ("${cardName}")`);
    try {
        const updates = {};

        // Run fetches in parallel
        const [imageUrl, priceResult] = await Promise.all([
            getCardImageFromYugipedia(cardName),
            fetchPrice ? getMarketPrice(cardName) : Promise.resolve(null)
        ]);

        if (imageUrl) {
            updates.cardImageUrl = imageUrl;
        }
        if (priceResult && priceResult.price !== null) {
            updates.price = priceResult.price;
            updates.isApiPrice = true;
        }

        // If there are any updates, save them to the database
        if (Object.keys(updates).length > 0) {
            const updatedPost = await Post.findByIdAndUpdate(postId, { $set: updates }, { new: true });
            
            if (updatedPost) {
                console.log(`Broadcasting update for post: ${postId}`);
                // Emit the event to all connected clients
                io.emit('postUpdated', updatedPost);
            }
        }
    } catch (error) {
        console.error(`Background job failed for post ${postId}:`, error);
    }
};

// --- Helper function to get TCGplayer market price ---
const getMarketPrice = async (cardName) => {
    let browser = null;
    try {
        browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        
        const formattedCardName = encodeURIComponent(String(cardName).trim());
        const searchUrl = `https://www.tcgplayer.com/search/yugioh/product?productLineName=yugioh&q=${formattedCardName}&view=grid`;

        await page.goto(searchUrl, { waitUntil: 'networkidle2' });

        const priceSelector = 'span.product-card__market-price--value';
        await page.waitForSelector(priceSelector, { timeout: 15000 });
        const priceElementText = await page.$eval(priceSelector, el => el.textContent);
        const price = parseFloat(priceElementText.replace(/[^0-9.-]+/g, ""));
        
        return !isNaN(price) ? { cardName, price } : { cardName, price: null };
    } catch (error) {
        console.error(`Failed to fetch card price for "${cardName}":`, error.message);
        return { cardName, price: null };
    } finally {
        if (browser) await browser.close();
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
            // Retry with index.php style URL if direct path is blocked
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
        // Fallback to YGOPRODeck API image when Yugipedia blocks or fails
        try {
            const nameParam = encodeURIComponent(String(cardName).trim());
            const resp = await axios.get(`https://db.ygoprodeck.com/api/v7/cardinfo.php?name=${nameParam}`, { timeout: 10000 });
            return resp?.data?.data?.[0]?.card_images?.[0]?.image_url_small
                || resp?.data?.data?.[0]?.card_images?.[0]?.image_url
                || null;
        } catch (fallbackErr) {
            console.error('Fallback YGOPRODeck failed:', fallbackErr.message);
            return null;
        }
    }
};


module.exports = {
    initiatePriceAndImageFetch,
};

