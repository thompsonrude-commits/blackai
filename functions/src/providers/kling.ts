/**
 * Kling AI Video Provider (Kuaishou)
 * Reverse-engineered API - No API key required, uses browser cookie
 * Source: https://github.com/yihong0618/klingCreator
 */

export interface KlingVideoResult {
  videoUrl: string;
  model: string;
  taskId?: string;
  duration?: number;
}

/**
 * Generate video using Kling AI (Kuaishou)
 * Uses reverse-engineered API endpoint
 */
export async function klingVideo(
  prompt: string,
  options: {
    imageUrl?: string;
    highQuality?: boolean;
    duration?: 5 | 10;
    aspectRatio?: '16:9' | '9:16' | '1:1';
  } = {}
): Promise<KlingVideoResult> {
  const {
    imageUrl,
    highQuality = false,
    duration = 5,
    aspectRatio = '16:9',
  } = options;

  // Check for Kling cookie in environment
  const klingCookie = process.env.KLING_COOKIE;
  
  if (!klingCookie) {
    throw new Error('KLING_COOKIE environment variable not set. Please login to klingai.kuaishou.com and extract cookie.');
  }

  try {
    // Kling API endpoint (reverse-engineered)
    const endpoint = 'https://klingai.kuaishou.com/api/task/submit';
    
    const requestBody = {
      prompt,
      type: imageUrl ? 'image_to_video' : 'text_to_video',
      image_url: imageUrl,
      cfg_scale: 0.5,
      mode: highQuality ? 'pro' : 'std',
      duration,
      aspect_ratio: aspectRatio,
      camera_control: {
        type: 'none', // Can be: none, pan, tilt, zoom, etc.
      },
    };

    console.log('[KlingVideo] Submitting task:', {
      prompt: prompt.slice(0, 50),
      type: requestBody.type,
      mode: requestBody.mode,
      duration,
    });

    const submitResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': klingCookie,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://klingai.kuaishou.com/',
        'Origin': 'https://klingai.kuaishou.com',
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(30000),
    });

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      console.error('[KlingVideo] Submit failed:', submitResponse.status, errorText);
      throw new Error(`Kling API submit failed: ${submitResponse.status}`);
    }

    const submitData = await submitResponse.json();
    const taskId = submitData.data?.task_id || submitData.task_id;

    if (!taskId) {
      console.error('[KlingVideo] No task ID in response:', submitData);
      throw new Error('Kling API did not return task ID');
    }

    console.log('[KlingVideo] Task submitted:', taskId);

    // Poll for completion (Kling takes 1-3 minutes typically)
    const maxPolls = 60; // 5 minutes max
    const pollInterval = 5000; // 5 seconds
    let polls = 0;

    while (polls < maxPolls) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      polls++;

      const statusResponse = await fetch(
        `https://klingai.kuaishou.com/api/task/status?task_id=${taskId}`,
        {
          headers: {
            'Cookie': klingCookie,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://klingai.kuaishou.com/',
          },
          signal: AbortSignal.timeout(10000),
        }
      );

      if (!statusResponse.ok) {
        console.warn('[KlingVideo] Status check failed:', statusResponse.status);
        continue;
      }

      const statusData = await statusResponse.json();
      const status = statusData.data?.status || statusData.status;
      const videoUrl = statusData.data?.video_url || statusData.video_url;

      console.log(`[KlingVideo] Poll ${polls}/${maxPolls}: status=${status}`);

      if (status === 'completed' && videoUrl) {
        console.log('[KlingVideo] Video generation completed');
        return {
          videoUrl,
          model: highQuality ? 'kling-1.5-pro' : 'kling-1.5-std',
          taskId,
          duration,
        };
      }

      if (status === 'failed' || status === 'error') {
        throw new Error(`Kling video generation failed: ${statusData.message || 'Unknown error'}`);
      }

      // Continue polling if status is 'processing', 'queued', etc.
    }

    throw new Error('Kling video generation timeout after 5 minutes');

  } catch (error: any) {
    console.error('[KlingVideo] Error:', error);
    throw new Error(`Kling video generation failed: ${error.message}`);
  }
}

/**
 * Extend video to 10 seconds (if original was 5s)
 */
export async function klingExtendVideo(
  taskId: string,
  prompt: string
): Promise<KlingVideoResult> {
  const klingCookie = process.env.KLING_COOKIE;
  
  if (!klingCookie) {
    throw new Error('KLING_COOKIE environment variable not set');
  }

  try {
    const endpoint = 'https://klingai.kuaishou.com/api/task/extend';
    
    const extendResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': klingCookie,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://klingai.kuaishou.com/',
        'Origin': 'https://klingai.kuaishou.com',
      },
      body: JSON.stringify({
        task_id: taskId,
        prompt,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!extendResponse.ok) {
      throw new Error(`Kling extend failed: ${extendResponse.status}`);
    }

    const extendData = await extendResponse.json();
    const newTaskId = extendData.data?.task_id || extendData.task_id;

    // Poll for extended video (similar to main generation)
    const maxPolls = 60;
    const pollInterval = 5000;
    let polls = 0;

    while (polls < maxPolls) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      polls++;

      const statusResponse = await fetch(
        `https://klingai.kuaishou.com/api/task/status?task_id=${newTaskId}`,
        {
          headers: {
            'Cookie': klingCookie,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          signal: AbortSignal.timeout(10000),
        }
      );

      if (!statusResponse.ok) continue;

      const statusData = await statusResponse.json();
      const status = statusData.data?.status || statusData.status;
      const videoUrl = statusData.data?.video_url || statusData.video_url;

      if (status === 'completed' && videoUrl) {
        return {
          videoUrl,
          model: 'kling-1.5-extended',
          taskId: newTaskId,
          duration: 10,
        };
      }

      if (status === 'failed' || status === 'error') {
        throw new Error('Kling video extension failed');
      }
    }

    throw new Error('Kling video extension timeout');

  } catch (error: any) {
    console.error('[KlingExtend] Error:', error);
    throw new Error(`Kling video extension failed: ${error.message}`);
  }
}
