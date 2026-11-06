# Tabata Core Plans (GitHub Pages)

Public catalog of Tabata Core workout plans.

Live site: https://tasosstyl1984.github.io/tabataCoreDrills/  
Repo: https://github.com/tasosstyl1984/tabataCoreDrills

**Public `catalog.json`** = online-only plans the Android app can download.
**Admin `presets.json`** = the shipped Android presets (`default_*` ↔ `remote_*`),
shown only after Admin sign-in (not mixed into the app download catalog).
Football-only packs stay out of shipped gym presets.

### Edit presets in Admin → devices pick up updates

1. Sign in as Admin on this site.
2. Open a card marked **preset** → **Edit** (name, description, cover, rounds).
3. **Save** writes `drills/remote_*.json` + `presets.json` (not `catalog.json`).
4. The Android app fetches `presets.json` on catalog refresh and silently updates
   matching shipped `default_*` plans when `updatedAtMs` is newer. User-built
   custom plans are never touched.
5. Optionally sync into the APK seed for new installs / offline:

```bash
# from TabataCore repo root (sibling of this repo)
python tool/import_presets_from_drills.py
```

Presets cannot be deleted from the site (they ship in the APK). Online-only plans
still use **New plan** / Delete against `catalog.json`.

### Weekly plans (`weekly_plans.json`)

Curated **Mon–Sun** schedules: each day points at a `remote_*` plan id from
`catalog.json` (or **rest** = `null`). Tabata Core PR2 will download this file and
let users **Choose a weekly plan**; until then the public site lists weeks for preview.

**Admin**

1. Sign in → **New weekly plan** (admin bar).
2. Set name, description, and seven day dropdowns (catalog + preset overlay while signed in).
3. **Save** commits `weekly_plans.json` in one atomic git commit (bumps `version` / `updatedAtMs`).
4. **Edit** / **Delete** / **↑↓ reorder** on weekly cards when signed in.

Example entry:

```json
{
  "id": "remote_week_mon_thu_strength",
  "name": "Mon / Thu strength",
  "description": "Weighted Shadow Monday, Ladies First Thursday.",
  "updatedAtMs": 0,
  "slots": {
    "mon": "remote_weighted_shadow",
    "tue": null,
    "wed": null,
    "thu": "remote_ladies_first",
    "fri": null,
    "sat": null,
    "sun": null
  }
}
```

## How the site loads data

- **GitHub Pages** hosts the HTML/CSS/JS shell and static exercise guide assets.
- **Mutable plans** (`catalog.json`, `drills/*.json`, `plan_covers/*`, `weekly_plans.json`) are always read from
  **raw.githubusercontent.com** (same source the Android app uses). That avoids the
  Pages CDN lag after Save.

## Admin (browser)

1. Open the site → **Admin**.
2. Sign in with a **GitHub personal access token** that can write Contents on this repo.
   - Fine-grained PAT: Resource owner `tasosstyl1984`, repository `tabataCoreDrills`,
     permission **Contents: Read and write**.
   - Classic PAT: `repo` scope (or Contents write if available).
3. The token is stored in **sessionStorage** for this tab only — never commit a PAT to git.
4. Save / Delete create a **single git commit** (cover + drill + catalog when needed).
5. After Save, the grid/preview update immediately from the API response; visitors use raw.

### Exercise images (Admin tab)

1. Sign in → in the **Admin** bar, open **Exercise images** (next to **Plans**).
2. Pick an exercise, choose a replacement **PNG / JPEG / WebP** (the page encodes **WebP** in the browser).
3. **Save to GitHub** commits `exercise_guides/{activityId}.webp` and bumps **`exercise_guides/manifest.json`** and **`exercise_guides_manifest.json`** in one atomic commit.
4. Long-form how-to text (**Setup / Action / Form check**) lives in this repo as **`exercise_guides_copy.json`** (sync from TabataCore tooling — not edited in this tab). Equipment labels live in **`exercise_catalog.json`**.
5. Plan preview exercise lightbox: **wheel zoom** and **drag pan** on the image (same interaction as the review HTML).

## Sync direction

| Direction | When | Command (from TabataCore root) |
|-----------|------|--------------------------------|
| **App → site** | After changing the Dart seed locally | `python tool/export_presets_catalog.py` |
| **Site → app** | After Admin edits presets on this site | `python tool/import_presets_from_drills.py` |

Export writes `drills/remote_*.json` + `presets.json` (does **not** replace public `catalog.json`).
Import is the reverse for the next Android release.

### Exercise guide images + equipment

- Illustrations: `exercise_guides/{activityId}.webp`, versioned in `exercise_guides_manifest.json`.
- Optional equipment tags: `equipment` string array on each activity in `exercise_catalog.json` (empty = none/bodyweight). App UI for equipment is not shipped yet.
- Same movement with different equipment shares a `movement` id (for a later “use the equipment I have” swap). The picker still lists each exercise on its own.
- Refresh from approved PNGs + `drills+equipment.xlsx` (TabataCore):  
  `python tool/import_drills_from_excel.py --dry-run` then `--apply` (see `tool/drills_import_config.py` for EX-code mapping).

To refresh plan cover WebPs from locked mockups:

```bash
python tool/export_locked_plan_covers.py
```

## Add a plan manually

1. Add `drills/remote_your_id.json` (`id` must start with `remote_`).
2. Append an entry to `catalog.json` and bump `version` / `updatedAtMs`.
3. Prefer adding the matching `default_*` seed in the Android app first so the catalog stays in sync.
4. Commit and push.

## Website download → app import

Browse the site, Preview a plan, Download JSON, then in Tabata Core:

- Open the file with the app, or
- **Settings → Plans → Import**

Use **Refresh** on the site (or hard-refresh) if you need to re-fetch the catalog from raw.
