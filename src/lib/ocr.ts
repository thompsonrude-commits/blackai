import { DEFAULT_MAX_INLINE_IMAGE_BYTES, normalizeImageForVision } from './imageNormalization';

export interface OcrResult {
  text: string;
  confidence?: number;
  provider?: string;
  language?: string;
  source?: 'tesseract' | 'api' | 'local';
}

async function preprocessImageForOcr(imageUrl: string): Promise<string> {
  const normalizedImage = await normalizeImageForVision(imageUrl, {
    maxDimension: 1600,
    maxBytes: DEFAULT_MAX_INLINE_IMAGE_BYTES,
    quality: 0.9,
  });

  if (typeof document === 'undefined') return normalizedImage.dataUrl;

  const img = new Image();
  img.src = normalizedImage.dataUrl;
  await new Promise((resolve, reject) => {
    img.onload = () => resolve(null);
    img.onerror = () => reject(new Error('Image could not be loaded for OCR preprocessing.'));
  });

  const canvas = document.createElement('canvas');
  const ratio = Math.min(1.6, 1600 / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
  canvas.width = Math.max(1, Math.round((img.naturalWidth || img.width) * ratio));
  canvas.height = Math.max(1, Math.round((img.naturalHeight || img.height) * ratio));
  const ctx = canvas.getContext('2d');
  if (!ctx) return normalizedImage.dataUrl;

  ctx.filter = 'contrast(1.25) saturate(1.2) brightness(1.05)';
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const threshold = gray > 180 ? 255 : 0;
    data[i] = threshold;
    data[i + 1] = threshold;
    data[i + 2] = threshold;
  }
  ctx.putImageData(imageData, 0, 0);

  return canvas.toDataURL('image/png');
}

async function tryTesseractOcr(preprocessedImage: string): Promise<OcrResult | null> {
  try {
    const { createWorker } = await import('tesseract.js');
    console.log('[OCR] Starting Tesseract.js worker...');
    // createWorker(lang) — OEM mode and logger options handled via second arg object in v5+
    const worker = await createWorker('eng', 1, {
      logger: (m: any) => {
        if (m.status === 'recognizing text') {
          console.log(`[Tesseract] ${Math.round((m.progress || 0) * 100)}%`);
        }
      },
    });

    console.log('[OCR] Recognizing text...');
    const { data } = await worker.recognize(preprocessedImage);
    await worker.terminate();

    const text = (data.text || '').trim();
    console.log('[OCR] Extracted text preview:', text.substring(0, 100));

    if (text) {
      return {
        text,
        confidence: (data.confidence ?? 0) / 100,
        provider: 'tesseract',
        source: 'tesseract',
      };
    }
  } catch (err) {
    console.error('[OCR] Tesseract.js failed:', err);
  }
  return null;
}

async function tryApiOcr(preprocessedImage: string): Promise<OcrResult | null> {
  try {
    const response = await fetch('/api/v1/ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: preprocessedImage, task: 'ocr', language: 'eng' }),
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) return null;

    // api/vision.js (which handles /api/v1/ocr) returns { text, description, provider, model }
    // Some older backends wrap it as { data: { text } } — handle both shapes
    const payload = await response.json().catch(() => ({})) as Record<string, any>;
    const text = (
      (typeof payload.text === 'string' ? payload.text : '') ||
      (typeof payload.data?.text === 'string' ? payload.data.text : '') ||
      (typeof payload.description === 'string' ? payload.description : '')
    ).trim();

    if (text) {
      return {
        text,
        confidence: payload.confidence ?? payload.data?.confidence,
        provider: payload.provider ?? payload.data?.provider ?? 'api',
        source: 'api',
      };
    }
  } catch {
    // ignore and continue to empty result
  }

  return null;
}

export async function detectTextInImage(imageUrl: string): Promise<OcrResult> {
  if (!imageUrl) throw new Error('An image is required for OCR');

  const preprocessed = await preprocessImageForOcr(imageUrl);
  const tesseractResult = await tryTesseractOcr(preprocessed);
  if (tesseractResult?.text) return tesseractResult;

  const apiResult = await tryApiOcr(preprocessed);
  if (apiResult?.text) return apiResult;

  return {
    text: '',
    provider: 'local',
    source: 'local',
    confidence: 0,
  };
}
