# Clay style study (draft)

An opt-in claymation study of **scene 4 (bun)** and **scene 5 (patty)**.
All other scenes delegate to the existing flat renderer.
The prototype inherits every duration and caption from the original scenes:
960×540, eight scenes, 57 seconds. Narration text and TTS are unchanged.
Nothing is wired into the canonical episode or standalone player.

The previous three-card vector treatment is replaced with full-width miniature
workbench sets: code-sculpted, imperfect clay meshes, pressed marks, rolled
seams, soft studio lighting and real contact shadows. Four posed renders per
step are held on a 12-exposure-per-second stop-motion clock. The scene clock
and export cadence remain 30fps. Texture never flickers randomly.
Fingerprint whorls are physically pressed into the mesh; broader unevenness
breaks up the silhouette, while a fine surface bump and high roughness keep
the dough matte rather than smooth plastic.

Visual reference: [The Play-Doh Show — BBQ Burger Bash](https://www.toongoggles.com/shows/play-doh-show/season/1/episode/22).
The reference informed the tabletop staging, matte physical material and
chunky hand-made proportions. No reference imagery, characters or logos are
included. Every mesh and material is created by `sculpt.py`; the baked PNGs
are original procedural renders, not AI-generated images or video.

## Compare

From the repository root, serve with `python3 -m http.server 8000` and open
`/video-pipeline/pilot/burger/clay/`. Both canvases use the same scene-local
time; pause or scrub to compare the flat and clay versions. This is a silent
visual preview, not a replacement for the narrated export.

From `video-pipeline/`, generate six matched keyframes per style and scene:

```sh
npm ci
node pilot/burger/clay/render-previews.mjs
```

Outputs go to ignored `video-pipeline/out/clay-study/`, including a comparison
sheet and full-resolution clay bun/patty frames. Install `fonts-noto-cjk` to
render Korean. Pass an output directory as the first argument if needed.

For pipeline integration after visual approval, the experimental episode
is exported from `clay/scenes.mjs`. It is deliberately not registered in
the queue, and is not marked visually approved or ready to publish.

## Rebuild the miniature assets

The committed images in `assets/` make browser playback and tests independent
of Blender. To reproduce the four poses for each of six process steps:

```sh
sudo apt-get install blender
DISPLAY=:0 blender -b -t 6 --python video-pipeline/pilot/burger/clay/sculpt.py
```

Run from the repository root. Blender 3.0.1 / Eevee was used for the study.
This requires a working OpenGL display for Eevee; it is an authoring command,
not a runtime dependency or a mandatory CI step.

For a quick material check, append an output directory, scene-name filter and
pose number after `--`, e.g. `-- /tmp/clay-check bun-bake 0`.
