import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { createCanvas } from '@napi-rs/canvas';

test('the standalone recorder stops once playback reaches 57 seconds', async () => {
  const html = await readFile(new URL('../../index.html', import.meta.url), 'utf8');
  const canvas = createCanvas(960, 540);
  canvas.addEventListener = () => {};
  canvas.captureStream = () => ({});
  const elements = new Map([['stage', canvas]]);
  let nextFrame, stopCalls = 0;

  runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)[1], {
    document: {
      getElementById(id) {
        if (!elements.has(id)) {
          elements.set(id, { style: {}, addEventListener(event, fn) { this[event] = fn; } });
        }
        return elements.get(id);
      },
    },
    requestAnimationFrame(fn) { nextFrame = fn; },
    MediaRecorder: class {
      start() { this.state = 'recording'; }
      stop() { this.state = 'inactive'; stopCalls++; }
    },
  });

  nextFrame(100);
  elements.get('bRec').click();
  nextFrame(120);
  nextFrame(57_119);
  assert.equal(stopCalls, 0);
  nextFrame(57_120);
  assert.equal(elements.get('fill').style.width, '100%');
  assert.equal(stopCalls, 1);
  nextFrame(60_120);
  elements.get('bRec').click();
  assert.equal(stopCalls, 1);
});
