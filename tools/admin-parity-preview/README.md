# Exercise / Cover image lab

Local tool with **two big tabs**:

| Tab | Frame | Export |
|-----|--------|--------|
| **Exercises** | 3∶2 | 1536×1024 WebP |
| **Cover** | 8∶5 | 1200×750 WebP |

## How it works

1. Open the **Exercises** or **Cover** tab.
2. Load an image: **file**, **drop**, **paste URL**, or **Load from repo** (same paths as Drills: `exercise_guides/{id}.webp`, `plan_covers/...`).
3. **Zoom** with the **slider** or **wheel**. **Drag** to move.
4. **App preview** updates live. **Download** saves WebP; the default filename matches the shipped asset when you loaded from repo (e.g. `burpees.webp`).
5. Commit the file back to the repo with **Drills admin** or git — this lab does not push to GitHub.

Default repo is **`tasosstyl1984/tabataCoreDrills`**, branch **`main`**. Override with query: `?owner=…&repo=…&branch=…`

**Deep links (optional):**

- Exercise by id: `?exercise=burpees`
- Exercise by raw URL: `?ex_url=https://raw.githubusercontent.com/…/burpees.webp`
- Plan cover path: `?cover=plan_covers/your_file.webp`
- Cover by raw URL: `?cov_url=https://raw.githubusercontent.com/…`

Same interaction model as Drills admin zoom/pan (no Cropper).

## Run

```bash
cd c:\github\tabataCoreDrills
python -m http.server 5050
```

Open: http://localhost:5050/tools/admin-parity-preview/

Hard-refresh (Ctrl+F5) after updates.
