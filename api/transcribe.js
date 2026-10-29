// BLACK AI — Voice transcription endpoint
// Uses Groq Whisper (whisper-large-v3-turbo) for fast, accurate transcription
// Route: /api/v1/transcribe  (via vercel.json)

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Id, X-Session-Id');

  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const GROQ_KEY = process.env.GROQ_API_KEY || process.env.GROQ_KEY || process.env.VITE_GROQ_KEY;
  if (!GROQ_KEY) {
    return res.status(500).json({ error: 'API key not configured', text: '', provider: 'none' });
  }

  const startTime = Date.now();

  try {
    // Read raw body as buffer (audio file)
    const chunks = [];
    await new Promise((resolve, reject) => {
      req.on('data', chunk => chunks.push(chunk));
      req.on('end', resolve);
      req.on('error', reject);
    });

    const buffer = Buffer.concat(chunks);
    if (!buffer.length) {
      return res.status(400).json({ error: 'No audio data received', text: '' });
    }

    // Detect content type from request headers
    const contentType = req.headers['content-type'] || 'audio/webm';
    const isFormData = contentType.includes('multipart/form-data');

    let audioBuffer = buffer;
    let audioMime = 'audio/webm';
    let filename = 'audio.webm';

    // If raw audio bytes (not multipart), use directly
    if (isFormData) {
      // Extract audio from multipart — find the audio part
      const boundary = contentType.split('boundary=')[1];
      if (boundary) {
        const boundaryBuf = Buffer.from(`--${boundary}`);
        const parts = [];
        let start = buffer.indexOf(boundaryBuf);
        while (start !== -1) {
          const end = buffer.indexOf(boundaryBuf, start + boundaryBuf.length);
          if (end === -1) break;
          parts.push(buffer.slice(start + boundaryBuf.length, end));
          start = end;
        }
        // Find the part with audio data (skip headers)
        for (const part of parts) {
          const headerEnd = part.indexOf('\r\n\r\n');
          if (headerEnd !== -1) {
            const headerStr = part.slice(0, headerEnd).toString();
            if (headerStr.includes('audio') || headerStr.includes('file')) {
              audioBuffer = part.slice(headerEnd + 4, part.length - 2); // trim trailing \r\n
              if (headerStr.includes('webm')) audioMime = 'audio/webm';
              else if (headerStr.includes('mp4')) audioMime = 'audio/mp4';
              else if (headerStr.includes('wav')) audioMime = 'audio/wav';
              else if (headerStr.includes('ogg')) audioMime = 'audio/ogg';
              break;
            }
          }
        }
      }
    }

    // Determine file extension from mime type
    if (audioMime.includes('webm')) filename = 'audio.webm';
    else if (audioMime.includes('mp4')) filename = 'audio.mp4';
    else if (audioMime.includes('wav')) filename = 'audio.wav';
    else if (audioMime.includes('ogg')) filename = 'audio.ogg';
    else if (audioMime.includes('mpeg') || audioMime.includes('mp3')) filename = 'audio.mp3';

    // Build FormData for Groq Whisper
    const formBoundary = 'groq_whisper_' + Date.now().toString(36);
    const formParts = [];

    // file field
    formParts.push(
      `--${formBoundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
      `Content-Type: ${audioMime}\r\n\r\n`
    );

    // model field
    const modelPart =
      `\r\n--${formBoundary}\r\n` +
      `Content-Disposition: form-data; name="model"\r\n\r\n` +
      `whisper-large-v3-turbo`;

    // response_format field
    const formatPart =
      `\r\n--${formBoundary}\r\n` +
      `Content-Disposition: form-data; name="response_format"\r\n\r\n` +
      `json`;

    const closePart = `\r\n--${formBoundary}--\r\n`;

    const bodyParts = [
      Buffer.from(formParts[0], 'utf8'),
      audioBuffer,
      Buffer.from(modelPart + formatPart + closePart, 'utf8'),
    ];
    const formBody = Buffer.concat(bodyParts);

    const resp = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_KEY}`,
        'Content-Type': `multipart/form-data; boundary=${formBoundary}`,
      },
      body: formBody,
      signal: AbortSignal.timeout(45000),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      console.error('[Transcribe] Groq Whisper error:', resp.status, errText.slice(0, 200));
      return res.status(503).json({
        error: 'Transcription failed',
        text: '',
        provider: 'groq',
        model: 'whisper-large-v3-turbo',
        latencyMs: Date.now() - startTime,
      });
    }

    const data = await resp.json();
    const text = (data.text || '').trim();

    console.log('[Transcribe] Success, chars:', text.length, 'latency:', Date.now() - startTime, 'ms');

    return res.status(200).json({
      text,
      provider: 'groq',
      model: 'whisper-large-v3-turbo',
      latencyMs: Date.now() - startTime,
    });

  } catch (err) {
    console.error('[Transcribe] Unexpected error:', err);
    return res.status(500).json({
      error: 'Transcription error',
      text: '',
      provider: 'none',
      model: 'error',
      details: err.message,
    });
  }
};
