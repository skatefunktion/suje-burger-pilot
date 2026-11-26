import { readFile, writeFile } from 'node:fs/promises';

const preview = new URL('../../../index.html', import.meta.url);
const sources = ['../../scenes/canvas-kit.mjs', './scenes.mjs'];
const inline = await Promise.all(sources.map(async path =>
  (await readFile(new URL(path, import.meta.url), 'utf8')).split('\nexport {')[0]
));
const original = await readFile(preview, 'utf8');
const pattern = /(\/\* BEGIN GENERATED PILOT SOURCES \*\/\n)[\s\S]*?(\/\* END GENERATED PILOT SOURCES \*\/)/;
if (!pattern.test(original)) throw new Error('Missing pilot source markers');
const updated = original.replace(pattern, (_, start, end) => start + inline.join('\n') + end);

if (process.argv.includes('--write')) await writeFile(preview, updated);
else if (original !== updated) throw new Error('Pilot preview out of sync: run npm run sync:pilot');
