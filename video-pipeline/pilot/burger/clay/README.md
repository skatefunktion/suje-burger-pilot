# Clay style study (draft)

An opt-in, code-drawn Play-Doh-like treatment of **scene 4 (bun)** and
**scene 5 (patty)**. All other scenes delegate to the existing flat renderer.
The prototype inherits every duration and caption from the original scenes:
960×540, eight scenes, 57 seconds. Narration text and TTS are unchanged.
Nothing is wired into the canonical episode or standalone player.

The clay effect uses softly uneven silhouettes, matte shaded surfaces,
deterministic pores and finger impressions, thick rounded tools, and contact
shadows. Texture never changes randomly between frames. No generated images,
external assets, or additional dependencies are used.

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
