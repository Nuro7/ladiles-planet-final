import test from 'node:test';
import assert from 'node:assert/strict';
import { templateNumber, numberedTemplateLabel } from '../src/studio/templateNumbering.js';
test('numbers active templates consecutively without counting coming soon cards', () => {
  const scene = (id, extra = {}) => ({ id, subjects: { solo: { hasVideoPrompt: true, ...extra } } });
  const scenes = [scene('a'), scene('hidden', {available:false}), scene('b')];
  assert.equal(templateNumber(scenes, 'a'), '#1');
  assert.equal(templateNumber(scenes, 'b'), '#2');
  assert.equal(templateNumber(scenes, 'hidden'), '');
  assert.equal(templateNumber([scene('b')], 'b'), '#1');
});
test('image numbering and labels do not duplicate old numeric prefixes', () => {
  assert.equal(templateNumber([{id:'image',subjects:{solo:{hasImagePrompt:true}}}], 'image', 'image'), '#1');
  assert.equal(numberedTemplateLabel('#1', '01 · Luxury Bridal Film'), '#1 · Luxury Bridal Film');
});
