# art/incoming — unvalidated deliveries

Raw creative deliveries wait here until the asset tool has checked them. **Nothing in this folder reaches the game.**

```
art/incoming/pack-01/<asset_id>.png                  a finished sheet, or
art/incoming/pack-01/<asset_id>/<anim>_<NN>.png      loose frames (NN from 01; flat #00FF00 background if no alpha)

npm run assets:validate:pack01                       check only; writes art/incoming/pack-01/report.md
npm run assets:build:pack01                          assemble + validate + write public/assets/final/ (rejected assets are never written)
```

Rules: exact asset ids and cell sizes from `docs/GEMINI_PACK_01_BRIEF.md`; concept boards and collages are **not** deliverables and are rejected
(unknown file names, wrong sizes). After a successful build, record the file in `docs/CREATIVE_DELIVERY_LOG.md` (a test fails if the log claims a
delivery that is not in `public/`). Audio goes to `art/incoming/audio/` (see `docs/audio/README.md`).
