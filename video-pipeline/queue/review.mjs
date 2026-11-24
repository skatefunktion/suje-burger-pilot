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
        if (!response.ok) throw new Error(`GitHub visual approval lookup failed (HTTP ${response.status})`);
        return raw ? Buffer.from(await response.arrayBuffer()) : response.json();
      }));
    }
    return cache.get(path);
  }

  return async function assertHumanReviewed(review, fingerprint, reviewURL, fingerprintFrom) {
    assertChecklist(review, fingerprint);
    const login = review.reviewer.toLowerCase();
    if (!/^[a-z0-9][a-z0-9-]{0,38}$/.test(login) || automationLogin.test(login) || !allowed.has(login)) {
      throw new Error('Visual reviewer must be an allowlisted human GitHub account (VIDEO_PIPELINE_HUMAN_REVIEWERS)');
    }
    if (!Number.isSafeInteger(review.approvalPR) || review.approvalPR < 1) {
      throw new Error('Visual checklist must name its GitHub approval PR (approvalPR)');
    }

    const pullPath = `${repo}/pulls/${review.approvalPR}`;
    const pull = await get(pullPath);
    const head = pull.head?.sha;
    if (pull.user?.login?.toLowerCase() === login) {
      throw new Error('A scene PR author cannot approve their own visual checklist');
    }
    if (!/^[a-f0-9]{40}$/.test(head ?? '')) {
      throw new Error('GitHub approval PR does not have an accessible head commit');
    }

    let latest;
    for (let page = 1; ; page++) {
      const reviews = await get(`${pullPath}/reviews?per_page=100&page=${page}`);
      for (const entry of reviews) {
        if (entry.user?.login?.toLowerCase() === login &&
            ['APPROVED', 'CHANGES_REQUESTED', 'DISMISSED'].includes(entry.state)) latest = entry;
      }
      if (reviews.length < 100) break;
    }
    if (latest?.user?.type !== 'User' || latest.state !== 'APPROVED' || latest.commit_id !== head) {
      throw new Error(`Visual checklist needs an active GitHub approval by ${login} on PR #${review.approvalPR}'s head commit`);
    }

    const readApproved = url => {
      const path = relative(repoRoot, fileURLToPath(url)).split(sep).map(encodeURIComponent).join('/');
      return get(`${repo}/contents/${path}?ref=${head}`, true);
    };
    const pinned = JSON.parse(await readApproved(reviewURL));
    assertChecklist(pinned, fingerprint);
    if (pinned.reviewer.toLowerCase() !== login || pinned.approvalPR !== review.approvalPR) {
      throw new Error('Visual checklist does not match the file on the human-approved PR commit');
    }
    if (await fingerprintFrom(readApproved) !== fingerprint) {
      throw new Error('Scene source on the human-approved PR commit does not match the current fingerprint');
    }
  };
}
