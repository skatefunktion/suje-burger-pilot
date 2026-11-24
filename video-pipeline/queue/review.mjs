import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const checks = ['insideCanvas', 'captionClear', 'proportions', 'readable', 'contrast', 'layerOrder', 'pilotStyle'];
const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
const repo = 'skatefunktion/suje-burger-pilot';
const automationLogin = /devin|automation|(?:^|[-_])bot(?:[-_]|$)|bot$|\[bot\]|^github-actions$/i;

export async function reviewFingerprint(episode, index, scene, readSource = readFile) {
  const hash = createHash('sha256');
  hash.update(JSON.stringify([scene.dur, scene.cap, episode.viewport]));
  for (const source of [
    episode.sources[index],
    ...(episode.reviewSources ?? []),
    ...(episode.reviewDependencies?.[index] ?? []),
    new URL('../scenes/canvas-kit.mjs', import.meta.url),
    new URL('./frames.mjs', import.meta.url),
    new URL('./render-child.mjs', import.meta.url),
  ]) {
    const sourceHash = createHash('sha256').update(await readSource(source)).digest();
    hash.update(sourceHash);
  }
  return hash.digest('hex');
}

function assertChecklist(review, fingerprint, baseline = false) {
  if (typeof review?.reviewer !== 'string' || !review.reviewer.trim() || review.fingerprint !== fingerprint ||
      !checks.every(check => review.checks?.[check] === true || (baseline && check === 'readable'))) {
    throw new Error('Missing or stale visual checklist approval');
  }
}

export function assertPilotSmokeReviewed(review, fingerprint) {
  const baseline = typeof review?.baselineException === 'string' && !!review.baselineException.trim();
  assertChecklist(review, fingerprint, baseline);
  return baseline ? review.baselineException : null;
}

export function createHumanReviewVerifier({
  reviewers = process.env.VIDEO_PIPELINE_HUMAN_REVIEWERS ?? '',
  token = process.env.GITHUB_TOKEN,
  request = fetch,
} = {}) {
  const allowed = new Set(reviewers.toLowerCase().split(/[\s,]+/).filter(Boolean));
  const cache = new Map();
  function get(path, raw = false) {
    if (!cache.has(path)) {
      const headers = {
        Accept: raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      };
      if (token) headers.Authorization = `Bearer ${token}`;
      cache.set(path, request(`https://api.github.com/repos/${path}`, {
        headers, signal: AbortSignal.timeout(15_000),
      }).then(async response => {
        if (raw && response.status === 404) return null;
        if (!response.ok) throw new Error(`GitHub visual approval lookup failed (HTTP ${response.status})`);
        return raw ? Buffer.from(await response.arrayBuffer()) : response.json();
      }));
    }
    return cache.get(path);
  }

  async function matches(ref, fingerprint, fingerprintFrom) {
    if (!/^[a-f0-9]{40}$/.test(ref ?? '')) return false;
    const missing = new Error('Scene source is missing at the requested commit');
    try {
      return await fingerprintFrom(async url => {
        const path = relative(repoRoot, fileURLToPath(url)).split(sep).map(encodeURIComponent).join('/');
        const bytes = await get(`${repo}/contents/${path}?ref=${ref}`, true);
        if (!bytes) throw missing;
        return bytes;
      }) === fingerprint;
    } catch (error) {
      if (error !== missing) throw error;
      return false;
    }
  }

  return async function assertHumanReviewed({ number, expectedHead, base }, fingerprint, fingerprintFrom) {
    if (!Number.isSafeInteger(number) || number < 1) throw new Error('Missing GitHub visual approval PR number');
    const pullPath = `${repo}/pulls/${number}`;
    const pull = await get(pullPath);
    const head = pull.head?.sha;
    if (!/^[a-f0-9]{40}$/.test(head ?? '')) {
      throw new Error('GitHub approval PR does not have an accessible head commit');
    }
    if (expectedHead !== undefined && expectedHead !== head) {
      throw new Error(`PR #${number}'s head changed since this check was triggered`);
    }
    if (base && await matches(base, fingerprint, fingerprintFrom)) return;

    const author = pull.user?.login?.toLowerCase();
    const latest = new Map();
    for (let page = 1; ; page++) {
      const reviews = await get(`${pullPath}/reviews?per_page=100&page=${page}`);
      for (const entry of reviews) {
        const login = entry.user?.login?.toLowerCase();
        if (author && allowed.has(login) && login !== author && !automationLogin.test(login) &&
            ['APPROVED', 'CHANGES_REQUESTED', 'DISMISSED'].includes(entry.state)) latest.set(login, entry);
      }
      if (reviews.length < 100) break;
    }
    if (![...latest.values()].some(entry =>
      entry.user.type === 'User' && entry.state === 'APPROVED' && entry.commit_id === head)) {
      throw new Error(`Visual checklist needs an active GitHub approval from an allowlisted human other than the author on PR #${number}'s head commit`);
    }
    if (!await matches(head, fingerprint, fingerprintFrom)) {
      throw new Error('Scene source on the human-approved PR commit does not match the current fingerprint');
    }
  };
}
