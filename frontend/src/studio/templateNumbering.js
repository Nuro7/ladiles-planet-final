// Customer-facing numbering is local to each mode and output library.
// Keep provider/template IDs and the generation prompt itself untouched.
export function templateNumber(scenes, id, kind = 'video') {
  const active = (scenes || []).filter(scene => Object.values(scene.subjects || {}).some(recipe =>
    recipe.available !== false && !recipe.hidden && !recipe.comingSoon &&
    (kind === 'image' ? recipe.hasImagePrompt : recipe.hasVideoPrompt)));
  const index = active.findIndex(scene => scene.id === id);
  return index < 0 ? '' : `#${index + 1}`;
}

export function numberedTemplateLabel(number, label = '') {
  return [number, label.replace(/^(?:#\d+\s*[·.—-]?\s*|\d+\s*[·.—-]\s*)/, '')].filter(Boolean).join(' · ');
}
