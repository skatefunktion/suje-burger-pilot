import { stat } from 'node:fs/promises';
import { WIDTH, HEIGHT, FPS } from '../queue/frames.mjs';
import { run } from '../queue/process.mjs';

async function probe(path) {
  const { stdout } = await run('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', path]);
  return JSON.parse(stdout);
}

export async function inspectAudio(path) {
  const { streams, format } = await probe(path);
  if (!streams.some(stream => stream.codec_type === 'audio')) throw new Error('Audio stream missing');
  const duration = Number(format.duration);
  if (!Number.isFinite(duration) || duration <= 0) throw new Error('No measurable narration duration');
  const { stderr } = await run('ffmpeg', ['-nostdin', '-hide_banner', '-i', path, '-vn',
    '-af', 'silencedetect=noise=-45dB:d=0.15', '-f', 'null', '-']);
  const gaps = [...stderr.matchAll(/silence_duration: ([\d.]+)/g)].map(match => Number(match[1]));
  const voiced = duration - gaps.reduce((a, b) => a + b, 0);
  if (voiced < 0.25 || voiced / duration < 0.25 || gaps.some(gap => gap > 2.5)) {
    throw new Error('Narration audio is silent or contains a long gap');
  }
  return { duration };
}

export function assertPublishable(scenes) {
  if (!scenes.length || scenes.some(scene => scene.status !== 'passed' || scene.audio?.status !== 'passed')) {
    throw new Error('QC blocked: every scene needs a successful render, visual approval, and narration');
  }
}

export function assertDuration(duration) {
  if (!Number.isFinite(duration) || duration < 45 || duration > 60) {
    throw new Error(`QC blocked: duration ${duration}s is outside 45–60s`);
  }
}

export async function inspectVideo(path, expectedDuration) {
  const size = (await stat(path)).size;
  if (size < 1024 || size > 80 * 1024 * 1024) throw new Error(`QC blocked: unexpected file size ${size}`);
  const { streams } = await probe(path);
  const video = streams.find(stream => stream.codec_type === 'video');
  if (!video || video.width !== WIDTH || video.height !== HEIGHT || video.r_frame_rate !== `${FPS}/1`) {
    throw new Error('QC blocked: expected 960×540 video at 30fps');
  }
  const { duration } = await inspectAudio(path);
  assertDuration(duration);
  if (Math.abs(duration - expectedDuration) > 2 / FPS ||
      Math.abs(Number(video.duration) - expectedDuration) > 1 / FPS ||
      Number(video.nb_frames) !== Math.round(expectedDuration * FPS)) {
    throw new Error(`QC blocked: stitched duration or frame count differs from storyboard (${expectedDuration}s)`);
  }
  return { duration, frames: Number(video.nb_frames), size };
}
