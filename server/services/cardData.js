const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');

// --- Helper function to get TCGplayer market price ---
const getMarketPrice = async (cardName, browserInstance = null, retryCount = 0) => {
    const maxRetries = 2;
    let browser = browserInstance;
    let page = null;
    
    console.log(`Fetching price for "${cardName}" (attempt ${retryCount + 1}/${maxRetries + 1})`);
    
    // Set a global timeout for the entire operation (2 minutes)
    const operationTimeout = setTimeout(() => {
        console.log(`Operation timeout reached for "${cardName}"`);
    }, 120000);
    
    // Add process exit handler for cleanup
    const cleanup = () => {
        clearTimeout(operationTimeout);
        if (page && !page.isClosed()) {
            page.close().catch(() => {});
        }
        if (!browserInstance && browser && browser.isConnected()) {
            browser.close().catch(() => {});
        }
    };
    
    process.on('SIGTERM', cleanup);
    process.on('SIGINT', cleanup);
    
    try {
        if (!browser) {
            let resolvedExecutablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
            
            // Try to get Puppeteer's default executable path if not set
            if (!resolvedExecutablePath) {
                try {
                    resolvedExecutablePath = puppeteer.executablePath();
                } catch (_) {
                    // If Puppeteer can't find Chrome, try common paths
                    const commonPaths = [
                        '/usr/bin/chromium-browser',  // Alpine Linux
                        '/usr/bin/chromium',          // Alpine Linux alternative
                        '/usr/bin/google-chrome',     // Ubuntu/Debian
                        '/usr/bin/google-chrome-stable', // Ubuntu/Debian
                        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', // macOS
                        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', // Windows
                        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe' // Windows 32-bit
                    ];
                    
                    // Try to find Chrome in common locations
                    const fs = require('fs');
                    for (const path of commonPaths) {
                        try {
                            if (fs.existsSync(path)) {
                                resolvedExecutablePath = path;
                                console.log(`Found browser executable at: ${path}`);
                                break;
                            }
                        } catch (_) {
                            continue;
                        }
                    }
                }
            }

            const launchOptions = {
                headless: "new",
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor',
                    '--single-process',
                    '--disable-background-timer-throttling',
                    '--disable-backgrounding-occluded-windows',
                    '--disable-renderer-backgrounding',
                    '--disable-features=TranslateUI',
                    '--disable-ipc-flooding-protection',
                    '--max_old_space_size=512', // Limit memory usage
                    '--disable-extensions',
                    '--disable-plugins'
                ],
                timeout: 45000, // Reduce browser launch timeout to 45 seconds
                protocolTimeout: 45000 // Reduce protocol timeout to 45 seconds
            };
            
            // Only set executablePath if we found one
            if (resolvedExecutablePath && resolvedExecutablePath !== 'undefined' && resolvedExecutablePath !== undefined) {
                launchOptions.executablePath = resolvedExecutablePath;
                console.log(`Using Chrome executable: ${resolvedExecutablePath}`);
            }
            
            browser = await puppeteer.launch(launchOptions);
        }
        page = await browser.newPage();
        
        // Set page timeout and add connection monitoring
        page.setDefaultTimeout(30000);
        
        // Add error handlers for connection issues
        page.on('error', (err) => {
            console.log(`Page error: ${err.message}`);
        });
        
        page.on('pageerror', (err) => {
            console.log(`Page script error: ${err.message}`);
        });

        const formattedCardName = encodeURIComponent(String(cardName).trim());
        const searchUrl = `https://www.tcgplayer.com/search/tcg/product?productLineName=tcg&q=${formattedCardName}&view=grid`;
        
        // Navigate with retry logic
        await page.goto(searchUrl, { 
            waitUntil: 'networkidle2',
            timeout: 30000 
        });

        const priceSelector = 'span.product-card__market-price--value';
        
        // Try multiple selectors in case the page structure changes
        const selectors = [
            'span.product-card__market-price--value',
            '.product-card__market-price--value',
            '[data-testid="market-price"]',
            '.market-price',
            '.price-value'
        ];
        
        let priceElementText = null;
        for (const selector of selectors) {
            try {
                await page.waitForSelector(selector, { timeout: 10000 });
                priceElementText = await page.$eval(selector, el => el.textContent);
                break;
            } catch (e) {
                console.log(`Selector ${selector} not found, trying next...`);
                continue;
            }
        }
        
        if (!priceElementText) {
            throw new Error('No price element found with any selector');
        }
        
        const price = parseFloat(priceElementText.replace(/[^0-9.-]+/g, ""));

        if (!isNaN(price)) {
            return { cardName, price };
        }

        return { cardName, price: null };
    } catch (error) {
        console.error(`Failed to fetch card price from TCGplayer for "${cardName}":`, error.message);
        
        // Check if it's a connection error and handle accordingly
        if (error.message.includes('Connection closed') || error.message.includes('Target closed') || error.message.includes('Protocol error')) {
            console.log('Connection was closed, attempting recovery...');
            // Don't try fallback if connection is already closed
            if (retryCount < maxRetries) {
                console.log(`Retrying price fetch for "${cardName}" in 2 seconds...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                return getMarketPrice(cardName, browserInstance, retryCount + 1);
            }
            return { cardName, price: null };
        }
        
        // Try fallback approach with different search parameters
        try {
            console.log(`Attempting fallback search for "${cardName}"...`);
            
            // If page is null (browser failed to launch), try to create a new page
            if (!page && browser) {
                page = await browser.newPage();
            }
            
            if (!page) {
                throw new Error('No browser page available for fallback');
            }
            
            const fallbackUrl = `https://www.tcgplayer.com/search/tcg/product?productLineName=tcg&q=${encodeURIComponent(cardName)}`;
            await page.goto(fallbackUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
            
            // Try to find any price element on the page
            const fallbackSelectors = [
                '.price',
                '[class*="price"]',
                '[class*="market"]',
                '.product-card__price',
                '.search-result__price'
            ];
            
            for (const selector of fallbackSelectors) {
                try {
                    const elements = await page.$$(selector);
                    for (const element of elements) {
                        const text = await page.evaluate(el => el.textContent, element);
                        const price = parseFloat(text.replace(/[^0-9.-]+/g, ""));
                        if (!isNaN(price) && price > 0) {
                            console.log(`Fallback found price: $${price}`);
                            return { cardName, price };
                        }
                    }
                } catch (e) {
                    continue;
                }
            }
        } catch (fallbackError) {
            console.error(`Fallback also failed for "${cardName}":`, fallbackError.message);
        }
        
        // Retry logic
        if (retryCount < maxRetries) {
            console.log(`Retrying price fetch for "${cardName}" in 2 seconds...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            return getMarketPrice(cardName, browserInstance, retryCount + 1);
        }
        
        return { cardName, price: null };
    } finally {
        // Clear the operation timeout and remove event listeners
        clearTimeout(operationTimeout);
        process.removeListener('SIGTERM', cleanup);
        process.removeListener('SIGINT', cleanup);
        
        // Safely close page and browser with proper error handling
        try {
            if (page) {
                // Check if page is still connected before closing
                if (!page.isClosed()) {
                    await page.close();
                }
            }
        } catch (closeError) {
            console.log(`Page close warning: ${closeError.message}`);
        }
        
        try {
            if (!browserInstance && browser) {
                // Check if browser is still connected before closing
                if (browser.isConnected()) {
                    await browser.close();
                }
            }
        } catch (browserCloseError) {
            console.log(`Browser close warning: ${browserCloseError.message}`);
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


