# FREE PROVIDERS UPDATE - Chinese AI Providers

## Summary
Replaced Puter.js (user-pays model) with truly free Chinese AI providers as default.

---

## New Provider Priority

### Images (Truly Free)
1. **Jimeng AI** (ByteDance) ✅ Already implemented
   - Truly free for users
   - No authentication required
   - Resolution: 1024x1024
   - Speed: Fast (~3-5s)
   
2. **Z-Image Turbo** (Alibaba) ✅ NEW
   - Truly free for users
   - No authentication required
   - Model: 6B parameter S3-DiT architecture
   - Resolution: Up to 1536x1536 (recommended 1024x1024)
   - Speed: 2-5s on consumer hardware, <1s on H800
   - Best for: Photorealistic images, bilingual text (Chinese + English)
   - License: Apache 2.0 (open-source)
   - API: ModelScope (Alibaba Cloud)
   - Rate limits: ~50-100 generations/hour

### User-Pays (Optional Premium)
3. **Puter.js** (Moved to low priority)
   - User-pays model: $0.03-$0.10 per image
   - Users must sign in to Puter account
   - Priority: 50 (only used if all free providers fail)
   - Should add UI warning before use

---

## Technical Changes

### New Files Created
- `functions/src/providers/zimage.ts` - Z-Image Turbo provider implementation

### Files Modified
1. `functions/src/types.ts`
   - Added 'zimage' to ProviderId type

2. `functions/src/media/authoritativeRegistry.ts`
   - Reorganized providers by pricing model
   - Jimeng: Priority 1 (free)
   - Z-Image: Priority 2 (free)
   - Puter: Priority 50 (user-pays, fallback only)

3. `functions/src/media/engine.ts`
   - Updated fallback chain: Jimeng → Z-Image → Error
   - Removed Puter from automatic flow
   - Better error messages

4. `src/lib/imageClient.ts`
   - Backend API now first priority (uses Jimeng → Z-Image)
   - Removed Puter.js priority logic
   - Clearer user experience

5. `src/lib/aiOrchestratorBridge.ts`
   - Updated image generation to use backend first
   - Removed Puter.js from default flow
   - Simplified error handling

6. `src/lib/puterImageService.ts`
   - Added clear documentation about user-pays model
   - Header warning: "NOT free for users"
   - Pricing disclosure: $0.03-$0.10 per image

---

## Z-Image Technical Details

### Architecture
```
S3-DiT (Scalable Single-Stream Diffusion Transformer)
├─ 6 billion parameters
├─ Text tokens + Visual tokens + Image VAE in one stream
├─ Fits in 16GB VRAM (consumer GPUs)
└─ Requires only 8-9 inference steps
```

### API Flow
```
1. Submit task → POST /v1/images/generations
2. Receive task_id
3. Poll status → GET /v1/tasks/{task_id}
4. When SUCCEED → Download image
5. Convert to base64 → Return
```

### Performance
- **Speed**: 2-5 seconds typical
- **Quality**: Comparable to Stable Diffusion 3
- **Resolution**: 1024x1024 recommended, up to 1536x1536
- **Best for**: Photorealistic scenes, bilingual text

### Rate Limits
- Free tier: ~50-100 generations/hour
- Soft limits, resets periodically
- No hard blocks, just throttling

---

## User Experience Changes

### Before (Misleading)
```
User: "generate image"
  ↓
Puter.js (priority 1)
  ↓
Puter sign-in popup appears
  ↓
User surprised by charges ($0.03-$0.10)
  ↓
Poor experience, trust violation
```

### After (Transparent)
```
User: "generate image"
  ↓
Backend API (Jimeng - FREE)
  ↓ if fails
Z-Image (Alibaba - FREE)
  ↓ if both fail
Error: "All free providers unavailable"
```

### Future (With Puter as Premium Option)
```
User: "generate image"
  ↓
Try Jimeng (free)
  ↓ if fails
Show choice:
  ⚪ Try again (free)
  ⚪ Use Premium (Puter, $0.03-$0.10) ← Requires consent
```

---

## Benefits

### For Users
- ✅ Truly free image generation
- ✅ No sign-in required
- ✅ No unexpected charges
- ✅ Transparent experience
- ✅ High quality images (Alibaba tech)

### For Developers
- ✅ No backend costs
- ✅ No API keys to manage
- ✅ Two free providers (redundancy)
- ✅ Open-source model (Z-Image)
- ✅ Better trust with users

---

## Testing Checklist

- [ ] Deploy to Firebase Functions
- [ ] Test Jimeng generation (should work, already tested)
- [ ] Test Z-Image generation (new provider)
- [ ] Verify fallback: Jimeng fail → Z-Image
- [ ] Verify error: Both fail → Clear message
- [ ] Check console logs show correct provider
- [ ] Verify no Puter.js auto-trigger
- [ ] Test image quality (1024x1024)
- [ ] Test with text-heavy prompts (Z-Image excels)
- [ ] Monitor rate limits

---

## Next Steps

### Immediate
1. Deploy and test Z-Image provider
2. Monitor success/failure rates
3. Adjust timeouts if needed (currently 60s)

### Short-term
1. Add UI toggle for "Premium Quality" (Puter)
2. Show cost disclosure before Puter usage
3. Add provider selection in settings
4. Add generation history/stats

### Long-term
1. Search for more free Chinese providers
2. Implement Tencent Hunyuan (20 free/day)
3. Add image upscaling (separate service)
4. Add style transfer options
5. Build capability engines for other domains

---

## Documentation References

- Z-Image GitHub: https://github.com/Tongyi-MAI/Z-Image
- Z-Image API Guide: https://apidog.com/blog/free-z-image-api/
- ModelScope API: https://api-inference.modelscope.cn/
- Puter Pricing: https://developer.puter.com/pricing/
- Jimeng (Existing): ByteDance reverse-engineered API

---

## Lessons Learned

### Pricing Transparency
- **Never** claim a service is "free" without checking who pays
- **Always** disclose user-pays models upfront
- **Test** billing flows before deploying to users

### Provider Research
- Chinese AI companies (ByteDance, Alibaba, Tencent) offer truly free tiers
- Open-source models (Z-Image, Hunyuan) have no usage fees
- Reverse-engineered APIs (Jimeng, Kling) work but may be unstable

### Architecture
- Backend API abstraction allows easy provider swaps
- Priority-based fallback prevents single point of failure
- Client-side generation (Puter) creates billing confusion

---

## Status

✅ **Jimeng** - Implemented, tested, working
✅ **Z-Image** - Implemented, needs deployment testing
❌ **Puter** - Demoted to low priority (user-pays disclosure needed)
⬜ **Tencent Hunyuan** - Future addition (20 free/day)
⬜ **Seedance 2.0** - Future addition (video, limited free tier)

---

## Conclusion

BLACK AI now uses **truly free** Chinese AI providers by default:
1. Jimeng AI (ByteDance)
2. Z-Image Turbo (Alibaba)

This gives users:
- Free image generation
- No unexpected charges
- High-quality results
- Transparent experience

Puter.js remains available as optional premium upgrade (with cost disclosure).
