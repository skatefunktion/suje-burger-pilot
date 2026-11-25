import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { paintFrame, frameCount } from '../../../queue/frames.mjs';
import { episode as flat } from '../episode.mjs';
import { episode as clay } from './scenes.mjs';
import { createCanvasKit } from '../../../scenes/canvas-kit.mjs';

for (const weight of ['Regular', 'Bold']) {
  if (!GlobalFonts.registerFromPath(`/usr/share/fonts/opentype/noto/NotoSansCJK-${weight}.ttc`, 'Noto Sans KR')) {
    throw new Error('Install fonts-noto-cjk before rendering the comparison');
  }
}
const output = resolve(process.argv[2] ?? new URL('../../../out/clay-study/', import.meta.url).pathname);
await mkdir(output, { recursive: true });
const canvas = createCanvas(960, 540);
const scenes = clay.createScenes(canvas.getContext('2d'), createCanvasKit(canvas.getContext('2d')));
const sheet = createCanvas(1968, 1232), ctx = sheet.getContext('2d');
ctx.fillStyle = '#EDE7DD'; ctx.fillRect(0, 0, sheet.width, sheet.height);
ctx.font = '700 26px "Noto Sans KR", sans-serif'; ctx.fillStyle = '#2E2921';
ctx.fillText('기존 · 플랫', 16, 42); ctx.fillText('시안 · 플레이도 클레이', 992, 42);
const manifest = [];
for (const [row, [index, name]] of [[3, 'bun'], [4, 'patty']].entries()) {
  for (const position of [0, .18, .5, .65, .86, 1]) {
    // paintFrame uses fixed 30fps scene-local stepping; t=1 is the final real frame.
    const frame = Math.round(position * (frameCount(scenes[index].dur) - 1));
    for (const [column, [style, episode]] of [['flat', flat], ['clay', clay]].entries()) {
      paintFrame(canvas, episode, index, frame);
      const filename = `${style}-${name}-${String(frame).padStart(3, '0')}.png`;
      await writeFile(join(output, filename), await canvas.encode('png'));
      manifest.push({ scene: index + 1, style, frame, file: filename });
      if (position === .86) {
        ctx.drawImage(canvas, 16 + column * 976, 64 + row * 584);
        if (style === 'clay') await writeFile(join(output, `clay-${name}.png`), await canvas.encode('png'));
      }
    }
  }
}
ctx.font = '500 20px "Noto Sans KR", sans-serif'; ctx.fillStyle = '#685C4E';
ctx.fillText('960 × 540 · 번 / 패티 두 장면만 적용 · 57초 타이밍 / 자막 / 내레이션 원고 유지 · 미병합 시안', 16, 1212);
await writeFile(join(output, 'flat-vs-clay.png'), await sheet.encode('png'));
await writeFile(join(output, 'frames.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(output);
