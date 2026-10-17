/**
 * videoConcatService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Concatenate two (or more) video URLs into a single seamless MP4 using ffmpeg.
 *
 * Used by the Extend feature so the original video + extension play as ONE
 * continuous clip (no pause / seek between them).
 *
 * Strategy: use ffmpeg's `concat` filter which re-encodes both streams to a
 * consistent codec/framerate/sample-rate — works even when the two source
 * videos have slightly different params. Slower than stream-copy concat but
 * far more reliable.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const fs    = require('fs');
const path  = require('path');
const os    = require('os');
const axios = require('axios');
const { spawn } = require('child_process');
const { randomUUID } = require('crypto');

const TMP_DIR = path.join(os.tmpdir(), 'ladies-planet-concat');
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

async function _downloadToTemp(url, label) {
    const ext = (url.split('.').pop() || 'mp4').split('?')[0].slice(0, 4);
    const file = path.join(TMP_DIR, `${label}-${randomUUID()}.${ext}`);
    console.log(`📥 [Concat] Downloading ${label} → ${file}`);
    const r = await axios.get(url, { responseType: 'arraybuffer', timeout: 120000 });
    fs.writeFileSync(file, Buffer.from(r.data));
    return file;
}

/**
 * Concatenate two video URLs into a single MP4.
 * Returns the local file path of the merged video.
 *
 * @param {string[]} urls — list of public video URLs, in playback order
 * @returns {Promise<string>} local file path of the merged MP4
 */
async function concatVideos(urls) {
    if (!urls || urls.length < 2) {
        throw new Error('concatVideos needs at least 2 URLs');
    }

    const start = Date.now();
    const localFiles = [];
    for (let i = 0; i < urls.length; i++) {
        localFiles.push(await _downloadToTemp(urls[i], `clip${i}`));
    }

    const outPath = path.join(TMP_DIR, `merged-${randomUUID()}.mp4`);

    // Build ffmpeg args for concat filter — re-encodes for safety.
    // 2160×3840 vertical (Higgsfield wedding videos) doesn't survive
    // stream-copy concat if framerates differ even slightly.
    const args = [];
    for (const f of localFiles) {
        args.push('-i', f);
    }
    const n = localFiles.length;
    const filterParts = [];
    for (let i = 0; i < n; i++) filterParts.push(`[${i}:v:0][${i}:a:0]`);
    const filter = `${filterParts.join('')}concat=n=${n}:v=1:a=1[v][a]`;

    args.push(
        '-filter_complex', filter,
        '-map', '[v]', '-map', '[a]',
        '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '22',
        '-c:a', 'aac', '-b:a', '192k',
        '-movflags', '+faststart',
        '-y', outPath,
    );

    console.log(`🎬 [Concat] Running ffmpeg on ${n} clips...`);
    await _runFfmpeg(args);

    // Cleanup downloaded clips (keep the merged result for the caller)
    for (const f of localFiles) {
        try { fs.unlinkSync(f); } catch {}
    }
    console.log(`✅ [Concat] Done in ${((Date.now() - start) / 1000).toFixed(1)}s → ${outPath}`);
    return outPath;
}

function _runFfmpeg(args) {
    return new Promise((resolve, reject) => {
        const p = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });
        let stderrTail = '';
        p.stderr.on('data', (d) => {
            // Keep only the last ~2KB of stderr for error reporting.
            stderrTail = (stderrTail + d.toString()).slice(-2000);
        });
        p.on('error', (err) => reject(new Error('ffmpeg spawn failed: ' + err.message)));
        p.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`ffmpeg exit ${code}: ${stderrTail.slice(-500)}`));
        });
    });
}

module.exports = { concatVideos };
