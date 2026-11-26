# Full clay burger pilot (unmerged)

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
