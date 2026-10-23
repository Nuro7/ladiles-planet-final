// Names come from the actual uploaded/selected Flow assets, not user filenames.
// The assets are attached separately; textual names are not a substitute for chips.
export function bindReferenceNames(prompt: string, names: string[], identityIndices: number[] = [], preservePrompt = false): string {
  if (identityIndices.some(i => !Number.isInteger(i) || i < 1 || i > names.length)) throw new Error('The identity reference is missing; nothing was generated.');
  if (preservePrompt || !names.length) return prompt;
  const roles = names.map((_, i) => {
    const match = prompt.match(new RegExp(`(?:^|\\n)Image ${i + 1}:\\s*([^\\n]+)`));
    return match?.[1]?.trim() || 'Use this attached reference according to the scene instructions.';
  });
  let bound = prompt;
  const aliases = ['BRIDE_IDENTITY', 'DRESS_REFERENCE', 'DRESS_FRONT', 'DRESS_DETAIL', 'ENVIRONMENT_REFERENCE'];
  names.forEach((name, i) => {
    for (const alias of aliases) {
      if (roles[i].includes(alias)) {
        // Replace only whole semantic labels, retaining the exact title returned by Flow.
        bound = bound.replace(new RegExp(`\\b${alias}\\b`, 'g'), () => `asset ${JSON.stringify(name)}`);
      }
    }
  });
  const identity = identityIndices.map(i=>JSON.stringify(names[i-1]));
  return bound + '\nEXACT ATTACHED FLOW ASSET NAMES\n' + names.map((name, i) =>
    `Image ${i + 1}: ${JSON.stringify(name)}. Role: ${roles[i]}`).join('\n') +
    '\nThese are the references already attached to this request. Do not select other project images or render the filenames as text.' +
    (identity.length ? '\nIDENTITY AUTHORITY — Only '+identity.join(' and ')+' define the people in this request. Preserve their facial structure, eye spacing, eyebrows, nose, lips, jawline, skin tone and natural asymmetry across every shot. Do not blend in any face from the motion video, dress photos or venue references. Their original clothing is NOT the wardrobe target; use the separate dress references. Keep facial features visible and recognizable; do not hide the face to avoid identity matching.' : '');
}
