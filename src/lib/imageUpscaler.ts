/**
 * AI Image Upscaler - Real super-resolution enhancement
 * Uses AI models to genuinely improve image quality, not just resize
 */

export interface UpscaleOptions {
  scale?: 2 | 4;
  model?: 'realesrgan' | 'gfpgan' | 'codeformer';
  removeWatermark?: boolean;
}

export interface UpscaleResult {
  success: boolean;
  upscaledUrl?: string;
  upscaledBase64?: string;
  error?: string;
  originalWidth?: number;
  originalHeight?: number;
  newWidth?: number;
  newHeight?: number;
}

/**
 * Upscale image using Replicate's Real-ESRGAN (real AI enhancement)
 */
export async function upscaleImageWithAI(
  imageUrl: string,
  options: UpscaleOptions = {}
): Promise<UpscaleResult> {
  const { scale = 2, model = 'realesrgan' } = options;

  try {
    // Call our backend API which uses Replicate
    const response = await fetch('/api/v1/image/upscale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageUrl,
        scale,
        model,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[Upscaler] API error:', error);
      return {
        success: false,
        error: `Upscale API failed: ${response.status}`,
      };
    }

    const data = await response.json();

    return {
      success: true,
      upscaledUrl: data.upscaledUrl,
      upscaledBase64: data.upscaledBase64,
      originalWidth: data.originalWidth,
      originalHeight: data.originalHeight,
      newWidth: data.newWidth,
      newHeight: data.newHeight,
    };
  } catch (err) {
    console.error('[Upscaler] Failed to upscale:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown upscale error',
    };
  }
}

/**
 * Fallback: Basic bicubic upscaling (better than current implementation)
 */
export async function upscaleImageBasic(
  imageUrl: string,
  scale: number = 2
): Promise<UpscaleResult> {
  try {
    // Fetch the image
    const img = new Image();
    img.crossOrigin = 'anonymous';

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageUrl;
    });

    const originalWidth = img.width;
    const originalHeight = img.height;
    const newWidth = originalWidth * scale;
    const newHeight = originalHeight * scale;

    // Create high-quality canvas
    const canvas = document.createElement('canvas');
    canvas.width = newWidth;
    canvas.height = newHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return { success: false, error: 'Canvas context unavailable' };
    }

    // Enable high-quality image rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Apply sharpening filter before upscaling
    // Draw at 2x size with high quality
    ctx.drawImage(img, 0, 0, newWidth, newHeight);

    // Apply unsharp mask for better clarity
    const imageData = ctx.getImageData(0, 0, newWidth, newHeight);
    applyUnsharpMask(imageData, 1.5, 0.5);
    ctx.putImageData(imageData, 0, 0);

    // Convert to base64
    const upscaledBase64 = canvas.toDataURL('image/png', 1.0);

    return {
      success: true,
      upscaledBase64,
      originalWidth,
      originalHeight,
      newWidth,
      newHeight,
    };
  } catch (err) {
    console.error('[Upscaler] Basic upscale failed:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Upscale failed',
    };
  }
}

/**
 * Apply unsharp mask to enhance edges and details
 */
function applyUnsharpMask(
  imageData: ImageData,
  amount: number = 1.5,
  radius: number = 0.5
): void {
  const { data, width, height } = imageData;
  const blurred = new Uint8ClampedArray(data);

  // Simple box blur for mask
  const r = Math.ceil(radius);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let rSum = 0,
        gSum = 0,
        bSum = 0,
        count = 0;

      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const i = (ny * width + nx) * 4;
            rSum += data[i];
            gSum += data[i + 1];
            bSum += data[i + 2];
            count++;
          }
        }
      }

      const i = (y * width + x) * 4;
      blurred[i] = rSum / count;
      blurred[i + 1] = gSum / count;
      blurred[i + 2] = bSum / count;
    }
  }

  // Apply unsharp mask: original + amount * (original - blurred)
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.min(255, Math.max(0, data[i] + amount * (data[i] - blurred[i])));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + amount * (data[i + 1] - blurred[i + 1])));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + amount * (data[i + 2] - blurred[i + 2])));
  }
}

/**
 * Try to remove watermark using inpainting (requires backend)
 */
export async function removeWatermark(imageUrl: string): Promise<UpscaleResult> {
  try {
    const response = await fetch('/api/v1/image/remove-watermark', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl }),
    });

    if (!response.ok) {
      return { success: false, error: 'Watermark removal unavailable' };
    }

    const data = await response.json();
    return {
      success: true,
      upscaledUrl: data.cleanedUrl,
      upscaledBase64: data.cleanedBase64,
    };
  } catch (err) {
    return {
      success: false,
      error: 'Watermark removal failed',
    };
  }
}
