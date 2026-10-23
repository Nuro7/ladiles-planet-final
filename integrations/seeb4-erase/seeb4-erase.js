/* SEEB4 Erase -- browser engine.
 *
 * Reverse alpha blending, in the browser, with the same stack the existing
 * browser-based removers use:
 * Canvas for pixels, WebCodecs for video frames, mp4box.js to demux and
 * mp4-muxer to remux. No network, no model.
 *
 *   frame    = a*overlay + (1-a)*original          <- what the generator did
 *   original = (frame - a*overlay) / (1-a)         <- what we do
 *
 * The mask is greyscale: luma encodes alpha directly (the reference tool's "grey mask
 * path", with OVERLAY LUMA supplying the mark's colour separately). Effective
 * alpha per pixel is
 *
 *   a = min(luma/255 * opacity * baseStrength, blendCeiling)
 *
 * Classic script, no modules, no fetch of assets -- so this works opened
 * straight off the filesystem.
 */
(function (global) {
  "use strict";

  /* ------------------------------------------------------------------ config */

  // Defaults and ranges mirror the reference tool's settings panel.
  var DEFAULTS = {
    /*
     * MARK OUTLINE. Off by default, and that default is a deliberate choice
     * rather than a guess about which is better.
     *
     * The outline is real -- it is measurably there on 1080p video and switching
     * this on cuts the leftover by 60% (see strokedMask). But it cannot be
     * detected from the shipped alpha map, because that map was measured on solid
     * black where a black outline is algebraically invisible. So there is no way
     * to tell from the mask whether a given file has one.
     *
     * Applied to a mark that has no outline it over-corrects badly: on a synthetic
     * frame composited without one, true removal fell from 98% to 72%. Defaulting
     * it on would trade a verified-good case for an unverified one.
     *
     * Deciding it automatically was tried and does not work. Solving the outline's
     * alpha by regressing the cleaned band against the band's own profile picked
     * 0.00 on the four real 1080p frames that demonstrably need 0.20, and 0.32 on
     * the black sample where the outline cannot be seen at all -- exactly backwards
     * in both directions. Shipping that would be worse than shipping nothing, so
     * this stays a switch the user throws when they can see an outline left behind.
     */
    stroke: false,
    strokeAlpha: null,      // null = use the fitted STROKE.alpha
    maskScale: 1.0,         // MASK SIZE x        0.5 .. 3.0
    // Must be 1.00, and this is measured rather than a matter of taste.
    //
    // OPACITY "auto" solves for the gain that zeroes the residual *assuming
    // strength 1.0*, and the applied alpha is mask * gain * strength. So any
    // strength other than 1.00 walks the solver's answer straight back off its
    // optimum, by exactly that factor.
    //
    // This defaulted to 1.10 for a while, justified as compensation for the
    // generated sparkle being only an approximation of the shipped mask (a
    // "~0.049 mean alpha difference" that was never true -- measured against the
    // real mask it is 0.006, with r = 0.9986). The cost was not small: on a
    // synthetic frame with a known original, strength 1.10 removed 82.9% of the
    // mark where 1.00 removed 92.7%. The panel's own "BASE STRENGTH is not 1.00"
    // warning was firing on the default, and it was right.
    baseStrength: 1.0,      // BASE STRENGTH      0.5 .. 2.0
    /*
     * OPACITY. "auto" | number, where a number is a *gain* on the mask, not an
     * alpha: applied peak = mask peak (0.506) x gain. So this default asks for a
     * peak alpha of about 0.291 -- a deliberately softer correction than the
     * measured 0.506, chosen because it holds up better on the pale-background
     * frames where a full-strength inversion rings.
     *
     * "auto" solves the gain per file and is still the setting that scores best
     * on ordinary content, so it stays one pick away in the panel.
     */
    opacity: 0.575,         // OPACITY            "auto" | number
    opacityChoices: [1.0, 0.62],
    blendCeiling: 0.99,     // BLEND CEILING      0.5 .. 1.0
    overlayLuma: 255,       // OVERLAY LUMA       200 .. 255
    edgeDiffusion: "auto",  // EDGE DIFFUSION     "auto" | "on" | "off"
    diffusionStrength: 0.6, // DIFFUSION STRENGTH 0.1 .. 1.0
    dilationRadius: 2,      // DILATION RADIUS    0 .. 5 px
    maxDiffusionPasses: 120,// MAX DIFFUSION      10 .. 200
    bitrateScale: 1.0,      // VIDEO BITRATE x    0.5 .. 3.0
    // Warn when less than this fraction of the mark's amplitude was removed.
    // The reference tool defaults its own correlation control to 0.35, but that
    // number belongs to a differently-defined metric, so it would not mean anything
    // here. Images land around 98%; lossy video bottoms out near 90% because
    // compression smears the mark's edges, so 0.85 leaves video headroom while
    // still catching real failures decisively (a wrong gain scores ~37%).
    warnQuality: 0.85,      // WARN IF REMOVED <=  0.1 .. 0.99
    position: null          // {x, y} top-left of the mask box, null = auto
  };

  // Geometry of the Gemini sparkle, measured from the 48px mask the reference ships:
  // a four-pointed star whose concave edges are circular arcs centred on the
  // diagonals. Fitted c/extent reproduce it to ~0.012 mean coverage error.
  var SPARKLE = { corner: 1.2, extent: 1.12, peakAlpha: 129 / 255 };

  /**
   * The real mask, measured rather than drawn: 48x48 alpha bytes, base64.
   *
   * Taken from Calibrate/bg_48.png -- solid-black Gemini output, where the
   * composite collapses to f = alpha*c so alpha is just luma/255 with c white.
   * Peak byte is 129, i.e. alpha 0.5059, matching every sample measured.
   *
   * This is the default mask, and the reason matters. `sparkleMask` is a good
   * fit but not an exact one, and the gap sets a hard floor on removal: on a
   * synthetic frame whose original is known, the generated shape tops out near
   * 94% removed no matter how well the gain is solved, because a scalar gain
   * cannot fix a shape error. The measured mask reaches 99.3%. Same solver, same
   * settings -- the mask was the ceiling.
   *
   * Bytes at or below 2 were zeroed. They are PNG/codec residue scattered evenly
   * across the whole tile (1025 pixels at exactly 1), not alpha: at alpha 0.004
   * the correction is under one 8-bit level, so keeping them only dirties clean
   * pixels outside the mark and drags them into `touched`.
   */
  var GEMINI_MASK_48 =
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAABxcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
    "AAAAAAAAAAAAAAAAAAAAACGAgCAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
    "AAAAAAAAAAAAAEiAgEgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
    "AAAAAHCAgHgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIICA" +
    "gIAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUICAgIBgAAAA" +
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAAAAAAAAAAAAAAAAARgICAgICAEAAAAAAAAAAA" +
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAAAAABQgICAgICAUQAAAAAAAAAAAAAAAAAA" +
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABGAgICBgICAgCAAAAAAAAAAAwAAAAAAAAAAAAAA" +
    "AAAAAAAAAAAAAAAAAAAAAAAAAHCAgICAgICAgGAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
    "AAAAAAAAAAAAAAAAQICAgICAgICAgIA4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAAA" +
    "AAAAAAAQgICAgICAgICAgIB4GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAABBw" +
    "gICAgICAgICAgICAcAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGmAgICAgICA" +
    "gICAgICAgGAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUYCAgICAgICAgICAgICA" +
    "gIBQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQgICAgICAgICAgICAgICAgICAUAAA" +
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACGCAgICAgYCAgICAgICAgICAgICAgGgQAAAAAAAA" +
    "AAAAAAAAAAAAAAAAAAAAAAAYcICAgICAgYCAgICAgICAgICAgICAgIBwEQMAAAAAAAAAAAAA" +
    "AAAAAAAAAAAAADh4gICAgICAgICAgICAgICAgICAgICAgICAgEIAAAAAAAAAAAAAAAAAAAAA" +
    "AAAgYICAgICAgICAgICAgICAgICAgICAgICAgICAgIBwEAAAAAAAAAAAAAAAAAAAEFGAgICA" +
    "gICAgICAgICAgICAgICAgICAgYCAgICAgICAgFAQAAAAAAAAAAAAACFggICAgICAgYCAgICA" +
    "gICAgICAgICAgICAgICAgICAgICAgICAUCAAAAAAACBIeICAgICAgICAgICAgICAgICAgICA" +
    "gICAgICAgICAgICAgICAgICAgIBwSCAAcICAgICAgICAgICAgICAgICAgICAgICAgICAgICA" +
    "gICAgICAgICAgICAgICAgIBwcICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA" +
    "gICAgICAgICAgIBwACBIcICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA" +
    "gIB4SCAAAAMAACBQgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAYCAAAAAA" +
    "AAAAAAAAEFGAgICAgYCAgICAgICAgICAgIGAgICAgICAgICAgICAgFERAAAAAAAAAAAAAAAA" +
    "AAAQcICAgICAgICAgICAgICAgICAgICAgICAgICAgIBgIAAAAAAAAAAAAAAAAAAAAAAAAECA" +
    "gICAgICAgICAgICAgICAgICAgICAgICAeTkAAAAAAAAAAAAAAAAAAAAAAAAAAAAQcYCAgICA" +
    "gICBgICAgICAgICAgICAgIBwGAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEGiAgICAgICAgICA" +
    "gICAgICAgICAgGAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQgICAgICAgYCAgICAgICA" +
    "gICAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUICAgYCAgYCAgICAgICAgIBQAAAA" +
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGCAgICAgICAgICAgICAgGgAAAAAAAAAAAAA" +
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAhwgICAgICAgYCAgICAcBAAAAAAAAAAAAAAAAAAAAAA" +
    "AAAAAAAAAAAAAAAAAAAAAAAZeICAgICAgICAgICAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
    "AAAAAAAAAAAAAAAAOICAgICAgICAgIBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
    "AAAAAAAAAGCAgICAgICAgHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
    "ACCAgICAgICAgBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQgICA" +
    "gICAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQgICAgICAEAAA" +
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYYCAgIBQAAAAAAAAAAAA" +
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIICAgIAgAAAAAAAAAAAAAAAAAAAA" +
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHiAgHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAEiAgEkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
    "AAAAAAAAAAAAAAAAAAAAACCAgCEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
    "AAAAAAAAAAAAAABwcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

  /** Chamfer distance to the nearest set pixel. Two sweeps is plenty at this size. */
  function chamfer(seed, n) {
    var d = new Float32Array(n * n), i, x, y, v;
    for (i = 0; i < n * n; i++) d[i] = seed[i] ? 0 : 1e9;
    var fwd = [[-1, 0, 1], [0, -1, 1], [-1, -1, 1.414], [1, -1, 1.414]];
    var rev = [[1, 0, 1], [0, 1, 1], [1, 1, 1.414], [-1, 1, 1.414]];
    for (var pass = 0; pass < 2; pass++) {
      for (y = 0; y < n; y++) for (x = 0; x < n; x++) {
        i = y * n + x; v = d[i];
        for (var k = 0; k < 4; k++) {
          var nx = x + fwd[k][0], ny = y + fwd[k][1];
          if (nx < 0 || ny < 0 || nx >= n || ny >= n) continue;
          v = Math.min(v, d[ny * n + nx] + fwd[k][2]);
        }
        d[i] = v;
      }
      for (y = n - 1; y >= 0; y--) for (x = n - 1; x >= 0; x--) {
        i = y * n + x; v = d[i];
        for (var k2 = 0; k2 < 4; k2++) {
          var mx = x + rev[k2][0], my = y + rev[k2][1];
          if (mx < 0 || my < 0 || mx >= n || my >= n) continue;
          v = Math.min(v, d[my * n + mx] + rev[k2][2]);
        }
        d[i] = v;
      }
    }
    return d;
  }

  /**
   * Add the mark's dark outline, and with it per-pixel overlay colour.
   *
   * The shipped mask is missing a stroke, and the reason is worth stating because
   * it is not an oversight in the measurement -- it is a blind spot in the method.
   * `bg_48.png` was measured from *solid black* Gemini output, and over black a
   * black stroke is algebraically invisible: f = a*0 + (1-a)*0 = 0, identical to
   * no mark at all. So no black-background sample can ever reveal one, however
   * carefully it is measured.
   *
   * It shows up immediately on real content. Measured on a 1920x1080 clip, in the
   * band just outside the sparkle's core the frame is ~10 luma *darker* than its
   * surroundings, and where the shipped mask reads a faint alpha of 0.02-0.20 the
   * real pixels are 20-30 luma darker. Treating those as faint *white* and
   * subtracting a*255 pushes them darker still, which is exactly the black
   * sparkle outline left behind in the cleaned output.
   *
   * Fitted against four real frames by minimising how much the cleaned patch
   * deviates from a smooth fit of its surroundings: a 2 px band (at 72 px, so
   * ~2.8% of the mark), alpha 0.34, tapering outward, with the core taken as
   * alpha >= 8% of peak. That cut the residual by 75%.
   */
  function strokedMask(base, opts) {
    opts = opts || {};
    var width = opts.strokeWidth == null ? STROKE.width : opts.strokeWidth;
    var alpha = opts.strokeAlpha == null ? STROKE.alpha : opts.strokeAlpha;
    var coreThr = opts.strokeCore == null ? STROKE.core : opts.strokeCore;
    if (alpha <= 0 || width <= 0) return base;

    var n = base.size, i;
    // Width is a fraction of the mark, so the stroke scales with it.
    var w = Math.max(0.75, width * n);
    var peak = Math.max(maskPeak(base), 1e-6);
    var support = new Uint8Array(n * n);
    for (i = 0; i < n * n; i++) support[i] = base.data[i] >= coreThr * peak ? 1 : 0;

    var dOut = chamfer(support, n);
    var data = new Float32Array(n * n), overlay = new Float32Array(n * n);
    // The band's own alpha profile, kept so the solver can regress against it.
    var band = new Float32Array(n * n);
    for (i = 0; i < n * n; i++) {
      var d = dOut[i];
      // Stroke alpha in the band, tapering outward; zero in the core and beyond.
      var aS = 0;
      if (d > 0 && d <= w) {
        aS = alpha * Math.max(0, Math.min(1, 1 - (d - 1) / w));
      }
      var aM = base.data[i];
      var tot = aM + aS;
      if (tot <= 0) { data[i] = 0; overlay[i] = 255; continue; }

      /*
       * Compose the two layers *premultiplied* rather than letting the stroke
       * overwrite the sparkle's colour. The band is not pure black: it is the
       * sparkle's own antialiased white edge and the black stroke, both present.
       *
       * Overwriting it with black broke the one case that was already exact.
       * Over solid black the composite is f = aM*255, so a black-only band
       * recovers (f - 0)/(1 - aS) = f/0.66 -- it brightens pixels that should
       * stay put, and the brightest leftover on the real black sample went from
       * 2.3 to 12.3. Premultiplied, the same pixel gives
       * (aM*255 - aM*255)/(1 - tot) = 0, which is correct, and on light content
       * the black layer still pulls the effective colour down where it belongs.
       */
      data[i] = Math.min(tot, 0.995);
      overlay[i] = (aM * 255 + aS * 0) / tot;
      band[i] = aS;
    }
    return { size: n, data: data, overlay: overlay, stroked: true, band: band };
  }

  /**
   * The mask as it should be applied at a given box size.
   *
   * The stroke has to be built *after* resizing, not before. Built at 48 px and
   * bilinearly upscaled to 72, a 2 px band widens and, worse, the overlay plane
   * interpolates across its own 255-to-0 boundary and invents mid-greys along it.
   * Built at the working size the band stays the width it was fitted at.
   */
  function maskAt(mask, size, cfg) {
    var m = resizeMask(mask, size);
    // A mask that already carries colour -- calibrated, or explicitly stroked --
    // is taken as given.
    if (m.overlay) return m;
    if (cfg && cfg.stroke === false) return m;
    return strokedMask(m, cfg || {});
  }


  var geminiCache = null;

  /** The measured Gemini sparkle, decoded once. */
  function geminiMask() {
    if (geminiCache) return { size: geminiCache.size, data: geminiCache.data };
    var bin = (typeof atob === "function")
      ? atob(GEMINI_MASK_48)
      : Buffer.from(GEMINI_MASK_48, "base64").toString("binary");
    var size = Math.round(Math.sqrt(bin.length));
    var data = new Float32Array(size * size);
    for (var i = 0; i < data.length; i++) data[i] = bin.charCodeAt(i) / 255;
    geminiCache = { size: size, data: data };
    return { size: size, data: data };
  }

  /**
   * The mask every entry point falls back to when the caller supplies none.
   *
   * Stroked by default. The outline is present in real output at every resolution
   * measured; it was simply invisible to the black-background calibration that
   * produced the alpha map. Note it costs nothing on a black background, where
   * a*(0-0) is zero either way, so switching it on cannot regress that case.
   */
  function defaultMask() {
    return geminiMask();
  }

  // Reference placement, measured from real Gemini output: a 48x48 mark inset
  // 73 px from the bottom-right of a 768x1376 image, peaking at luma 129.
  //
  // The size does NOT scale with resolution. Two independent facts say so: the
  // shipped mask is exactly 48 px, and a 768x1376 frame carries an exactly
  // 48 px mark -- a proportional model would have predicted 102 px there, which
  // is why an earlier reference of "96 px at 1280x720" produced a box twice too
  // large. It looks like a fixed-size sprite composited at native scale.
  //
  // The size holds across every resolution measured; the inset does not:
  //
  //    768x1376  -> (647,1255)   inset 73
  //   1376x768   -> (1255,647)   inset 73   (coordinates simply swap)
  //   1536x2752  -> (1399,2615)  inset 89
  //   2751x1536  -> (2615,1399)  inset 88/89
  //   1280x720   -> (1136,576)   inset 96   (video)
  //
  // All five are 48 px marks, so 48 is safe to assume. The inset is not: a 720
  // short edge gives 96 while 1536 gives 89, so it tracks nothing usable. Hence
  // the position is detected and only the size is assumed.
  //
  // Keep size at 48. It is measured, not inferred -- the bounding box is exactly
  // 48x48 and the peak pixel exactly luma 129, matching the 48 px mask the
  // reference ships. If the detector ever disagrees, fix the detector: a size-comparability
  // bug once made it report 46, and "correcting" this constant to match only hid
  // the real fault.
  var REFERENCE = { size: 48, inset: 73 };

  /*
   * Video breaks the "always 48 px" rule, and a real clip proved it.
   *
   * Measured from a 1920x1080 Gemini clip by averaging 60 frames (the mark is
   * static, so the moving scene averages away and the sparkle survives): the mark
   * is 72 px at an inset of 142/143, against the 48 px at inset 96 measured at
   * 1280x720. Both ratios are exactly 1.5 -- size/height is 0.0667 and
   * inset/height is 0.1333 at *both* resolutions.
   *
   * The obvious reading is that video is rendered at a canonical 720p, watermarked
   * at 48 px, and upscaled, which carries the mark along with everything else.
   * Stills do not do this: 1536x2752 still carries a 48 px mark.
   *
   * So neither scale can be assumed, and both are searched. The cost of being
   * wrong here is total: at 48 px the true 1080p location scores 0.100, so a
   * 48-seeded search cannot find it at all, and it did not -- it landed 1607 px
   * away with a confident-looking 0.454.
   */
  var VIDEO_SCALE_HEIGHT = 720;

  /*
   * The mark's dark outline. Fitted on four real 1920x1080 frames through the
   * engine's own path -- see strokedMask for what it is and why it was missing.
   *
   * `width` is a fraction of the mark's size, so the band scales with the mark:
   * 7 px on the measured 72 px mark, ~4.7 px at 48 px. The fit plateaus flat
   * between 7 and 16 px (18.6 vs 18.8 residual), so the narrow end is taken --
   * it reaches fewer clean pixels for the same benefit.
   */
  var STROKE = { width: 7 / 72, alpha: 0.20, core: 0.50 };

  /**
   * Sizes worth seeding the search at, largest-frame case included.
   *
   * Ranked against each other later by fitScore, which is why a wrong guess in
   * this list is harmless: it simply loses.
   */
  function seedSizes(w, h) {
    var minSide = Math.min(w, h);
    var sizes = [REFERENCE.size];
    var scaled = Math.round(REFERENCE.size * (minSide / VIDEO_SCALE_HEIGHT));
    // Only worth a separate pass if it is meaningfully different and still sane.
    if (scaled >= REFERENCE.size + 6 && scaled <= minSide / 3) sizes.push(scaled);
    return sizes;
  }

  /**
   * Corner placements to test as priors: the still-image geometry (48 px at inset
   * 73) and the video geometry, whose inset is twice the mark size (96 = 2x48 at
   * 720p, 143 ~ 2x72 at 1080p).
   */
  function anchorBoxes(w, h) {
    var out = [defaultBox(w, h, 1)];
    var sizes = seedSizes(w, h);
    for (var i = 0; i < sizes.length; i++) {
      var s = sizes[i], inset = 2 * s;
      var x = w - inset - s, y = h - inset - s;
      if (x >= 0 && y >= 0) out.push({ x: x, y: y, size: s });
    }
    return out;
  }

  // How much better than the corner placement a roaming candidate must score
  // before it is believed. 0.10 sits well above the 0.02-0.04 by which texture
  // wins a false match, and well below the 0.3+ by which a genuinely off-corner
  // mark wins a true one. See the note in detectScaled.
  var ANCHOR_MARGIN = 0.10;

  // Below this, no placement in the frame looks like the mask at all, and the
  // result should be treated as "not found" rather than quietly used.
  var MIN_DETECT_SCORE = 0.30;

  function settings(overrides) {
    var out = {};
    for (var k in DEFAULTS) if (DEFAULTS.hasOwnProperty(k)) out[k] = DEFAULTS[k];
    for (var j in overrides || {}) if (overrides.hasOwnProperty(j)) out[j] = overrides[j];
    return out;
  }

  /* -------------------------------------------------------------------- mask */

  /** A mask is { size, data: Float32Array(size*size) } with data in 0..1. */
  function sparkleMask(size) {
    size = size || 96;
    var data = new Float32Array(size * size);
    var ss = 4, c = SPARKLE.corner, s = SPARKLE.extent;
    var r2 = (1 - c) * (1 - c) + c * c;
    var inv = 1 / ss, sub = inv * inv;

    for (var y = 0; y < size; y++) {
      for (var x = 0; x < size; x++) {
        var cover = 0;
        for (var sy = 0; sy < ss; sy++) {
          var gy = (((y + (sy + 0.5) * inv) / size) * 2 - 1) / s;
          for (var sx = 0; sx < ss; sx++) {
            var gx = (((x + (sx + 0.5) * inv) / size) * 2 - 1) / s;
            // Outside all four corner circles => inside the star.
            var inside = true;
            for (var qy = -1; qy <= 1 && inside; qy += 2) {
              for (var qx = -1; qx <= 1 && inside; qx += 2) {
                var dx = gx - qx * c, dy = gy - qy * c;
                if (dx * dx + dy * dy < r2) inside = false;
              }
            }
            if (inside) cover += sub;
          }
        }
        data[y * size + x] = cover * SPARKLE.peakAlpha;
      }
    }
    return { size: size, data: data };
  }

  /** Read a greyscale PNG as a mask: luma/255 becomes alpha. */
  function maskFromImageData(img) {
    var n = Math.min(img.width, img.height);
    var data = new Float32Array(n * n);
    for (var y = 0; y < n; y++) {
      for (var x = 0; x < n; x++) {
        var p = (y * img.width + x) * 4;
        // Rec.601 luma; a pure grey mask makes this an identity.
        var luma = 0.299 * img.data[p] + 0.587 * img.data[p + 1] + 0.114 * img.data[p + 2];
        // A mask with real transparency uses its alpha channel instead.
        var a = img.data[p + 3];
        data[y * n + x] = (a < 255 ? (a / 255) * (luma / 255) : luma / 255);
      }
    }
    return { size: n, data: data };
  }

  /** Bilinear resample of one square plane. */
  function resizePlane(src, n, size) {
    var out = new Float32Array(size * size);
    var ratio = n / size;
    for (var y = 0; y < size; y++) {
      var fy = Math.min(n - 1, Math.max(0, (y + 0.5) * ratio - 0.5));
      var y0 = Math.floor(fy), y1 = Math.min(n - 1, y0 + 1), wy = fy - y0;
      for (var x = 0; x < size; x++) {
        var fx = Math.min(n - 1, Math.max(0, (x + 0.5) * ratio - 0.5));
        var x0 = Math.floor(fx), x1 = Math.min(n - 1, x0 + 1), wx = fx - x0;
        var top = src[y0 * n + x0] * (1 - wx) + src[y0 * n + x1] * wx;
        var bot = src[y1 * n + x0] * (1 - wx) + src[y1 * n + x1] * wx;
        out[y * size + x] = top * (1 - wy) + bot * wy;
      }
    }
    return out;
  }

  /**
   * Bilinear resample of a square mask. Alpha only, so no premultiply needed.
   *
   * `overlay`, when present, carries the mark's own colour per pixel (luma 0..255)
   * and is resampled alongside alpha. It exists because the mark is not one
   * colour: see strokedMask.
   */
  function resizeMask(mask, size) {
    var out;
    if (size === mask.size) {
      out = { size: size, data: mask.data.slice() };
      if (mask.overlay) out.overlay = mask.overlay.slice();
      return out;
    }
    out = { size: size, data: resizePlane(mask.data, mask.size, size) };
    if (mask.overlay) out.overlay = resizePlane(mask.overlay, mask.size, size);
    return out;
  }

  /** Default mark box for a frame, from the reference placement. */
  function defaultBox(w, h, maskScale) {
    var size = Math.max(8, Math.round(REFERENCE.size * (maskScale || 1)));
    var inset = REFERENCE.inset;
    // Grow around the mark's centre so MASK SIZE stays concentric.
    var grow = Math.round((size - REFERENCE.size) / 2);
    return {
      x: Math.max(0, Math.min(w - size, w - inset - size + grow)),
      y: Math.max(0, Math.min(h - size, h - inset - size + grow)),
      size: size
    };
  }

  /* --------------------------------------------------------------- detection */

  /**
   * Sliding-window box mean, separable and O(N) regardless of radius.
   *
   * The naive 5x5 version below costs 25 operations per pixel, which is fine on
   * a 48px mask but not on a megapixel frame that has to be high-passed before
   * a full-frame search.
   */
  function boxMean(src, W, H, r) {
    var tmp = new Float32Array(W * H), out = new Float32Array(W * H);
    var x, y, sum, cnt, base;

    for (y = 0; y < H; y++) {
      base = y * W; sum = 0; cnt = 0;
      for (x = 0; x <= r && x < W; x++) { sum += src[base + x]; cnt++; }
      for (x = 0; x < W; x++) {
        tmp[base + x] = sum / cnt;
        if (x + r + 1 < W) { sum += src[base + x + r + 1]; cnt++; }
        if (x - r >= 0) { sum -= src[base + x - r]; cnt--; }
      }
    }
    for (x = 0; x < W; x++) {
      sum = 0; cnt = 0;
      for (y = 0; y <= r && y < H; y++) { sum += tmp[y * W + x]; cnt++; }
      for (y = 0; y < H; y++) {
        out[y * W + x] = sum / cnt;
        if (y + r + 1 < H) { sum += tmp[(y + r + 1) * W + x]; cnt++; }
        if (y - r >= 0) { sum -= tmp[(y - r) * W + x]; cnt--; }
      }
    }
    return out;
  }

  /**
   * High-pass luma for a whole frame, computed once and reused across the
   * detection sweep. Removing the local mean is what lets a faint mark on a
   * bright background outscore the background itself.
   */
  /** High-pass radius that keeps a mark of this size mostly intact. */
  function detailRadius(size) {
    return Math.max(2, Math.round(size / 6));
  }

  /** Pre-smoothing radius that kills dither/compression noise, not the mark. */
  function detailSmooth(size) {
    return Math.max(1, Math.round(size / 32));
  }

  function highpassImage(img, radius, smooth) {
    var W = img.width, H = img.height, n = W * H;
    var luma = new Float32Array(n), px = img.data;
    for (var i = 0, p = 0; i < n; i++, p += 4) {
      luma[i] = 0.299 * px[p] + 0.587 * px[p + 1] + 0.114 * px[p + 2];
    }
    // Band-pass, matching highpass() above -- see the note there on dithering.
    if (smooth > 0) luma = boxMean(luma, W, H, smooth);
    var mean = boxMean(luma, W, H, radius || 2);
    var hp = new Float32Array(n);
    for (var j = 0; j < n; j++) hp[j] = luma[j] - mean[j];
    return { data: hp, width: W, height: H };
  }

  /**
   * Subtract a local mean, leaving only detail. Edges clamp.
   *
   * The radius must be scaled to the mark: at r=2 a 48 px mark with a flat
   * interior collapses to just its outline, throwing away most of the shape that
   * makes it findable. Callers pass a radius derived from the mark size, and
   * must use the *same* radius for the image and the mask or the two detail
   * signals are not comparable.
   */
  function highpass(src, size, r, smooth) {
    r = r || 2;
    // Optional mild low-pass first, making this a band-pass. Palette-quantised
    // and dithered sources (GIF above all, but also heavily compressed JPEG and
    // video) carry pixel-level noise that a plain high-pass amplifies, drowning
    // out the mark. Smoothing by 1-2 px costs a 48 px shape almost nothing and
    // removes most of that noise.
    if (smooth > 0) src = boxMean(src, size, size, smooth);
    var out = new Float32Array(size * size);
    for (var y = 0; y < size; y++) {
      for (var x = 0; x < size; x++) {
        var sum = 0, cnt = 0;
        for (var dy = -r; dy <= r; dy++) {
          var yy = y + dy;
          if (yy < 0 || yy >= size) continue;
          for (var dx = -r; dx <= r; dx++) {
            var xx = x + dx;
            if (xx < 0 || xx >= size) continue;
            sum += src[yy * size + xx]; cnt++;
          }
        }
        out[y * size + x] = src[y * size + x] - sum / cnt;
      }
    }
    return out;
  }

  /**
   * How much of the mask's shape is still visible in a result. Zero is perfect.
   *
   * Signed on purpose: a leftover mark correlates positively with the mask, an
   * over-correction negatively, so the sign says which way to move -- which is
   * what `solveGain` bisects on.
   *
   * `useHighpass` trades robustness against noise sensitivity, and the two
   * callers want opposite things. Solving and detection high-pass, so a bright
   * or dark background cannot masquerade as a mark. The quality readout does
   * not: high-pass amplifies the compression ringing that collects on the
   * mark's edge, which made lossy video score ~0.5 even when the mark was
   * visibly gone.
   *
   * Two earlier attempts at a safety metric failed and are worth not repeating:
   * correlating raw before/after luma scores ~0 on a flawless removal (removing
   * the mark is *supposed* to change brightness), and correlating their
   * high-pass detail scores low too, because `before` contains the mark's
   * silhouette as a strong edge that `after` correctly lacks. Looking for
   * residual mask shape is the thing that actually tracks quality.
   */
  function markResidual(maskData, luma, size, touched, useHighpass) {
    var dm = useHighpass ? highpass(maskData, size) : maskData;
    var dl = useHighpass ? highpass(luma, size) : luma;
    var n = size * size, idx = [], i;
    for (i = 0; i < n; i++) if (touched[i]) idx.push(i);
    if (idx.length < 16) return 0;
    var pm = new Float32Array(idx.length), pl = new Float32Array(idx.length);
    for (i = 0; i < idx.length; i++) { pm[i] = dm[idx[i]]; pl[i] = dl[idx[i]]; }
    return pearson(pm, pl, idx.length);
  }

  function pearson(a, b, n) {
    var sa = 0, sb = 0, i;
    for (i = 0; i < n; i++) { sa += a[i]; sb += b[i]; }
    var ma = sa / n, mb = sb / n, num = 0, da = 0, db = 0;
    for (i = 0; i < n; i++) {
      var x = a[i] - ma, y = b[i] - mb;
      num += x * y; da += x * x; db += y * y;
    }
    var den = Math.sqrt(da * db);
    return den > 1e-9 ? num / den : 0;
  }

  /** Correlate mask shape against the window's high-pass detail. */
  function detailScore(img, mask, box) {
    var size = box.size, W = img.width, n = size * size;
    var m = resizeMask(mask, size);
    var luma = new Float32Array(n);
    for (var y = 0, i = 0; y < size; y++) {
      var row = ((box.y + y) * W + box.x) * 4;
      for (var x = 0; x < size; x++, i++) {
        var p = row + x * 4;
        luma[i] = 0.299 * img.data[p] + 0.587 * img.data[p + 1] + 0.114 * img.data[p + 2];
      }
    }
    // A radius that scales with the mark keeps the comparison fair across sizes.
    return pearson(highpass(m.data, size), highpass(luma, size), n);
  }

  /** Least-squares slope of luma against mask alpha, over the mark's pixels. */
  function slopeOnMask(maskData, luma, touched) {
    var sm = 0, sl = 0, cnt = 0, i;
    for (i = 0; i < maskData.length; i++) {
      if (!touched[i]) continue;
      sm += maskData[i]; sl += luma[i]; cnt++;
    }
    if (cnt < 16) return 0;
    var mm = sm / cnt, ml = sl / cnt, num = 0, den = 0;
    for (i = 0; i < maskData.length; i++) {
      if (!touched[i]) continue;
      var dm = maskData[i] - mm;
      num += dm * (luma[i] - ml); den += dm * dm;
    }
    return den > 1e-9 ? num / den : 0;
  }

  /**
   * What fraction of the mark's amplitude was removed. 1 is a clean removal.
   *
   * This is the metric worth reporting, because correlation alone is
   * scale-invariant: a 2-byte mask-shaped ripple left by codec ringing
   * correlates as strongly as a 50-byte ghost, so lossy video scored ~0.56 even
   * when the mark was visibly gone. Regressing luma on the mask gives the mark's
   * amplitude in bytes before and after, and their ratio is amplitude-aware and
   * directly interpretable: 0.98 means 98% of the mark is gone.
   *
   * Over-correction flips the residual's sign, and taking |ratio| means it
   * counts against the score just as much as under-correction does.
   *
   * `size` enables the background compensation, and without it this number is
   * simply wrong. Regressing *raw* luma on the mask charges the score for
   * whatever the background happens to do under the mark: the recovered pixels
   * still carry the real scene, and the part of it that happens to align with
   * the mask's shape is counted as leftover mark. On a synthetic frame removing
   * 99.3% of the mark, the raw ratio reported 92.3%, and it was not even
   * monotonic -- a genuinely better removal could score lower than a worse one.
   * Band-passing both signals at the mark's own scale (the same radius detection
   * uses) removes the background's low-frequency contribution and leaves the
   * ratio tracking truth: 99.4% on that frame, while still collapsing to ~20%
   * when the gain is deliberately wrong.
   */
  function markRemoval(maskData, before, after, touched, size) {
    // Raw slopes stay the reported amplitudes: they are in luma bytes, which is
    // what "23.8 of 116 left" has to mean to be worth showing.
    var sb = slopeOnMask(maskData, before, touched);
    var sa = slopeOnMask(maskData, after, touched);
    var qb = sb, qa = sa;
    if (size) {
      var r = detailRadius(size);
      var dm = highpass(maskData, size, r, 0);
      qb = slopeOnMask(dm, highpass(before, size, r, 0), touched);
      qa = slopeOnMask(dm, highpass(after, size, r, 0), touched);
    }
    if (Math.abs(qb) < 1e-6) return { quality: 1, amplitude: sb, residual: sa };
    return {
      quality: 1 - Math.abs(qa) / Math.abs(qb),
      amplitude: sb,
      residual: sa
    };
  }

  function maskPeak(mask) {
    var peak = 0;
    for (var i = 0; i < mask.data.length; i++) if (mask.data[i] > peak) peak = mask.data[i];
    return peak;
  }

  /**
   * Find the mark's size as well as its position.
   *
   * The size cannot be assumed: it varies with resolution and with whatever the
   * generator decided, and a box that is too small leaves a ring of untouched
   * mark while one that is too large drags in clean pixels. So sweep a range of
   * sizes, take the best position for each, and keep the size that correlates
   * best. Scored on high-pass detail so a bright or dark background cannot
   * outvote the mark's actual shape.
   */
  /**
   * Score one exact placement at its own size. Only valid at a fixed size.
   *
   * `radius`/`smooth` must be forwarded whenever `hp` is a shared high-pass
   * image: without them `detect` would derive its own from the box size and
   * filter the mask differently from the image it is being compared against.
   */
  function boxScore(img, mask, box, hp, radius, smooth) {
    return detect(img, mask, {
      size: box.size, hp: hp, radius: radius, smooth: smooth,
      region: { x0: box.x, y0: box.y, x1: box.x, y1: box.y }
    }).score;
  }

  /**
   * Score a candidate placement over a window of *fixed* size.
   *
   * Plain correlation cannot be compared across box sizes: a smaller window has
   * fewer samples, so chance alignment scores higher. Maximising it collapses
   * every size search to the smallest size allowed -- which is exactly what
   * happened, every mark "detected" as 12 px. Evaluating each candidate over one
   * constant window fixes the sample count so the comparison is fair, and it
   * also punishes a too-large mask, which predicts mark structure in places the
   * frame has none.
   */
  function fitScore(img, mask, box, hp, evalSize, radius, smooth) {
    var W = img.width, H = img.height, e = evalSize;
    if (e > W || e > H || box.size < 4) return -2;

    var cx = box.x + box.size / 2, cy = box.y + box.size / 2;
    var ex = Math.max(0, Math.min(W - e, Math.round(cx - e / 2)));
    var ey = Math.max(0, Math.min(H - e, Math.round(cy - e / 2)));

    // Draw the candidate mask into the window; everything outside it is zero,
    // which is the prediction "no mark here".
    var m = resizeMask(mask, box.size);
    var render = new Float32Array(e * e);
    var y, x, gy, gx;
    for (y = 0; y < box.size; y++) {
      gy = box.y + y - ey;
      if (gy < 0 || gy >= e) continue;
      for (x = 0; x < box.size; x++) {
        gx = box.x + x - ex;
        if (gx < 0 || gx >= e) continue;
        render[gy * e + gx] = m.data[y * box.size + x];
      }
    }

    var predicted = highpass(render, e, radius || detailRadius(box.size),
      smooth == null ? detailSmooth(box.size) : smooth);
    var observed = new Float32Array(e * e);
    for (y = 0; y < e; y++) {
      for (x = 0; x < e; x++) observed[y * e + x] = hp.data[(ey + y) * W + (ex + x)];
    }
    return pearson(predicted, observed, e * e);
  }

  function detectScaled(img, mask, opts) {
    opts = opts || {};
    var base = opts.base || defaultBox(img.width, img.height, 1).size;
    var minSide = Math.min(img.width, img.height);
    // One radius and one high-pass image for the whole search, so every score is
    // computed against the same detail signal.
    var radius = opts.radius || detailRadius(base);
    var smooth = opts.smooth == null ? detailSmooth(base) : opts.smooth;
    var hp = opts.hp || highpassImage(img, radius, smooth);

    /*
     * Seed the position at each plausible mark scale, then let fitScore choose
     * between them over one common window.
     *
     * An earlier note here said probing several sizes "was tried and dropped"
     * because ranking cross-size candidates could not be made fair. That was true
     * of raw correlation, and it is exactly what fitScore was later written to
     * fix -- it holds the evaluation window constant, so the comparison *is* fair
     * now. Meanwhile the single-seed version had a hard failure: on a real
     * 1920x1080 clip whose mark is 72 px, the correct location scores only 0.100
     * under a 48 px filter, so the search could not see it and confidently
     * reported a spot 1607 px away instead.
     */
    var probes = opts.probeSizes || seedSizes(img.width, img.height);
    var seed = null, seedEval = Math.min(minSide, Math.round(Math.max.apply(null, probes) * 1.4));
    for (var pi = 0; pi < probes.length; pi++) {
      var probe = Math.max(10, Math.min(minSide, probes[pi]));
      // Each scale needs a filter, and therefore a high-pass, matched to itself.
      var pRad = detailRadius(probe), pSm = detailSmooth(probe);
      var pHp = (probe === base && opts.hp) ? hp : highpassImage(img, pRad, pSm);
      var r = detect(img, mask, {
        size: probe, hp: pHp, radius: pRad, smooth: pSm, region: opts.region
      });
      var fit = fitScore(img, mask, { x: r.x, y: r.y, size: probe }, pHp, seedEval, pRad, pSm);
      if (!seed || fit > seed.fit) {
        seed = { x: r.x, y: r.y, size: probe, score: r.score, fit: fit };
      }
    }
    // Refinement below re-derives its own filters, so switch to the winner's.
    if (seed.size !== base) {
      radius = detailRadius(seed.size);
      smooth = detailSmooth(seed.size);
      hp = highpassImage(img, radius, smooth);
    }

    // Alternate between refining the size about the mark's centre and nudging
    // the position at that size. Integer size steps matter: on real output, 46 px
    // instead of 48 left a brightest residue of 95/129 luma versus 45/129.
    // The size search is deliberately a *refinement*, not a wide search. Over a
    // broad range it is unreliable, because this mark is soft-edged, low-contrast
    // and self-similar, so a half-size or double-size candidate can out-score the
    // truth. Narrow and dependable is worth more than wide and wrong: a mark well
    // outside this range is handled by typing PX, or exactly by calibrating.
    var cur = seed;
    for (var pass = 0; pass < 2; pass++) {
      var cx = cur.x + cur.size / 2, cy = cur.y + cur.size / 2;
      var lo = Math.max(10, Math.round(cur.size * (pass === 0 ? 0.72 : 0.9)));
      var hi = Math.min(minSide, Math.round(cur.size * (pass === 0 ? 1.4 : 1.12)));
      // One window for every candidate in this pass, big enough for the largest.
      var evalSize = Math.min(minSide, Math.round(hi * 1.4));

      var bestSized = null;
      for (var s = lo; s <= hi; s++) {
        var bx = Math.max(0, Math.min(img.width - s, Math.round(cx - s / 2)));
        var by = Math.max(0, Math.min(img.height - s, Math.round(cy - s / 2)));
        var sc = fitScore(img, mask, { x: bx, y: by, size: s }, hp, evalSize, radius, smooth);
        if (!bestSized || sc > bestSized.score) {
          bestSized = { x: bx, y: by, size: s, score: sc };
        }
      }
      if (!bestSized) break;

      // Re-centre at the chosen size, searching nearby. Compare like with like:
      // rescore the winner through fitScore at the same window.
      var half = Math.max(4, Math.round(bestSized.size * 0.5));
      var local = detect(img, mask, {
        size: bestSized.size, hp: hp, radius: radius, smooth: smooth,
        region: {
          x0: bestSized.x - half, y0: bestSized.y - half,
          x1: bestSized.x + half, y1: bestSized.y + half
        }
      });
      var localBox = { x: local.x, y: local.y, size: bestSized.size };
      var localFit = fitScore(img, mask, localBox, hp, evalSize, radius, smooth);
      cur = localFit > bestSized.score
        ? { x: local.x, y: local.y, size: bestSized.size, score: localFit }
        : bestSized;
    }

    // Report the score at the mark's own size, which is the number a user can
    // compare against a detection threshold.
    cur.score = detect(img, mask, {
      size: cur.size, hp: hp, radius: radius, smooth: smooth,
      region: { x0: cur.x, y0: cur.y, x1: cur.x, y1: cur.y }
    }).score;

    /*
     * Anchor prior. A whole-frame search is right in principle -- the mark is not
     * always at the corner inset -- but on its own it loses to busy texture, and
     * loses *silently*.
     *
     * Measured on a real 48px mark recomposited over a 19x29 px grid pattern
     * (tiles, fabric, foliage all do this): the search picked the opposite corner
     * of the frame, 1815 px away, scoring 0.466 against the correct placement's
     * 0.428. Removal went from 97.9% to 0.0% -- and worse, the α solver then
     * "succeeded" on empty background, returning gain 0.07, so nothing anywhere
     * reported a failure.
     *
     * The winner only beat the truth by 0.038 there, whereas a mark genuinely away
     * from the corner beats the anchor by a mile (0.37-0.55 against 0.05-0.13,
     * measured the same way). That gap is what makes a margin rule safe: require
     * the roaming winner to be *clearly* better than the corner before believing
     * it, and otherwise take the corner, which is where Gemini actually puts it.
     */
    if (!opts.region && opts.anchor !== false) {
      // Every corner geometry actually measured is a candidate; the best one is
      // what the roaming winner has to beat.
      var cands = anchorBoxes(img.width, img.height);
      var anchor = null, anchorScore = -2;
      for (var ai = 0; ai < cands.length; ai++) {
        var c = cands[ai];
        var cRad = detailRadius(c.size), cSm = detailSmooth(c.size);
        var cHp = (c.size === cur.size) ? hp : highpassImage(img, cRad, cSm);
        var sc = detect(img, mask, {
          size: c.size, hp: cHp, radius: cRad, smooth: cSm,
          region: { x0: c.x, y0: c.y, x1: c.x, y1: c.y }
        }).score;
        if (sc > anchorScore) { anchorScore = sc; anchor = c; }
      }
      var margin = opts.anchorMargin == null ? ANCHOR_MARGIN : opts.anchorMargin;
      if (cur.score < anchorScore + margin) {
        cur = {
          x: anchor.x, y: anchor.y, size: anchor.size, score: anchorScore,
          anchored: true, roamScore: cur.score, roamSize: cur.size
        };
      }
      // Either way, say whether this is worth trusting. Below the floor even the
      // anchor is only a guess, and the honest answer is "place it by hand".
      cur.confident = cur.score >= (opts.minScore == null ? MIN_DETECT_SCORE : opts.minScore);
      cur.anchorScore = anchorScore;
    }
    return cur;
  }

  /**
   * Sweep sizes with the top-left held fixed.
   *
   * Needed when the user has pinned a position but not a size: the full search
   * would score each candidate size at *its own* best position, then hand back a
   * size measured somewhere other than where the mark was pinned, which is how
   * a pinned position ended up paired with a mismatched size.
   */
  function detectSizeAt(img, mask, x, y, base, opts) {
    opts = opts || {};
    var radius = opts.radius || detailRadius(base);
    var smooth = opts.smooth == null ? detailSmooth(base) : opts.smooth;
    var hp = opts.hp || highpassImage(img, radius, smooth);
    var lo = Math.max(10, Math.round(base * (opts.min || 0.5)));
    var hi = Math.min(Math.min(img.width, img.height), Math.round(base * (opts.max || 2.6)));
    // Fixed evaluation window, so sizes are comparable -- see fitScore.
    var evalSize = Math.min(Math.min(img.width, img.height), Math.round(hi * 1.4));
    var best = null;
    // Integer steps: the size has to be exact, not merely close.
    for (var size = lo; size <= hi; size++) {
      if (x + size > img.width || y + size > img.height) continue;
      var score = fitScore(img, mask, { x: x, y: y, size: size }, hp, evalSize, radius, smooth);
      if (!best || score > best.score) best = { size: size, score: score };
    }
    if (best) {
      best.score = boxScore(img, mask, { x: x, y: y, size: best.size }, hp, radius, smooth);
    }
    return best || { size: base, score: 0 };
  }

  /**
   * Solve for the alpha gain instead of choosing between two presets.
   *
   * Under-correction leaves a bright mark, which correlates *positively* with
   * the mask; over-correction leaves a dark one, correlating negatively. The
   * signed correlation therefore crosses zero at the correct gain, so bisect it.
   * This is strictly better than the reference's "auto-pick 1.0 vs 0.62" -- it finds
   * whatever the real value is, including values neither preset covers.
   */
  function solveGain(img, box, mask, cfg) {
    cfg = settings(cfg);
    var size = box.size, W = img.width;
    var m = maskAt(mask, size, cfg), n = size * size;
    var peak = Math.max(maskPeak(m), 1e-6);

    function residual(gain) {
      var trial = new Float32Array(n), touched = new Uint8Array(n);
      for (var y = 0, i = 0; y < size; y++) {
        var row = ((box.y + y) * W + box.x) * 4;
        for (var x = 0; x < size; x++, i++) {
          var p = row + x * 4;
          var a = Math.min(m.data[i] * gain, cfg.blendCeiling);
          var l = 0.299 * img.data[p] + 0.587 * img.data[p + 1] + 0.114 * img.data[p + 2];
          var col = m.overlay ? m.overlay[i] : cfg.overlayLuma;
          trial[i] = a > 0 ? (l - a * col) / (1 - a) : l;
          touched[i] = a > 0 ? 1 : 0;
        }
      }
      return markResidual(m.data, trial, size, touched, true);
    }

    // Bracket: gain 0 leaves the mark fully present (r > 0). Push up until the
    // sign flips, then bisect. Gains are expressed so peak alpha = peak*gain.
    var loG = 0.05, hiG = Math.min(2.6, (cfg.blendCeiling / peak) * 0.999);
    var rLo = residual(loG), rHi = residual(hiG);
    if (rLo <= 0) return { gain: loG, residual: rLo, solved: false };
    if (rHi >= 0) return { gain: hiG, residual: rHi, solved: false };

    for (var it = 0; it < 22; it++) {
      var mid = 0.5 * (loG + hiG);
      var rMid = residual(mid);
      if (rMid > 0) { loG = mid; rLo = rMid; } else { hiG = mid; rHi = rMid; }
    }
    var gain = 0.5 * (loG + hiG);
    return { gain: gain, residual: residual(gain), solved: true, peakAlpha: peak * gain };
  }

  /**
   * Find the mark anywhere in the frame, by matched filtering the mask's shape
   * against high-pass detail.
   *
   * Searching only the anchored corner was wrong: real output does not always
   * put the mark at a fixed inset from the bottom-right, and when it does not,
   * a corner-limited search cannot find it at all -- which forced manual
   * placement on every file. So the default region is the whole frame.
   *
   * Cost is kept sane by correlating against a pre-computed high-pass image
   * (shared across sizes) and by sweeping coarsely before refining.
   */
  function detect(img, mask, opts) {
    opts = opts || {};
    var size = opts.size || Math.round(mask.size);
    var W = img.width, H = img.height;
    if (size > W || size > H) return { x: 0, y: 0, score: -2 };

    // Radius and smoothing must match whatever the shared high-pass image used,
    // or the two detail signals are not comparable.
    var radius = opts.radius || detailRadius(size);
    var smooth = opts.smooth == null ? detailSmooth(size) : opts.smooth;
    var hp = (opts.hp && opts.hp.width === W && opts.hp.height === H)
      ? opts.hp : highpassImage(img, radius, smooth);
    var hpData = hp.data;
    var m = highpass(resizeMask(mask, size).data, size, radius, smooth);
    var n = size * size;

    // Mask statistics are constant across positions.
    var mSum = 0, i;
    for (i = 0; i < n; i++) mSum += m[i];
    var mMean = mSum / n, mVar = 0;
    for (i = 0; i < n; i++) { var dm = m[i] - mMean; mVar += dm * dm; }
    if (mVar < 1e-9) return { x: 0, y: 0, score: -2 };
    var mSd = Math.sqrt(mVar);

    var region = opts.region || { x0: 0, y0: 0, x1: W - size, y1: H - size };
    var x0 = Math.max(0, region.x0), y0 = Math.max(0, region.y0);
    var x1 = Math.min(W - size, region.x1), y1 = Math.min(H - size, region.y1);
    if (x1 < x0 || y1 < y0) return { x: x0, y: y0, score: -2 };

    var best = { x: x0, y: y0, score: -2 };

    function scoreAt(ox, oy) {
      var lSum = 0, lSq = 0, cross = 0, y, x, row, v;
      for (y = 0; y < size; y++) {
        row = (oy + y) * W + ox;
        for (x = 0; x < size; x++) {
          v = hpData[row + x];
          lSum += v; lSq += v * v; cross += v * m[y * size + x];
        }
      }
      // Pearson, expanded so only `cross` needs the full inner product.
      var lVar = lSq - (lSum * lSum) / n;
      if (lVar < 1e-6) return -2;
      return (cross - mMean * lSum) / (mSd * Math.sqrt(lVar));
    }

    function sweep(ax, ay, bx, by, step) {
      for (var y = ay; y <= by; y += step) {
        for (var x = ax; x <= bx; x += step) {
          var s = scoreAt(x, y);
          if (s > best.score) best = { x: x, y: y, score: s };
        }
      }
    }

    // Coarse enough to be quick, fine enough not to skip past the peak.
    var coarse = Math.max(2, Math.round(size / 6));
    sweep(x0, y0, x1, y1, coarse);
    var cx = best.x, cy = best.y;
    sweep(Math.max(x0, cx - coarse), Math.max(y0, cy - coarse),
          Math.min(x1, cx + coarse), Math.min(y1, cy + coarse), 1);
    return best;
  }

  /* ---------------------------------------------------------------- unblend */

  /**
   * Invert the composite inside `box`, writing into `img` in place.
   * Returns diagnostics including the before/after Pearson r that the reference
   * uses as its "warn if r <= threshold" safety net.
   */
  function unblendRegion(img, box, mask, cfg) {
    cfg = settings(cfg);
    var size = box.size, W = img.width, px = img.data;
    var m = maskAt(mask, size, cfg);
    var overlay = cfg.overlayLuma;
    var ceiling = cfg.blendCeiling;
    var gain = cfg.opacity === "auto" ? cfg.opacityChoices[0] : cfg.opacity;
    var strength = cfg.baseStrength;

    var n = size * size;
    var before = new Float32Array(n), after = new Float32Array(n);
    var lost = new Uint8Array(n), touchedMask = new Uint8Array(n);
    var lostCount = 0, clipped = 0, touched = 0;

    for (var y = 0, i = 0; y < size; y++) {
      var row = ((box.y + y) * W + box.x) * 4;
      for (var x = 0; x < size; x++, i++) {
        var a = m.data[i] * gain * strength;
        if (a <= 0) { // fully transparent: leave the byte exactly as it was
          var q = row + x * 4;
          before[i] = after[i] = 0.299 * px[q] + 0.587 * px[q + 1] + 0.114 * px[q + 2];
          continue;
        }
        touchedMask[i] = 1;
        if (a >= ceiling) { a = ceiling; lost[i] = 1; lostCount++; }
        touched++;

        // The mark's own colour, per pixel where the mask carries it: the core is
        // white and the stroke black, so one scalar cannot serve both.
        var col = m.overlay ? m.overlay[i] : overlay;
        var p = row + x * 4, inv = 1 / (1 - a), off = a * col;
        before[i] = 0.299 * px[p] + 0.587 * px[p + 1] + 0.114 * px[p + 2];
        for (var c = 0; c < 3; c++) {
          var v = (px[p + c] - off) * inv;
          if (v < 0) { v = 0; clipped++; } else if (v > 255) { v = 255; clipped++; }
          px[p + c] = v + 0.5 | 0;
        }
        after[i] = 0.299 * px[p] + 0.587 * px[p + 1] + 0.114 * px[p + 2];
      }
    }

    var diffused = 0;
    var wantDiffusion = cfg.edgeDiffusion === "on" ||
      // "Auto activates for high opacity with grey masks."
      (cfg.edgeDiffusion === "auto" && lostCount > 0 && gain * strength >= 1.0);
    if (wantDiffusion && lostCount > 0) {
      diffused = diffuse(img, box, lost, cfg);
    }

    // Quality: the fraction of the mark's amplitude removed. 1 is clean, so
    // "warn if <= threshold" reads the same way round as the reference's control.
    var removal = touched > 0
      ? markRemoval(m.data, before, after, touchedMask, size)
      : { quality: 1, amplitude: 0, residual: 0 };

    return {
      box: box,
      lost: lostCount,
      diffused: diffused,
      clipped: clipped,
      touched: touched,
      quality: removal.quality,
      markAmplitude: removal.amplitude,   // the mark's strength in luma bytes
      residualAmplitude: removal.residual, // what is left of it
      // Shape-only diagnostic; see markResidual for why it is not the headline.
      shapeResidual: markResidual(m.data, after, size, touchedMask, false),
      alphaPeak: Math.min(ceiling, maskPeak(m) * gain * strength)
    };
  }

  /**
   * Fill pixels the inverse could not recover, by diffusing their neighbours
   * inward (Jacobi iterations on the Laplacian). This is a plausible fill from
   * surrounding real pixels -- not a model, and not the true original.
   */
  function diffuse(img, box, lost, cfg) {
    var size = box.size, W = img.width, px = img.data, n = size * size;

    // Dilate the unrecoverable set so the seam sits on solid pixels.
    var region = lost;
    for (var r = 0; r < cfg.dilationRadius; r++) {
      var grown = new Uint8Array(n);
      for (var y = 0; y < size; y++) {
        for (var x = 0; x < size; x++) {
          var i = y * size + x;
          if (region[i]) { grown[i] = 1; continue; }
          if ((x > 0 && region[i - 1]) || (x < size - 1 && region[i + 1]) ||
              (y > 0 && region[i - size]) || (y < size - 1 && region[i + size])) grown[i] = 1;
        }
      }
      region = grown;
    }

    var count = 0;
    for (var k = 0; k < n; k++) if (region[k]) count++;
    if (!count) return 0;

    // Seed from the current (recovered) values and relax.
    var buf = [new Float32Array(n * 3), new Float32Array(n * 3)];
    for (var y2 = 0, i2 = 0; y2 < size; y2++) {
      var row = ((box.y + y2) * W + box.x) * 4;
      for (var x2 = 0; x2 < size; x2++, i2++) {
        var p = row + x2 * 4;
        for (var c = 0; c < 3; c++) buf[0][i2 * 3 + c] = buf[1][i2 * 3 + c] = px[p + c];
      }
    }

    var src = 0;
    for (var pass = 0; pass < cfg.maxDiffusionPasses; pass++) {
      var a = buf[src], b = buf[1 - src];
      for (var yy = 0; yy < size; yy++) {
        for (var xx = 0; xx < size; xx++) {
          var idx = yy * size + xx;
          if (!region[idx]) continue;
          var base = idx * 3;
          for (var ch = 0; ch < 3; ch++) {
            var sum = 0, cnt = 0;
            if (xx > 0)        { sum += a[base - 3 + ch]; cnt++; }
            if (xx < size - 1) { sum += a[base + 3 + ch]; cnt++; }
            if (yy > 0)        { sum += a[base - size * 3 + ch]; cnt++; }
            if (yy < size - 1) { sum += a[base + size * 3 + ch]; cnt++; }
            b[base + ch] = cnt ? sum / cnt : a[base + ch];
          }
        }
      }
      src = 1 - src;
    }

    // Feather the result in, so the patch does not edge against recovered pixels.
    var solved = buf[src], w = cfg.diffusionStrength;
    for (var y3 = 0, i3 = 0; y3 < size; y3++) {
      var row3 = ((box.y + y3) * W + box.x) * 4;
      for (var x3 = 0; x3 < size; x3++, i3++) {
        if (!region[i3]) continue;
        // Core pixels take the fill fully; dilated collar blends by strength.
        var weight = lost[i3] ? 1 : w;
        var p3 = row3 + x3 * 4;
        for (var c3 = 0; c3 < 3; c3++) {
          var v = px[p3 + c3] * (1 - weight) + solved[i3 * 3 + c3] * weight;
          px[p3 + c3] = v < 0 ? 0 : v > 255 ? 255 : v + 0.5 | 0;
        }
      }
    }
    return count;
  }

  /**
   * Resolve OPACITY "auto": try each calibrated value and keep the one whose
   * result looks least like a residual mark. A leftover sparkle correlates
   * with the mask; an over-correction leaves a dark one. Both show up as
   * |correlation between mask alpha and the cleaned luma|, so minimise that.
   */
  function pickOpacity(img, box, mask, cfg) {
    var choices = cfg.opacityChoices || DEFAULTS.opacityChoices;
    var size = box.size, W = img.width;
    var m = resizeMask(mask, size), n = size * size;
    var best = { opacity: choices[0], residual: Infinity, stats: null };

    for (var k = 0; k < choices.length; k++) {
      // Work on a copy so each trial starts from the untouched pixels.
      var trial = new ImageData(new Uint8ClampedArray(img.data), img.width, img.height);
      var stats = unblendRegion(trial, box, mask, settings(
        Object.assign({}, cfg, { opacity: choices[k], edgeDiffusion: "off" })
      ));
      var luma = new Float32Array(n);
      for (var y = 0, i = 0; y < size; y++) {
        var row = ((box.y + y) * W + box.x) * 4;
        for (var x = 0; x < size; x++, i++) {
          var p = row + x * 4;
          luma[i] = 0.299 * trial.data[p] + 0.587 * trial.data[p + 1] + 0.114 * trial.data[p + 2];
        }
      }
      var residual = Math.abs(pearson(m.data, luma, n));
      if (residual < best.residual) {
        best = { opacity: choices[k], residual: residual, stats: stats };
      }
    }
    return best;
  }

  /* ------------------------------------------------------------------ images */

  function canvasOf(w, h) {
    var c = (typeof OffscreenCanvas !== "undefined")
      ? new OffscreenCanvas(w, h) : document.createElement("canvas");
    c.width = w; c.height = h;
    return c;
  }

  /**
   * Decide where the mark is and how big it is.
   *
   * `cfg.markSize` pins the size; `cfg.position` pins the corner. Whatever is
   * not pinned is measured from the frame, because the reference geometry is
   * only a guess and real output varies with resolution.
   */
  function resolvePlacement(img, mask, cfg) {
    var score = null, markSize, anchored = false, confident = null;

    if (cfg.markSize && cfg.position) {
      markSize = Math.round(cfg.markSize);
    } else if (cfg.position) {
      // Position pinned, size not: measure the size where the mark was pinned.
      var sized = detectSizeAt(img, mask, cfg.position.x | 0, cfg.position.y | 0,
                              defaultBox(img.width, img.height, 1).size);
      markSize = sized.size;
      score = sized.score;
    } else {
      var found = detectScaled(img, mask, {
        base: defaultBox(img.width, img.height, 1).size,
        corner: cfg.corner
      });
      score = found.score;
      anchored = !!found.anchored;
      confident = found.confident;
      markSize = cfg.markSize ? Math.round(cfg.markSize) : found.size;
      if (!cfg.position) cfg = Object.assign({}, cfg, { position: { x: found.x, y: found.y } });
    }

    // MASK SIZE x grows the treated area concentrically around the mark.
    var size = Math.max(8, Math.round(markSize * (cfg.maskScale || 1)));
    var grow = Math.round((size - markSize) / 2);
    var box = {
      x: Math.max(0, Math.min(img.width - size, (cfg.position.x | 0) - grow)),
      y: Math.max(0, Math.min(img.height - size, (cfg.position.y | 0) - grow)),
      size: size
    };
    return {
      box: box, score: score, markSize: markSize, position: cfg.position,
      // `anchored` = the roaming search was overruled by the corner prior.
      // `confident` = false means no placement looked like the mask; the result
      // is a guess and the caller should say so rather than present a number.
      anchored: anchored, confident: confident
    };
  }

  /** "auto" opacity means: solve for the real gain. A number means: use it. */
  function resolveOpacity(img, box, mask, cfg, hooks) {
    if (cfg.opacity !== "auto") return { cfg: settings(cfg), info: null };
    var solved = solveGain(img, box, mask, cfg);
    var used = settings(Object.assign({}, cfg, { opacity: solved.gain }));
    if (hooks && hooks.onOpacity) hooks.onOpacity(solved.gain, solved.residual);
    return { cfg: used, info: solved };
  }

  async function processImage(file, cfg, hooks) {
    cfg = settings(cfg);
    hooks = hooks || {};
    var bitmap = await createImageBitmap(file);
    var canvas = canvasOf(bitmap.width, bitmap.height);
    var ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close && bitmap.close();

    var img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    var mask = cfg.mask || defaultMask();
    var placed = resolvePlacement(img, mask, cfg);

    var resolved = resolveOpacity(img, placed.box, mask, cfg, hooks);
    var stats = unblendRegion(img, placed.box, mask, resolved.cfg);
    stats.detectScore = placed.score;
    stats.detectAnchored = placed.anchored;
    stats.detectConfident = placed.confident;
    stats.opacityUsed = resolved.cfg.opacity;
    stats.strokeAlpha = resolved.cfg.strokeAlpha;
    stats.markSize = placed.markSize;
    stats.gainSolved = resolved.info ? resolved.info.solved : null;
    ctx.putImageData(img, 0, 0);

    var blob = canvas.convertToBlob
      ? await canvas.convertToBlob({ type: "image/png" })
      : await new Promise(function (r) { canvas.toBlob(r, "image/png"); });
    return { blob: blob, stats: stats, width: canvas.width, height: canvas.height };
  }

  /** Render before/after crops for the preview panes. */
  async function previewCrops(source, cfg, zoom) {
    cfg = settings(cfg);
    var bitmap = await createImageBitmap(source);
    var canvas = canvasOf(bitmap.width, bitmap.height);
    var ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close && bitmap.close();

    var img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    var mask = cfg.mask || defaultMask();
    var placed = resolvePlacement(img, mask, cfg);

    var resolved = resolveOpacity(img, placed.box, mask, cfg, null);

    var cleaned = new ImageData(new Uint8ClampedArray(img.data), img.width, img.height);
    var stats = unblendRegion(cleaned, placed.box, mask, resolved.cfg);
    stats.detectScore = placed.score;
    stats.detectAnchored = placed.anchored;
    stats.detectConfident = placed.confident;
    stats.opacityUsed = resolved.cfg.opacity;
    stats.strokeAlpha = resolved.cfg.strokeAlpha;
    stats.markSize = placed.markSize;
    stats.gainSolved = resolved.info ? resolved.info.solved : null;

    // A window around the mark, so the user sees the mark and its surroundings.
    var pad = Math.round(placed.box.size * (zoom === false ? 1.6 : 0.6));
    var cx = placed.box.x + placed.box.size / 2, cy = placed.box.y + placed.box.size / 2;
    var side = placed.box.size + pad * 2;
    var sx = Math.max(0, Math.min(img.width - side, Math.round(cx - side / 2)));
    var sy = Math.max(0, Math.min(img.height - side, Math.round(cy - side / 2)));
    side = Math.min(side, img.width - sx, img.height - sy);

    return {
      box: placed.box, stats: stats, position: placed.position,
      crop: { x: sx, y: sy, size: side },
      original: img, cleaned: cleaned,
      width: img.width, height: img.height
    };
  }

  /* ------------------------------------------------------------------- video */

  function codecDescription(file, track) {
    // mp4box.all.js exposes DataStream as its own global; MP4Box itself only
    // carries createFile.
    var DS = global.DataStream || (global.MP4Box && global.MP4Box.DataStream);
    if (!DS) throw new Error("mp4box DataStream is unavailable — is vendor/mp4box.all.min.js loaded?");

    var trak = file.getTrackById(track.id);
    var entries = trak.mdia.minf.stbl.stsd.entries;
    for (var i = 0; i < entries.length; i++) {
      var box = entries[i].avcC || entries[i].hvcC || entries[i].vpcC || entries[i].av1C;
      if (!box) continue;
      var stream = new DS(undefined, 0, DS.BIG_ENDIAN);
      box.write(stream);
      return new Uint8Array(stream.buffer, 8); // strip the 8-byte box header
    }
    return null;
  }

  var FREQ_INDEX = [96000, 88200, 64000, 48000, 44100, 32000, 24000, 22050,
                    16000, 12000, 11025, 8000, 7350];

  /**
   * AAC AudioSpecificConfig for the muxer. Prefer the real esds bytes; fall
   * back to synthesising AAC-LC config from the sample rate and channel count,
   * which is correct for every Gemini clip and keeps audio passthrough working
   * even when the esds layout is unexpected.
   */
  function audioDescription(file, track) {
    try {
      var entries = file.getTrackById(track.id).mdia.minf.stbl.stsd.entries;
      for (var i = 0; i < entries.length; i++) {
        var esds = entries[i].esds;
        if (esds && esds.esd) {
          var descs = esds.esd.descs || [];
          for (var j = 0; j < descs.length; j++) {
            var inner = descs[j].descs || [];
            for (var k = 0; k < inner.length; k++) {
              if (inner[k].data && inner[k].data.length) return new Uint8Array(inner[k].data);
            }
          }
        }
      }
    } catch (e) { /* fall through to the synthesised config */ }

    var rate = track.audio ? track.audio.sample_rate : 44100;
    var channels = track.audio ? track.audio.channel_count : 2;
    var idx = FREQ_INDEX.indexOf(rate);
    if (idx < 0) idx = 4;
    // 5 bits objectType(2=AAC-LC) | 4 bits freqIndex | 4 bits channelConfig
    var bits = (2 << 11) | (idx << 7) | (channels << 3);
    return new Uint8Array([(bits >> 8) & 0xff, bits & 0xff]);
  }

  async function demux(buffer) {
    var file = global.MP4Box.createFile();
    var info = await new Promise(function (resolve, reject) {
      file.onReady = resolve;
      file.onError = function (e) { reject(new Error("mp4box: " + e)); };
      buffer.fileStart = 0;
      file.appendBuffer(buffer);
      file.flush();
    });
    if (!info.videoTracks || !info.videoTracks.length) throw new Error("no video track in this file");

    var video = info.videoTracks[0];
    var audio = (info.audioTracks || [])[0] || null;
    var samples = { video: [], audio: [] };

    // The whole file is already in memory, so mp4box delivers every sample
    // synchronously during start()/flush() -- possibly across several onSamples
    // calls. Collect them all rather than racing a promise: an earlier version
    // resolved immediately after start() and could continue with nothing
    // collected, which silently produced a track with no data.
    file.onSamples = function (id, user, list) {
      var bucket = user === "v" ? samples.video : samples.audio;
      for (var i = 0; i < list.length; i++) bucket.push(list[i]);
    };
    file.setExtractionOptions(video.id, "v", { nbSamples: Number.MAX_SAFE_INTEGER });
    if (audio) file.setExtractionOptions(audio.id, "a", { nbSamples: Number.MAX_SAFE_INTEGER });
    file.start();
    file.flush();

    if (!samples.video.length) {
      throw new Error(
        "no video samples could be extracted (track reports " + video.nb_samples +
        "). The file may be fragmented or truncated.");
    }

    return { file: file, info: info, video: video, audio: audio, samples: samples };
  }

  async function pickEncoderConfig(width, height, bitrate, fps) {
    var candidates = ["avc1.640034", "avc1.640028", "avc1.4d0028", "avc1.42e01f"];
    for (var i = 0; i < candidates.length; i++) {
      var config = {
        codec: candidates[i], width: width, height: height,
        bitrate: bitrate, framerate: fps,
        avc: { format: "avc" }
      };
      try {
        var support = await VideoEncoder.isConfigSupported(config);
        if (support && support.supported) return config;
      } catch (e) { /* try the next profile */ }
    }
    throw new Error("no supported H.264 encoder configuration for " + width + "x" + height);
  }

  async function processVideo(file, cfg, hooks) {
    cfg = settings(cfg);
    hooks = hooks || {};
    if (typeof VideoDecoder === "undefined" || typeof VideoEncoder === "undefined") {
      throw new Error("this browser has no WebCodecs support (needs Chrome/Edge 94+)");
    }

    var buffer = await file.arrayBuffer();
    var d = await demux(buffer);
    var track = d.video;
    var width = track.video.width, height = track.video.height;
    var duration = d.info.duration / d.info.timescale;
    var fps = duration > 0 ? track.nb_samples / duration : 30;

    if (width % 2 || height % 2) throw new Error(width + "x" + height + " has an odd dimension");

    var mask = cfg.mask || defaultMask();
    var canvas = canvasOf(width, height);
    var ctx = canvas.getContext("2d", { willReadFrequently: true });

    // Every track must start at timestamp zero -- the muxer rejects a non-zero
    // first chunk outright -- and real clips often do not oblige. In this sample
    // the video begins 0.083 s after the audio, so no single shared offset can
    // put both at zero, and rebasing each track by its own start would silently
    // slide the audio 83 ms against the picture.
    //
    // So the video is rebased to its own start, and the audio that precedes the
    // first frame is dropped rather than pulled forward. Sync is then preserved
    // to within one AAC packet (~21 ms) instead of being off by the whole gap,
    // and the only cost is audio from a stretch that has no video anyway.
    var usMicros = function (s) { return Math.round((1e6 * s.cts) / s.timescale); };
    var usDur = function (s) { return Math.round((1e6 * s.duration) / s.timescale); };
    var baseTs = Infinity, ti;
    for (ti = 0; ti < d.samples.video.length; ti++) {
      baseTs = Math.min(baseTs, usMicros(d.samples.video[ti]));
    }
    if (!isFinite(baseTs)) baseTs = 0;

    // Bitrate: keep the source's, with a floor generous enough that the
    // re-encode does not visibly cost quality, then apply the user's multiplier.
    var sourceBits = duration > 0 ? (file.size * 8) / duration : 4e6;
    var floor = width * height * fps * 0.15;
    var bitrate = Math.round(Math.max(sourceBits * 1.2, floor) * cfg.bitrateScale);

    var encoderConfig = await pickEncoderConfig(width, height, bitrate, fps);
    var target = new global.Mp4Muxer.ArrayBufferTarget();
    var muxerOptions = {
      target: target,
      video: { codec: "avc", width: width, height: height },
      fastStart: "in-memory"
    };
    // Only declare an audio track if there are actually audio samples to put in
    // it. A declared-but-empty track never receives a decoder config, and the
    // muxer then dereferences that null while writing the sample description --
    // surfacing as a bare "Cannot read properties of null (reading
    // 'colorSpace')" with nothing pointing at the real cause.
    var hasAudio = !!d.audio && d.samples.audio.length > 0 && !cfg.dropAudio;
    if (hasAudio) {
      muxerOptions.audio = {
        codec: "aac",
        numberOfChannels: d.audio.audio.channel_count,
        sampleRate: d.audio.audio.sample_rate
      };
    }
    var muxer = new global.Mp4Muxer.Muxer(muxerOptions);

    var encodeErr = null;
    var videoChunks = 0;
    // The muxer builds its video track from the first chunk it is handed, and
    // needs a decoderConfig at that moment; Chrome supplies one only on the
    // encoder's first output and sends bare {} afterwards. Hold chunks back until
    // a config has arrived, then replay them, so the track can never be created
    // configless (which surfaces only as a null dereference inside the muxer).
    var videoMeta = null;
    var pending = [];
    // A throw inside a WebCodecs output callback does not reach the awaiting
    // code -- it is reported as an unhandled error and lost. That is how a
    // rejected-every-chunk muxer error stayed invisible until finalize() failed
    // on something unrelated. Capture it and re-throw it where it can be seen.
    var muxErr = null;
    var encoder = new VideoEncoder({
      output: function (chunk, meta) {
        if (meta && meta.decoderConfig) videoMeta = meta;
        videoChunks++;
        try {
          if (!videoMeta) { pending.push(chunk); return; }
          while (pending.length) muxer.addVideoChunk(pending.shift(), videoMeta);
          muxer.addVideoChunk(chunk, videoMeta);
        } catch (e) {
          if (!muxErr) muxErr = e;
        }
      },
      error: function (e) { encodeErr = e; }
    });
    encoder.configure(encoderConfig);

    // Placement and opacity are decided once, on the first frame, then held
    // for the whole clip -- the mark does not move between frames.
    var box = null, used = cfg, stats = null, detectScore = null, frames = 0;
    var detectAnchored = false, detectConfident = null;
    var markSize = null, worstQuality = 1;

    var decodeErr = null;
    var decoder = new VideoDecoder({
      output: function (frame) {
        try {
          ctx.drawImage(frame, 0, 0);
          var ts = frame.timestamp, dur = frame.duration;
          frame.close();

          if (!box) {
            var probe = ctx.getImageData(0, 0, width, height);
            var placed = resolvePlacement(probe, mask, cfg);
            box = placed.box; detectScore = placed.score; markSize = placed.markSize;
            detectAnchored = placed.anchored; detectConfident = placed.confident;
            used = resolveOpacity(probe, box, mask, cfg, hooks).cfg;
            if (hooks.onPlacement) hooks.onPlacement(box, detectScore, markSize, placed);
          }

          // Only the mark's box is read back and rewritten, so cost barely
          // changes with resolution.
          var roi = ctx.getImageData(box.x, box.y, box.size, box.size);
          var shifted = { x: 0, y: 0, size: box.size };
          stats = unblendRegion(roi, shifted, mask, used);
          if (stats.quality < worstQuality) worstQuality = stats.quality;
          ctx.putImageData(roi, box.x, box.y);

          var out = new VideoFrame(canvas, { timestamp: ts - baseTs, duration: dur });
          encoder.encode(out);
          out.close();
          frames++;
          if (hooks.onProgress && frames % 5 === 0) hooks.onProgress(frames, track.nb_samples);
        } catch (e) { decodeErr = e; }
      },
      error: function (e) { decodeErr = e; }
    });

    decoder.configure({
      codec: track.codec,
      codedWidth: width,
      codedHeight: height,
      description: codecDescription(d.file, track) || undefined
    });

    for (var i = 0; i < d.samples.video.length; i++) {
      var s = d.samples.video[i];
      decoder.decode(new EncodedVideoChunk({
        type: s.is_sync ? "key" : "delta",
        timestamp: (1e6 * s.cts) / s.timescale,
        duration: (1e6 * s.duration) / s.timescale,
        data: s.data
      }));
      // Backpressure: let the output callback drain rather than queueing the
      // whole clip's worth of decoded frames into memory.
      if (decoder.decodeQueueSize > 12) {
        while (decoder.decodeQueueSize > 4) {
          await new Promise(function (r) { setTimeout(r, 1); });
          if (decodeErr) throw decodeErr;
        }
      }
      if (decodeErr) throw decodeErr;
    }

    await decoder.flush();
    decoder.close();
    if (decodeErr) throw decodeErr;
    await encoder.flush();
    encoder.close();
    if (encodeErr) throw encodeErr;
    if (muxErr) throw muxErr;

    if (!videoChunks) {
      throw new Error(
        "the encoder produced no data for " + frames + " decoded frame(s). " +
        "Try a lower VIDEO BITRATE or a different clip.");
    }
    if (!videoMeta) {
      throw new Error(
        "the encoder never reported a decoder configuration for " + videoChunks +
        " chunk(s), so the output cannot be described. This browser's H.264 " +
        "encoder may not support the 'avc' bitstream format.");
    }
    if (pending.length) {
      throw new Error(pending.length + " encoded chunk(s) were never muxed");
    }

    // Audio rides through as-is: the encoded AAC packets are copied into the
    // new container without ever being decoded.
    var audioCopied = 0, audioSkew = 0, audioTrimmed = 0;
    if (hasAudio) {
      var desc = audioDescription(d.file, d.audio);
      var meta = {
        decoderConfig: {
          codec: d.audio.codec || "mp4a.40.2",
          numberOfChannels: d.audio.audio.channel_count,
          sampleRate: d.audio.audio.sample_rate,
          description: desc
        }
      };
      var audioStart = null;
      for (var a = 0; a < d.samples.audio.length; a++) {
        var as = d.samples.audio[a];
        var ats = usMicros(as), adur = usDur(as);
        // Skip packets that finish before the first video frame.
        if (ats + adur <= baseTs) continue;
        if (audioStart === null) audioStart = ats;
        muxer.addAudioChunkRaw(
          as.data, "key",
          Math.max(0, ats - audioStart),
          adur,
          audioCopied === 0 ? meta : undefined
        );
        audioCopied++;
      }
      // How far the kept audio still sits from the first frame, in microseconds.
      audioSkew = audioStart === null ? 0 : audioStart - baseTs;
      audioTrimmed = d.samples.audio.length - audioCopied;
    }

    muxer.finalize();
    return {
      blob: new Blob([target.buffer], { type: "video/mp4" }),
      frames: frames,
      width: width, height: height, fps: fps,
      box: box,
      stats: stats,
      detectScore: detectScore,
      detectAnchored: detectAnchored,
      detectConfident: detectConfident,
      markSize: markSize,
      opacityUsed: used.opacity,
      worstQuality: worstQuality,
      bitrate: bitrate,
      videoChunks: videoChunks,
      audio: hasAudio ? {
        copied: audioCopied,
        codec: d.audio.codec,
        channels: d.audio.audio.channel_count,
        sampleRate: d.audio.audio.sample_rate,
        // Packets dropped because they preceded the first video frame, and the
        // residual offset of the kept audio (microseconds, under one packet).
        trimmed: audioTrimmed,
        skewUs: audioSkew
      } : null,
      // Distinguishes "this clip is silent" from "we failed to carry its audio".
      audioDropped: !!d.audio && !hasAudio
    };
  }

  /* --------------------------------------------------------------- calibrate */

  /**
   * Measure a mask from watermarked samples, the same least-squares fit as the
   * Python calibrator: across samples with known flat backgrounds o,
   *
   *   f = a*c + (1-a)*o
   *
   * is a line in o with slope (1-a), so alpha and the overlay colour fall out.
   * Two clearly different tones are enough.
   */
  /**
   * Derive the mask from solid-black samples: alpha = luma / overlayLuma.
   *
   * Exact for a mark of known colour, because nothing of the background survives
   * the blend to confuse it. Averaged over however many samples are supplied.
   */
  function calibrateOnBlack(samples, W, H, opts) {
    var overlay = opts.overlayLuma || 255;
    var tol = opts.tolerance || 6, pad = 4;
    var minX = W, minY = H, maxX = -1, maxY = -1, k, y, x, p, l;

    for (k = 0; k < samples.length; k++) {
      var px = samples[k].img.data;
      for (y = 0; y < H; y++) {
        for (x = 0; x < W; x++) {
          p = (y * W + x) * 4;
          l = 0.299 * px[p] + 0.587 * px[p + 1] + 0.114 * px[p + 2];
          if (l <= tol) continue;
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < 0) {
      throw new Error("no mark found: the sample is entirely black, so it carries no watermark");
    }

    var bx = Math.max(0, minX - pad), by = Math.max(0, minY - pad);
    var size = Math.max(maxX + 1 + pad - bx, maxY + 1 + pad - by);
    size = Math.min(size, W - bx, H - by);

    var n = size * size;
    var alpha = new Float32Array(n), colour = new Float32Array(n * 3);
    var peak = 0, residual = 0, residualN = 0;

    for (y = 0; y < size; y++) {
      for (x = 0; x < size; x++) {
        var i = y * size + x;
        p = ((by + y) * W + (bx + x)) * 4;
        var sum = 0;
        for (k = 0; k < samples.length; k++) {
          var d = samples[k].img.data;
          sum += 0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2];
        }
        var mean = sum / samples.length;
        var a = Math.max(0, Math.min(1, mean / overlay));
        if (a < 1 / 255) a = 0;
        alpha[i] = a;
        if (a > peak) peak = a;
        colour[i * 3] = colour[i * 3 + 1] = colour[i * 3 + 2] = overlay;

        for (k = 0; k < samples.length; k++) {
          var dd = samples[k].img.data;
          var obs = 0.299 * dd[p] + 0.587 * dd[p + 1] + 0.114 * dd[p + 2];
          residual += Math.abs(a * overlay - obs);
          residualN++;
        }
      }
    }

    return {
      mask: { size: size, data: alpha },
      box: { x: bx, y: by, size: size },
      resolution: { width: W, height: H },
      peakAlpha: peak,
      overlayLuma: overlay,
      residual: residual / Math.max(1, residualN),
      inset: { x: W - bx - size, y: H - by - size },
      method: "solid black (alpha = luma / " + overlay + ")"
    };
  }

  function calibrate(samples, opts) {
    opts = opts || {};
    if (!samples.length) throw new Error("no calibration samples");

    var W = samples[0].img.width, H = samples[0].img.height;
    for (var s = 0; s < samples.length; s++) {
      if (samples[s].img.width !== W || samples[s].img.height !== H) {
        throw new Error("all calibration samples must be the same resolution");
      }
    }

    var lo = Infinity, hi = -Infinity;
    for (var b = 0; b < samples.length; b++) {
      var bg = samples[b].background;
      var luma = 0.299 * bg[0] + 0.587 * bg[1] + 0.114 * bg[2];
      lo = Math.min(lo, luma); hi = Math.max(hi, luma);
    }
    // Over a black background the composite collapses to f = alpha * c, so a
    // single solid-black sample yields alpha directly once the mark's colour is
    // assumed (that is exactly what the reference's OVERLAY LUMA is for, white by
    // default). Far easier to produce than two matched tones, and exact rather
    // than fitted -- real Gemini output measured this way peaks at luma 129,
    // i.e. alpha 0.5059.
    if (hi <= 6) return calibrateOnBlack(samples, W, H, opts);

    if (samples.length < 2) {
      throw new Error(
        "a single sample only works when its background is solid black. Either use " +
        "a black one, or add a second clearly different tone such as solid mid-grey");
    }
    if (hi - lo < 24) {
      throw new Error("sample backgrounds differ by only " + Math.round(hi - lo) +
        " levels; use clearly different tones such as solid black and solid mid-grey, " +
        "or supply a single solid black sample on its own");
    }

    // Locate the mark: anything deviating from the flat background.
    var tol = opts.tolerance || 6, pad = 4;
    var minX = W, minY = H, maxX = -1, maxY = -1;
    for (var k = 0; k < samples.length; k++) {
      var px = samples[k].img.data, bgk = samples[k].background;
      for (var y = 0; y < H; y++) {
        for (var x = 0; x < W; x++) {
          var p = (y * W + x) * 4;
          if (Math.abs(px[p] - bgk[0]) > tol || Math.abs(px[p + 1] - bgk[1]) > tol ||
              Math.abs(px[p + 2] - bgk[2]) > tol) {
            if (x < minX) minX = x; if (x > maxX) maxX = x;
            if (y < minY) minY = y; if (y > maxY) maxY = y;
          }
        }
      }
    }
    if (maxX < 0) throw new Error("no mark found: nothing deviates from the flat background");

    var bx = Math.max(0, minX - pad), by = Math.max(0, minY - pad);
    var size = Math.max(Math.min(W - bx, maxX + 1 + pad - bx), Math.min(H - by, maxY + 1 + pad - by));
    size = Math.min(size, W - bx, H - by);

    var n = size * size;
    var alpha = new Float32Array(n), colour = new Float32Array(n * 3);
    var residual = 0, residualN = 0, N = samples.length;

    for (var yy = 0, i = 0; yy < size; yy++) {
      for (var xx = 0; xx < size; xx++, i++) {
        var p2 = ((by + yy) * W + (bx + xx)) * 4;
        // Pool the three channels: one alpha governs all of them.
        var num = 0, den = 0, fmean = [0, 0, 0], omean = [0, 0, 0], c;
        for (var m = 0; m < N; m++) {
          for (c = 0; c < 3; c++) {
            fmean[c] += samples[m].img.data[p2 + c] / N;
            omean[c] += samples[m].background[c] / N;
          }
        }
        for (var m2 = 0; m2 < N; m2++) {
          for (c = 0; c < 3; c++) {
            var df = samples[m2].img.data[p2 + c] - fmean[c];
            var doo = samples[m2].background[c] - omean[c];
            num += df * doo; den += doo * doo;
          }
        }
        var slope = den > 1e-9 ? num / den : 1;
        var a = Math.max(0, Math.min(1, 1 - slope));
        if (a < 1 / 255) a = 0;
        alpha[i] = a;

        var safe = Math.max(a, 1 / 255);
        for (c = 0; c < 3; c++) {
          var v = (fmean[c] - slope * omean[c]) / safe;
          colour[i * 3 + c] = Math.max(0, Math.min(255, v));
        }
        for (var m3 = 0; m3 < N; m3++) {
          for (c = 0; c < 3; c++) {
            var recomposed = a * colour[i * 3 + c] + (1 - a) * samples[m3].background[c];
            residual += Math.abs(recomposed - samples[m3].img.data[p2 + c]);
            residualN++;
          }
        }
      }
    }

    var peak = 0, sum = 0, wsum = 0;
    for (var q = 0; q < n; q++) {
      if (alpha[q] > peak) peak = alpha[q];
      sum += alpha[q] * (colour[q * 3] + colour[q * 3 + 1] + colour[q * 3 + 2]) / 3;
      wsum += alpha[q];
    }

    return {
      mask: { size: size, data: alpha },
      box: { x: bx, y: by, size: size },
      resolution: { width: W, height: H },
      peakAlpha: peak,
      overlayLuma: wsum > 0 ? sum / wsum : 255,
      residual: residual / Math.max(1, residualN),
      inset: { x: W - bx - size, y: H - by - size },
      method: "two-tone least squares"
    };
  }

  /** Serialise a mask as a greyscale PNG data URL (luma encodes alpha). */
  function maskToPngBlob(mask, scale) {
    scale = scale || 1;
    var m = scale === 1 ? mask : resizeMask(mask, Math.round(mask.size * scale));
    var canvas = canvasOf(m.size, m.size);
    var ctx = canvas.getContext("2d");
    var img = ctx.createImageData(m.size, m.size);
    for (var i = 0; i < m.size * m.size; i++) {
      var v = Math.round(Math.max(0, Math.min(1, m.data[i])) * 255);
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
      img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return canvas.convertToBlob
      ? canvas.convertToBlob({ type: "image/png" })
      : new Promise(function (r) { canvas.toBlob(r, "image/png"); });
  }

  global.SEEB4 = {
    DEFAULTS: DEFAULTS,
    SPARKLE: SPARKLE,
    REFERENCE: REFERENCE,
    settings: settings,
    sparkleMask: sparkleMask,
    strokedMask: strokedMask,
    maskAt: maskAt,
    chamfer: chamfer,
    STROKE: STROKE,
    seedSizes: seedSizes,
    anchorBoxes: anchorBoxes,
    geminiMask: geminiMask,
    defaultMask: defaultMask,
    maskPeak: maskPeak,
    detectScaled: detectScaled,
    detectSizeAt: detectSizeAt,
    detailScore: detailScore,
    boxScore: boxScore,
    fitScore: fitScore,
    highpassImage: highpassImage,
    boxMean: boxMean,
    solveGain: solveGain,
    markResidual: markResidual,
    markRemoval: markRemoval,
    slopeOnMask: slopeOnMask,
    highpass: highpass,
    maskFromImageData: maskFromImageData,
    resizeMask: resizeMask,
    maskToPngBlob: maskToPngBlob,
    defaultBox: defaultBox,
    detect: detect,
    pearson: pearson,
    unblendRegion: unblendRegion,
    pickOpacity: pickOpacity,
    processImage: processImage,
    processVideo: processVideo,
    previewCrops: previewCrops,
    calibrate: calibrate
  };
})(typeof window !== "undefined" ? window : self);
