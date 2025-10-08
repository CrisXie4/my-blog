const MISSING_CONFIG_MESSAGE = 'Missing YAOHU environment variables';

function buildRequestUrl(baseUrl, apiKey) {
    if (!baseUrl) {
        throw new Error('Base URL is not configured');
    }

    const hasKeyParam = /[?&]key=/.test(baseUrl);

    if (hasKeyParam) {
        return baseUrl;
    }

    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}key=${encodeURIComponent(apiKey)}`;
}

function extractQuote(data) {
    if (!data) {
        return null;
    }

    if (typeof data === 'string') {
        return data.trim();
    }

    if (Array.isArray(data) && data.length > 0) {
        return extractQuote(data[0]);
    }

    const candidateKeys = ['data', 'text', 'content', 'hitokoto', 'quote'];

    for (const key of candidateKeys) {
        if (data[key]) {
            return extractQuote(data[key]);
        }
    }

    return null;
}

module.exports = async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');

    if (req.method !== 'GET') {
        res.statusCode = 405;
        res.setHeader('Allow', 'GET');
        res.end(JSON.stringify({ error: 'Method Not Allowed' }));
        return;
    }

    const { YAOHU_URL, YAOHU_API } = process.env;

    if (!YAOHU_URL || !YAOHU_API) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: MISSING_CONFIG_MESSAGE }));
        return;
    }

    try {
        const requestUrl = buildRequestUrl(YAOHU_URL, YAOHU_API);
        const response = await fetch(requestUrl);

        if (!response.ok) {
            throw new Error(`Remote API responded with ${response.status}`);
        }

        const contentType = response.headers.get('content-type') || '';
        const payload = contentType.includes('application/json') ? await response.json() : await response.text();
        const quote = extractQuote(payload);

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ quote: quote || 'Stay passionate, chase the horizon', raw: payload }));
    } catch (error) {
        console.error('[random-quote] Failed to fetch quote', error);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Failed to fetch random quote' }));
    }
};
