import { join } from 'node:path';
import { writeFile } from 'node:fs/promises';
import { run } from '../queue/process.mjs';

export async function stitch(dir, segments, output) {
  const tracks = [
    [segments.map(path => join(path, 'video.mp4')), ['-map', '0:v:0', '-c:v', 'copy']],
    [segments.map(path => join(path, 'voice.wav')), ['-map', '1:a:0', '-c:a', 'aac', '-b:a', '128k']],
  ];
  const inputs = await Promise.all(tracks.map(async ([paths], index) => {
    const list = join(dir, `concat-${index}.txt`);
    await writeFile(list, paths.map(path => "file '" + path.replaceAll("'", "'\\''") + "'").join('\n') + '\n');
    return ['-f', 'concat', '-safe', '0', '-i', list];
  }));
  await run('ffmpeg', ['-nostdin', '-hide_banner', '-loglevel', 'error', '-y',
    ...inputs.flat(), ...tracks.flatMap(([, opts]) => opts), '-movflags', '+faststart', output]);
}
