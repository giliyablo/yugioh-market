const axios = require('axios');
const cheerio = require('cheerio');

const getMarketPrice = async (cardName) => {
    try {
        const response = await axios.post(
            'https://mp-search-api.tcgplayer.com/v1/search/request?q=' + encodeURIComponent(cardName) + '&isList=false',
            {
                "algorithm": "sales_synonym_v2",
                "from": 0,
                "size": 1,
                "filters": {
                    "term": {},
                    "range": {},
                    "match": {}
                },
                "listingType": "all",
                "context": {
                    "cart": {},
                    "shippingCountry": "US"
                },
                "settings": {
                    "useFuzzySearch": true,
                    "didYouMean": true
                }
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                }
            }
        );

        const marketPrice = response.data?.results[0]?.results[0]?.marketPrice;

        if (marketPrice) {
            return { cardName, price: marketPrice };
        }
        return { cardName, price: null };
    } catch (error) {
        console.error(`Error in getMarketPrice for "${cardName}":`, error.message);
        throw error;
    }
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
