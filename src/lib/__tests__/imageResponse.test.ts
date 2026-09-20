import { describe, expect, it } from 'vitest';
import { normalizeImageResponse } from '../imageResponse';

describe('normalizeImageResponse', () => {
  it('normalizes a provider URL', () => {
    expect(normalizeImageResponse({ mediaUrl: 'https://example.com/image.png' })).toMatchObject({
      imageUrl: 'https://example.com/image.png',
      mediaUrl: 'https://example.com/image.png',
    });
  });

  it('normalizes raw base64 as a data URL', () => {
    expect(normalizeImageResponse({ imageBase64: 'aGVsbG8=' })).toMatchObject({
      imageUrl: 'data:image/png;base64,aGVsbG8=',
      imageBase64: 'data:image/png;base64,aGVsbG8=',
    });
  });

  it('preserves an existing data URL', () => {
    const dataUrl = 'data:image/jpeg;base64,aGVsbG8=';
    expect(normalizeImageResponse({ imageBase64: dataUrl })?.imageUrl).toBe(dataUrl);
  });

  it('rejects malformed provider responses', () => {
    expect(normalizeImageResponse({})).toBeNull();
    expect(normalizeImageResponse({ imageBase64: '   ' })).toBeNull();
  });
});
