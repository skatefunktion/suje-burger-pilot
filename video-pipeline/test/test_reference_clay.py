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
    @classmethod
    def setUpClass(cls):
        mods=[]
        for name in ('rigid-scenes','process-scenes'):
            spec=importlib.util.spec_from_file_location(name,ROOT/f'{name}.py')
            module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
            mods.append(module)
        cls.rigid,cls.processes=mods
        cls.processes.configure(cls.rigid)

    def test_process_motion_changes_objects_without_boiling_the_background(self):
        for frame in (201,271,400,466,536,597,678,731,795,1045,1317):
            first=self.processes.render(frame);second=self.processes.render(frame+1)
            self.assertEqual(first.shape,(1080,1080,3))
            self.assertEqual(first.dtype,np.uint8)
            self.assertFalse(np.array_equal(first,second),f'Held motion at {frame}')
            self.assertTrue(np.array_equal(first[:238,:950],second[:238,:950]),
                f'Background/header boiling at {frame}')
            self.assertTrue(np.array_equal(first,self.processes.render(frame)),
                f'Non-deterministic process frame {frame}')

    def test_all_process_boundaries_render_and_dairy_stages_are_not_premature(self):
        for start,end in ((128,320),(384,576),(576,640),(640,704),(704,768),
                (768,832),(1024,1088),(1280,1344),(1472,1536)):
            for frame in (start,start+1,end-2,end-1):
                self.assertIsNotNone(self.processes.render(frame),frame)
        early=self.processes.dairy(390);late=self.processes.dairy(440)
        blank=self.rigid.paper_plate(440)
        self.assertTrue(np.array_equal(early[635:,540:],blank[635:,540:]))
        self.assertGreater(np.count_nonzero(late[635:,540:]!=blank[635:,540:]),50000)

    def test_korean_actors_are_complete_and_do_not_include_atlas_boundaries(self):
        server=self.processes.part('drive-in-korea-actors.webp',2,width=125)
        self.assertGreater(server[1].shape[0]/server[1].shape[1],2.2)
        self.assertLess(server[1].shape[0]/server[1].shape[1],4.5)
        for i in range(2):
            car=self.processes.part('drive-in-korea-actors.webp',i,width=680)
            self.assertGreater(car[1].shape[1]/car[1].shape[0],1.7)
            self.assertLess(car[1].shape[1]/car[1].shape[0],3.5)
        self.assertEqual(len(self.processes.workers()),7)
        heights=[]
        for i in range(7):
            _,alpha,(_,cy)=self.rigid.person(i)
            heights.append(alpha.shape[0])
            self.assertLess(cy+alpha.shape[0]/2,809)
            self.assertEqual(cy+alpha.shape[0]/2,795)
        self.assertEqual(len(set(heights)),7)
        self.assertGreaterEqual(max(heights)-min(heights),35)

    def test_harvest_anatomy_has_adult_arm_proportions_and_no_open_waist(self):
        import cv2
        for index in (0,1):
            baseline=None
            for frame in range(704,768):
                data,foot,crop,basket=self.processes.harvest_action(frame,index)
                for shoulder,elbow,wrist in data['arms']:
                    upper=np.linalg.norm(np.subtract(elbow,shoulder))
                    lower=np.linalg.norm(np.subtract(wrist,elbow))
                    # The former 133px arms were 56% of a 238px person.
                    self.assertLess((upper+lower)/1.75,.4,'Arms exceed adult proportions')
                    self.assertAlmostEqual(upper,.29,places=6)
                    self.assertAlmostEqual(lower,.27,places=6)
                sprite,center=self.processes.harvest_worker(frame,index)
                alpha=sprite[1]
                hx,hy=data['hip'];hx=399-hx if index==0 else hx
                patch=alpha[round(hy)-5:round(hy)+6,round(hx)-5:round(hx)+6]
                self.assertTrue(np.all(patch>240),f'Open waist in {index}/{frame}')
                n,labels,stats,_=cv2.connectedComponentsWithStats(np.uint8(alpha>64))
                self.assertGreater(stats[1:,4].max()/np.count_nonzero(alpha>64),.995,
                    f'A limb or torso is detached in {index}/{frame}')
                bottom=np.where(alpha>64)[0].max()
                if baseline is None:baseline=bottom
                self.assertLessEqual(abs(bottom-baseline),1,'Planted feet shifted')

    def test_each_picker_faces_and_reaches_their_own_crop_then_deposits_it(self):
        for index,direction in ((0,-1),(1,1)):
            first=self.processes.harvest_action(704,index)
            pick=self.processes.harvest_action(724,index)
            lift=self.processes.harvest_action(739,index)
            deposited=self.processes.harvest_action(760,index)
            self.assertFalse(pick[0]['holding'])
            self.assertTrue(lift[0]['holding'])
            self.assertTrue(deposited[0]['deposited'])
            self.assertGreater(pick[0]['bend']-first[0]['bend'],25)
            self.assertGreater(first[0]['hip_z']-pick[0]['hip_z'],.2 if index==0 else .15)
            self.assertGreater((pick[2][0]-pick[1][0])*direction,65)
            self.assertGreater(pick[2][1]-lift[2][1],30,'Crop was not lifted')
            # Direction derives from the rendered head/nose, not just the hand.
            self.assertGreater(pick[0]['nose'][0]-pick[0]['head'][0],8)
            self.assertGreater((pick[3][0]-pick[1][0])*direction,0)

    def test_harvesters_and_baskets_are_grounded_clear_of_the_conveyor(self):
        for index in (0,1):
            for frame in range(704,768):
                data,foot,_,basket=self.processes.harvest_action(frame,index)
                sprite,center=self.processes.harvest_worker(frame,index)
                rows=np.flatnonzero(np.any(sprite[1]>64,axis=1))
                floor=center[1]-200+rows[-1]
                self.assertAlmostEqual(basket[1]+22.5,floor,delta=3,
                    msg='Basket floats above the planted boot soles')
                if frame==704:
                    self.assertGreater(rows[-1]-rows[0],260)
                    self.assertLess(rows[-1]-rows[0],285)
                if index==0:
                    hip_y=foot[1]+data['hip'][1]-data['feet'][1]
                    self.assertGreater(hip_y,760,'Worker sits on the conveyor rail')

    def test_harvest_faces_have_lit_skin_and_visible_eyes(self):
        for index in (0,1):
            for frame in range(704,768):
                data,*_=self.processes.harvest_action(frame,index)
                sprite,_=self.processes.harvest_worker(frame,index)
                rgb,alpha,_=sprite
                def sample(name):
                    x,y=data[name];x=399-x if index==0 else x
                    x,y=round(x),round(y)
                    self.assertGreater(alpha[y,x],240)
                    return rgb[y-1:y+2,x-1:x+2].mean(axis=2)
                cheek=sample('cheek');eye=sample('eye')
                self.assertGreater(np.median(cheek),120,'Face is a dark patch')
                self.assertLess(eye.min()+45,np.median(cheek),'Eye is buried/hidden')

    def test_press_has_one_sculpt_per_portion_and_four_separated_final_patties(self):
        import cv2
        for frame in range(640,704):
            items=self.processes.press_items(frame)
            self.assertEqual(len({item[1] for item in items}),len(items),
                'The same portion is drawn twice during the ball/patty swap')
            self.assertLessEqual(sum(item[0]=='flat' for item in items),1)
        final=self.processes.press_items(703)
        self.assertEqual([item[0] for item in final],['stack']*4)
        alpha=self.processes.opaque_patty()[1]
        interior=cv2.erode(np.uint8(alpha>200),np.ones((5,5),np.uint8),
            borderType=cv2.BORDER_CONSTANT,borderValue=0).astype(bool)
        self.assertTrue(np.all(alpha[interior]==255),'Patty interiors are translucent')
        image=self.processes.grinder(703)
        # Three long cream separators remain visible between opaque discs.
        paper=np.all(image[795:901,943:1008]==(209,223,231),axis=2)
        bands=np.mean(paper,axis=1)>.35
        starts=np.count_nonzero(bands&~np.r_[False,bands[:-1]])
        self.assertGreaterEqual(starts,3,'Finished patties merge into overlapping copies')

    def test_pasture_uses_complete_necks_without_a_sideways_collision(self):
        # Compare actual neck/shoulder texels, not just a nonblank-frame check.
        for frame,name,width,center in ((190,'mother-cow-actor.webp',570,(357,690)),
                (260,'grazing-cow-actor.webp',620,(385,710)),
                (280,'grazing-cow-actor.webp',620,(385,710))):
            sprite=self.processes.part(name,0,1,1,width)
            rgb,alpha,_=sprite;h,w=alpha.shape
            x,y=round(center[0]-w/2),round(center[1]-h/2)
            actual=self.processes.pasture(frame)[y:y+h,x:x+w]
            self.assertTrue(np.array_equal(actual[alpha==255],rgb[alpha==255]),
                f'The intact cow silhouette or neck texture changed at {frame}')
        # At the old newborn position there is now only the fixed pasture.
        blank=self.processes.plate('pasture-empty.webp')
        for frame in (256,264,272,278):
            self.assertTrue(np.array_equal(self.processes.pasture(frame)[700:890,730:960],
                blank[700:890,730:960]),'A newborn overlaps the grazing cow')

    def test_background_cattle_hooves_are_on_grass_not_the_tree(self):
        with patch.object(self.rigid,'place',wraps=self.rigid.place) as place:
            self.processes.pasture(300)
        small=[call.args for call in place.call_args_list if call.args[1][1].shape[1]==150]
        self.assertEqual(len(small),2)
        for _,sprite,(x,y) in small:
            floor=y+sprite[1].shape[0]/2
            self.assertGreaterEqual(floor,830)
            if x>800:self.assertGreaterEqual(floor,900)

    def test_minced_beef_is_a_connected_component_from_the_machine_lip(self):
        import cv2
        for frame in (640,654,659,680,703):
            image=self.processes.grinder(frame).astype(float)
            meat=np.uint8((image[:,:,2]>image[:,:,0]*1.6)&
                (image[:,:,2]>image[:,:,1]*1.4)&(image[:,:,2]>120))
            _,labels=cv2.connectedComponents(meat)
            lip=set(labels[620:634,480:494].ravel())-{0}
            hanging=set(labels[750:790,500:605].ravel())-{0}
            self.assertTrue(lip&hanging,f'Meat is detached from the outlet at {frame}')

    def test_ingredient_glyphs_follow_two_columns_and_their_layer_centers(self):
        centers=(314,454,544,632,728,809,894,986)
        for (label,box,size),center in zip(REF.LABELS['burger'],centers):
            face=REF.fit_font(label,size,box[2]-box[0])
            x,y=REF.label_origin(label,face,box,'burger')
            bx0,by0,bx1,by1=face.getbbox(label)
            if box[0]<540:self.assertEqual(x+bx1,350)
            else:self.assertEqual(x+bx0,865)
            self.assertLessEqual(abs(y+(by0+by1)/2-center),1)

    def test_clock_hands_share_the_physical_dial_center_and_stay_inside_it(self):
        cx,cy=301,338
        yy,xx=np.indices((1080,1080))
        dial=(xx-cx)**2+(yy-cy)**2<65**2
        hand_area=(xx-cx)**2+(yy-cy)**2<=48**2
        blank=self.processes.plate('bakery-empty.webp')
        for frame in (768,784,799,815,831):
            picture=self.processes.bakery(frame)
            changed=np.any(picture!=blank,axis=2)&dial
            self.assertGreater(np.count_nonzero(changed),100)
            self.assertFalse(np.any(changed&~hand_area),'A hand extends beyond the dial')
            self.assertTrue(np.array_equal(picture[cy,cx],(57,58,64)))

    def test_shop_visible_lettering_is_centered_in_the_red_sign(self):
        ink=[{'caption':1,'marker':1,'labels':[1]} for _ in range(REF.N)]
        picture=REF.text_frame(self.processes.drive_in(1312),1312,ink)
        patch=picture[337:425,170:646]
        yy,xx=np.where(np.all(patch>210,axis=2))
        self.assertGreater(len(xx),1000)
        self.assertAlmostEqual((int(xx.min())+int(xx.max()))/2,patch.shape[1]/2,delta=2)
        self.assertAlmostEqual((int(yy.min())+int(yy.max()))/2,patch.shape[0]/2,delta=2)

    def test_localized_wording_uses_time_only_countdowns_and_plain_sauce(self):
        self.assertEqual(REF.caption_for(0)['text'],'햄버거 하나가 만들어지는 과정')
        self.assertIn('점심',REF.caption_for(0)['subtitle'])
        self.assertEqual(REF.caption_for(236)['marker'],'약 2년 6개월 전')
        for caption in REF.FILM['captions']:
            self.assertNotIn('점심',caption['marker'])
            self.assertNotIn('스프레드',caption['text'])
        self.assertEqual(REF.LABELS['burger'][-2][0],'소스')

    def test_rigid_joint_rotation_preserves_area_and_object_proportions(self):
        rgb=np.full((41,79,3),170,np.uint8);alpha=np.full((41,79),255,np.uint8)
        for angle in (-28,0,19):
            posed=self.processes.similarity((rgb,alpha,(0,0)),angle=angle)
            points=self.rigid.cv2.findNonZero(np.uint8(posed[1]>127))
            _,(w,h),_=self.rigid.cv2.minAreaRect(points)
            self.assertAlmostEqual(max(w,h)/min(w,h),78/40,delta=.12)
            self.assertAlmostEqual(np.count_nonzero(posed[1]>127)/alpha.size,1,delta=.06)

    def test_final_bite_keeps_a_single_fixed_post_bite_sculpt(self):
        self.assertFalse(np.array_equal(self.processes.render(1487),self.processes.render(1488)))
        self.assertTrue(np.array_equal(self.processes.render(1488),self.processes.render(1535)))

    def test_falling_burger_layers_never_cover_the_native_heading(self):
        header=self.rigid.assembly_plate()[:238]
        for frame in range(1216,1280):
            self.assertTrue(np.array_equal(self.rigid.assembly(frame)[:238],header),frame)

    def test_day_map_has_no_sun_decoration_over_the_east_sea(self):
        spec=importlib.util.spec_from_file_location('korea_map',ROOT/'korea-map.py')
        korea=importlib.util.module_from_spec(spec);spec.loader.exec_module(korea)
        self.assertTrue(np.array_equal(korea.map_pose(1008,False)[275:321,955:1002],
            np.asarray(korea.background(False))[275:321,955:1002]))

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
        labels=''.join(n[0] for n in korea.NODES)+'서울제빵소 / 패티 / 점심산지와 배송 경로 예시울릉도N100 km'
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
        self.assertEqual(REF.caption_for(300)['marker'], '약 30개월 동안')
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
            f = REF.fit_font(cap['text'], 54 if marker else 64, 964)
            box = draw.multiline_textbbox((60, 115 if marker else 31), cap['text'], font=f, spacing=18)
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
        self.assertIn('SIL OPEN FONT LICENSE Version 1.1', (ROOT / 'fonts' / 'Gaegu-OFL.txt').read_text())
        self.assertIn('SIL OPEN FONT LICENSE Version 1.1', (ROOT / 'fonts' / 'NanumSquareRound-OFL.txt').read_text())
        self.assertIn('2017 NAVER Corporation', (ROOT / 'fonts' / 'NanumSquareRound-OFL.txt').read_text())

    def test_actual_two_line_caption_has_clear_leading(self):
        ink=[{'caption':1,'marker':1,'labels':[1]*8} for _ in range(REF.N)]
        image=REF.text_frame(np.full((1080,1080,3),255,np.uint8),736,ink)
        rows=np.any(image[119:238,:1040]!=255,axis=(1,2))
        occupied=np.flatnonzero(rows)
        gaps=np.diff(occupied)-1
        self.assertGreaterEqual(gaps.max(),12,'Korean caption lines touch')
        self.assertGreater(np.count_nonzero(rows[:60]),40)
        self.assertGreater(np.count_nonzero(rows[60:]),40)

    def test_type_on_does_not_rewind_when_reference_ink_varies(self):
        rows = [{'caption': n, 'marker': n} for n in [0, 20, 18, 40, 39, 60]]
        shown = [REF.ink_progress(rows, i, len(rows), 'caption') for i in range(len(rows))]
        self.assertEqual(shown, sorted(shown))
        self.assertEqual(shown[-1], 1)
        self.assertEqual(REF.type_text('한국어 자막', 1), '한국어 자막')
        self.assertEqual(REF.type_text('1일', .97), '1일')


if __name__ == '__main__':
    unittest.main()
