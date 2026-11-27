# Clay burger review exports (unmerged)

## Current request: 64-second square reference remake

`restyle-reference.py` follows the confirmed [Kevin Ngo film](https://x.com/kevin_t_ngo/status/2111569193347018977)
itself, not the earlier Korean pilot: **1080×1080, 24fps, 1,536 frames, 64 seconds**.
`reference-film.json` records 24 source-timed sections, 88 clay anchors, Korean
captions and the approved localization. The original video is supplied locally;
it is not committed. This remains a draft visual-review export, not a queue
registration or production rollout.

The source-frame image edits in `reference-assets/` follow the source compositions,
ingredient stages and camera framing, with matte clay material, rounded shapes,
meat-textured patties, and no fingerprints or finger dents. Faint construction
outlines remain outlines until their objects appear. Asset hashes and authoring
provenance are in `reference-assets/manifest.json`. These new anchors are AI-assisted
image edits, **not** the procedural Blender assets described below. The renderer
uses **intact clay sculpts**: no registration warp, optical flow, contour morphing
or dissolves. The former registration flattened dimensional
clay into the source drawing's silhouettes, and subsequent flow made it wobble.
Both passes are removed, not merely reduced in strength.

Exposures match source illustrated content in monotonically advancing order,
not just nearest timestamps; this preserves ingredient, dairy, oven and worker
stages without flickering back to earlier sculpts. `rigid-scenes.py` now poses
separate whole clay objects on fixed backgrounds at **24fps** for the exploded
diagram, sowing tractor, griddle, burger assembly and worker lineup/bee. Tractor
and griddle positions come from complete-object source measurements, not a pixel
displacement field. Newly sculpted loose ingredients and people have real alpha;
only uniform authoring-time sizing and rigid translation are used. There is no
per-frame shape stretching. `process-scenes.py` extends the fixed-set approach
to the remaining production shots: complete cattle sculpts and eight distinct
calf-rise sculpts, dairy stage entries, flower/bee/cucumber growth, grain delivery,
grinder and press, complete 3D pickers squatting/reaching/lifting vegetables into
baskets with planted feet and adult-length arms, oven door/tray/rising buns,
fresh slicing and curbside lunch. Whole parts rotate at joints; only physical
flower/fruit growth and dough rising use **uniform** scale, never changed aspect
ratios. Vehicles follow frame-by-frame paths. The final bite switches once to a
single fixed bitten sculpt instead of changing camera/texture afterward.
This remains a source-timed clay reinterpretation, **not** an exact reconstruction
of every original articulated pose or 3D patty rotation. `frame-exposures.json`
records each frame's authored stage and motion mode.

The harvesters no longer use a horizontally cut waist or detached arm images.
`sculpt-harvest.py` renders 64 **complete** 3D poses for each worker: continuous
jacket hems overlap a solid trouser seat, each bent sleeve is one smooth surface,
and knees bend to reach the low crop instead of extending the arms. Upper arm and
forearm lengths are 0.29 and 0.27 scene units against a roughly 1.75-unit adult.
The tomato picker faces screen-right toward the tomato vines, while the lettuce
picker faces screen-left. Projected hand/crop landmarks attach the intact produce
sprite to the grip. Baskets stay beside the workers, not in the pickup location.
Upright workers are about 270px tall, calibrated to the source foreground adult.
The lettuce worker and basket stand on the crop rows below the conveyor; neither
rests on its rail. Fixed ground shadows and brighter pose lighting keep their
boots and baskets visibly grounded in the existing field.
Short hair covers only the top/back of the head. Profile eyes and eyebrows sit
outside the cheek surface, and a soft camera-side fill keeps faces readable
under the hat brim rather than rendering as a featureless dark patch.

Rebuild these native-frame poses with Blender 3.x, then pack them (Pillow):

```sh
blender -b -t 4 --python video-pipeline/pilot/burger/clay/sculpt-harvest.py -- /path/to/render-directory
python3 video-pipeline/pilot/burger/clay/pack-harvest.py /path/to/render-directory
```

The grinder emits one portion per synchronized press stroke. A portion changes
from ball to pressed disc **once**, behind the die, then travels onto the output.
The finished stack uses opaque meat mattes and visible cream separator sheets,
as in the source, rather than overlapping translucent copies of the same image.

Visible headings, diagram labels, map labels and worker labels are typeset in
Korean. The owner requested two source-style exceptions: the shop's **BURGERS**
sign and the small **N** compass arrow, which also appears in the original map.
The current type proof uses **NanumSquareRound Bold**, a restrained rounded
Korean sans with warm brown ink, not the rejected Gaegu handwriting. It is
bundled in `fonts/` under the [SIL Open Font License 1.1](fonts/NanumSquareRound-OFL.txt),
permitting use in published videos. The unmodified font comes from
[NAVER's official archive](https://campaign.naver.com/nanumsquare_neo/download/NaverNanumSquareRound.zip);
the [official license](https://help.naver.com/service/30016/contents/18088?lang=ko&osType=PC)
explicitly includes NanumSquareRound. This is proof A; owner selection against
the lighter Gowun Dodum proof B remains open. Neither is claimed approved.
Ingredient names follow two fixed columns: left labels end at x=350, right labels
begin at x=865. Their visible glyphs are centered vertically on the eight layer
centers; full-label bounds keep the type-on from sliding horizontally.
The native type-on follows measured source-ink timing; the red underlined markers
retain their original location.
Two-line captions have an additional 18px of leading so full Korean glyphs do
not touch; the heading remains above the miniature artwork.

The opening reads **햄버거 하나가 만들어지는 과정**, with a short subtitle
establishing that the story rewinds from lunchtime. The source's opening marker
is **~2 YEARS TO LUNCH**. Its approved Hanwoo equivalent is now **약 2년 6개월 전**;
other countdowns use time-only Korean labels such as **6시간 전**, not the awkward
literal **점심까지**. The grazing duration is explicitly **약 30개월 동안**, distinct
from a countdown. **소스** replaces the less familiar **스프레드** throughout.

### Approved Daegwallyeong exception

The cattle sequences use tawny Hanwoo and green Daegwallyeong mountain pasture,
instead of California Herefords and golden hills. Their marker is **약 30개월 동안**;
the opening countdown and closing total agree at **약 2년 6개월**. The
[Korea Institute for Animal Products Quality Evaluation, September 2024](https://www.ekape.or.kr/webjin/202409/resource/sub01-01.html)
describes most Hanwoo steers being marketed at approximately 30 months of age.
This is an illustrative localization, not farm traceability or a claim of
exclusive grazing throughout that period. Other time labels, source order and
audio remain source-based.

### Approved Korean delivery-map exception

The three delivery sections use a **South Korean clay map**, including Jeju and
offshore islands, with a Daegwallyeong pasture pin and Seoul destination. The
country outline comes from public-domain [Natural Earth](https://www.naturalearthdata.com/about/terms-of-use/)
geometry in `korea-map-geography.json`. It is sculpted once by
`sculpt-korea-map.py`; `reference-assets/korea-terrain.png` is the committed,
fixed-geometry render. No Blender dependency is needed to export the video.
The eastern relief now uses connected, creased **Taebaek/Sobaek mountain ridges**,
not oval mounds. This is stylized relief, not measured elevation. The original
day-map sun decoration is deliberately removed at the owner's request.
The eastern island polygon (130.81–130.93°E, 37.45–37.55°N) is **Ulleungdo**;
its native **울릉도** label makes that explicit instead of leaving an unnamed dot.

`korea-map.py` draws native Korean labels, road paths and intact truck
glyphs moving at **24 poses per second**. Trucks advance by arc length, including
positions inside a road segment, rather than hopping between sparse waypoints.
The night/day wipe reveals the **same
terrain**, never a regenerated or warped map. The scale is recomputed as 100 km
for the local equirectangular projection, not translated from California miles.
The caption no longer claims a journey of hundreds of miles. Ingredient origins
are **illustrative**, labelled on screen as `산지와 배송 경로 예시`;
they are not traced suppliers. All six paths in `korea-road-routes.json` follow
the OpenStreetMap road network, retrieved via OSRM and simplified within
0.00015 degrees. Daegwallyeong to Seoul uses **영동고속도로 → 광주원주고속도로**
and connecting roads. These are example routes, not live navigation or a supplier
trip. Road data is ODbL-licensed with `© OpenStreetMap 기여자` visible on screen;
see [OpenStreetMap attribution](https://www.openstreetmap.org/copyright).
The nine legacy
California anchor edits remain in the provenance archive but are never rendered.

### Verified Jeolla wheat example

The sowing/harvest captions and map name an illustrative **전라도 우리밀** field.
[MAFRA's 2023 production-district casebook](https://www.mafra.go.kr/bbs/home/792/565281/artclView.do)
documents wheat in Jeonbuk Buan and Jeonnam, including the bread-making cultivar
백강. Its [2023 area release](https://www.mafra.go.kr/bbs/home/792/569098/download.do)
lists Jeonbuk 4,618ha and Jeonnam 4,572ha out of 11,600ha nationally. These dated
figures support the localization but are not put on screen as current statistics.
No claim is made that this particular burger or supplier uses domestic wheat.

### Approved Korean shop, vehicles and people

The lunch scene now uses a **Seoul neighborhood burger storefront**, native
**BURGERS** lettering like the original and compact Korean-style hatchbacks, without palm trees or
American diner decor. The grain vehicle is a Korean-style cab-over **1-ton truck**.
Korean farmers, drivers and shopkeepers use natural dark hair and practical local
workwear, with no exaggerated facial features. All moving bodies/vehicles have
their own alpha masks; they are not regenerated between frames. Legacy source
anchors remain in the provenance archive, but these production shots use the new
Korean sets and actors. Motion-asset hashes are checked **before encoding**.
The hand-harvest field uses two spaced workers rather than the original seven.
They reach for a lettuce/tomato, lift it and deposit it into a basket using
complete 3D poses with continuous clothing and proportionate limbs, not a cut
waist or detached 2D arm rods. Both face their own crops and squat through the
knees rather than rocking the whole person or lengthening an arm to reach.
The bakery clock's two
hands share its actual center at (301, 338) on the 1080-square plate and keep the
12:1 minute/hour rate. Shop lettering is centered by its visible glyph bounds.
The closing cast has individual uniform height sizing with aligned feet; the
rancher wears a brown vest and the dairy worker an ivory apron/light-blue shirt.

Cattle retain their complete authored silhouette; only eyelid blinks are added.
The rectangular neck cut and head rotation are removed, as is the grazing cow's
sideways slide into a stationary calf. The newborn belongs only to the birth/
standing scenes. Distant grazing cattle are anchored by hoof level on the grass,
not by their sprite center over the tree. The grinder's meat strands connect
continuously through a shaded clay outlet bend to the machine's actual lip,
rather than bobbing as a detached clump in empty space.

To rebuild only the fixed terrain (Blender 3.x):

```sh
blender -b -t 4 --python video-pipeline/pilot/burger/clay/sculpt-korea-map.py -- video-pipeline/pilot/burger/clay/reference-assets/korea-terrain.png
```

### Rebuild and QC

From the repository root, with ffmpeg and Python 3 installed:

```sh
python3 -m pip install numpy==1.26.4 Pillow==11.3.0 opencv-python-headless==4.10.0.84
python3 video-pipeline/pilot/burger/clay/restyle-reference.py prepare /path/to/confirmed-reference.mp4 /path/to/work
python3 video-pipeline/pilot/burger/clay/restyle-reference.py render /path/to/confirmed-reference.mp4 /path/to/work
```

The source must match the committed anchors' source hash, and the prepared source
hash must still match at render time. Missing anchors fail before
encoding. Committed WebP anchors make rendering independent of image-generation
access. `--shot 0` through `--shot 23` render a short silent motion study instead.
The full export copies the source AAC payload, verifies square dimensions,
frame rate and frame count, compares audio hashes, and fully decodes both streams.
Output: `kevin-burger-clay-ko-64s.mp4`, `export-review.json`, and one review frame
per section. Generated outputs and the original MP4 remain outside Git.

Run authoring checks with `python3 -m unittest discover -s video-pipeline/test -p 'test_reference_clay.py'`.

## Earlier 57-second landscape pilot

A complete claymation rendering of **all eight scenes**, following the owner's
choice of clay and the per-ingredient cuts in PR #14. No scene delegates its
artwork to the flat renderer. Every duration and caption comes from the original:
960×540, eight scenes, 57 seconds. Narration text and TTS are unchanged.
The full clay episode is reviewable here; the canonical episode, existing
standalone player and PR #14's branch are not modified or merged.

## Story coverage

1. A completed miniature burger introduces the episode.
2. Separate Hanwoo farm, wheat, tomato and lettuce shots lead to delivery to Seoul.
3. Each of Hanwoo, wheat, tomato, lettuce, sesame and cheese has its own growth or
   production shot. Crops leave the field when placed in the harvest basket.
   The six existing duration labels are retained; no new figures are introduced.
4. Bun mixing, proofing and baking retain the corrected miniature tools.
5. Mincing, shaping and grilling stay separate. Irregular beef grain, fat flecks,
   broken sidewall fibers and searing replace smooth pink toy-dough surfaces.
6. The six burger layers build in order, without cycling back to earlier layers.
7. Thick bulgogi sauce and falling sesame finish the burger.
8. The plated burger closes the episode, with the same textured patty visible.

The previous three-card vector treatment is replaced with full-width miniature
workbench sets: code-sculpted, imperfect clay meshes, rolled
seams, soft studio lighting and real contact shadows. Two or four posed renders
per shot are held on a 12-exposure-per-second stop-motion clock. Growth, harvest,
delivery and finishing poses advance forward; the scene clock
and export cadence remain 30fps. Texture never flickers randomly.
Broad unevenness breaks up the silhouette, while a fine surface bump and high
roughness keep the dough matte rather than smooth plastic. Fingerprint whorls,
finger dents and fingertip edge marks are deliberately omitted from all food
and props at the owner's request.
The revised silhouettes use one continuous bun dome, a beveled patty sidewall,
and properly open bowls and molds. Connected miniature parts make the tools
legible: the oven has a door frame, rack, vents and dials; the knife has a blade,
bolster and riveted handle; the grill has capped bars and a slotted turner.
The rounded bun and hand-shaped oven keep their established proportions and
uneven matte material without stamped surface patterns.

Visual reference: [The Play-Doh Show — BBQ Burger Bash](https://www.toongoggles.com/shows/play-doh-show/season/1/episode/22).
The reference informed the tabletop staging, matte physical material and
chunky hand-made proportions. No reference imagery, characters or logos are
included. Every mesh and material is created by `sculpt.py` and
`sculpt_episode.py`; the baked PNGs
are original procedural renders, not AI-generated images or video.

## Compare

From the repository root, serve with `python3 -m http.server 8000` and open
`/video-pipeline/pilot/burger/clay/`. Both canvases use the same scene-local
time; choose any of eight scenes, pause or scrub to compare the flat and clay
versions, or use **전체 57초 재생** for continuous playback. The left side is
the canonical flat reference, not a duplicate of PR #14. This is a silent
visual preview, not a replacement for the narrated export.
On narrow screens, the current process label and description also appear below
the clay canvas at 20px / 18px, alongside the separate 18px narration caption.
These use the same shot selector as the artwork, so scrubbing stays synchronized.

From `video-pipeline/`, generate six matched keyframes per style and scene:

```sh
npm ci
node pilot/burger/clay/render-previews.mjs
```

Outputs go to ignored `video-pipeline/out/clay-study/`, including an eight-scene
overview, ingredient/growth and assembly sheets, matched bun/patty comparisons,
and full-resolution scene frames. Install `fonts-noto-cjk` to
render Korean. Pass an output directory as the first argument if needed.

For pipeline integration after visual review, the full clay episode
is exported from `clay/scenes.mjs`. It is deliberately not registered in
the queue, and is not marked visually approved or ready to publish.

## Confirmed-reference presentation and narrated review MP4

The owner confirmed [Kevin Ngo's burger film](https://x.com/kevin_t_ngo/status/2111569193347018977)
as the visual reference, not the earlier Korean smoke export. Its numbers are
production-time markers, not prices. `original-format.mjs` follows its small red,
underlined time marker and one-line caption at the upper left, above large clay
artwork. There is no bottom caption band, centered heading, badge, inset card,
scene counter or process-progress strip.

The Korean pilot remains **960×540 landscape, eight scenes and 57 seconds**;
this is not a 64-second square remake of the English film. Every canonical
Korean caption stays verbatim, moved to the top. Ingredient durations come from
the existing Korean storyboard (Hanwoo 30 months, wheat 7, tomato/sesame 3,
lettuce 2, cheese a few days), not the California reference. Preparation,
delivery and finishing use verbal time/stage markers where no duration was
specified; no prices or new numeric claims are added.

Geometry-derived alpha mattes remove only the baked studio floor; pale props,
food surfaces and meat textures remain intact. The approved held-pose animation
is unchanged: this presentation correction does not remove stop-motion boil.
The export has its own top-caption painter/encoder; the shared production queue
and the comparison player's bottom-caption layout remain untouched.

From `video-pipeline/`, pass the owner's existing **57-second Korean narration
MP4** as the audio source, not the 64-second English reference:

```sh
node pilot/burger/clay/render-original.mjs /absolute/path/to/korean-pilot-57s.mp4
```

The ignored `out/clay-original-format/` directory contains the standalone MP4,
scene samples and an export manifest. The original audio stream is copied, not
regenerated or retimed, including any pre-existing test-voice pronunciation
artifacts. This is a review export, not a production publication or approval.

The committed mattes rebuild with the same geometry/camera as the color assets:

```sh
CLAY_ALPHA_ONLY=1 DISPLAY=:0 blender -b -t 4 --python video-pipeline/pilot/burger/clay/sculpt.py -- video-pipeline/pilot/burger/clay/assets/mattes
CLAY_ALPHA_ONLY=1 DISPLAY=:0 blender -b -t 4 --python video-pipeline/pilot/burger/clay/sculpt_episode.py -- video-pipeline/pilot/burger/clay/assets/mattes
```

## Rebuild the miniature assets

The committed images in `assets/` make browser playback and tests independent
of Blender. Rebuild the shared bun/patty poses and the complete episode sets:

```sh
sudo apt-get install blender
DISPLAY=:0 blender -b -t 4 --python video-pipeline/pilot/burger/clay/sculpt.py -- video-pipeline/pilot/burger/clay/assets
DISPLAY=:0 blender -b -t 4 --python video-pipeline/pilot/burger/clay/sculpt_episode.py -- video-pipeline/pilot/burger/clay/assets
```

Run from the repository root. Blender 3.0.1 / Eevee was used for the study.
This requires a working OpenGL display for Eevee; it is an authoring command,
not a runtime dependency or a mandatory CI step.

For a quick material check, append an output directory, scene-name filter and
pose number after `--`, e.g. `-- /tmp/clay-check bun-bake 0` for the shared
builder, or `-- /tmp/clay-check origin-farm 0` for the episode builder.

The original bun process assets are 1200×480. New episode sets are 900×360;
both have the same aspect ratio, framing and material/lighting library. The
runtime uses image dimensions, not a fixed source crop. Playback remains
960×540 at 30fps and does not require Blender or network services.
