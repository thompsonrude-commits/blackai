import { getSecretValue } from './secretHelpers';

const MODEL = process.env.CLOUDFLARE_IMAGE_MODEL || '@cf/stabilityai/stable-diffusion-xl-base-1.0';

export interface CloudflareImageResult {
  imageBase64: string;
  model: string;
  provider: 'cloudflare';
}

export async function generateImage(prompt: string, width = 1024, height = 1024): Promise<CloudflareImageResult> {
  const accountId = getSecretValue('CLOUDFLARE_ACCOUNT_ID');
  const apiToken = getSecretValue('CLOUDFLARE_API_TOKEN');
  if (!accountId || !apiToken) {
    throw new Error('Cloudflare Workers AI is not configured');
  }

  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${encodeURIComponent(MODEL)}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt, width, height, num_steps: 20 }),
    signal: AbortSignal.timeout(45_000),
  });

  if (!response.ok) {
    throw new Error(`Cloudflare Workers AI returned ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || '';
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length) throw new Error('Cloudflare Workers AI returned an empty image');

  if (contentType.includes('application/json')) {
    const payload = JSON.parse(bytes.toString('utf8')) as { success?: boolean; result?: { image?: string }; errors?: Array<{ message?: string }> };
    const image = payload.result?.image;
    if (!image) throw new Error(payload.errors?.[0]?.message || 'Cloudflare returned no image');
    return { imageBase64: `data:image/png;base64,${image}`, model: MODEL, provider: 'cloudflare' };
  }

  return {
    imageBase64: `data:${contentType || 'image/png'};base64,${bytes.toString('base64')}`,
    model: MODEL,
    provider: 'cloudflare',
  };
}

export default { generateImage };
