// Review export only; does not register or approve a production queue job.
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { episode, paintOriginalFormatFrame } from './original-format.mjs';
import { createCanvasKit } from '../../../scenes/canvas-kit.mjs';
import { FPS, WIDTH, HEIGHT, frameCount, samplePositions, visualBounds } from '../../../queue/frames.mjs';
import { run } from '../../../queue/process.mjs';
import { inspectVideo } from '../../../stitch/qc.mjs';

if (!process.argv[2]) throw new Error('Usage: node pilot/burger/clay/render-original.mjs KOREAN_NARRATED_MP4 [OUTPUT_DIRECTORY]');
const source = resolve(process.argv[2]);
const output = resolve(process.argv[3] ?? 'out/clay-original-format');
for (const weight of ['Regular', 'Bold']) {
  if (!GlobalFonts.registerFromPath(`/usr/share/fonts/opentype/noto/NotoSansCJK-${weight}.ttc`, 'Noto Sans KR')) {
    throw new Error('Install fonts-noto-cjk to render Korean text');
  }
}
if (!GlobalFonts.registerFromPath('/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf')) {
  throw new Error('Install fonts-noto-color-emoji to render the final caption');
}
const canvas = createCanvas(WIDTH, HEIGHT), ctx = canvas.getContext('2d');
const scenes = episode.createScenes(ctx, createCanvasKit(ctx));
const duration = scenes.reduce((sum, scene) => sum + scene.dur, 0);
await inspectVideo(source, duration);
await mkdir(output, { recursive: true });
const manifest = { purpose: 'Owner review export; draft remains unmerged',
  presentation: { reference: 'https://x.com/kevin_t_ngo/status/2111569193347018977',
    layout: 'Top-left underlined time marker and one-line Korean caption; no bottom band',
    productionTimes: 'Existing Korean pilot storyboard; no prices or invented preparation durations' },
  narration: { source, mode: 'Original audio stream copied without synthesis or retiming' },
  duration, scenes: [] };
let start = 0;
for (const [index, scene] of scenes.entries()) {
  const segment = join(output, `scene-${index + 1}`);
  await mkdir(segment, { recursive: true });
  const count = frameCount(scene.dur);
  for (const position of samplePositions) {
    const frame = Math.round(position * (count - 1));
    if (!visualBounds(episode, index, frame, { captionY: HEIGHT })) throw new Error(`Scene ${index + 1}: blank artwork`);
    paintOriginalFormatFrame(canvas, index, frame);
    await writeFile(join(segment, `frame-${String(frame).padStart(4, '0')}.png`), await canvas.encode('png'));
  }
  // Own the top-caption export without changing the shared queue's renderer.
  const encoder = spawn('ffmpeg', ['-nostdin', '-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'rawvideo', '-pixel_format', 'rgba', '-video_size', `${WIDTH}x${HEIGHT}`,
    '-framerate', String(FPS), '-i', 'pipe:0', '-an', '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p', '-threads', '2', '-preset', 'veryfast', '-crf', '18', join(segment, 'video.mp4')],
  { stdio: ['pipe', 'ignore', 'pipe'], timeout: 120_000 });
  let encoderError = '';
  encoder.stderr.on('data', data => { encoderError += data; });
  const encoded = once(encoder, 'close');
  try {
    function* frames() {
      for (let frame = 0; frame < count; frame++) {
        paintOriginalFormatFrame(canvas, index, frame);
        yield Buffer.from(ctx.getImageData(0, 0, WIDTH, HEIGHT).data);
      }
    }
    const [, [code]] = await Promise.all([pipeline(Readable.from(frames()), encoder.stdin), encoded]);
    if (code !== 0) throw new Error(`Scene ${index + 1}: encoder failed (${code}): ${encoderError}`);
  } catch (error) {
    encoder.kill('SIGKILL');
    throw error;
  } finally {
    await writeFile(join(segment, 'encoder.log'), encoderError);
  }
  manifest.scenes.push({ scene: index + 1, start, duration: scene.dur,
    caption: scene.cap, video: join(segment, 'video.mp4'), status: 'rendered' });
  console.log(`Rendered scene ${index + 1}: ${start}-${start + scene.dur}s`);
  start += scene.dur;
}
const concat = join(output, 'concat.txt');
await writeFile(concat, manifest.scenes.map(({ video }) => `file '${video.replaceAll("'", "'\\''")}'`).join('\n') + '\n');
manifest.video = join(output, 'suje-burger-clay-kevin-format-57s-ko.mp4');
await run('ffmpeg', ['-nostdin', '-hide_banner', '-loglevel', 'error', '-y',
  '-f', 'concat', '-safe', '0', '-i', concat, '-i', source,
  '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'copy',
  '-t', String(duration), '-movflags', '+faststart', manifest.video]);
manifest.qc = await inspectVideo(manifest.video, duration);
await writeFile(join(output, 'export-review.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ video: manifest.video, qc: manifest.qc }));
