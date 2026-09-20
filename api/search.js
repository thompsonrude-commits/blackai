// Vercel search endpoint - fetches real-time web content
// Used by chat.js to ground AI responses in current data

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).send('');

  const raw = await new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk.toString(); });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });

  let body;
  try { body = JSON.parse(raw); } catch (e) {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const { query } = body;
  if (!query) return res.status(400).json({ error: 'query required' });

  const results = await searchWeb(query);
  return res.status(200).json({ results, query });
};

async function searchWeb(query) {
  const encoded = encodeURIComponent(query);
  const results = [];

  // Try multiple search sources in parallel
  const [brave, serp, wiki] = await Promise.allSettled([
    braveSearch(query),
    serpApiSearch(query),
    wikipediaSearch(query)
  ]);

  if (brave.status === 'fulfilled' && brave.value) results.push(...brave.value);
  if (serp.status === 'fulfilled' && serp.value) results.push(...serp.value);
  if (wiki.status === 'fulfilled' && wiki.value) results.push(...wiki.value);

  return results.slice(0, 8);
}

// Google via SerpAPI (uses env var if available)
async function serpApiSearch(query) {
  const key = process.env.SERP_API_KEY || process.env.SERPAPI_KEY;
  if (!key) return null;
  try {
    const url = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${key}&num=5`;
    const r = await fetch(url, { signal: AbortSignal.timeout(6000) });
    const d = await r.json();
    if (!d.organic_results) return null;
    return d.organic_results.slice(0, 5).map(item => ({
      title: item.title,
      snippet: item.snippet,
      url: item.link,
      source: 'google'
    }));
  } catch (e) {
    return null;
  }
}

// Brave Search API (uses env var if available)
async function braveSearch(query) {
  const key = process.env.BRAVE_SEARCH_KEY || process.env.BRAVE_API_KEY;
  if (!key) return null;
  try {
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`;
    const r = await fetch(url, {
      headers: { 'Accept': 'application/json', 'X-Subscription-Token': key },
      signal: AbortSignal.timeout(6000)
    });
    const d = await r.json();
    if (!d.web?.results) return null;
    return d.web.results.slice(0, 5).map(item => ({
      title: item.title,
      snippet: item.description,
      url: item.url,
      source: 'brave'
    }));
  } catch (e) {
    return null;
  }
}

// Wikipedia search (completely free, no key needed)
async function wikipediaSearch(query) {
  try {
    const encoded = encodeURIComponent(query);
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=search&list=search&srsearch=${encoded}&format=json&srlimit=3&origin=*`;
    const searchRes = await fetch(searchUrl, { signal: AbortSignal.timeout(5000) });
    const searchData = await searchRes.json();

    if (!searchData.query?.search?.length) return null;

    const results = [];
    for (const item of searchData.query.search.slice(0, 2)) {
      try {
        const summaryUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=true&explaintext=true&titles=${encodeURIComponent(item.title)}&format=json&exsentences=4&origin=*`;
        const summaryRes = await fetch(summaryUrl, { signal: AbortSignal.timeout(5000) });
        const summaryData = await summaryRes.json();
        const pages = summaryData.query?.pages;
        if (pages) {
          const page = Object.values(pages)[0];
          if (page.extract) {
            results.push({
              title: page.title,
              snippet: page.extract.substring(0, 500),
              url: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title)}`,
              source: 'wikipedia'
            });
          }
        }
      } catch (e) { /* skip */ }
    }
    return results;
  } catch (e) {
    return null;
  }
}

module.exports.config = { api: { bodyParser: false } };
