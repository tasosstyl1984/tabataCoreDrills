# Tabata Core Plans (GitHub Pages)

Public catalog of Tabata Core workout plans.

Live site: https://tasosstyl1984.github.io/tabataCoreDrills/  
Repo: https://github.com/tasosstyl1984/tabataCoreDrills

**Public `catalog.json`** = online-only plans the Android app can download.
**Admin `presets.json`** = the 24 shipped Android presets (`default_*` ↔ `remote_*`),
shown only after Admin sign-in (not mixed into the app download catalog).
Football-only packs stay out of shipped gym presets.

## How the site loads data

- **GitHub Pages** hosts the HTML/CSS/JS shell and static exercise guide assets.
- **Mutable plans** (`catalog.json`, `drills/*.json`, `plan_covers/*`) are always read from
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

## Regenerate shipped presets (admin view)

From the TabataCore app repo root (sibling of this repo):

```bash
python tool/export_presets_catalog.py
```

That writes `drills/remote_*.json` for each shipped preset and `presets.json`
(does **not** replace public `catalog.json`).

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
