"""Authoring checks for the source-timed square clay export (no reference MP4 needed)."""
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from PIL import Image, ImageDraw
import numpy as np

ROOT = Path(__file__).resolve().parents[1] / 'pilot' / 'burger' / 'clay'
SPEC = importlib.util.spec_from_file_location('reference_clay', ROOT / 'restyle-reference.py')
REF = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(REF)


class ReferenceClayChecks(unittest.TestCase):
    def test_pose_schedule_preserves_stages_without_flickering_backwards(self):
        frames = np.zeros((8,100,8,3),np.uint8)
        frames[3:,84:] = 255
        frames[5,84:] = 110  # A one-frame redraw must not revisit an old sculpt.
        schedule = REF.exposure_schedule(frames,[0,7],0,8)
        self.assertEqual(schedule,sorted(schedule))
        self.assertEqual(schedule[3],7)  # New stage well before timestamp midpoint.
        self.assertEqual(set(schedule),{0,7})

    def test_export_preserves_the_whole_sculpt_instead_of_warping_its_pixels(self):
        # Exercise the real frame-rendering path; only text and encoder I/O are
        # replaced. A dense-registration/remap regression corrupts these textures.
        with tempfile.TemporaryDirectory() as directory:
            work=Path(directory)
            frames=np.zeros((64,96,96,3),np.uint8)
            frames[32:,84:]=255
            np.save(work/'source-proxy.npy',frames)
            (work/'source-sha256.txt').write_text('checked')
            (work/'source-ink.json').write_text(json.dumps([{}]*64))
            rng=np.random.default_rng(42)
            poses=[rng.integers(0,255,(128,128,3),dtype=np.uint8) for _ in range(2)]
            for key,pose in zip([0,63],poses):
                REF.cv2.imwrite(str(work/f'clay-{key:04d}.png'),pose)
            captured=[]
            class Encoder:
                def __init__(self,*args,**kwargs):
                    self.stdin=self
                    (work/'clay-picture.mp4').touch()
                def write(self,data):
                    captured.append(np.frombuffer(data,np.uint8).reshape(128,128,3).copy())
                def close(self):pass
                def wait(self):return 0
            film={'shots':[{'id':'fixture','start':0,'anchors':[0,63]}]}
            with patch.object(REF,'FILM',film),patch.object(REF,'N',64),\
                    patch.object(REF,'SIDE',128),patch.object(REF,'FLOW_SIDE',96),\
                    patch.object(REF,'probe'),patch.object(REF,'checked_source_hash',return_value='checked'),\
                    patch.object(REF,'text_frame',side_effect=lambda picture,*_:picture),\
                    patch.object(REF.subprocess,'Popen',Encoder):
                REF.render(work/'source.mp4',work,0)
            self.assertEqual(len(captured),64)
            for picture in captured:
                self.assertTrue(any(np.array_equal(picture,pose) for pose in poses),
                    'A sculpt was deformed, partly masked or cross-faded')

    def test_korean_map_is_fixed_geography_with_readable_native_labels(self):
        spec=importlib.util.spec_from_file_location('korea_map',ROOT/'korea-map.py')
        korea=importlib.util.module_from_spec(spec)
        spec.loader.exec_module(korea)
        geo=json.loads((ROOT/'korea-map-geography.json').read_text())
        self.assertEqual(geo['geometry']['type'],'MultiPolygon')
        self.assertIn('naturalearthdata.com',geo['license_url'])
        self.assertEqual(geo['license'],'Public domain')
        # All named map text, including separators, must exist in the video font.
        missing=bytes(korea.font(29).getmask(chr(0x10FFFF)))
        labels=''.join(n[0] for n in korea.NODES)+'서울제빵소 / 패티 / 점심산지와 배송 경로 예시북100 km'
        for char in set(labels):
            if not char.isspace():
                self.assertNotEqual(bytes(korea.font(29).getmask(char)),missing,char)
        with Image.open(korea.TERRAIN) as image:
            self.assertEqual(image.size,(1080,1080))
            self.assertEqual(image.mode,'RGBA')
        self.assertFalse(np.array_equal(korea.render(880),korea.render(883)),
            'Road-following trucks must advance rather than hold four frames')
        # Stationary coastline is identical across different delivery exposures.
        self.assertTrue(np.array_equal(korea.render(864)[890:960,650:800],
            korea.render(904)[890:960,650:800]))

    def test_deliveries_use_attributed_road_geometry_and_constant_speed(self):
        spec=importlib.util.spec_from_file_location('korea_map',ROOT/'korea-map.py')
        korea=importlib.util.module_from_spec(spec);spec.loader.exec_module(korea)
        data=korea.ROADS
        self.assertEqual(data['license'],'Open Database License 1.0 (ODbL)')
        self.assertEqual(len(data['routes']),6)
        self.assertIn('영동고속도로',data['routes'][3]['roads'])
        self.assertIn('광주원주고속도로',data['routes'][3]['roads'])
        for i in range(6):
            path=korea.route(i)
            self.assertGreater(len(path),100)
            self.assertLess(np.linalg.norm(path[0]-korea.project(*korea.NODES[i][1])),5)
            self.assertLess(np.linalg.norm(path[-1]-korea.DESTINATION),2)
            lengths=[]
            for progress in (.2,.4,.6):
                prefix=korea.route_prefix(i,progress)
                lengths.append(np.linalg.norm(np.diff(prefix,axis=0),axis=1).sum())
            self.assertAlmostEqual(lengths[1]/lengths[0],2,places=6)
            self.assertAlmostEqual(lengths[2]/lengths[0],3,places=6)

    def test_wheat_localization_has_official_jeolla_and_bread_evidence(self):
        wheat=REF.FILM['localization']['wheat']
        self.assertIn('mafra.go.kr',wheat['source'])
        self.assertIn('전남',wheat['source_quote'])
        self.assertIn('제빵',wheat['source_quote'])
        self.assertIn('전라도',REF.caption_for(320)['text'])
        self.assertIn('우리밀',REF.caption_for(576)['text'])

    def test_rigid_translation_preserves_shape_and_interior_texture(self):
        spec=importlib.util.spec_from_file_location('rigid',ROOT/'rigid-scenes.py')
        rigid=importlib.util.module_from_spec(spec);spec.loader.exec_module(rigid)
        rng=np.random.default_rng(4)
        rgb=rng.integers(30,220,(21,31,3),dtype=np.uint8)
        alpha=np.full((21,31),255,np.uint8)
        sprite=(rgb,alpha,(0,0))
        for position in [(100.5,200.5),(239.5,120.5),(301.5,600.5)]:
            canvas=np.zeros((1080,1080,3),np.uint8)
            rigid.place(canvas,sprite,position)
            x,y=[round(a-b/2) for a,b in zip(position,(31,21))]
            self.assertTrue(np.array_equal(canvas[y:y+21,x:x+31],rgb))
            self.assertEqual(np.count_nonzero(canvas),rgb.size)

    def test_loose_clay_parts_use_real_alpha_and_keep_the_onion_hole(self):
        spec=importlib.util.spec_from_file_location('rigid',ROOT/'rigid-scenes.py')
        rigid=importlib.util.module_from_spec(spec);spec.loader.exec_module(rigid)
        for i in range(8):
            rgb,mask,_=rigid.burger_part(i)
            self.assertEqual(rgb.shape[1],650)
            self.assertLess(mask.shape[0],350)
            self.assertGreater(mask.max(),240)
        _,ring,_=rigid.burger_part(2)
        self.assertEqual(ring[ring.shape[0]//2,ring.shape[1]//2],0)

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

    def test_entering_workers_do_not_cross_the_native_name_labels(self):
        spec=importlib.util.spec_from_file_location('rigid',ROOT/'rigid-scenes.py')
        rigid=importlib.util.module_from_spec(spec);spec.loader.exec_module(rigid)
        plate=rigid.paper_plate(1416)
        for frame in range(1344,1472,4):
            self.assertTrue(np.array_equal(rigid.render(frame)[810:],plate[810:]),
                f'Worker entered the caption strip at frame {frame}')

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
        for row in manifest['motion_assets']:
            asset=ROOT/'reference-assets'/row['file']
            self.assertEqual(hashlib.sha256(asset.read_bytes()).hexdigest(),row['sha256'])
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
