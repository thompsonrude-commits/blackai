export interface NormalizedImageResponse {
  imageUrl: string;
  mediaUrl?: string;
  imageBase64?: string;
}

export function normalizeImageResponse(data: {
  imageUrl?: unknown;
  mediaUrl?: unknown;
  imageBase64?: unknown;
}): NormalizedImageResponse | null {
  const imageUrl = typeof data.imageUrl === 'string' ? data.imageUrl.trim() : '';
  const mediaUrl = typeof data.mediaUrl === 'string' ? data.mediaUrl.trim() : '';
  const rawBase64 = typeof data.imageBase64 === 'string' ? data.imageBase64.trim() : '';

  if (imageUrl) return { imageUrl, mediaUrl: mediaUrl || undefined, imageBase64: rawBase64 || undefined };
  if (mediaUrl) return { imageUrl: mediaUrl, mediaUrl, imageBase64: rawBase64 || undefined };
  if (!rawBase64) return null;

  const imageBase64 = rawBase64.startsWith('data:')
    ? rawBase64
    : `data:image/png;base64,${rawBase64}`;
  return { imageUrl: imageBase64, imageBase64 };
}
