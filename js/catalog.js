(() => {
  const statusEl = document.getElementById("status");
  const gridEl = document.getElementById("grid");
  const searchEl = document.getElementById("search");
  const categoriesEl = document.getElementById("categories");

  let catalog = null;
  let activeCategory = "all";

  function setStatus(msg) {
    statusEl.textContent = msg || "";
  }

  function categoriesFrom(drills) {
    const set = new Set();
    for (const d of drills) {
      if (d.category) set.add(String(d.category));
    }
    return ["all", ...Array.from(set).sort()];
  }

  function renderChips(cats) {
    categoriesEl.innerHTML = "";
    for (const cat of cats) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip";
      btn.textContent = cat === "all" ? "All" : cat;
      btn.setAttribute("aria-pressed", cat === activeCategory ? "true" : "false");
      btn.addEventListener("click", () => {
        activeCategory = cat;
        renderChips(cats);
        renderGrid();
      });
      categoriesEl.appendChild(btn);
    }
  }

  function filteredDrills() {
    const q = (searchEl.value || "").trim().toLowerCase();
    return (catalog.drills || []).filter((d) => {
      if (activeCategory !== "all" && d.category !== activeCategory) return false;
      if (!q) return true;
      const hay = `${d.name || ""} ${d.description || ""} ${d.category || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }

  async function downloadDrill(entry) {
    const url = new URL(entry.file, catalog.baseUrl || window.location.href).toString();
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Could not fetch ${entry.file} (${res.status})`);
    const template = await res.json();
    const envelope = {
      format: "tabata_core_template",
      version: 2,
      sharedAtMs: Date.now(),
      creator: { displayName: "Tabata Core Drills" },
      template,
    };
    const blob = new Blob([JSON.stringify(envelope, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${entry.id}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  }

  function renderGrid() {
    const drills = filteredDrills();
    gridEl.innerHTML = "";
    if (!drills.length) {
      setStatus("No drills match your filters.");
      return;
    }
    setStatus(`${drills.length} drill${drills.length === 1 ? "" : "s"}`);
    for (const d of drills) {
      const card = document.createElement("article");
      card.className = "card";
      card.innerHTML = `
        <span class="badge">${d.category || "drill"}</span>
        <h3>${escapeHtml(d.name || d.id)}</h3>
        <p>${escapeHtml(d.description || "")}</p>
      `;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = "Download JSON";
      btn.addEventListener("click", async () => {
        btn.disabled = true;
        try {
          await downloadDrill(d);
          setStatus(`Downloaded ${d.id}.json`);
        } catch (err) {
          setStatus(err.message || "Download failed");
        } finally {
          btn.disabled = false;
        }
      });
      card.appendChild(btn);
      gridEl.appendChild(card);
    }
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  async function init() {
    setStatus("Loading catalog…");
    try {
      const res = await fetch("catalog.json", { cache: "no-store" });
      if (!res.ok) throw new Error(`catalog.json failed (${res.status})`);
      catalog = await res.json();
      // Prefer relative fetches when browsing locally / Pages root.
      if (!catalog.baseUrl) {
        catalog.baseUrl = new URL("./", window.location.href).toString();
      }
      // When opened from file:// or local preview, resolve drill files relative to this page.
      if (location.protocol === "file:" || location.hostname === "127.0.0.1" || location.hostname === "localhost") {
        catalog.baseUrl = new URL("./", window.location.href).toString();
      }
      renderChips(categoriesFrom(catalog.drills || []));
      renderGrid();
    } catch (err) {
      setStatus(err.message || "Failed to load catalog");
    }
  }

  searchEl.addEventListener("input", () => renderGrid());
  init();
})();
