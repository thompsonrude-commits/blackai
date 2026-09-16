// Serverless function to fetch URL content (bypasses CORS)
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log('Fetching URL:', url);

    // Fetch the URL from server-side (no CORS restrictions)
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    const charset = contentType.match(/charset=([^;]+)/i)?.[1]?.trim() || 'utf-8';
    const bytes = await response.arrayBuffer();
    let html;
    try {
      html = new TextDecoder(charset).decode(bytes);
    } catch {
      html = new TextDecoder('utf-8').decode(bytes);
    }

    // Simple HTML parsing - remove scripts, styles, extract text
    let content = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Fall back to a text reader for sites that return an anti-bot page to
    // server-side requests (common with older educational websites).
    const looksBlocked = /incapsula|_Incapsula_Resource|access denied|robot check/i.test(content);
    if (content.length < 100 || looksBlocked) {
      const readerUrl = `https://r.jina.ai/http://${new URL(url).host}${new URL(url).pathname}${new URL(url).search}`;
      const readerResponse = await fetch(readerUrl, {
        headers: {
          Accept: 'text/plain',
          'User-Agent': 'BLACK-AI-URL-Extractor/1.0'
        }
      });
      if (readerResponse.ok) {
        content = (await readerResponse.text()).trim();
      }
    }

    content = content
      .replaceAll('â€™', '’')
      .replaceAll('â€œ', '“')
      .replaceAll('â€', '”')
      .replaceAll('â€“', '–')
      .replaceAll('â€”', '—')
      .replaceAll('Â ', ' ')
      .replaceAll('Ã©', 'é')
      .replaceAll('Ã¨', 'è')
      .replaceAll('Ã¬', 'ì')
      .replaceAll('Ã²', 'ò')
      .replaceAll('Ã¹', 'ù')
      .replaceAll('Ã¡', 'á')
      .replaceAll('Ã³', 'ó')
      .replaceAll('Ãº', 'ú')
      .replaceAll('â€¦', '…');
    content = content
      .replace(/ï¿½/giu, '')
      .replace(/\uFFFD/g, '')
      .replace(/\bvb(?=\s+ugie\b)/giu, 'vb')
      .replace(/[ \t]{2,}/g, ' ');

    if (content.length < 100 || /incapsula|_Incapsula_Resource|access denied|robot check/i.test(content)) {
      throw new Error('Could not extract meaningful content from URL');
    }

    return res.status(200).json({
      success: true,
      content: content,
      length: content.length
    });

  } catch (error) {
    console.error('Fetch URL error:', error);
    return res.status(500).json({
      error: 'Failed to fetch URL',
      message: error.message
    });
  }
};
