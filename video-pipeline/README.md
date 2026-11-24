# Weekly Korean education-video pipeline

The [burger player](../index.html) still opens directly in a browser. The pipeline
uses the same scene functions and [canvas kit](scenes/canvas-kit.mjs). Episode 2's
[script and scene slots](episodes/ep02/README.md) are staged separately.

## Run locally

On Ubuntu, install Node.js 22+, FFmpeg (including ffprobe and libx264),
`fonts-noto-cjk` and `fonts-noto-color-emoji`.
Install `espeak-ng` for the offline Korean narration used by the CI smoke test.

```sh
cd video-pipeline
npm ci
npm test
npm run smoke
npm run render -- ep02 --scene-gate
```

Each run writes its own directory in `out/` (or `VIDEO_PIPELINE_OUT`) and a
`job.json` with scene results, retry count, fallback and audio status. Rendering
samples fixed frames at 30fps in an isolated process per attempt. If the first
attempt and two retries fail, a caption-only error card becomes the diagnostic
segment; the job is **degraded** and no final video is created. The smoke video
uses a local synthetic QA voice and is **not** a publication candidate.
Known readability issues in the existing pilot can be recorded as pilot
smoke-only exceptions; they do not satisfy production visual QC.

For production, set `FISH_AUDIO_API_KEY` and `FISH_AUDIO_REFERENCE_ID` (a Korean
voice authorized for the project) and use `npm run render -- ep02`. The Fish Audio
take is rendered per scene, checked for silence, and aligned within a modest speed
range. Listen to every take for pronunciation and pacing before publishing. If
the render, audio, visual approvals, or 45–60s/size/frame checks fail, the
command exits nonzero without promoting a final MP4.

## Add one scene per PR

1. Edit that scene's file under `scenes/ep02/`. Keep the assigned timing and
   caption; reuse the canvas kit for palette, ink strokes, easing, faces, pills,
   and shadows. Use `draw(t, ctx, kit)` with normalized time `t` and keep
   artwork above the caption band (`y < 480`).
2. Run `npm run render -- ep02 --review 1` (substitute the scene number).
   Open every PNG in that scene's output directory. The renderer looks for
   foreground content and checks artwork on and up to 64 pixels beyond the
   canvas edges, including the reserved caption area, at seven key frames.
   Human review must also check intended geometry, proportions, readable faces
   and labels, contrast, the intended layer order and the pilot's style.
3. Commit a checklist in `scenes/ep02/review-01.json` (use the scene number),
   with the assigned human reviewer's GitHub login, the PR number and the
   CLI-reported fingerprint. Example:
   ```json
   {
     "reviewer": "human-reviewer-github-login",
     "approvalPR": 123,
     "fingerprint": "Paste the reported SHA-256 after looking at the frames",
     "checks": {
       "insideCanvas": true,
       "captionClear": true,
       "proportions": true,
       "readable": true,
       "contrast": true,
       "layerOrder": true,
       "pilotStyle": true
     }
   }
   ```
   If the scene imports additional components, add those sources to the
   corresponding `episode.reviewDependencies` entry so edits invalidate approval.
   After checking the frames and checklist at the final commit, the human
   reviewer must submit an **Approve** review in GitHub (not just write their
   name in JSON). Only current approvals by an allowlisted human account
   other than the PR author count. CI reruns on review submission or dismissal.
   Later episodes can reuse an unchanged scene's checklist and approval PR.
4. CI renders every non-placeholder scene with `--scene-gate`, rejects stale or
   missing approvals, and separately runs the full burger smoke test. The exact
   scaffold stubs may stay pending until their scene PR. The production render
   does not accept stubs or unapproved visuals. Wait for `video-pipeline-qc` and
   merge one scene PR at a time.

Set the repository Actions variable `VIDEO_PIPELINE_HUMAN_REVIEWERS` to the
comma-separated GitHub logins of human reviewers. Set the same variable in
local production runs; supply a read-only `GITHUB_TOKEN` if GitHub API
authentication is needed. Only the burger **smoke fixture** uses legacy
Devin-reviewed references; that exception never approves a new scene or a
production render.

Keep GitHub's independent PR approval and `video-pipeline-qc` required, and
protect changes to the workflow and review code with designated reviewers.
