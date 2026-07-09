# AFF3CT Download Page & CSV Structure

This directory contains the CSV database file (`download_released.csv`) that feeds the pre-built binary downloads table on the AFF3CT website (`download.html`).

The download table is dynamically rendered by [`js/download.js`](../js/download.js), which fetches the CSV file, parses the entries from bottom to top (latest releases first), and generates download buttons for Windows, macOS, and Linux.

> [!NOTE]
> The page now shows a single **Released versions** section. Only tagged releases (`v*`) are listed. The previous split between "Development versions" (`download_develop.csv`) and "Stable versions" (`download_master.csv`) has been retired; `download_released.csv` is the renamed continuation of the former `download_master.csv` (its historical rows are preserved). `download_develop.csv` is kept only as an archive and is no longer displayed.

---

## 1. CSV Format

`download_released.csv` uses the following comma-separated format. Each column entry is enclosed in double quotes (`"`):

```csv
"tag","hash","date","message","author","path","builds"
```

| Column | Description | Example |
| :--- | :--- | :--- |
| **`tag`** | The git release tag or version. | `"v4.5.0"` or `"v3.0.2"` |
| **`hash`** | The git commit hash (short or full). | `"8fa65a3ca"` |
| **`date`** | The commit date string. | `"Thu Apr 21 10:34:08 2022 +0200"` |
| **`message`** | The commit message title. | `"Update AFF3CT headers."` |
| **`author`** | The author of the commit. | `"Adrien Cassagne"` |
| **`path`** | Base URL where the archives are hosted (must end with `/`). | `"https://github.com/aff3ct/aff3ct/releases/download/v4.5.0/"` |
| **`builds`** | Semicolon-separated (`;`) list of zip filenames available at `path`. | `"aff3ct_v4_5_0_linux_gcc_x64_sse4_2_<hash>.zip;..."` |

> [!IMPORTANT]
> Historical rows in `download_released.csv` must **never be modified or formatted**. Full backward compatibility (retrocompatibility) with older hosting URLs and naming conventions is maintained.

---

## 2. Naming Convention for Zip Files

When [`js/download.js`](../js/download.js) renders the download links, it inspects substrings within each zip filename in `builds` to classify the operating system, architecture, and SIMD instruction set:

- **Operating System (`sys`)**:
  - Contains `windows` $\rightarrow$ Windows build
  - Contains `macos` $\rightarrow$ macOS build
  - Contains `linux` $\rightarrow$ Linux build
- **Architecture (`arch`)**:
  - Contains `x86` $\rightarrow$ 32-bit x86
  - Contains `x64` (or otherwise) $\rightarrow$ 64-bit x86-64
- **SIMD Instruction Set (`simd`)**:
  - Contains `avx2` $\rightarrow$ AVX2 optimizations
  - Contains `sse4_2` $\rightarrow$ SSE4.2 optimizations

### Archive Naming Schemes

- **New Naming Convention (GitHub Actions era)**:
  ```
  aff3ct_<tag>_<os>_<compiler>_<arch>_<simd>_<hash>.zip
  ```
  *Example*: `aff3ct_v4_5_0_linux_gcc_x64_sse4_2_a1b2c3d.zip`

- **Legacy Naming Convention (GitLab CI / Early GitHub era)**:
  ```
  aff3ct_master_<os>_<compiler>_[<arch>_]<simd>_<hash>.zip
  ```
  *Example*: `aff3ct_master_linux_gcc_x64_sse4_2_61509eb75.zip`

---

## 3. Old Entries vs. New Entries

The AFF3CT project has evolved through several CI and binary hosting eras. While the CSV format (`tag,hash,date,message,author,path,builds`) has remained constant, the base `path` and zip naming schemes differ. Historical rows keep their original paths/names for backward compatibility:

### New Entries: GitHub Actions Era
- **CI Engine**: GitHub Actions (`github.com/aff3ct/aff3ct`).
- **Hosting (`path`)**: Uploaded as **GitHub Release assets**, attached to the release tag itself:
  ```
  https://github.com/aff3ct/aff3ct/releases/download/<tag>/
  ```
- **Filenames (`builds`)**: Use the release `<tag>` as prefix (e.g., `aff3ct_v4_5_0_linux_...`).

### Old Entries: GitLab CI Era
- **CI Engine**: GitLab CI (`gitlab.com/aff3ct/aff3ct`).
- **Hosting (`path`)**: Stored directly as GitLab job artifacts:
  ```
  https://gitlab.com/aff3ct/aff3ct/-/jobs/<job_id>/artifacts/raw/builds/
  ```
- **Filenames (`builds`)**: Used `master` prefix for release builds (e.g., `aff3ct_master_linux_...`).

### Oldest Entries: GitHub Resources Era
- **Hosting (`path`)**: Hosted in a dedicated repository (`aff3ct/resources`):
  ```
  https://github.com/aff3ct/resources/raw/master/aff3ct_builds/
  ```
- **Filenames (`builds`)**: Early builds sometimes omitted the architecture prefix (`x64`), defaulting to 64-bit.

---

## 4. How a New Entry is Appended by CI

A new entry is appended **only when a `v*` tag is pushed** (the `deploy.yml` workflow in `aff3ct/aff3ct` publishes releases on tags only; branch pushes and pull requests run dry-runs that publish nothing):

1. Multi-platform binaries (Windows, macOS, Linux across SSE4.2 and AVX2) are compiled and packaged into `.zip` archives.
2. The archives are uploaded as assets to the GitHub Release for that tag (e.g., `v4.5.0`).
3. The CI constructs a new line adhering to the CSV schema:
   ```csv
   "v4.5.0","<hash>","<date>","<message>","<author>","https://github.com/aff3ct/aff3ct/releases/download/v4.5.0/","aff3ct_v4_5_0_linux_gcc_x64_sse4_2_<hash>.zip;..."
   ```
4. This line is appended to the bottom of `download/download_released.csv`.
5. When a user visits `download.html`, [`js/download.js`](../js/download.js) reads the CSV file from bottom up and displays the latest release entries.
