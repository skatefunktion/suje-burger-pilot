import { fork, spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { finished } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { FPS, WIDTH, HEIGHT } from './frames.mjs';

const childFile = fileURLToPath(new URL('./render-child.mjs', import.meta.url));

export async function renderScene(episodeURL, index, path, { mode = 'render', timeout = 45_000 } = {}) {
  await mkdir(path, { recursive: true });
  const child = fork(childFile, [episodeURL.href, String(index), mode, path],
    { stdio: ['ignore', 'pipe', 'pipe', 'ipc'] });
  let result, error, timedOut = false;
  child.on('message', message => { result = message; });
  child.on('error', err => { error = err; });
  child.stderr.on('data', data => { process.stderr.write(data); });

  const log = createWriteStream(join(path, 'encoder.log'));
  const encoder = mode === 'review' ? null : spawn('ffmpeg', [
    '-nostdin', '-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'rawvideo', '-pixel_format', 'rgba', '-video_size', `${WIDTH}x${HEIGHT}`,
    '-framerate', String(FPS), '-i', 'pipe:0', '-an',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-threads', '2',
    '-preset', 'veryfast', '-crf', '18', join(path, 'video.mp4'),
  ], { stdio: ['pipe', 'ignore', 'pipe'] });
  const encoding = encoder && new Promise(resolve => {
    encoder.stderr.pipe(log, { end: false });
    encoder.on('error', err => { error = err; });
    encoder.stdin.on('error', err => { error = err; });
    encoder.on('close', resolve);
    child.stdout.pipe(encoder.stdin);
  });
  if (!encoder) child.stdout.resume();
  const timer = setTimeout(() => {
    timedOut = true;
    child.kill('SIGKILL');
    encoder?.kill('SIGKILL');
  }, timeout);

  const [code, encoderCode] = await Promise.all([
    new Promise(resolve => child.on('close', resolve)), encoding,
  ]);
  clearTimeout(timer);
  log.end();
  await finished(log);

  if (timedOut) return { ok: false, kind: 'timeout', frame: 0, message: `Scene exceeded ${timeout}ms` };
  if (result?.ok === false) return result;
  if (error || code !== 0 || !result?.ok || (encoder && encoderCode !== 0)) {
    return { ok: false, kind: 'render', frame: 0,
      message: error?.message ?? `Renderer/encoder failed (${code}/${encoderCode}); see ${join(path, 'encoder.log')}` };
  }
  return result;
}

export async function renderWithRetry(render, { report, pause } = {}) {
  const attempts = [];
  for (let number = 1; number <= 3; number++) {
    const outcome = await render('render', number);
    attempts.push(outcome);
    report?.(outcome, number);
    if (outcome.ok) return { status: 'rendered', retries: number - 1, attempts };
    if (number < 3 && outcome.kind === 'timeout') await pause?.(number);
  }
  const outcome = await render('fallback', 4);
  report?.(outcome, 4);
  return { status: outcome.ok ? 'degraded' : 'failed', retries: 2,
    attempts, fallback: outcome.ok ? 'caption-card' : 'failed' };
}
