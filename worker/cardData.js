const axios = require('axios');
const cheerio = require('cheerio');

// This function attempts to find a price, trying different name variations.
const getMarketPrice = async (cardName) => {
    // A normalized version of the name, replacing hyphens with spaces, often yields better results.
    const normalizedCardName = cardName.replace(/-/g, ' ');

    // We'll try the normalized name first, then the original if needed.
    const searchTerms = Array.from(new Set([normalizedCardName, cardName]));

    for (const term of searchTerms) {
        try {
            const payload = {
                "algorithm": "sales_synonym_v2",
                "from": 0,
                "size": 1,
                "filters": {
                    "term": { "productLineName": ["yugioh"] }
                },
                "q": term,
                "context": { "shippingCountry": "US" },
                "settings": { "useFuzzySearch": true, "didYouMean": true }
            };

            const response = await axios.post(
                'https://mp-search-api.tcgplayer.com/v1/search/request',
                payload,
                { headers: { 'Content-Type': 'application/json' } }
            );

            const marketPrice = response.data?.results[0]?.results[0]?.marketPrice;

            if (marketPrice) {
                console.log(`Successfully found price for "${cardName}" using search term: "${term}"`);
                return { cardName, price: marketPrice };
            }
        } catch (error) {
            console.warn(`API request failed for search term: "${term}". Trying next term...`);
        }
    }

    // If both attempts fail, return null.
    console.error(`Could not find a market price for "${cardName}" after trying all variations.`);
    return { cardName, price: null };
};


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
        if (imageUrl) {
            return imageUrl;
        }
        throw new Error('Image not found on Yugipedia page.');

    } catch (error) {
        console.warn(`Could not scrape Yugipedia for "${cardName}", attempting fallback...`);
        try {
            const nameParam = encodeURIComponent(String(cardName).trim());
            const { data } = await axios.get(`https://db.ygoprodeck.com/api/v7/cardinfo.php?name=${nameParam}`, { timeout: 10000 });
            
            const cardImages = data?.data?.[0]?.card_images;
            if (cardImages && cardImages.length > 0) {
                return cardImages[0].image_url_small || cardImages[0].image_url;
            }
            return null;
        } catch (fallbackErr) {
            console.error('Fallback to YGOPRODeck API failed:', fallbackErr.message);
            return null;
        }
    }
};

module.exports = { getMarketPrice, getCardImageFromYugipedia };

