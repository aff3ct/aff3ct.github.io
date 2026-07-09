# AFF3CT Download Page

`download_released.csv` feeds the **Released versions** table on `download.html`,
rendered by [`js/download.js`](../js/download.js) (read bottom-up, latest first).

Only tagged releases (`v*`) are listed. `download_develop.csv` is a retired
archive, no longer displayed.

## CSV format

One quoted, comma-separated row per release:

```csv
"tag","hash","date","message","author","path","builds"
```

- `path`: base URL of the archives, must end with `/`.
- `builds`: `;`-separated zip filenames found at `path`. `download.js` picks the
  OS/arch/SIMD from substrings in each name (`windows`/`macos`/`linux`,
  `x86`/`x64`, `avx2`/`sse4_2`).

New rows are appended by the `deploy.yml` workflow in `aff3ct/aff3ct` **only when
a `v*` tag is pushed**; binaries are attached to that tag's GitHub Release, so
`path` is `https://github.com/aff3ct/aff3ct/releases/download/<tag>/`.

> [!IMPORTANT]
> Never rewrite existing rows — older ones keep their legacy paths/names
> (GitLab job artifacts, `aff3ct/resources`) for backward compatibility.
