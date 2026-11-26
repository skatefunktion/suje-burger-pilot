import { writeFile } from 'node:fs/promises';
import { run } from '../queue/process.mjs';
import { inspectAudio } from '../stitch/qc.mjs';

export async function narrateApprovedScenes(scenes, narrateScene) {
  const blocked = scenes.filter(scene => scene.status !== 'passed');
  if (blocked.length) {
    const details = blocked.map(scene => `${scene.scene} (${scene.status})`).join(', ');
    throw new Error(`QC blocked: narration skipped because scenes failed render or visual approval: ${details}`);
  }
  for (const [index, scene] of scenes.entries()) await narrateScene(scene, index);
}

export async function narrate({ text, duration, path, smoke }) {
  if (!text?.trim()) throw new Error('Missing narration text');
  const raw = path + '.source';
  if (smoke) {
    await run('espeak-ng', ['-v', 'ko', '-s', '205', '-w', raw, '--stdin'], { input: text });
  } else {
    const { FISH_AUDIO_API_KEY, FISH_AUDIO_REFERENCE_ID } = process.env;
    if (!FISH_AUDIO_API_KEY || !FISH_AUDIO_REFERENCE_ID) {
      const error = new Error('Set FISH_AUDIO_API_KEY and FISH_AUDIO_REFERENCE_ID to synthesize publishable narration');
      error.permanent = true;
      throw error;
    }
    const response = await fetch('https://api.fish.audio/v1/tts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${FISH_AUDIO_API_KEY}`,
        'Content-Type': 'application/json',
        model: 's2-pro',
      },
      body: JSON.stringify({ text, reference_id: FISH_AUDIO_REFERENCE_ID, format: 'wav' }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) {
      await response.body?.cancel();
      const error = new Error(`Fish Audio returned HTTP ${response.status}`);
      error.permanent = response.status < 500 && ![408, 429].includes(response.status);
      throw error;
    }
    await writeFile(raw, Buffer.from(await response.arrayBuffer()));
  }

  const trimmed = path + '.trim.wav';
  const trim = 'silenceremove=start_periods=1:start_duration=0.03:start_threshold=-45dB';
  await run('ffmpeg', ['-nostdin', '-hide_banner', '-loglevel', 'error', '-y', '-i', raw,
    '-af', `${trim},areverse,${trim},areverse`, '-ac', '1', '-ar', '48000', trimmed]);
  const { duration: sourceDuration } = await inspectAudio(trimmed);
  const speed = sourceDuration / (duration - 0.2);
  if (!smoke && (speed < 0.75 || speed > 1.25)) {
    throw new Error(`Narration needs an unsuitable pacing adjustment (${speed.toFixed(2)}×); re-record or edit the line`);
  }
  const tempos = [];
  let remaining = speed;
  while (remaining > 2) { tempos.push(2); remaining /= 2; }
  while (remaining < 0.5) { tempos.push(0.5); remaining *= 2; }
  tempos.push(remaining);
  const filters = [...tempos.map(value => `atempo=${value}`), 'apad', `atrim=duration=${duration}`];
  await run('ffmpeg', ['-nostdin', '-hide_banner', '-loglevel', 'error', '-y', '-i', trimmed,
    '-af', filters.join(','), '-ac', '1', '-ar', '48000', path]);
  await inspectAudio(path);
}
