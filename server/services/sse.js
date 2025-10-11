const clients = new Set();

function sseHandler(req, res) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders && res.flushHeaders();

    const client = { res };
    clients.add(client);

    req.on('close', () => {
        clients.delete(client);
    });

    // Send a comment to keep connection alive
    const keepAlive = setInterval(() => {
        try { res.write(': keep-alive\n\n'); } catch (_) {}
    }, 280);

    req.on('close', () => clearInterval(keepAlive));
}

function broadcast(event, data) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const { res } of clients) {
        try { res.write(payload); } catch (_) { /* ignore broken pipe */ }
    }
}

module.exports = { sseHandler, broadcast };


