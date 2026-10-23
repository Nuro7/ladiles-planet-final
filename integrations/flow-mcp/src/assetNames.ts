const mediaExtension = /\.(?:png|jpe?g|webp|gif|mp4|mov|webm)$/i;
const escape = (name: string) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Flow's grid and ingredient picker sometimes expose different extension labels.
// Never use prefix matching: stock1 must not select stock10.
export function assetNamePattern(name: string): RegExp {
  const extension = name.match(mediaExtension)?.[0];
  const stem = extension ? name.slice(0, -extension.length) : name;
  const suffix = extension ? `(?:${escape(extension)})?` : '';
  return new RegExp(`^${escape(stem)}${suffix}(?: (?:Image|Video|Avatar|Character))?$`, 'i');
}

export function sameAssetName(actual: string, expected: string): boolean {
  return assetNamePattern(expected).test(actual) || assetNamePattern(actual).test(expected);
}
