const axios = require('axios');
const cheerio = require('cheerio');

const getMarketPrice = async (cardName) => {
    const original = String(cardName).trim();
    const normalized = cardName.replace(/-/g, ' ');
    const superNormalized = cardName.toLowerCase().replace(/[^a-z0-9\s]/g, '');

    const searchTerms = Array.from(new Set([normalized, superNormalized, original]));

    for (const term of searchTerms) {
        if (!term) continue;

        try {
            // First, try TCGPlayer
            const payload = {
                "algorithm": "sales_synonym_v2",
                "from": 0,
                "size": 25,
                "sort": {}
            };

            const response = await axios.post(
                `https://mp-search-api.tcgplayer.com/v1/search/request?q=${term}&isList=false`,
                payload,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    }
                }
            );

            const marketPrice = response.data?.results[0]?.results[0]?.marketPrice;

            if (marketPrice) {
                console.log(`Successfully found price for "${cardName}" using search term: "${term}" on TCGPlayer`);
                return { cardName, price: marketPrice };
            }
        } catch (error) {
            console.warn(`TCGPlayer API request failed for search term: "${term}". Trying JustTCG...`);
            try {
                const { data } = await axios.get(`https://api.justtcg.com/v2/cards?q=${term}`, {
                    headers: {
                        'Authorization': `Bearer ${process.env.JUSTTCG_API_KEY}`
                    }
                });

                if (data && data.cards && data.cards.length > 0) {
                    const card = data.cards[0];
                    if (card.variants && card.variants.length > 0) {
                        const price = card.variants[0].price;
                        console.log(`Successfully found price for "${cardName}" using search term: "${term}" on JustTCG`);
                        return { cardName, price: price };
                    }
                }
            } catch (justTcgError) {
                console.error(`JustTCG API request failed for search term: "${term}". Error:`, justTcgError.response ? justTcgError.response.data : justTcgError.message);
            }
        }
    }

    console.error(`Could not find a market price for "${cardName}" after trying all variations and sources.`);
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

        // Fallback to JustTCG if no image is found
        const justTcgData = await axios.get(`https://api.justtcg.com/v2/cards?q=${nameParam}`, {
            headers: {
                'Authorization': `Bearer ${process.env.JUSTTCG_API_KEY}`
            }
        });
        if (justTcgData.data && justTcgData.data.cards && justTcgData.data.cards.length > 0) {
            const card = justTcgData.data.cards[0];
            if (card.image) {
                return card.image;
            }
        }
        return null;
    } catch (fallbackErr) {
        console.error('Fallback to YGOPRODeck API failed:', fallbackErr.message);
        return null;
    }
};

module.exports = { getMarketPrice, getCardImageFromYugipedia };