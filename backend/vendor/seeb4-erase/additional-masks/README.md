# Isolated visible-logo alpha masks

Repository: https://github.com/froggeric/gemini-watermark-and-synthid-remover
Pinned source commit: `37f338847c7fcdbaa1ab3f883c6a742173dd9595`
Source directory: `assets/watermark-masks/`
License: MIT; see `LICENSE.froggeric`.

Only standalone visible-logo grayscale PNG masks are downloaded here. No
SynthID, metadata-stripping, regeneration, model, CLI, or update code is used.
Each grayscale byte encodes white-overlay alpha times 255. These assets are
for evaluation against the actual 1080p clip; download does not imply that the
production worker uses them or that the resulting correction has been verified.

Upstream documents the 48px Gemini mask as the average of ten captures and
the video reference mask as an independent reference for the same profile.
