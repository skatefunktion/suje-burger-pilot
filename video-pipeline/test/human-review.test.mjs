import assert from 'node:assert/strict';
import { relative } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { createHumanReviewVerifier, reviewFingerprint } from '../queue/review.mjs';

const head = 'a'.repeat(40);
const root = '/repos/skatefunktion/suje-burger-pilot';
const reviewFile = 'video-pipeline/scenes/ep02/review-01.json';
const reviewURL = new URL('../scenes/ep02/review-01.json', import.meta.url);
const source = 'video-pipeline/scenes/ep02/01.mjs';
const filenames = [source, 'video-pipeline/scenes/canvas-kit.mjs',
  'video-pipeline/queue/frames.mjs', 'video-pipeline/queue/render-child.mjs'];
const contents = new Map(filenames.map(path => [path, Buffer.from(`content of ${path}`)]));
const episode = { sources: [new URL('../scenes/ep02/01.mjs', import.meta.url)] };
const fingerprintFrom = readSource => reviewFingerprint(episode, 0, { cap: '자막', dur: 8 }, readSource);
const localRoot = fileURLToPath(new URL('../../', import.meta.url));
const checklist = {
  reviewer: 'human-reviewer',
  approvalPR: 19,
  fingerprint: await fingerprintFrom(url => contents.get(relative(localRoot, fileURLToPath(url)))),
  checks: {
    insideCanvas: true, captionClear: true, proportions: true, readable: true,
    contrast: true, layerOrder: true, pilotStyle: true,
  },
};
const approval = { user: { login: 'human-reviewer', type: 'User' }, state: 'APPROVED', commit_id: head };

function setup({ author = 'scene-author', reviews = [approval], pinned = checklist,
  fileStatus = 200, approvedSources = contents } = {}) {
  const calls = [];
  const results = {
    [`${root}/pulls/19`]: { user: { login: author }, head: { sha: head, repo: { full_name: 'skatefunktion/suje-burger-pilot' } } },
    [`${root}/pulls/19/reviews?per_page=100&page=1`]: reviews,
    [`${root}/contents/${reviewFile}?ref=${head}`]: JSON.stringify(pinned),
    ...Object.fromEntries([...approvedSources].map(([path, bytes]) => [`${root}/contents/${path}?ref=${head}`, bytes])),
  };
  const assertReviewed = createHumanReviewVerifier({
    reviewers: 'Human-Reviewer, Devin, pipeline-bot, pr-automation',
    token: '',
    async request(address, options) {
      const url = new URL(address);
      const key = url.pathname + url.search;
      assert.equal(url.origin, 'https://api.github.com');
      assert.ok(Object.hasOwn(results, key), key);
      calls.push(key);
      if (key.includes('/contents/')) assert.equal(options.headers.Accept, 'application/vnd.github.raw+json');
      return key.includes('/contents/')
        ? new Response(results[key], { status: fileStatus })
        : Response.json(results[key]);
    },
  });
  return { calls, check: (data = checklist) => assertReviewed(data, checklist.fingerprint, reviewURL, fingerprintFrom) };
}

test('an allowlisted human approval counts only with the exact checklist on the reviewed commit', async () => {
  const { check, calls } = setup();
  await check();
  assert.equal(calls.length, 3 + filenames.length);
  await assert.rejects(setup({ pinned: { ...checklist, fingerprint: 'different' } }).check(), /stale/);
  await assert.rejects(setup({ pinned: { ...checklist, reviewer: 'other-human' } }).check(), /does not match/);
  const approvedSources = new Map(contents).set(source, Buffer.from('different scene actually approved'));
  await assert.rejects(setup({ approvedSources }).check(), /Scene source .* does not match/);
});

test('self-signed JSON, non-allowlisted accounts and automation accounts do not approve a scene', async () => {
  const { check, calls } = setup();
  for (const reviewer of ['Devin', 'pipeline-bot', 'pr-automation', 'human-looking-name']) {
    await assert.rejects(check({ ...checklist, reviewer }), /allowlisted human/);
  }
  await assert.rejects(check({ ...checklist, approvalPR: undefined }), /approvalPR/);
  assert.deepEqual(calls, []);
  await assert.rejects(setup({ author: 'human-reviewer' }).check(), /cannot approve their own/);
  await assert.rejects(setup({ reviews: [{ ...approval, user: { ...approval.user, type: 'Bot' } }] }).check(), /active GitHub approval/);
});

test('approval must be current and the pinned checklist must be available', async () => {
  for (const reviews of [[], [{ ...approval, commit_id: 'b'.repeat(40) }],
    [approval, { ...approval, state: 'CHANGES_REQUESTED' }], [{ ...approval, state: 'DISMISSED' }]]) {
    await assert.rejects(setup({ reviews }).check(), /active GitHub approval/);
  }
  await assert.rejects(setup({ fileStatus: 403 }).check(), /lookup failed \(HTTP 403\)/);
});
