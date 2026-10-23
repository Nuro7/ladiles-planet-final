import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const file=path=>readFileSync(new URL('../src/studio/'+path,import.meta.url),'utf8');
test('image viewer expands the framed container, not the raw image, and preserves the entire image',()=>{
  const viewer=file('experience/ImageViewer.jsx'), css=file('experience/imageViewer.css');
  assert.match(viewer,/shell\.current\.requestFullscreen\(\)/);
  assert.match(viewer,/createPortal/);
  assert.match(viewer,/role="dialog" aria-modal="true"/);
  assert.match(css,/object-fit: contain/);
  assert.match(css,/border: 3px solid #d4af63/);
  assert.match(css,/border-radius: clamp/);
  assert.match(viewer,/event.key === 'Escape'/);
  assert.match(viewer,/previousFocus\?\.focus/);
});
test('both generated results and history images open the shared viewer',()=>{
  assert.match(file('modules/CinematicStudio.jsx'),/<ImageViewer src=\{state.url\}/);
  assert.match(file('modules/HistoryModule.jsx'),/onClick=\{\(\) => setSelectedImage\(it\)\}/);
  assert.match(file('modules/HistoryModule.jsx'),/<ImageLightbox src=\{selectedImage.url\}/);
});
