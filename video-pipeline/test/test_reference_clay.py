"""Authoring checks for the source-timed square clay export (no reference MP4 needed)."""
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

from PIL import Image, ImageDraw
import numpy as np

ROOT = Path(__file__).resolve().parents[1] / 'pilot' / 'burger' / 'clay'
SPEC = importlib.util.spec_from_file_location('reference_clay', ROOT / 'restyle-reference.py')
REF = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(REF)


class ReferenceClayChecks(unittest.TestCase):
    def test_abrupt_stage_changes_use_content_not_nearest_timestamp(self):
        frames = np.zeros((5, 100, 8, 3), dtype=np.uint8)
        frames[4, 84:] = 255
        frames[1, 84:] = 250  # New stage early, nearer old anchor in time.
        frames[1, :84] = 0   # Header still resembles the old anchor.
        frames[4, :84] = 255
        self.assertEqual(REF.source_exposure(frames, [0, 4], 1), 4)
        frames[3, 84:] = 5   # Old stage late, nearer new anchor in time.
        frames[3, :84] = 255
        self.assertEqual(REF.source_exposure(frames, [0, 4], 3), 0)

    def test_different_reference_is_rejected_before_preparation(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / 'wrong-reference.mp4'
            source.write_bytes(b'not the confirmed film')
            with self.assertRaisesRegex(AssertionError, 'film used to author'):
                REF.prepare(source, Path(directory) / 'work')
            self.assertFalse((Path(directory) / 'work').exists())

    def test_source_timeline_is_complete_and_assets_are_intact(self):
        manifest = json.loads((ROOT / 'reference-assets' / 'manifest.json').read_text())
        hashes = {a['frame']: a for a in manifest['anchors']}
        covered = []
        for shot in REF.FILM['shots']:
            start = shot['start']
            covered.extend(range(start, start + 64))
            self.assertTrue(all(start <= k < start + 64 for k in shot['anchors']))
            self.assertEqual(shot['anchors'], sorted(set(shot['anchors'])))
            for key in shot['anchors']:
                asset = ROOT / 'reference-assets' / f'{key:04d}.webp'
                self.assertEqual(hashlib.sha256(asset.read_bytes()).hexdigest(), hashes[key]['sha256'])
                with Image.open(asset) as image:
                    self.assertEqual(image.size, (1024, 1024))
                    image.verify()
        self.assertEqual(covered, list(range(1536)))
        self.assertEqual(len(hashes), 88)
        self.assertEqual(REF.FPS, 24)
        self.assertEqual(REF.SIDE, 1080)

    def test_localized_age_and_total_are_consistent_and_sourced(self):
        data = REF.FILM
        local = data['localization']
        self.assertEqual(local['raising_months'], 30)
        self.assertIn('ekape.or.kr', local['source'])
        self.assertIn('약 30개월', local['source_quote'])
        self.assertIn('대관령', REF.caption_for(200)['text'])
        self.assertEqual(REF.caption_for(300)['marker'], '약 30개월')
        self.assertIn('약 2년 6개월', REF.caption_for(200)['marker'])
        self.assertIn('약 2년 6개월', REF.caption_for(1500)['text'])
        self.assertNotIn('18개월', str(data['captions']))

    def test_rounded_korean_type_has_all_glyphs_and_fits_safe_areas(self):
        draw = ImageDraw.Draw(Image.new('RGB', (1080, 1080)))
        missing = bytes(REF.font(32).getmask(chr(0x10FFFF)))
        strings = []
        for cap in REF.FILM['captions']:
            strings.extend([cap['text'], cap['marker']])
            marker = bool(cap['marker'])
            f = REF.fit_font(cap['text'], 49 if marker else 54, 964)
            box = draw.multiline_textbbox((60, 119 if marker else 31), cap['text'], font=f, spacing=3)
            self.assertGreaterEqual(box[0], 40)
            self.assertLessEqual(box[2], 1040)
            self.assertLess(box[3], 238 if marker else 192)
        for group in REF.LABELS.values():
            for value, (x0, y0, x1, y1), size in group:
                strings.append(value)
                f = REF.fit_font(value, size, x1 - x0)
                self.assertLessEqual(f.getlength(value), x1 - x0)
                self.assertLess(y0 - 2 + draw.textbbox((0, 0), value, font=f)[3], 1080)
        for char in set(''.join(strings)):
            if not char.isspace():
                self.assertNotEqual(bytes(REF.font(32).getmask(char)), missing, f'Missing glyph: {char}')
        self.assertIn('SIL OPEN FONT LICENSE Version 1.1', (ROOT / 'fonts' / 'OFL.txt').read_text())

    def test_type_on_does_not_rewind_when_reference_ink_varies(self):
        rows = [{'caption': n, 'marker': n} for n in [0, 20, 18, 40, 39, 60]]
        shown = [REF.ink_progress(rows, i, len(rows), 'caption') for i in range(len(rows))]
        self.assertEqual(shown, sorted(shown))
        self.assertEqual(shown[-1], 1)
        self.assertEqual(REF.type_text('한국어 자막', 1), '한국어 자막')
        self.assertEqual(REF.type_text('1일', .97), '1일')


if __name__ == '__main__':
    unittest.main()
