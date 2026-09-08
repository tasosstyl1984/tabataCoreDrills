# Tabata Core Drills (GitHub Pages)

Public catalog of Tabata Core workout templates (“drills”).

## Publish as a public Pages site

This folder is the site root for the public companion repo
[`tabataCoreDrills`](https://github.com/tasosstyl1984/tabataCoreDrills).

1. Push this folder’s contents to that repo’s root (`main`).
2. Enable **GitHub Pages** from the repo root (branch `main` / `/ (root)`).
3. Site URL: `https://tasosstyl1984.github.io/tabataCoreDrills/`
4. Catalog API: `https://tasosstyl1984.github.io/tabataCoreDrills/catalog.json`

The Android app’s in-app sync points at that catalog URL.

## Add a drill

1. Add `drills/remote_your_id.json` using the same fields as a `TabataTemplate` (`id` must start with `remote_`).
2. Append an entry to `catalog.json` (`file`, `updatedAtMs`, `category`, `description`).
3. Bump `catalog.json` `version` and `updatedAtMs`.
4. Commit and push — Pages updates in a minute or two.

## Website download → app import

Users can browse `index.html`, tap **Download JSON**, then in Tabata Core:

- Open the file with the app, or
- **Settings → Templates → Import**

The JSON is a `tabata_core_template` envelope (version 2), which the app already accepts.

## Local preview

Serve this folder over HTTP (browsers block `fetch` from `file://` for some setups):

```bash
npx --yes serve remote-drills-site
```
