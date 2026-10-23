// Premium offers bundles only for the combined output; Flagship stays separate.
export function templateLibraryMode(tier, output, guided) {
  if (tier === 'flagship' || tier === 'premium' && output !== 'both') return 'guided-cards';
  return output === 'both' || ['budget', 'ultrafast'].includes(tier) || !guided
    ? 'bundles-and-cards' : 'guided-cards';
}
