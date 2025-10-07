const Post = require('../models/Post');
const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { getIO } = require('./socket');

const initiatePriceAndImageFetch = async (postId, cardName, fetchPrice = true) => {
    console.log(`Starting background job for post ${postId} ("${cardName}")`);
    try {
        const updates = {};

        const [imageUrl, priceResult] = await Promise.all([
            getCardImageFromYugipedia(cardName),
            fetchPrice ? getMarketPrice(cardName) : Promise.resolve(null)
        ]);

        if (imageUrl) updates.cardImageUrl = imageUrl;
        if (priceResult && priceResult.price !== null) {
            updates.price = priceResult.price;
            updates.isApiPrice = true;
        }

        if (Object.keys(updates).length > 0) {
            const updatedPost = await Post.findByIdAndUpdate(postId, { $set: updates }, { new: true });
            if (updatedPost) {
                console.log(`Broadcasting update for post: ${postId}`);
                const io = getIO();
                io.emit('postUpdated', updatedPost);
            }
        }
    } catch (err) {
        console.error(`Background job failed for post ${postId}:`, err.message);
    }
};

// --- Helper functions ---
const getMarketPrice = async (cardName) => {
    let browser;
    try {
        browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox','--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        const formatted = encodeURIComponent(cardName.trim());
        const url = `https://www.tcgplayer.com/search/yugioh/product?productLineName=yugioh&q=${formatted}&view=grid`;

        await page.goto(url, { waitUntil: 'networkidle2' });
        const priceSelector = 'span.product-card__market-price--value';
        await page.waitForSelector(priceSelector, { timeout: 15000 });
        const priceText = await page.$eval(priceSelector, el => el.textContent);
        const price = parseFloat(priceText.replace(/[^0-9.-]+/g, ""));
        return !isNaN(price) ? { cardName, price } : { cardName, price: null };
    } catch (err) {
        console.error(`Failed to fetch price for "${cardName}":`, err.message);
        return { cardName, price: null };
    } finally {
        if (browser) await browser.close();
    }
};

const getCardImageFromYugipedia = async (cardName) => {
    try {
        const formatted = encodeURIComponent(cardName.trim().replace(/ /g, '_'));
        const wikiUrl = `https://yugipedia.com/wiki/${formatted}`;
        const res = await axios.get(wikiUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10000 });
        const $ = cheerio.load(res.data);
        const img = $('td.cardtable-cardimage a img');
        let src = img.attr('src') || img.attr('data-src') || $('meta[property="og:image"]').attr('content') || null;
        if (src && src.startsWith('//')) src = 'https:' + src;
        return src || null;
    } catch (err) {
        console.error(`Error fetching image for "${cardName}":`, err.message);
        try {
            const resp = await axios.get(`https://db.ygoprodeck.com/api/v7/cardinfo.php?name=${encodeURIComponent(cardName)}`, { timeout: 10000 });
            return resp?.data?.data?.[0]?.card_images?.[0]?.image_url_small || null;
        } catch {
            return null;
        }
    }
};

module.exports = { initiatePriceAndImageFetch };
