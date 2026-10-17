# Budget video finishing

The client workflow does not change. Budget now follows:

```text
Saved Flow generation -> upscaled download -> 1080p check
    -> visible corner-logo cleanup -> optional scene music
    -> final 1080p check -> client download
```

`services/studioVideoService.js` owns the gate, so both Custom and the unified
creation workflow use it. `services/watermarkService.js` starts the isolated
`scripts/clean-visible-logo.js` worker. The worker uses the pinned MIT-licensed
[SEEB4 engine](https://github.com/seeb4coding/seeb4-erase) in `vendor/seeb4-erase`.
No paid API, Python package, additional login, or visible browser is needed for
cleanup. FFmpeg must be installed, either through the existing backend package
or via `FFMPEG_PATH` on Linux.

The source download remains in `data/flow-mcp/outputs`. Only validated finished
derivatives are registered with the media endpoint. Processing failures do not
fall back to a raw video. Use **Recover** to reuse a submitted provider job
rather than pay for another generation. Cleanup runs in a separate process, with
a five-minute timeout and bounded frame memory, so the web server stays responsive.

Each finished derivative has an internal `.mp4.json` audit containing the pinned
engine version and processing statistics. This audit is not served to clients.
No invisible watermark is deliberately removed and no metadata-stripping flags
are used. FFmpeg copies supported metadata and the original audio; arbitrary
proprietary MP4 boxes may not survive re-encoding. Keep the retained source when
original provenance is required.

The engine targets a detected bottom-right white sparkle, not arbitrary logos
or large watermarks. A failed detection blocks publication instead of blurring a
large rectangle. After reverse-alpha blending, a sparse two-pixel contour band
is interpolated to reduce the compressed outline. This can soften a small detail
crossing the original logo. Detection and overlay inversion are approximate on
compressed video: an output still needs a human quality check. Portrait, longer, or newly
changed provider logos require their own live sample checks before deployment.

## Verification

From `backend`, run `node --test tests/*.test.js scripts/clean-visible-logo.test.js`.
For a local downloaded clip, call `cleanVisibleLogo(absolutePath)` from the
watermark service; it returns the validated local output path. This operation
does not create a new generation or spend provider credits.

Verified locally on the existing upscaled cat sample: 1920×1080, 96 picture
frames at 24 fps (4.00 seconds), all 31 automated tests passing. The source-file
SHA-256 stayed unchanged, and compressed AAC packet hashes matched before and
after cleanup. The processed container reports 4.04 seconds because of copied
audio timing; no picture frames were dropped. Sampled frame checks covered the
start, end, intermediate frames and the weakest reverse-blending score. Small
local softening remains where a floor seam passes beneath the former logo.

This change does not fix the separately disconnected Supabase project, provide
production access control, or establish a production-ready Linux Flow session.
