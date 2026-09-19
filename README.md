# Tabata Core Drills (GitHub Pages)

Public catalog of Tabata Core workout templates (“drills”).

Live site: https://tasosstyl1984.github.io/tabataCoreDrills/  
Repo: https://github.com/tasosstyl1984/tabataCoreDrills

## Browse & import

1. Open the live site, preview a drill, download JSON.
2. On phone: open the file with Tabata Core, or **Settings → Templates → Import**.
3. Or in the app use **Check for online drills** under Templates.

Exercise images in a drill preview are clickable — they open how-to details (setup / action / form).

## Admin (create / edit / delete)

The site has an **Admin** button (top of page).

- **Username:** `admin`
- **Password:** `tabataCore1`
- **GitHub PAT:** fine-grained or classic token with **Contents: Read and write** on this repo. Pasted at login, kept in `sessionStorage` only (never committed).

After sign-in you can:

- **New drill** — name, category, description, then a **Custom rounds** editor (pick exercises, work/rest steppers, move up/down, clone set/round) similar to the mobile app.
- **Edit / Delete** on cards or from the preview dialog.
- Saves commit to `main` via the GitHub Contents API (`drills/*.json` + `catalog.json`).

This password is a light UI gate only (visible in page source). The PAT is what authorizes writes.

## Regenerate exercise copy / catalog for the site

From the TabataCore app repo root:

```bash
flutter test tool/export_exercise_site_data_test.dart
```

Writes into this repo (sibling folder):

- `exercise_guides_copy.json` — how-to text for the exercise lightbox
- `exercise_catalog.json` — activity picker for the admin editor

## Regenerate drills from the app’s shipped presets

```bash
flutter test tool/export_remote_drills_test.dart
```

Then copy `remote-drills-site/` into this repo and push (or use Admin on the site).

## Add a drill manually (git)

1. Add `drills/remote_your_id.json` (`id` must start with `remote_`).
2. Append an entry to `catalog.json` and bump `version` / `updatedAtMs`.
3. Commit and push.
