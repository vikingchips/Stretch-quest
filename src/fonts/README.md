# Fonts

**Jost** — variable weight axis 200–500, subset to latin and latin-ext.
Copyright 2020 The Jost Project Authors, https://github.com/indestructible-type/Jost
Licensed under the SIL Open Font License 1.1 (see `OFL.txt`).

Self-hosted rather than loaded from a CDN so the PWA keeps its typography
offline and makes no third-party requests. The files are imported from
`src/index.css` with relative URLs, so Vite hashes them and rewrites the paths
for whatever `BASE_PATH` the deploy uses.

Only weights 200 (extralight) and 300 (light) are used.
