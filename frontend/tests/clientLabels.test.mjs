import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { qualityLabel, modelLabel, clientText } from '../src/studio/clientLabels.js';

test('client quality names map without changing submitted resolution IDs', () => {
  assert.equal(qualityLabel('480p'), 'Normal quality');
  assert.equal(qualityLabel('720p'), 'High quality');
  assert.equal(qualityLabel('1080p'), 'Highest quality');
  assert.equal(qualityLabel('1080P'), 'Highest quality');
  assert.equal(modelLabel('wan3_0_prime'), 'Creative Film');
  assert.equal(modelLabel('seedance_2_5'), 'Reference Edit');
});
test('provider status text does not expose engine brands or numeric quality', () => {
  const text = clientText('Higgsfield MCP: Wan 3.0 Prime 480p, Seedance 2.5 Edit 720p, Grok Imagine 1.5 1080p, GPT Image 2');
  assert.doesNotMatch(text, /Higgsfield|Wan|Seedance|Grok|GPT|480p|720p|1080p/i);
  assert.match(text, /Normal quality/);
  assert.match(text, /Highest quality/);
});
test('generation timer is gated by office testing; client history has no timer', () => {
  const studio=readFileSync(new URL('../src/studio/modules/CinematicStudio.jsx', import.meta.url),'utf8');
  const history=readFileSync(new URL('../src/studio/modules/HistoryModule.jsx', import.meta.url),'utf8');
  assert.match(studio, /testingDetailsEnabled\(\) && <GenerationTiming/);
  assert.doesNotMatch(history, /formatElapsed|\['Model',/);
  assert.match(studio, /label:qualityLabel\(id\)/);
  assert.match(studio, /modelLabel\(item.id\)/);
  assert.match(studio, /templateLibraryMode\(tierId, output, guided\)/);
});
