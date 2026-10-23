import { sameAssetName } from './assetNames.js';

export interface UploadedAsset { name: string; ready?: boolean }

// Virtualised tiles need not coexist in the DOM. Remember each ready filename
// across pages and polls; unrelated media and placeholders cannot complete a batch.
export async function waitForNamedUploads<T extends UploadedAsset>(
  names: string[],
  scan: (complete: (assets: T[]) => boolean) => Promise<T[]>,
  timeoutMs: number,
  options: { now?: () => number; pause?: () => Promise<void>; progress?: (done: number) => void } = {},
): Promise<T[]> {
  const now = options.now || Date.now;
  const deadline = now() + timeoutMs;
  const found = new Map<string, T>();
  const remember = (assets: T[]) => {
    for (const expected of names) {
      const match = assets.find(asset => asset.ready === true && sameAssetName(asset.name, expected));
      if (match) found.set(expected, match);
    }
    return found.size === names.length;
  };
  while (now() < deadline) {
    remember(await scan(remember));
    options.progress?.(found.size);
    if (found.size === names.length) return names.map(name => found.get(name)!);
    await (options.pause || (() => new Promise<void>(resolve => setTimeout(resolve, 1200))))();
  }
  const missing = names.filter(name => !found.has(name));
  throw new Error(`Reference upload verification timed out. Missing or still uploading: ${missing.join(', ')}. No generation was submitted; recover this request to reuse uploaded files.`);
}
