# CI

GitHub Actions only discovers workflows from the repository root.
The pipeline workflow is [`video-pipeline.yml`](../../../.github/workflows/video-pipeline.yml).
The required status check for main should be **`video-pipeline-qc`** in a
repository ruleset or branch protection; workflow YAML cannot enforce branch
protection. Do not merge with this check pending or red.
