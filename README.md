# Tabata Core Plans (GitHub Pages)

Public catalog of Tabata Core workout plans.

Live site: https://tasosstyl1984.github.io/tabataCoreDrills/  
Repo: https://github.com/tasosstyl1984/tabataCoreDrills

This catalog mirrors the **24 shipped Android presets** (`default_*` ↔ `remote_*`).
Online-only extras (football packs, wall-pass-only combos, etc.) were removed.

## Regenerate from the app’s shipped presets

From the TabataCore app repo root (sibling of this repo):

```bash
flutter test tool/export_remote_drills_test.dart
```

That writes shipped `default_*` templates into this repo’s `drills/` + `catalog.json`.

## Add a plan manually

1. Add `drills/remote_your_id.json` (`id` must start with `remote_`).
2. Append an entry to `catalog.json` and bump `version` / `updatedAtMs`.
3. Prefer adding the matching `default_*` seed in the Android app first so the catalog stays in sync.
4. Commit and push.

## Website download → app import

Browse the site, Preview a plan, Download JSON, then in Tabata Core:

- Open the file with the app, or
- **Settings → Plans → Import**
