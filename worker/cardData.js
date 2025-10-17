const axios = require('axios');
const cheerio = require('cheerio');

// This function attempts to find a price, trying different name variations.
const getMarketPrice = async (cardName) => {
    // 1. Original name
    const original = encodeURIComponent(String(cardName).trim());;
    // 2. Normalized: Replaces hyphens with spaces
    const normalized = cardName.replace(/-/g, ' ');
    // 3. Super-Normalized: Lowercase and remove all non-alphanumeric characters (except spaces)
    const superNormalized = cardName.toLowerCase().replace(/[^a-z0-9\s]/g, '');

    // Create a unique set of search terms to try in order of likely success.
    const searchTerms = Array.from(new Set([normalized, superNormalized, original]));

    for (const term of searchTerms) {
        // Skip empty search terms which can happen with certain inputs.
        if (!term) continue;

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

    // If all attempts fail, log an error and return null.
    console.error(`Could not find a market price for "${cardName}" after trying all variations.`);
    return { cardName, price: null };
};


const getCardImageFromYugipedia = async (cardName) => {
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
};

module.exports = { getMarketPrice, getCardImageFromYugipedia };

