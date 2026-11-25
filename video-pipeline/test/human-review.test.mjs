import assert from 'node:assert/strict';
import { relative } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { episode as ep02 } from '../episodes/ep02/episode.mjs';
import { createHumanReviewVerifier, reviewFingerprint } from '../queue/review.mjs';

const head = 'a'.repeat(40);
const base = 'b'.repeat(40);
const root = '/repos/skatefunktion/suje-burger-pilot';
const reviewFile = 'video-pipeline/scenes/ep02/review-01.json';
const source = 'video-pipeline/scenes/ep02/01.mjs';
const filenames = [source, 'video-pipeline/scenes/canvas-kit.mjs',
  'video-pipeline/queue/frames.mjs', 'video-pipeline/queue/render-child.mjs'];
const contents = new Map(filenames.map(path => [path, Buffer.from(`content of ${path}`)]));
const episode = { sources: [new URL('../scenes/ep02/01.mjs', import.meta.url)] };
const fingerprintFrom = readSource => reviewFingerprint(episode, 0, { cap: '자막', dur: 8 }, readSource);
const localRoot = fileURLToPath(new URL('../../', import.meta.url));
const fingerprint = await fingerprintFrom(url => contents.get(relative(localRoot, fileURLToPath(url))));
const approval = { user: { login: 'human-reviewer', type: 'User' }, state: 'APPROVED', commit_id: head };

function setup({ author = 'scene-author', reviews = [approval],
  fileStatus = 200, approvedSources = contents, baseSources = new Map(), json,
  fork = { full_name: 'contributor/suje-burger-pilot' } } = {}) {
  const calls = [];
  const results = {
    [`${root}/pulls/19`]: { user: { login: author }, head: { sha: head, repo: fork } },
    [`${root}/pulls/19/reviews?per_page=100&page=1`]: reviews,
    ...(json === undefined ? {} : { [`${root}/contents/${reviewFile}?ref=${head}`]: json }),
    ...Object.fromEntries([...approvedSources].map(([path, bytes]) => [`${root}/contents/${path}?ref=${head}`, bytes])),
    ...Object.fromEntries([...baseSources].map(([path, bytes]) => [`${root}/contents/${path}?ref=${base}`, bytes])),
  };
  const assertReviewed = createHumanReviewVerifier({
    reviewers: 'Human-Reviewer, Devin, pipeline-bot, pr-automation',
    token: '',
    async request(address, options) {
      const url = new URL(address);
      const key = url.pathname + url.search;
      assert.equal(url.origin, 'https://api.github.com');
      calls.push(key);
      if (key.includes('/contents/')) assert.equal(options.headers.Accept, 'application/vnd.github.raw+json');
      if (!Object.hasOwn(results, key)) return new Response(null, { status: 404 });
      return key.includes('/contents/')
        ? new Response(results[key], { status: fileStatus })
        : Response.json(results[key]);
    },
  });
  return { calls, check: (context, expected = fingerprint, from = fingerprintFrom) =>
    assertReviewed({ number: 19, expectedHead: head, ...context }, expected, from) };
}

test('an allowlisted human approval on the exact scene PR head counts without review JSON', async () => {
  const { check, calls } = setup();
  await check();
  assert.equal(calls.length, 2 + filenames.length);
  const approvedSources = new Map(contents).set(source, Buffer.from('different scene actually approved'));
  await assert.rejects(setup({ approvedSources }).check(), /Scene source .* does not match/);
});

test('episode 2 approvals survive wiring metadata changes but not script changes', async () => {
  const script = 'video-pipeline/episodes/ep02/script.mjs';
  const wiring = 'video-pipeline/episodes/ep02/episode.mjs';
  const approvedSources = new Map(contents).set(script, Buffer.from('approved script'))
    .set(wiring, Buffer.from('episode wiring without reviewSources'));
  const currentSources = new Map(approvedSources).set(wiring, Buffer.from('episode wiring with reviewSources'));
  const from = readSource => reviewFingerprint(ep02, 0, ep02.createScenes()[0], readSource);
  const expected = await from(url => currentSources.get(relative(localRoot, fileURLToPath(url))));

  const { check, calls } = setup({ approvedSources });
  await check({}, expected, from);
  assert.ok(calls.includes(`${root}/contents/${script}?ref=${head}`));
  assert.ok(calls.every(path => !path.includes(wiring)));

  const staleSources = new Map(approvedSources).set(script, Buffer.from('different narration'));
  await assert.rejects(setup({ approvedSources: staleSources }).check({}, expected, from),
    /Scene source .* does not match/);
});

test('scene checklist JSON neither grants nor blocks approval', async () => {
  for (const json of [undefined, '{invalid JSON', JSON.stringify({ reviewer: 'human-reviewer', approved: true })]) {
    const approved = setup({ json });
    await approved.check();
    const unapproved = setup({ json, reviews: [] });
    await assert.rejects(unapproved.check(), /active GitHub approval/);
    assert.ok([...approved.calls, ...unapproved.calls].every(path => !path.includes(reviewFile)));
  }
});

test('non-allowlisted accounts, PR authors and bots do not approve a scene', async () => {
  for (const reviewer of ['Devin', 'pipeline-bot', 'pr-automation', 'human-looking-name']) {
    await assert.rejects(setup({ reviews: [{ ...approval, user: { ...approval.user, login: reviewer } }] })
      .check(), /allowlisted human/);
  }
  await assert.rejects(setup({ author: 'human-reviewer' }).check(), /other than the author/);
  await assert.rejects(setup({ reviews: [{ ...approval, user: { ...approval.user, type: 'Bot' } }] }).check(), /active GitHub approval/);
});

test('a deleted fork still resolves approved source by SHA through the base repository', async () => {
  const { check, calls } = setup({ fork: null });
  await check();
  assert.ok(calls.includes(`${root}/contents/${source}?ref=${head}`));
});

test('approval must be current and the reviewed source must be available', async () => {
  for (const reviews of [[], [{ ...approval, commit_id: base }],
    [approval, { ...approval, state: 'CHANGES_REQUESTED' }], [{ ...approval, state: 'DISMISSED' }]]) {
    await assert.rejects(setup({ reviews }).check(), /active GitHub approval/);
  }
  await assert.rejects(setup({ fileStatus: 403 }).check(), /lookup failed \(HTTP 403\)/);
  await assert.rejects(setup().check({ expectedHead: base }), /head changed/);
});

test('only visuals unchanged from the PR base inherit its approval', async () => {
  const { check, calls } = setup({ reviews: [], baseSources: contents });
  await check({ base });
  assert.ok(calls.every(path => !path.includes('/reviews?')));
  const baseSources = new Map(contents).set(source, Buffer.from('different base scene'));
  await assert.rejects(setup({ reviews: [], baseSources }).check({ base }), /active GitHub approval/);
});
