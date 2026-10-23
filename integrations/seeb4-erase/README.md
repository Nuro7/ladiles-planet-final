<p align="center">
  <img src="https://seeb4erase.seeb4coding.in/assets/logo-seeb4erase-removebg-preview.png" alt="SEEB4 Erase — see it, remove it, perfect it" width="320">
</p>

<h1 align="center">SEEB4 Erase</h1>

<p align="center">
  <b>Remove Gemini watermarks instantly — 100% free.</b><br>
  Nothing is uploaded: your photo or video never leaves your device, because the whole
  conversion happens in your own browser. No account, no queue, no server, no AI.
</p>

<p align="center">
  <a href="https://seeb4erase.seeb4coding.in"><img alt="Live demo" src="https://img.shields.io/badge/demo-seeb4erase.seeb4coding.in-4f21e6"></a>
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-6d35f5"></a>
  <img alt="No build step" src="https://img.shields.io/badge/build%20step-none-8f6bff">
  <img alt="Runs offline" src="https://img.shields.io/badge/network-never-231f20">
  <a href="https://seeb4coding.in"><img alt="seeb4coding.in" src="https://img.shields.io/badge/by-seeb4coding-231f20"></a>
</p>

<p align="center">
  <b>Demo: <a href="https://seeb4erase.seeb4coding.in">seeb4erase.seeb4coding.in</a></b><br>
  <sub>The hosted page is the same static files. Your photo or video is still processed
  entirely in your own browser — the server only delivers the page.</sub>
</p>

---

**Open `index.html` in Chrome or Edge. That's the whole install.** No build step, no server,
no Python, no network. HTML + Tailwind + JavaScript, with everything vendored locally. Your
files never leave the machine — there is no code path in this project that sends one anywhere.

It is a from-scratch implementation of the technique the existing browser-based Gemini
watermark removers use: none of their code is used here, but the settings panel and network
tab of the closest one — *the reference tool* below — are what the maths that follows was
checked against, and it is referred to throughout for exactly that reason. Where this project
reaches a different answer, the measurement that settled it is shown.

## What these watermark removers actually do

Despite the "Gemini Omni" branding, **there is no AI in this tool.** Google renders the
frame, then blends a semi-transparent sparkle on top:

```
frame = α·overlay + (1−α)·original
```

That is one linear equation per pixel, and it inverts exactly:

```
original = (frame − α·overlay) / (1−α)
```

No inpainting model, no diffusion net, no guessing — the original pixels are still in the
file, just scaled and offset.

That panel and network tab give away the rest of the stack, and this project uses the same
pieces:

| Reference tool | Here |
|---|---|
| Canvas API for pixels | same |
| WebCodecs for video frames | same |
| `mp4box.all.min.js` to demux | [same library](vendor/mp4box.all.min.js), from npm |
| `mp4-muxer.min.js` to remux | [same library](vendor/mp4-muxer.min.js), from npm |
| Grey mask + "OVERLAY LUMA" | same — mask luma *is* α |

Its `bg_48.png` turned out to be the mask itself: a 48×48 greyscale sparkle, flat at
luma 129 (α ≈ 0.506) inside, 0 outside, antialiased between.

**That measured mask is what this project blends against**, carried as 2 KB of base64 in
[seeb4-erase.js](seeb4-erase.js) rather than a file to fetch, so it still works opened off the
filesystem. A parametric stand-in is also generated — a four-pointed star with concave
circular-arc edges, fitted to 0.006 mean α error (r = 0.9986) — and it is close enough to
*find* the mark just as well, but not to *remove* it as well. A scalar α gain cannot correct
a shape error, so the drawn shape floors removal near 94% however perfectly α is solved,
where the measured one reaches 99%. It stays available under WATERMARK LOGO as the one
option that assumes nothing about the 2026 sparkle.

### Measured from real Gemini output

A solid-black Gemini image (768×1376) pins the mark down exactly:

| | value |
|---|---|
| mark size | **48×48 px** — *fixed*, not scaled with resolution |
| peak pixel | `rgb(129,129,129)` → **α = 129/255 = 0.5059** |
| inset | 73 px from the right and bottom edges |
| bbox fill | 38.0% (the generated stand-in: 38.5%) |

A 1280×720 Gemini **video** carries the same 48 px mark, at (1136, 576) — inset 96 px
rather than 73. So the size is constant across images and video while the inset is not,
which is why the position is detected rather than assumed.

The 48 px agreeing exactly with the 48 px asset is why this project treats the mark as a
fixed-size sprite. A proportional model built on the widely-quoted "96 px at 1280×720"
predicts 102 px on that frame — more than twice too large, which is exactly the kind of
default that makes a tool look broken. Auto-detection finds **48 px at (647,1255), score
0.982** on that file unaided.

## Four things this does better

The reference tool's panel exposes its own limits, and they were worth fixing rather than
copying. The fourth is that its **α presets are not a menu here** — see BASE STRENGTH below
and the *Custom α gain* box, which covers the values 1.0 and 0.62 leave out.

**1. The mark is found anywhere in the frame, at a measured size.** The reference anchors to
a corner. Real output doesn't always oblige — one 768×1376 image had its mark at y≈901
rather than the corner's y=1255, and a corner-limited search simply cannot find that,
which forces manual placement on every file. So the search covers the whole frame, by
matched-filtering the mask's shape against high-pass detail. It lands pixel-exact in the
middle of a frame, at the top-left, and off-centre, scoring 0.95–0.99. The size is then
refined to the exact integer, which is not cosmetic: 46 px instead of 48 left a brightest
residue of 95/129 luma versus 45/129.

Getting there took three real corrections, all of them the same mistake in different
clothes — **Pearson correlation is not comparable across window sizes.** A smaller window
has fewer samples, so chance alignment scores higher. Maximising it collapsed every search
to the smallest size allowed (every mark "found" as 12 px), and let a double-size probe
latch onto unrelated bright structure and win. Candidate sizes are now scored over one
*fixed* window, which also punishes a too-large mask for predicting mark structure where
the frame has none. A 5×5 high-pass was also throwing away most of the shape — it reduces
a 48 px flat-interior mark to its outline — so the radius now scales with the mark.

A whole-frame search on its own is not enough, though, and it fails *silently*, which is
worse. With the real 48 px mark recomposited over a 19×29 px grid pattern — what tiles,
fabric and foliage all look like to a matched filter — the search picked the **opposite
corner of the frame**, 1815 px away, scoring 0.466 against the correct placement's 0.428.
Removal went from 97.9% to 0.0%, and the α solver then happily "succeeded" on empty
background with gain 0.07, so no part of the tool reported a problem.

The rescue is that the false match beat the truth by only **0.038**, while a mark genuinely
away from the corner beats the corner placement by **0.3–0.9**. That gap makes a margin rule
safe: the roaming winner must be at least 0.10 better than the reference corner inset before
it is believed, and otherwise the corner wins.

| scene (mark at the corner) | before | after |
|---|---|---|
| busy 19×29 px grid | 0.0% removed, box 1815 px away | **97.4%**, exact box |
| dense foliage | off by 2 px | **exact** |
| black / flat / gradient / photo | 98–99% | unchanged |

Marks that really are off-corner still roam freely — verified at y=901, dead centre, and
top-left, plus both video insets of 96 px, all found pixel-exact. And when *nothing* in the
frame correlates above 0.30, the tool now says so ("nothing in this frame looks like the
mask — place it by hand") instead of quietly cleaning the wrong 48×48 square.

**2. α is solved, not picked from two presets.** The reference offers "Auto-pick (1.0 vs 0.62)".
Instead, under-correction leaves a bright mark that correlates *positively* with the mask
and over-correction leaves a dark one that correlates negatively, so the signed
correlation crosses zero at the true α — bisect it. Recovers 1.00 → 0.999, 0.62 → 0.618,
and 0.77 → 0.769, a value neither preset covers.

**3. The quality metric means something.** "WARN IF PEARSON R ≤ 0.35" never says which
correlation. Two plausible readings both fail: raw before/after luma scores ~0 on a
*flawless* removal (removing a mark is supposed to change brightness), and correlating
high-pass detail also scores low, because the input contains the mark's silhouette as a
strong edge the output correctly lacks. Correlation is also scale-invariant, so a 2-byte
codec ripple scores as badly as a 50-byte ghost. So this reports **what fraction of the
mark's amplitude was removed**, by regressing luma on the mask before and after.

That regression has to be **band-passed at the mark's own scale**, and getting this wrong
was itself a bug. Run on raw luma, it charges the score for whatever the background happens
to do under the mark: the recovered pixels still carry the real scene, and the part of the
scene that happens to align with the sparkle is counted as leftover mark. It was not merely
pessimistic but *non-monotonic* — a genuinely better removal could score lower than a worse
one. Measured against a synthetic frame whose original is known:

| | true removal | raw score | band-passed score |
|---|---|---|---|
| measured mask, α solved | 98.4% | 92.9% | **98.8%** |
| generated mask, α solved | 92.7% | 94.1% | 94.9% |
| BASE STRENGTH 1.3 (wrong) | 20.8% | −5.5% | **17.1%** |
| α pinned to 0.62 (wrong) | 45.2% | 43.7% | **42.3%** |

Row 2 is the non-monotonicity, in one line: the raw score ranks the generated mask *above*
the measured one (94.1% vs 92.9%) when it is in fact 5.7 points worse.

So the number now tracks the truth on good runs *and* still collapses on bad ones. The
default warning threshold is 85%, not the reference tool's 0.35 — that number belongs to a
differently-defined metric and would mean nothing here.

The metric earned its keep immediately: it caught a bug where pinning a position without a
size made the search return a size measured at a *different* position, quietly dropping
video from 90% to 35% removed.

## Video does not carry a 48 px mark

The "size is fixed at 48 px" rule holds for stills and breaks for video, and a real
1920×1080 clip settles it. Averaging 60 frames isolates the mark cleanly — it is static, so
the moving scene averages away — and what is left measures **72 px at an inset of 142/143**,
against 48 px at inset 96 measured at 1280×720:

| | mark size | inset | size ÷ height | inset ÷ height |
|---|---|---|---|---|
| 1280×720 video | 48 px | 96 | 0.0667 | 0.1333 |
| 1920×1080 video | **72 px** | **143** | 0.0667 | 0.1333 |
| 1536×2752 still | 48 px | 89 | — | — |

Both video ratios are identical, so 1080p output looks like a canonical 720p render
upscaled 1.5×, watermark included. Stills do not do this.

This was a total failure, not a near miss. Under a 48 px filter the correct 1080p location
scores **0.100**, so the search could not see it — it reported a spot **1607 px away** with a
confident-looking 0.454, on every frame. The fix is to seed the position search at each
plausible scale (48 px and `48 × height/720`) and let `fitScore`'s fixed evaluation window
rank them, which is the cross-size comparison it was written to make fair. Detection now
lands **pixel-exact at (1704, 864), 72 px, scoring 0.87–0.91** on all four frames tested.
The corner priors gained the video geometry too, whose inset is twice the mark size.

Cost is one extra full-frame pass: ~0.3 s → ~1.6 s at 1080p, once per file, cached
afterwards.

## The mark has a dark outline, and black samples cannot see it

Turn **MARK OUTLINE** on if the cleaned output still shows a dark sparkle traced where the
mark was. It is off by default, and both facts need explaining.

The overlay is not one colour. On the same 1080p clip, the band just outside the sparkle's
core sits ~10 luma **darker** than its surroundings, and where the shipped mask reads a faint
alpha of 0.02–0.20 the real pixels are 20–30 luma darker. Treating those as faint *white* and
subtracting `α·255` drives them darker still — which is precisely the black outline left
behind. So `unblendRegion` now takes a per-pixel overlay colour, and the mask can carry one.

**No black-background sample can ever reveal this.** Over black, `f = α·0 + (1−α)·0 = 0` —
a black outline is indistinguishable from no mark at all. `bg_48.png` was measured on solid
black, so the shipped alpha map was always going to be missing it, however carefully measured.

Fitted on four real frames, a 7 px band (fraction of the mark, so it scales) at α 0.20 with
the core taken as α ≥ 50% of peak cuts the leftover by **60%** — residual 46.1 → 18.6. The
two layers compose *premultiplied* rather than the outline overwriting the sparkle's colour;
letting it overwrite took the black sample's brightest leftover from 2.3 to 12.3, because
over black the band should recover to exactly zero and `f/(1−α)` does not.

It is off by default because the same blind spot means the tool cannot tell which files have
one, and applied to a mark without an outline it over-corrects hard — 98% → 72% true removal
on a synthetic frame composited without one. **Deciding it automatically was tried and
abandoned:** solving the outline's alpha by regressing the cleaned band against the band's own
profile chose 0.00 on the four frames that demonstrably need 0.20, and 0.32 on the black
sample where the outline is invisible — backwards in both directions. A switch the user throws
when they can see the problem beats a solver that is confidently wrong.

## BASE STRENGTH must be 1.00

Worth stating on its own, because for a while the default was 1.10 and it was quietly the
single largest source of leftover watermark.

The applied α is `mask × gain × strength`. OPACITY on *auto* solves for the gain that zeroes
the residual **assuming strength 1.0** — so any other strength scales the solver's answer
straight back off the optimum by exactly that factor. At 1.10 the correction overshoots 10%,
which flips the residual's sign and leaves a faint *dark* sparkle instead of a bright one:

| BASE STRENGTH | true removal |
|---|---|
| 1.10 | 82.9% |
| **1.00** | **92.7%** |

(both with the generated mask, to isolate the one variable). The panel's own
"BASE STRENGTH is not 1.00" warning was firing on the shipped default, and it was right.
The 1.10 was justified as compensating for the generated mask being approximate, citing a
"~0.049 mean α difference" — measured against the real mask that difference is 0.006, so
the fudge was correcting an error an order of magnitude smaller than itself. Shipping the
measured mask removes even that pretext.

Saved settings from before this change are reset on first load, because a stored 1.10 would
otherwise silently override the new default.

## Using it

1. **Drop a file.** Position, size and α are measured automatically, anywhere in the frame.
2. **Check the preview.** ORIGINAL vs CLEANED, with the treated box outlined. The readout
   shows `α≤`, luma levels left, and % removed.
3. **Leave the sliders alone.** They exist to match the reference panel, but OPACITY on *auto*
   already solves α, so **BASE STRENGTH at anything other than 1.00 can only make the result
   worse** — see above. If a result looks wrong, fix the **position and PX size**, not the
   strength.
   If you do want to drive α by hand, OPACITY has a **Custom α gain…** box rather than only
   the reference's two presets. It opens at whatever the solver last reported, and shows the peak α
   that gain works out to, since a gain is not an α: the applied peak is `0.506 × gain`.
4. **Fix placement if auto-fit missed.** Click a preview to move the mark, type X/Y/PX,
   nudge by 1/10 px, or press **Auto** to re-measure. Watch % removed as you go.
   **Lock** keeps a hand-placed mark across files of the same size, so a batch that needs a
   manual fix needs it once rather than once per file.
5. **Apply & download.** Images save as lossless PNG; video as MP4 with the audio copied.

### Calibrate — no longer required, still useful

This used to be the only way to get an exact mask. It isn't any more: the measured mask
ships as the default, which is where most of the old gap went.

| mask | mark removed | brightest leftover pixel |
|---|---|---|
| generated stand-in | 99.1% | 44.6 / 129 luma |
| **measured (now the default)** | **99.9%** | **0.9 / 129 luma** |

Calibrating still earns its place when the mark is *not* the sparkle this ships — a different
logo, a resized or recoloured variant, or whatever replaces it next. It measures α from your
own output instead of trusting anything above.

**One solid-black sample is enough.** Ask the generator for `a completely solid pure black
image`, save the watermarked result as **PNG**, and drop it into **Calibrate**. Over black
the composite collapses to `f = α·255`, so α falls out exactly — measured residual on real
output was 0.03 bytes. The panel then adopts the measured mask, size and position.

For a non-black background you need a second, clearly different tone (e.g. solid mid-grey):
per pixel `f = α·c + (1−α)·o` is a line in the background value, so two tones separate α
from the mark's colour. Watch the **fit residual** either way — under ~0.5 bytes means the
fitted overlay reproduces your samples almost exactly. Use PNG; JPEG noise blurs α.

## Limits worth knowing

- **Opaque cores can't be recovered.** Where α approaches 1, dividing by `1−α` amplifies
  8-bit rounding into speckle. Past BLEND CEILING those pixels are filled by diffusing
  their neighbours inward — a plausible fill, not the truth. Gemini's mark sits near
  α 0.5, so this rarely triggers.
- **Video is approximate, and re-encoded.** Chroma subsampling and compression mean the
  stored pixels aren't the exact composited values, so ~93% removal on a real 1280×720 clip
  rather than an image's ~99%; a deliberately harsh low-bitrate clip can drop to ~77%, where
  the warning firing is the correct behaviour. Changed pixels also mean changed compressed
  data — no tool can avoid that. Raise VIDEO BITRATE × for high-motion clips.
- **Audio is copied packet-for-packet and never decoded** — but tracks must start at
  timestamp zero, and real clips don't always oblige. One sample's video began 83 ms after
  its audio. Rebasing each track to its own start would slide the audio against the picture,
  so the video is rebased to its own start and audio preceding the first frame is dropped
  instead: sync stays within one AAC packet (~21 ms) and the count of trimmed packets is
  reported. That gap was also the source of a genuinely misleading bug — the muxer rejected
  every chunk for a non-zero first timestamp, but an exception thrown inside a WebCodecs
  `output` callback never reaches the awaiting code, so the only visible symptom was an
  unrelated null dereference at the end. Those callbacks now capture and re-throw.
- **Auto-fit refines the size, it doesn't search wildly.** The mark is soft-edged,
  low-contrast and self-similar, so over a broad range a half- or double-size candidate can
  out-score the truth. The refinement covers roughly 0.7–1.4× the reference and is
  dependable there; a mark well outside that needs PX typed in, or a calibration, which
  measures it exactly. Narrow and reliable beats wide and wrong.
- **A white mark on white is nearly unrecoverable.** Over luma 248 the mark shifts pixels by
  only ~4 levels, so there is almost nothing to invert. The detector still finds the right
  spot, but check the reported amplitude: ~8 luma levels there versus ~200 over dark
  content. Low amplitude means little to remove and little to gain.
- **Animated GIF/WebP: one frame out, not an animation.** Animated stills are decoded
  frame by frame (via `ImageDecoder`) and the scrubber picks which frame to work on, but the
  output is a single PNG — browsers ship no GIF encoder. Frame selection matters more than
  it sounds: reading only frame 0 meant a lead-in frame handed the detector a blank image
  (luma spread 4 versus ~65 for real content), which looked exactly like broken auto
  placement. GIFs are also palette-quantised and dithered, so detection band-passes rather
  than high-passes — that lifted confidence on an 8-level dithered frame from 0.75 to 0.98.
- **Only alpha-blended overlays.** A mark burned in with multiply, screen, or a
  displacement effect isn't this equation and won't come out cleanly.
- **SynthID is untouched.** Google's invisible provenance watermark isn't an alpha overlay
  and survives. AI-generated media stays AI-generated — keep labelling it, and check your
  generator's terms for how its output may be used.
- **Chrome or Edge for video.** WebCodecs is required; images work anywhere.

## Files

| Path | Role |
|---|---|
| [index.html](index.html) | the page — UI, Tailwind, wiring |
| [seeb4-erase.js](seeb4-erase.js) | the engine: mask, detection, α solving, unblend, video pipeline |
| [Calibrate/](Calibrate/) | solid-black Gemini samples the shipped mask was measured from |
| [assets/](assets/) | brand lockup, light and dark |
| [vendor/](vendor/) | Tailwind, mp4box.js, mp4-muxer — all local |

There is no `package.json`, no bundler and no test runner, because there is nothing to build.
The engine attaches one global, `SEEB4`, and the page calls into it.

## Running it

**Nothing to install: [seeb4erase.seeb4coding.in](https://seeb4erase.seeb4coding.in)** is the
current build, live. It is the same static files served over HTTPS, so the processing still
happens in your browser and your file still never leaves your machine.

To run your own copy, any of these work — pick whichever you find least annoying:

```bash
git clone https://github.com/seeb4coding/seeb4-erase.git
cd seeb4-erase
start index.html          # Windows;  macOS: open index.html
```

- **Don't want git?** Use *Code → Download ZIP* on GitHub, unzip, double-click `index.html`.
- **Want to host it yourself?** Enable GitHub Pages on the `main` branch, root folder — the
  repo is already a static site, so it serves as-is at
  `https://seeb4coding.github.io/seeb4-erase/`, which is what
  [seeb4erase.seeb4coding.in](https://seeb4erase.seeb4coding.in) points at. Files are still
  processed locally in the visitor's browser; the host only delivers the page.
- **Offline is the normal case, not a special mode.** The mask is embedded as base64 and the
  three dependencies are vendored, so `file://` works with the network cable out.

Video needs WebCodecs, which means Chrome or Edge (or any Chromium). Images work in any
current browser.

## Contributing

Issues and pull requests are welcome at
[seeb4coding/seeb4-erase](https://github.com/seeb4coding/seeb4-erase).

The one house rule that matters here: **this project settles arguments with measurements.**
Nearly every section above exists because a plausible-sounding default turned out to be
wrong when a number was put on it. So if you change detection, α solving, the mask or the
metric, say in the PR what you measured, on what file, and what the % removed was before and
after. A change that improves a real file's score is easy to accept; a change that "should be
better" is not.

Two things make that easier:

- **Keep the accent colour in one place.** The whole UI reads Tailwind `brand-*` utilities,
  defined once in the `@theme` block at the top of [index.html](index.html). Don't hard-code
  a hex in markup.
- **Don't add a build step or a runtime dependency.** New vendored libraries go in
  [vendor/](vendor/) as a pinned local file, and the page must keep working from `file://`.

Bug reports are most useful with the frame that broke it — the reported position, size, α and
% removed, plus the input if you're able to share it.

## Credits

- **[mp4box.js](https://github.com/gpac/mp4box.js)** (BSD-3-Clause) — MP4 demuxing.
- **[mp4-muxer](https://github.com/Vanilagy/mp4-muxer)** (MIT) — MP4 remuxing.
- **[Tailwind CSS](https://tailwindcss.com)** (MIT) — the browser build, vendored.

Vendored copies keep their own licences; the MIT licence below covers this project's own code.

## Use it responsibly

Removing a watermark does not transfer any rights in the underlying work. Use this on output
you are entitled to use — your own generations, your own footage, content you have permission
for — and check your generator's terms, which may require the mark to stay. Invisible
provenance signals such as SynthID are unaffected: AI-generated media stays AI-generated, so
keep labelling it as such. Don't use it to pass off someone else's work as yours.

## License

[MIT](LICENSE) © 2026 [seeb4coding](https://seeb4coding.in) — coding meets innovation.
