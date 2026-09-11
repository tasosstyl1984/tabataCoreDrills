(() => {
  const statusEl = document.getElementById("guides-status");
  const gridEl = document.getElementById("guides-grid");
  if (!statusEl || !gridEl) return;

  function setStatus(msg) {
    statusEl.textContent = msg || "";
  }

  function labelFor(id) {
    const spaced = String(id || "").replace(/([A-Z])/g, " $1").trim();
    if (!spaced) return id;
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
  }

  async function init() {
    setStatus("Loading exercise images…");
    try {
      const res = await fetch("exercise_guides_manifest.json", { cache: "no-store" });
      if (!res.ok) throw new Error(`Manifest HTTP ${res.status}`);
      const manifest = await res.json();
      const images = Array.isArray(manifest.images) ? manifest.images : [];
      gridEl.innerHTML = "";
      for (const img of images) {
        const figure = document.createElement("figure");
        figure.className = "guide-card";
        const image = document.createElement("img");
        image.src = img.file;
        image.alt = labelFor(img.id);
        image.loading = "lazy";
        const caption = document.createElement("figcaption");
        caption.textContent = labelFor(img.id);
        figure.appendChild(image);
        figure.appendChild(caption);
        gridEl.appendChild(figure);
      }
      const mb = ((manifest.totalBytes || 0) / (1024 * 1024)).toFixed(1);
      setStatus(`${images.length} images · ~${mb} MB`);
    } catch (err) {
      setStatus(err.message || "Failed to load exercise images");
    }
  }

  init();
})();
