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
        const envExecutable = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser';
        let resolvedExecutablePath = envExecutable;
        if (!resolvedExecutablePath) {
            try {
                resolvedExecutablePath = puppeteer.executablePath();
            } catch (_) {
                resolvedExecutablePath = undefined;
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
                '--disable-gpu'
            ]
        };
        if (resolvedExecutablePath) {
            launchOptions.executablePath = resolvedExecutablePath;
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

    // Fetch price if missing
    if (post.price === undefined || post.price === null || post.price === "") {
        update.enrichment.priceStatus = 'pending';
        await postsService.updatePost(postId, { enrichment: update.enrichment });
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
    }

    // Fetch image if placeholder/missing
    const isPlaceholder = (url) => !url || (typeof url === 'string' && (url.includes('placehold.co') || url == ""));
    if (isPlaceholder(post.cardImageUrl)) {
        update.enrichment.imageStatus = 'pending';
        await postsService.updatePost(postId, { enrichment: update.enrichment });
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
    }

    await postsService.updatePost(postId, update);
    const saved = await postsService.getPost(postId);
    if (saved) {
        broadcast('post.updated', { id: saved.id, post: saved });
    }
}

module.exports = { enqueue };


