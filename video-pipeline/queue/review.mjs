import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const checks = ['insideCanvas', 'captionClear', 'proportions', 'readable', 'contrast', 'layerOrder', 'pilotStyle'];

export async function reviewFingerprint(episode, index, scene) {
  const hash = createHash('sha256');
  hash.update(JSON.stringify([scene.dur, scene.cap, episode.viewport]));
  for (const source of [
    episode.sources[index],
    ...(episode.reviewDependencies?.[index] ?? []),
    new URL('../scenes/canvas-kit.mjs', import.meta.url),
    new URL('./frames.mjs', import.meta.url),
    new URL('./render-child.mjs', import.meta.url),
  ]) {
    const sourceHash = createHash('sha256').update(await readFile(source)).digest();
    hash.update(sourceHash);
  }
  return hash.digest('hex');
}

export function assertReviewed(review, fingerprint, { pilotSmoke = false } = {}) {
  const baseline = pilotSmoke && typeof review?.baselineException === 'string' && !!review.baselineException.trim();
  if (typeof review?.reviewer !== 'string' || !review.reviewer.trim() || review.fingerprint !== fingerprint ||
      !checks.every(check => review.checks?.[check] === true || (baseline && check === 'readable'))) {
    throw new Error('Missing or stale visual checklist approval');
  }
  return baseline ? review.baselineException : null;
}
