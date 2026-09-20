# 🔍 Debug Image Generation

## How to Check Which Provider is Being Used

Open your browser's **Developer Console** (F12) and watch for these logs when generating an image:

### ✅ If Puter.js is Working:
```
[Puter] SDK loaded successfully
[ImageGen] Using Puter.js (free unlimited)
```
OR
```
[ImageEngine] Using Puter.js
[ImageEngine] Image URL generated: data:image/png;base64,...
```

**Result:** No watermark, high quality ✅

---

### ❌ If Using legacy-image-provider (Fallback):
```
[ImageGen] Backend failed, using legacy-image-provider fallback
[ImageEngine] Image URL generated (legacy-image-provider fallback): https://image.legacy-image-provider.ai/...
```

**Result:** Has watermark, lower quality ❌

---

## Why Might Puter.js Fail?

### 1. **First Load**
Puter.js SDK needs to download (~1-2 seconds on first use)
```
[Puter] SDK loading...
```
**Solution:** Second image should work

### 2. **Network Error**
```
Failed to load Puter.js SDK
```
**Solution:** Check internet connection

### 3. **Browser Compatibility**
Some old browsers don't support Puter.js
**Solution:** Use Chrome, Edge, Firefox (latest)

### 4. **User Not Authenticated**
Puter.js uses user-pays model (requires account)
**Solution:** User creates free Puter account

---

## Step-by-Step Debug Process

### Test 1: Check Console Logs
1. Open Developer Console (F12)
2. Go to "Console" tab
3. Generate an image
4. Look for `[Puter]` or `[ImageGen]` logs

### Test 2: Check Network Tab
1. Open Developer Console (F12)
2. Go to "Network" tab
3. Generate an image
4. Look for:
   - `js.puter.com/v2/` (Puter.js SDK loading)
   - `api.puter.com` (Puter.js API calls)
   - `legacy-image-provider.ai` (fallback being used)

### Test 3: Force Puter.js
Open console and run:
```javascript
// Check if Puter is loaded
console.log('Puter available:', window.puter !== undefined);

// Try loading Puter manually
const script = document.createElement('script');
script.src = 'https://js.puter.com/v2/';
script.onload = () => console.log('Puter loaded!');
script.onerror = () => console.error('Puter failed to load');
document.head.appendChild(script);
```

---

## Expected Flow

### First Image Generation
```
1. User clicks "Generate"
2. Puter.js SDK starts loading (1-2s)
3. Meanwhile, falls back to legacy-image-provider
4. Image shows (with watermark)
5. Puter.js finishes loading ✅
```

### Second+ Image Generation
```
1. User clicks "Generate"
2. Puter.js already loaded ✅
3. Uses Qwen/FLUX models
4. Image shows (NO watermark) ✅
```

---

## Manual Test

### Test in Browser Console:
```javascript
// 1. Import Puter service
import('./puterImageService.js').then(async (puter) => {
  
  // 2. Check availability
  const available = await puter.isPuterAvailable();
  console.log('Puter available:', available);
  
  // 3. Generate test image
  if (available) {
    const imageUrl = await puter.generateImageWithPuter('test image', {
      model: 'flux-dev',
      quality: 'high'
    });
    console.log('Generated:', imageUrl);
    
    // 4. Display in page
    const img = document.createElement('img');
    img.src = imageUrl;
    document.body.appendChild(img);
  }
});
```

---

## Common Issues & Fixes

### Issue 1: "Still seeing legacy-image-provider watermark"
**Cause:** Puter.js not loading or failing
**Check:**
```javascript
console.log(window.puter); // Should show object, not undefined
```
**Fix:** Wait 2-3 seconds after page load, try again

### Issue 2: "Puter is undefined"
**Cause:** SDK failed to load
**Check Network Tab:** Look for `js.puter.com` request status
**Fix:** Check firewall/ad blocker blocking Puter.js

### Issue 3: "Image quality still low"
**Cause:** Using legacy-image-provider fallback
**Check Console:** Should see `[ImageGen] Using Puter.js`
**Fix:** Clear cache, reload page, try again

### Issue 4: "Text not rendering properly"
**Cause:** Not using Qwen model for text
**Check Console:** Should see `model: 'qwen-image'` for text prompts
**Fix:** Include keywords like "text", "poster", "banner" in prompt

---

## Success Indicators

### ✅ Puter.js Working:
- Console shows: `[Puter] SDK loaded successfully`
- Console shows: `[ImageGen] Using Puter.js`
- Image has NO watermark
- Image quality is high
- Text renders clearly (if text prompt)

### ❌ Fallback Mode:
- Console shows: `legacy-image-provider fallback`
- Image has small watermark at bottom
- Image quality is medium
- Text might be blurry

---

## Provider Comparison

| Feature | Puter.js | legacy-image-provider |
|---------|----------|--------------|
| **Watermark** | ❌ None | ✅ Yes |
| **Quality** | High (1024×1024) | Medium |
| **Speed** | 3-8 seconds | 2-5 seconds |
| **Text Rendering** | Excellent (Qwen) | Poor |
| **Cost** | Free (user-pays) | Free |
| **Prompt Aware** | ✅ Yes | ❌ No |

---

## Force legacy-image-provider (Testing Only)

If you want to test legacy-image-provider fallback:
```javascript
// Disable Puter.js temporarily
window.puter = undefined;

// Now generate image - will use legacy-image-provider
```

---

## Get Help

If Puter.js still not working:

1. **Check Browser Console** - Copy all errors
2. **Check Network Tab** - Look for failed requests
3. **Check Browser** - Use latest Chrome/Edge/Firefox
4. **Clear Cache** - Hard refresh (Ctrl+Shift+R)
5. **Disable Extensions** - Ad blockers might block Puter.js

---

## Next Steps After Deployment

1. Open https://blackaing.vercel.app
2. Open Developer Console (F12)
3. Generate an image
4. Check console logs
5. Share logs if issue persists

Expected: `[ImageGen] Using Puter.js (free unlimited)` ✅
