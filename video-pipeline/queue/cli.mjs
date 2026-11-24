import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { setTimeout as pause } from 'node:timers/promises';
import { join, resolve } from 'node:path';
import { createCanvas } from '@napi-rs/canvas';
import { createCanvasKit } from '../scenes/canvas-kit.mjs';
import { FPS, frameCount } from './frames.mjs';
import { renderScene, renderWithRetry } from './render.mjs';
import { assertReviewed, reviewFingerprint } from './review.mjs';
import { narrate, narrateApprovedScenes } from '../tts/narration.mjs';
import { stitch } from '../stitch/stitch.mjs';
import { assertDuration, assertPublishable, inspectVideo } from '../stitch/qc.mjs';

const episodes = {
  burger: new URL('../pilot/burger/episode.mjs', import.meta.url),
  ep02: new URL('../episodes/ep02/episode.mjs', import.meta.url),
};

const [id, flag, selection, ...extra] = process.argv.slice(2);
const reviewing = flag === '--review';
const smoke = flag === '--smoke';
const gate = flag === '--scene-gate';
const episodeURL = Object.hasOwn(episodes, id) && episodes[id];
const chosen = selection === undefined ? null : Number(selection);
const cwd = resolve(process.env.VIDEO_PIPELINE_OUT ?? 'out');

async function main() {
  if (!episodeURL || (flag !== undefined && !reviewing && !smoke && !gate) ||
      (chosen !== null && (!reviewing || !Number.isSafeInteger(chosen) || chosen < 1)) ||
      (gate && id !== 'ep02') || extra.length) {
    throw new Error('Usage: npm run render -- {burger|ep02} [--review [scene] | --smoke | --scene-gate]');
  }
  const { episode } = await import(episodeURL.href);
  const ctx = createCanvas(1, 1).getContext('2d');
  const scenes = episode.createScenes(ctx, createCanvasKit(ctx));
  const duration = scenes.reduce((sum, scene) => sum + frameCount(scene.dur), 0) / FPS;
  assertDuration(duration);
  if (chosen > scenes.length) throw new Error('Scene number is out of range');

  await mkdir(cwd, { recursive: true });
  const dir = await mkdtemp(join(cwd, `${id}-`));
  const job = { episode: id, mode: flag ?? 'production', duration, status: 'running', scenes: [] };
  console.log(`Job: ${dir}`);
  let start = 0;
  try {
    for (const [index, scene] of scenes.entries()) {
      const number = String(index + 1).padStart(2, '0');
      const result = { scene: number, start, duration: scene.dur };
      start += scene.dur;
      if (chosen !== null && chosen !== index + 1) continue;
      job.scenes.push(result);
      const sceneDir = join(dir, number);
      const fingerprint = await reviewFingerprint(episode, index, scene);
      const review = async () => {
        const url = new URL(`review-${number}.json`, episode.sources[index]);
        return assertReviewed(await readFile(url, 'utf8').then(JSON.parse, error => {
          if (error.code !== 'ENOENT') throw error;
          return null;
        }), fingerprint, { pilotSmoke: smoke && id === 'burger' });
      };
      if (gate && await isPending(episode.sources[index], number)) {
        result.status = 'pending';
        console.log(`Scene ${number}: pending (unchanged scaffold)`);
        continue;
      }

      if (reviewing || gate) {
        const outcome = await renderScene(episodeURL, index, sceneDir, { mode: gate ? 'render' : 'review' });
        logScene(result, outcome, gate ? 'scene render' : 'visual samples');
        result.fingerprint = fingerprint;
        if (!outcome.ok) {
          Object.assign(result, { status: 'failed', error: outcome });
          continue;
        }
        console.log(`Scene ${number} fingerprint: ${fingerprint}`);
        result.status = 'ready-for-review';
        if (gate) {
          try {
            await review();
            result.status = 'passed';
          } catch (error) {
            Object.assign(result, { status: 'failed', visualError: error.message });
            console.error(`Scene ${number}: ${error.message}`);
          }
        }
        continue;
      }

      let segment, timeouts = 0;
      Object.assign(result, await renderWithRetry(async (mode, attempt) => {
        segment = join(sceneDir, mode === 'fallback' ? 'fallback' : `attempt-${attempt}`);
        const outcome = await renderScene(episodeURL, index, segment, { mode, timeout: 45_000 + 15_000 * timeouts });
        if (outcome.kind === 'timeout') timeouts++;
        logScene(result, outcome, mode === 'fallback' ? mode : `attempt ${attempt}`);
        return outcome;
      }, { pause: attempt => pause(attempt * 250) }));
      result.segment = segment;
      result.audio = { status: 'skipped', attempts: [] };
      if (result.status !== 'rendered') continue;

      try {
        const baselineException = await review();
        if (baselineException) {
          result.visualBaselineException = baselineException;
          console.warn(`Scene ${number}: pilot smoke-only visual exception: ${baselineException}`);
        }
        result.status = 'passed';
      } catch (error) {
        Object.assign(result, { status: 'unapproved', visualError: error.message });
        console.error(`Scene ${number}: ${error.message}`);
      }
    }

    if (reviewing || gate) {
      if (job.scenes.some(scene => scene.status === 'failed')) throw new Error('Visual gate failed; see job.json');
      job.status = gate ? 'passed' : 'ready-for-review';
      return;
    }
    await narrateApprovedScenes(job.scenes, async (result, index) => {
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await narrate({ text: episode.narration?.[index] ?? scenes[index].cap,
            duration: result.duration, path: join(result.segment, 'voice.wav'), smoke });
          result.audio.status = 'passed';
          result.audio.attempts.push({ ok: true });
          logScene(result, { ok: true }, `audio ${attempt}`);
          break;
        } catch (error) {
          result.audio.status = 'failed';
          result.audio.attempts.push({ ok: false, message: error.message });
          logScene(result, { kind: 'audio', message: error.message }, `audio ${attempt}`);
          if (error.permanent) break;
          if (attempt < 3) await pause(attempt * 500);
        }
      }
    });
    assertPublishable(job.scenes);
    const stage = join(dir, 'staged.mp4');
    try {
      await stitch(dir, job.scenes.map(scene => scene.segment), stage);
      job.qc = await inspectVideo(stage, duration);
      job.video = join(dir, smoke ? 'smoke.mp4' : 'video.mp4');
      await rename(stage, job.video);
    } finally {
      await rm(stage, { force: true });
    }
    job.status = smoke ? 'smoke-passed-not-for-publication' : 'passed';
    const baselineExceptions = job.scenes.filter(scene => scene.visualBaselineException).length;
    console.log(`QC PASS: ${job.qc.duration}s, ${job.qc.frames} frames, audible narration, ${job.scenes.length - baselineExceptions} visually approved scenes${baselineExceptions ? `, ${baselineExceptions} pilot smoke-only exceptions` : ''}`);
    console.log(`${job.status}: ${job.video}`);
  } catch (error) {
    job.status = job.scenes.some(scene => scene.status === 'degraded') ? 'degraded' : 'failed';
    job.error = error.message;
    throw error;
  } finally {
    await writeFile(join(dir, 'job.json'), JSON.stringify(job, null, 2) + '\n');
  }
}

function logScene(scene, outcome, attempt) {
  const at = (scene.start + (outcome.frame ?? 0) / FPS).toFixed(3);
  const detail = outcome.ok ? 'ok' : `${outcome.kind}: ${outcome.message}`;
  console.log(`Scene ${scene.scene} @ ${at}s [${attempt}]: ${detail}`);
}

async function isPending(source, number) {
  return (await readFile(source, 'utf8')).trim() ===
    `export function draw() {\n  throw new Error('Episode 2 scene ${number} is not implemented');\n}`;
}

main().catch(error => {
  console.error(error.stack);
  process.exitCode = 1;
});
