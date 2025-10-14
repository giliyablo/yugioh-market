const puppeteer = require('puppeteer');
const { postsService } = require('./firestoreService');
const { getMarketPrice, getCardImageFromYugipedia } = require('./cardData');
const { broadcast } = require('./sse');

// Simple in-memory job queue
const queue = [];
let isRunning = false;

function enqueue(job) {
    queue.push(job);
    run();
}

async function run() {
    if (isRunning) return;
    isRunning = true;
    let browser = null;
    try {
        // Resolve a robust executablePath similar to cardData.js
        let resolvedExecutablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
        if (!resolvedExecutablePath) {
            try {
                resolvedExecutablePath = puppeteer.executablePath();
            } catch (_) {
                const fs = require('fs');
                const commonPaths = [
                    '/usr/bin/chromium-browser',
                    '/usr/bin/chromium',
                    '/usr/bin/google-chrome',
                    '/usr/bin/google-chrome-stable',
                    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
                    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
                ];
                for (const p of commonPaths) {
                    try { if (fs.existsSync(p)) { resolvedExecutablePath = p; break; } } catch (_) {}
                }
            }
        }

        const launchOptions = {
            headless: 'new',
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
                '--max_old_space_size=512',
                '--disable-extensions',
                '--disable-plugins'
            ],
            timeout: 45000,
            protocolTimeout: 45000
        };
        if (resolvedExecutablePath && resolvedExecutablePath !== 'undefined') {
            launchOptions.executablePath = resolvedExecutablePath;
            console.log(`Using Chrome executable (jobs): ${resolvedExecutablePath}`);
        } else {
            console.log('Using Puppeteer-managed Chrome (jobs)');
        }
        browser = await puppeteer.launch(launchOptions);
    } catch (e) {
        // If puppeteer fails, we will still try single-mode fetches
        browser = null;
    }
    try {
        while (queue.length > 0) {
            const job = queue.shift();
            await processJob(job, browser);
        }
    } finally {
        if (browser) try { await browser.close(); } catch (_) {}
        isRunning = false;
    }
}

async function processJob(job, sharedBrowser) {
    const { postId, cardName } = job;
    const post = await postsService.getPost(postId);
    if (!post) return;

    const update = { enrichment: { ...post.enrichment } };

    // Prepare parallel tasks for price and image enrichment
    const tasks = [];

    if (post.price === undefined || post.price === null || post.price === "") {
        update.enrichment.priceStatus = 'pending';
        tasks.push((async () => {
            try {
                const result = await getMarketPrice(cardName, sharedBrowser || null);
                if (result && result.price !== null) {
                    update.price = result.price;
                    update.isApiPrice = true;
                    update.enrichment.priceStatus = 'done';
                } else {
                    update.enrichment.priceStatus = 'error';
                    update.enrichment.lastError = 'Price not found';
                }
            } catch (e) {
                update.enrichment.priceStatus = 'error';
                update.enrichment.lastError = e.message;
            }
        })());
    }

    const isPlaceholder = (url) => !url || (typeof url === 'string' && (url.includes('placehold.co') || url == ""));
    if (isPlaceholder(post.cardImageUrl)) {
        update.enrichment.imageStatus = 'pending';
        tasks.push((async () => {
            try {
                const img = await getCardImageFromYugipedia(cardName);
                if (img) {
                    update.cardImageUrl = img;
                    update.enrichment.imageStatus = 'done';
                } else {
                    update.enrichment.imageStatus = 'error';
                    update.enrichment.lastError = 'Image not found';
                }
            } catch (e) {
                update.enrichment.imageStatus = 'error';
                update.enrichment.lastError = e.message;
            }
        })());
    }

    if (tasks.length > 0) {
        await postsService.updatePost(postId, { enrichment: update.enrichment });
        await Promise.allSettled(tasks);
    }

    await postsService.updatePost(postId, update);
    const saved = await postsService.getPost(postId);
    if (saved) {
        broadcast('post.updated', { id: saved.id, post: saved });
    }
}

module.exports = { enqueue };


