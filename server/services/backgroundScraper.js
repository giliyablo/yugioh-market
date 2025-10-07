const Post = require('../models/Post');
const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { io } = require('./socket'); // Safe because it's in a separate file

// --- Singleton browser instance ---
let browser;
async function getBrowser() {
    if (!browser) {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
    }
    return browser;
}

// --- Main background job ---
async function initiatePriceAndImageFetch(postId, cardName, fetchPrice = true) {
    console.log(`Starting background job for post ${postId} ("${cardName}")`);
    try {
        const updates = {};

        const [imageUrl, priceResult] = await Promise.all([
            getCardImageFromYugipedia(cardName),
            fetchPrice ? getMarketPrice(cardName) : Promise.resolve(null)
        ]);

        if (imageUrl) updates.cardImageUrl = imageUrl;
        if (priceResult?.price) {
            updates.price = priceResult.price;
            updates.isApiPrice = true;
        }

        if (Object.keys(updates).length > 0) {
            const updatedPost = await Post.findByIdAndUpdate(postId, { $set: updates }, { new: true });
            if (updatedPost) {
                console.log(`Broadcasting update for ${cardName}`);
                io.emit('postUpdated', updatedPost);
            }
        }
    } catch (error) {
        console.error(`Background job failed for ${cardName}:`, error);
    }
}

// --- Market price scraper ---
async function getMarketPrice(cardName) {
    let page;
    try {
        const browser = await getBrowser();
        page = await browser.newPage();
        const formatted = encodeURIComponent(cardName.trim());
        const url = `https://www.tcgplayer.com/search/yugioh/product?productLineName=yugioh&q=${formatted}&view=grid`;

        await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });

        const selector = 'span.product-card__market-price--value';
        try {
            await page.waitForSelector(selector, { timeout: 8000 });
            const text = await page.$eval(selector, el => el.textContent);
            const price = parseFloat(text.replace(/[^0-9.-]+/g, ''));
            return { cardName, price: isNaN(price) ? null : price };
        } catch {
            return { cardName, price: null };
        }
    } catch (err) {
        console.error(`Failed to fetch price for ${cardName}:`, err.message);
        return { cardName, price: null };
    } finally {
        if (page) await page.close();
    }
}

// --- Image fetcher ---
async function getCardImageFromYugipedia(cardName) {
    try {
        const formatted = encodeURIComponent(cardName.trim().replace(/ /g, '_'));
        const url = `https://yugipedia.com/wiki/${formatted}`;
        const headers = { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://yugipedia.com/' };
        let html;

        try {
            const res = await axios.get(url, { headers, timeout: 10000 });
            html = res.data;
        } catch {
            const altUrl = `https://yugipedia.com/index.php?title=${formatted}`;
            html = (await axios.get(altUrl, { headers, timeout: 10000 })).data;
        }

        const $ = cheerio.load(html);
        const img = $('td.cardtable-cardimage a img');
        let imageUrl = img.attr('srcset')?.split(',')[0].split(' ')[0]
            || img.attr('src')
            || $('meta[property="og:image"]').attr('content')
            || '';

        if (imageUrl.startsWith('//')) imageUrl = 'https:' + imageUrl;
        if (imageUrl.startsWith('/')) imageUrl = 'https://yugipedia.com' + imageUrl;

        if (!imageUrl) throw new Error('No image found');
        return imageUrl;
    } catch (err) {
        console.warn(`Yugipedia failed for "${cardName}", falling back to YGOPRODeck.`);
        try {
            const resp = await axios.get(`https://db.ygoprodeck.com/api/v7/cardinfo.php?name=${encodeURIComponent(cardName)}`);
            return resp?.data?.data?.[0]?.card_images?.[0]?.image_url || null;
        } catch {
            return null;
        }
    }
}

module.exports = { initiatePriceAndImageFetch };
    