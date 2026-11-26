// Review export only; does not register or approve a production queue job.
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createCanvas } from '@napi-rs/canvas';
import { episode } from './original-format.mjs';
import { createCanvasKit } from '../../../scenes/canvas-kit.mjs';
import { renderScene } from '../../../queue/render.mjs';
import { run } from '../../../queue/process.mjs';
import { inspectVideo } from '../../../stitch/qc.mjs';

if (!process.argv[2]) throw new Error('Usage: node pilot/burger/clay/render-original.mjs REFERENCE_MP4 [OUTPUT_DIRECTORY]');
const source = resolve(process.argv[2]);
const output = resolve(process.argv[3] ?? 'out/clay-original-format');
const ctx = createCanvas(960, 540).getContext('2d');
const scenes = episode.createScenes(ctx, createCanvasKit(ctx));
const duration = scenes.reduce((sum, scene) => sum + scene.dur, 0);
await inspectVideo(source, duration);
await mkdir(output, { recursive: true });
const manifest = { purpose: 'Owner review export; draft remains unmerged',
  narration: { source, mode: 'Original audio stream copied without synthesis or retiming' },
  duration, scenes: [] };
let start = 0;
for (const [index, scene] of scenes.entries()) {
  const segment = join(output, `scene-${index + 1}`);
  const outcome = await renderScene(new URL('./original-format.mjs', import.meta.url), index, segment,
    { timeout: 120_000 });
  if (!outcome.ok) throw new Error(`Scene ${index + 1}: ${JSON.stringify(outcome)}`);
  manifest.scenes.push({ scene: index + 1, start, duration: scene.dur,
    caption: scene.cap, video: join(segment, 'video.mp4'), status: 'rendered' });
  console.log(`Rendered scene ${index + 1}: ${start}-${start + scene.dur}s`);
  start += scene.dur;
}
const concat = join(output, 'concat.txt');
await writeFile(concat, manifest.scenes.map(({ video }) => `file '${video.replaceAll("'", "'\\''")}'`).join('\n') + '\n');
manifest.video = join(output, 'suje-burger-clay-original-format-57s-ko.mp4');
await run('ffmpeg', ['-nostdin', '-hide_banner', '-loglevel', 'error', '-y',
  '-f', 'concat', '-safe', '0', '-i', concat, '-i', source,
  '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'copy',
  '-t', String(duration), '-movflags', '+faststart', manifest.video]);
manifest.qc = await inspectVideo(manifest.video, duration);
await writeFile(join(output, 'export-review.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ video: manifest.video, qc: manifest.qc }));
