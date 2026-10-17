// Owner-confirmed Google Flow prompt tests. Add an entry only after the owner
// reports that the specific tier, mode, output, subject and template passed.
// Keys are independent of card order, so filtering or sorting cannot move a pass.
export const confirmedPromptTests = Object.freeze({
  'flagship:balance:video:couple:FLAGSHIP_GENJUTSU_01': { version: 1, status: 'passed' },
  'flagship:balance:video:couple:FLAGSHIP_GENJUTSU_02': { version: 1, status: 'passed' },
  'budget:balance:image:solo:BRIDAL_IMAGE_01': { version: 2, status: 'passed' },
  'budget:balance:image:solo:BRIDAL_IMAGE_02': { version: 2, status: 'passed' },
  'premium:balance:image:solo:BRIDAL_IMAGE_01': { version: 2, status: 'passed' },
  'premium:balance:image:solo:BRIDAL_IMAGE_02': { version: 2, status: 'passed' },
  // 'budget:speed:video:solo:TEMPLATE_ID': { version: 1, status: 'passed' },
  'budget:balance:video:solo:BRIDAL_REFERENCE_10': { version: 2, status: 'passed' },
  'budget:balance:video:solo:BRIDAL_REFERENCE_11': { version: 2, status: 'passed' },
  'budget:balance:video:solo:BRIDAL_REFERENCE_12': { version: 2, status: 'passed' },
  'budget:balance:video:solo:BRIDAL_REFERENCE_14': { version: 2, status: 'passed' },
  // The saved Flow asset link advanced this card to version 2 without changing its prompt.
  'budget:balance:video:solo:BUDGET_BALANCE_01': { version: 2, status: 'passed' },
});

// This registry fixes the displayed IDs to template identities. Reordering or
// filtering cards must not change the number the owner reports after a test.
const solo = [
  'palace-crimson-reveal', 'lakeside-palace-veil', 'garden-veil-spin',
  'golden-lily-lakeside', 'courtyard-breeze-portrait', 'velvet-couture-room',
  'garden-column-couture', 'white-heritage-couture', 'antique-salon-couture',
  'tropical-portico-story', 'sculpted-romance',
].map(scene => `${scene}:solo`);
const couple = [
  'heart-promise', 'dreamed-moment', 'garden-kiss-embrace',
  'hand-into-forever', 'held-in-spotlight', 'under-flowers-forever',
  'garden-promise-petal-welcome', 'courtyard-first-look',
].map(scene => `${scene}:couple`);
const catalogs = { 1: solo, 2: solo, 3: [...couple, ...solo], 4: [...couple, ...solo] };

export function promptCatalogNumber(modeNumber, scene, subject) {
  const index = catalogs[modeNumber]?.indexOf(`${scene}:${subject}`) ?? -1;
  return index < 0 ? null : `${modeNumber}.${index + 1}`;
}

export function promptTestStatus(tier, mode, kind, subject, assets) {
  if (!assets?.templateId) return 'untested';
  const key = [tier, mode, kind, subject, assets.templateId].join(':');
  const result = confirmedPromptTests[key];
  return result?.status === 'passed' && result.version === assets.version ? 'passed' : 'untested';
}
