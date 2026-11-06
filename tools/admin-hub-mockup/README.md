# Admin hub mockup tools

## 1) `visual-mockup.html` — **interactive** (opens from disk)

**[visual-mockup.html](visual-mockup.html)** — planned 3-tab hub + dialogs. **Works with your images:**

- **Replace image…** — pick a file from your PC
- **Crop…** — Cropper (CDN): **8∶5** plan hero / weekly cover / pill, **3∶2** exercise; **Use crop**
- **Clear → Not available** — black + grey placeholder
- **Plan dialog:** hero (8∶5 contain) + **Ready pill** (capsule **cover** + scrim, optional **Pill: replace / crop** or **Use hero image for pill**)
- **Weekly row:** opens weekly form + **optional weekly cover** (same 8∶5 zoom rail as plan hero)
- Previews use **wheel zoom + drag pan** via **`../../js/zoom-pan.js`**

**Requirements:** internet once for **Cropper** on cdnjs; **`file://`** path must stay under `tabataCoreDrills/tools/admin-hub-mockup/` so `../../js/zoom-pan.js` resolves. Nothing uploads to GitHub.

## 2) `index.html` — **full real app** inside an iframe

**[index.html](index.html)** loads the repo **[`../../index.html`](../../index.html)** (Cropper, PAT, Save to GitHub). **Requires** an HTTP server whose **document root is the `tabataCoreDrills` repo**, then open:

`http://127.0.0.1:PORT/tools/admin-hub-mockup/`

If the server root is wrong, the page shows a **red fix** message instead of a blank frame.

**Quick path without the wrapper:** from repo root,

```bash
py -m http.server 3456
```

open `http://127.0.0.1:3456/index.html`.

---

**Summary:** Use **visual-mockup.html** when you only need to see layout on disk; use **index.html** + server when you need the **full** admin application.
