# Vendored visible-logo engine

The unchanged `seeb4-erase.js` is from the MIT-licensed
[seeb4coding/seeb4-erase](https://github.com/seeb4coding/seeb4-erase) repository,
pinned to commit `e68a578b4a6bfdd35db2b069f1525859792c86f7`.
`SOURCE.json` records its SHA-256. Keep `LICENSE` with redistributed copies.

The backend worker uses only its visible-logo mask detection and reverse-alpha
blending math. The local adapter then smooths a sparse two-pixel logo-contour
band to reduce compression ringing; this is not a whole-rectangle blur and can
soften details that cross the contour. It does not use the upstream browser UI, video muxer, network
services, or invisible-watermark removal. No Python or browser is required for
this processing step. The existing FFmpeg installation decodes and encodes the
video, copying the original audio track and supported container metadata.

Re-encoding is not lossless and unsupported/private MP4 metadata boxes cannot be
guaranteed to survive remuxing. Originals are retained. This is **not** a tool for
removing SynthID, proving human authorship, or restoring pixels lost during
generation/compression. Inspect outputs before sharing them.

Updates are manual: audit the upstream change, update the pinned file/license
and manifest, then rerun the tests and compare real video frames.
