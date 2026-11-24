# Burger pilot

The existing [standalone browser player](../../../index.html) and [v1 backup](../../../index-v1.html)
remain the entry points at repository root. Its [storyboard](../../../storyboard.md) is
the narration and production reference.

The queue imports the original eight scene definitions from `scenes.mjs`. To change the
canonical sources, edit that file or `video-pipeline/scenes/canvas-kit.mjs` and run
`npm run sync:pilot` from `video-pipeline/` to regenerate the embedded source without
requiring a web server or network access for the browser preview.
