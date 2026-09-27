# Tabata Core Drills (GitHub Pages)

Public catalog of Tabata Core workout templates (“drills”).

Live site: https://tasosstyl1984.github.io/tabataCoreDrills/  
Repo: https://github.com/tasosstyl1984/tabataCoreDrills

## Regenerate from the app’s shipped presets

From the TabataCore app repo root (sibling of this repo):

```bash
flutter test tool/export_remote_drills_test.dart
```

That writes shipped `default_*` templates into this repo’s `drills/` + `catalog.json`
(online-only drills not in the app defaults are kept).

## Add a drill manually

1. Add `drills/remote_your_id.json` (`id` must start with `remote_`).
2. Append an entry to `catalog.json` and bump `version` / `updatedAtMs`.
3. Commit and push.

## Website download → app import

Browse the site, Preview a drill, Download JSON, then in Tabata Core:

- Open the file with the app, or
- **Settings → Templates → Import**
