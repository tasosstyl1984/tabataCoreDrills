(() => {
  const THEME_KEY = "tabataDrillsTheme";
  const RAW_BASE =
    "https://raw.githubusercontent.com/tasosstyl1984/tabataCoreDrills/main/";
  const statusEl = document.getElementById("status");
  const gridEl = document.getElementById("grid");
  const searchEl = document.getElementById("search");
  const categoriesEl = document.getElementById("categories");
  const themeToggleBtn = document.getElementById("theme-toggle");
  const catalogMetaEl = document.getElementById("catalog-meta");
  const refreshCatalogBtn = document.getElementById("refresh-catalog");
  const dialog = document.getElementById("preview-dialog");
  const previewBody = document.getElementById("preview-body");
  const previewTitle = document.getElementById("preview-title");
  const previewDownloadBtn = document.getElementById("preview-download");
  const previewCloseBtn = document.getElementById("preview-close");
  const exerciseDialog = document.getElementById("exercise-dialog");
  const exerciseBody = document.getElementById("exercise-body");
  const exerciseTitle = document.getElementById("exercise-title");
  const exerciseCloseBtn = document.getElementById("exercise-close");

  let catalog = null;
  let activeCategory = "all";
  let previewEntry = null;
  const templateCache = new Map();
  const imageIds = new Set();
  let guidesCopy = {};
  let activityCatalog = [];
  let guidesAssetVersion = "";

  function themePreference() {
    try {
      return localStorage.getItem(THEME_KEY) || "system";
    } catch (_) {
      return "system";
    }
  }

  function resolvedTheme(pref) {
    if (pref === "light" || pref === "dark") return pref;
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
    return "light";
  }

  function applyTheme(pref = themePreference()) {
    const mode = resolvedTheme(pref);
    document.documentElement.setAttribute("data-theme", mode);
    if (themeToggleBtn) {
      const icons = {
        system: themeToggleBtn.querySelector(".theme-icon-auto"),
        light: themeToggleBtn.querySelector(".theme-icon-light"),
        dark: themeToggleBtn.querySelector(".theme-icon-dark"),
      };
      Object.values(icons).forEach((el) => {
        if (el) el.hidden = true;
      });
      const show = icons[pref] || icons.system;
      if (show) show.hidden = false;
      const label =
        pref === "system"
          ? `Theme: Auto (${mode}). Click to change.`
          : `Theme: ${mode === "dark" ? "Dark" : "Light"}. Click to change.`;
      themeToggleBtn.setAttribute("aria-label", label);
      themeToggleBtn.setAttribute("title", label);
    }
  }

  function cycleTheme() {
    const order = ["system", "light", "dark"];
    const cur = themePreference();
    const next = order[(order.indexOf(cur) + 1) % order.length];
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch (_) {
      /* ignore */
    }
    applyTheme(next);
  }

  function setStatus(msg) {
    if (statusEl) statusEl.textContent = msg || "";
  }

  function categoriesFrom(drills) {
    const set = new Set();
    for (const d of drills) {
      if (d.category) set.add(String(d.category));
    }
    return ["all", ...Array.from(set).sort()];
  }

  function renderChips(cats) {
    if (!categoriesEl) return;
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
    const q = (searchEl?.value || "").trim().toLowerCase();
    return (catalog?.drills || []).filter((d) => {
      if (activeCategory !== "all" && d.category !== activeCategory) return false;
      if (!q) return true;
      const acts = (d.activityIds || []).join(" ");
      const hay = `${d.name || ""} ${d.description || ""} ${d.category || ""} ${acts}`.toLowerCase();
      return hay.includes(q);
    });
  }

  function remoteBaseUrl() {
    const base = (catalog?.baseUrl || RAW_BASE).trim();
    return base.endsWith("/") ? base : `${base}/`;
  }

  function drillFileUrl(entry) {
    const file = entry.file || `drills/${entry.id}.json`;
    return new URL(file, remoteBaseUrl()).toString();
  }

  /** Fresh blob URLs after admin cover upload — bypasses CDN until reload. */
  const localCoverUrls = new Map();

  function setLocalCover(id, objectUrl) {
    if (!id || !objectUrl) return;
    const prev = localCoverUrls.get(id);
    if (prev && prev !== objectUrl) {
      try {
        URL.revokeObjectURL(prev);
      } catch (_) {
        /* ignore */
      }
    }
    localCoverUrls.set(id, objectUrl);
  }

  function getLocalCover(id) {
    return id ? localCoverUrls.get(id) || "" : "";
  }

  function clearLocalCover(id) {
    if (!id || !localCoverUrls.has(id)) return;
    const prev = localCoverUrls.get(id);
    localCoverUrls.delete(id);
    if (prev) {
      try {
        URL.revokeObjectURL(prev);
      } catch (_) {
        /* ignore */
      }
    }
  }

  function coverUrl(entry) {
    if (!entry?.coverImage) return "";
    const local = entry.id ? localCoverUrls.get(entry.id) : "";
    if (local) return local;
    try {
      // Mutable covers always from raw (same as Android). Static exercise_guides
      // paths also resolve under catalog.baseUrl so Pages CDN cannot serve stale art.
      const url = new URL(String(entry.coverImage), remoteBaseUrl());
      const bust = entry.updatedAtMs || catalog?.updatedAtMs || catalog?.version;
      if (bust) url.searchParams.set("v", String(bust));
      return url.toString();
    } catch (_) {
      return "";
    }
  }

  function activityImageUrl(activityId) {
    if (!activityId || !imageIds.has(activityId)) return "";
    const url = new URL(
      `exercise_guides/${activityId}.webp`,
      window.location.href,
    );
    if (guidesAssetVersion) url.searchParams.set("v", guidesAssetVersion);
    return url.toString();
  }

  function activityLabel(id) {
    if (!id) return "Work";
    const fromCatalog = activityCatalog.find((a) => a.id === id);
    if (fromCatalog) return fromCatalog.label;
    const guide = guidesCopy[id];
    if (guide?.title) return guide.title;
    return String(id)
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (c) => c.toUpperCase())
      .trim();
  }

  async function fetchTemplate(entry, { bypassCache = false } = {}) {
    if (!bypassCache && templateCache.has(entry.id)) {
      return templateCache.get(entry.id);
    }
    const url = drillFileUrl(entry);
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`Could not fetch ${entry.file} (${res.status})`);
    }
    const template = await res.json();
    templateCache.set(entry.id, template);
    return template;
  }

  async function downloadDrill(entry) {
    const template = await fetchTemplate(entry);
    const envelope = {
      format: "tabata_core_template",
      version: 2,
      sharedAtMs: Date.now(),
      creator: { displayName: "Tabata Core Plans" },
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

  function formatDuration(totalSeconds) {
    const s = Math.max(0, Math.round(totalSeconds));
    const m = Math.floor(s / 60);
    const r = s % 60;
    if (m <= 0) return `${r}s`;
    if (r === 0) return `${m} min`;
    return `${m}m ${r}s`;
  }

  function estimateSeconds(template) {
    const plan = template.structuredPlan;
    if (plan && Array.isArray(plan.sets) && plan.sets.length) {
      let total = 0;
      plan.sets.forEach((set, setIdx) => {
        const rounds = set.rounds || [];
        rounds.forEach((round, roundIdx) => {
          total += Number(round.workSeconds) || 0;
          if (roundIdx < rounds.length - 1) {
            total += Number(round.restAfterSeconds) || 0;
          }
        });
        if (setIdx < plan.sets.length - 1) {
          total += Number(set.restAfterSetSeconds) || 0;
        }
      });
      return total;
    }
    const sets = Number(template.sets) || 0;
    const reps = Number(template.repsPerSet) || 0;
    const work = Number(template.workSeconds) || 0;
    const restReps = Number(template.restBetweenRepsSeconds) || 0;
    const restSets = Number(template.restBetweenSetsSeconds) || 0;
    if (sets < 1 || reps < 1) return 0;
    const perSet = reps * work + (reps - 1) * restReps;
    return sets * perSet + (sets - 1) * restSets;
  }

  function thumbButtonHtml(activityId, thumbClass) {
    const thumb = activityImageUrl(activityId);
    if (!thumb) {
      return `<span class="${thumbClass} placeholder" aria-hidden="true"></span>`;
    }
    return `<button type="button" class="round-thumb-btn" data-open-exercise="${escapeAttr(
      activityId || "",
    )}" aria-label="Open ${escapeAttr(activityLabel(activityId))} details"><img class="${thumbClass}" src="${escapeAttr(
      thumb,
    )}" alt="" loading="lazy" /></button>`;
  }

  function buildPreviewHtml(entry, template) {
    const sets = template.structuredPlan?.sets || [];
    const cover = coverUrl(entry);
    // Cover is decorative plan art only — exercise details open from round thumbs.
    const coverHtml = cover
      ? `<img class="preview-cover" src="${escapeAttr(cover)}" alt="" loading="lazy" />`
      : "";
    const stats = [
      ["Sets", String(template.sets ?? sets.length ?? "—")],
      ["Rounds / set", String(template.repsPerSet ?? sets[0]?.rounds?.length ?? "—")],
      ["Work", `${template.workSeconds ?? "—"}s`],
      ["Round rest", `${template.restBetweenRepsSeconds ?? "—"}s`],
      ["Set rest", `${template.restBetweenSetsSeconds ?? "—"}s`],
      ["Est. total", formatDuration(estimateSeconds(template))],
    ];

    let setsHtml = "";
    if (sets.length) {
      setsHtml = sets
        .map((set, i) => {
          const rounds = set.rounds || [];
          const rows = rounds
            .map((round, j) => {
              const rest =
                j < rounds.length - 1
                  ? `<span class="round-rest">→ ${round.restAfterSeconds || 0}s rest</span>`
                  : "";
              const thumbHtml = thumbButtonHtml(round.activityId, "round-thumb");
              return `<li>${thumbHtml}<div class="round-copy"><strong>${escapeHtml(
                activityLabel(round.activityId),
              )}</strong> · ${round.workSeconds}s work ${rest}</div></li>`;
            })
            .join("");
          const after =
            i < sets.length - 1
              ? `<p class="set-rest">Rest after set: ${set.restAfterSetSeconds || 0}s</p>`
              : "";
          return `<section class="preview-set"><h4>Set ${i + 1}</h4><ol>${rows}</ol>${after}</section>`;
        })
        .join("");
    } else {
      setsHtml = `<p class="muted">Uniform plan: ${template.sets}×${template.repsPerSet} · ${template.workSeconds}s / ${template.restBetweenRepsSeconds}s</p>`;
    }

    return `
      ${coverHtml}
      <p class="preview-desc">${escapeHtml(entry.description || "")}</p>
      <div class="preview-stats">
        ${stats
          .map(
            ([k, v]) =>
              `<div class="stat"><span class="stat-label">${escapeHtml(k)}</span><span class="stat-value">${escapeHtml(v)}</span></div>`,
          )
          .join("")}
      </div>
      <div class="preview-plan">${setsHtml}</div>
    `;
  }

  function showModal(el) {
    if (!el) return false;
    try {
      if (typeof el.showModal === "function") {
        if (!el.open) el.showModal();
      } else {
        el.setAttribute("open", "");
      }
      return true;
    } catch (_) {
      el.setAttribute("open", "");
      return true;
    }
  }

  function hideModal(el) {
    if (!el) return;
    try {
      if (typeof el.close === "function" && el.open) el.close();
      else el.removeAttribute("open");
    } catch (_) {
      el.removeAttribute("open");
    }
  }

  function openExerciseDetail(activityId) {
    if (!activityId) return;
    const guide = guidesCopy[activityId] || {};
    const title = guide.title || activityLabel(activityId);
    const img = activityImageUrl(activityId);
    if (exerciseTitle) exerciseTitle.textContent = title;
    const sections = [
      ["Setup", guide.setup],
      ["Action", guide.actionPhase],
      ["Form check", guide.formCheck],
    ]
      .filter(([, text]) => text)
      .map(
        ([h, text]) =>
          `<section class="exercise-section"><h3>${escapeHtml(h)}</h3><p>${escapeHtml(
            text,
          )}</p></section>`,
      )
      .join("");
    if (exerciseBody) {
      exerciseBody.innerHTML = `
        ${
          img
            ? `<img class="exercise-image" src="${escapeAttr(img)}" alt="${escapeAttr(title)}" />`
            : ""
        }
        ${
          sections ||
          `<p class="muted">No how-to copy for this exercise yet. Image${img ? "" : " also missing"}.</p>`
        }
      `;
    }
    showModal(exerciseDialog);
  }

  function wireExerciseClicks(root) {
    if (!root) return;
    root.querySelectorAll("[data-open-exercise]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        openExerciseDetail(btn.getAttribute("data-open-exercise"));
      });
    });
  }

  async function openPreview(entry) {
    // Prefer live catalog row (new coverImage path after save).
    const live =
      (catalog?.drills || []).find((d) => d.id === entry?.id) || entry;
    previewEntry = live;
    if (previewTitle) previewTitle.textContent = live.name || live.id;
    if (previewBody) previewBody.innerHTML = `<p class="muted">Loading preview…</p>`;
    if (previewDownloadBtn) previewDownloadBtn.disabled = true;
    showModal(dialog);
    try {
      const template = await fetchTemplate(live);
      if (previewBody) {
        previewBody.innerHTML = buildPreviewHtml(live, template);
        wireExerciseClicks(previewBody);
      }
      if (previewDownloadBtn) previewDownloadBtn.disabled = false;
    } catch (err) {
      if (previewBody) {
        previewBody.innerHTML = `<p class="error">${escapeHtml(err.message || "Preview failed")}</p>`;
      }
      setStatus(err.message || "Preview failed");
    }
  }

  function closePreview() {
    previewEntry = null;
    hideModal(dialog);
  }

  function closeExercise() {
    hideModal(exerciseDialog);
  }

  function renderGrid() {
    if (!gridEl || !catalog) return;
    const drills = filteredDrills();
    gridEl.innerHTML = "";
    if (!drills.length) {
      setStatus("No plans match your filters.");
      return;
    }
    setStatus(`${drills.length} plan${drills.length === 1 ? "" : "s"} — click a card to preview`);
    for (const d of drills) {
      const card = document.createElement("article");
      card.className = "card card-clickable";
      card.tabIndex = 0;
      card.setAttribute("role", "button");
      card.setAttribute("aria-label", `Preview ${d.name || d.id}`);
      const cover = coverUrl(d);
      const coverHtml = cover
        ? `<img class="card-cover" src="${escapeAttr(cover)}" alt="" loading="lazy" />`
        : "";
      card.innerHTML = `
        ${coverHtml}
        <span class="badge">${escapeHtml(d.category || "plan")}</span>
        <h3>${escapeHtml(d.name || d.id)}</h3>
        <p>${escapeHtml(d.description || "")}</p>
      `;
      const actions = document.createElement("div");
      actions.className = "card-actions";
      const previewBtn = document.createElement("button");
      previewBtn.type = "button";
      previewBtn.className = "btn-secondary";
      previewBtn.textContent = "Preview";
      const downloadBtn = document.createElement("button");
      downloadBtn.type = "button";
      downloadBtn.textContent = "Download";
      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "btn-edit-admin";
      editBtn.textContent = "Edit";
      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "btn-delete-admin";
      deleteBtn.textContent = "Delete";

      const open = (e) => {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        openPreview(d);
      };
      card.addEventListener("click", (e) => {
        if (e.target.closest("button")) return;
        open(e);
      });
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open(e);
        }
      });
      previewBtn.addEventListener("click", open);
      downloadBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        downloadBtn.disabled = true;
        try {
          await downloadDrill(d);
          setStatus(`Downloaded ${d.id}.json`);
        } catch (err) {
          setStatus(err.message || "Download failed");
        } finally {
          downloadBtn.disabled = false;
        }
      });
      editBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.dispatchEvent(new CustomEvent("tabata-admin-edit", { detail: { entry: d } }));
      });
      deleteBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.dispatchEvent(new CustomEvent("tabata-admin-delete", { detail: { entry: d } }));
      });
      actions.append(previewBtn, downloadBtn, editBtn, deleteBtn);
      card.appendChild(actions);
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

  function escapeAttr(s) {
    return escapeHtml(s).replace(/'/g, "&#39;");
  }

  function guidesAssetQuery() {
    return guidesAssetVersion ? `?v=${encodeURIComponent(guidesAssetVersion)}` : "";
  }

  async function loadImageIndex() {
    try {
      // Bust once so we learn the current version, then version-pin guide assets.
      const res = await fetch(
        `exercise_guides_manifest.json?_=${Date.now()}`,
        { cache: "no-store" },
      );
      if (!res.ok) return;
      const manifest = await res.json();
      guidesAssetVersion = String(manifest.version || "");
      imageIds.clear();
      for (const img of manifest.images || []) {
        if (img && img.id) imageIds.add(img.id);
      }
    } catch (_) {
      /* optional */
    }
  }

  async function loadGuidesCopy() {
    try {
      const res = await fetch(`exercise_guides_copy.json${guidesAssetQuery()}`, {
        cache: guidesAssetVersion ? "default" : "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      guidesCopy = data.guides || {};
    } catch (_) {
      /* optional */
    }
  }

  async function loadActivityCatalog() {
    try {
      const res = await fetch(`exercise_catalog.json${guidesAssetQuery()}`, {
        cache: guidesAssetVersion ? "default" : "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      activityCatalog = data.activities || [];
    } catch (_) {
      /* optional */
    }
  }

  function updateCatalogMeta() {
    if (!catalogMetaEl) return;
    if (!catalog) {
      catalogMetaEl.textContent = "";
      return;
    }
    const version = catalog.version != null ? String(catalog.version) : "—";
    let updated = "";
    const ms = Number(catalog.updatedAtMs);
    if (Number.isFinite(ms) && ms > 0) {
      try {
        updated = new Date(ms).toLocaleString();
      } catch (_) {
        updated = "";
      }
    }
    catalogMetaEl.textContent = updated
      ? `Catalog v${version} · updated ${updated}`
      : `Catalog v${version}`;
  }

  async function reloadCatalog({ fromRemote = false } = {}) {
    // fromRemote: drop in-memory templates so preview/edit re-fetch from raw.
    const kept = fromRemote ? new Map() : new Map(templateCache);
    templateCache.clear();
    const bust = `_=${Date.now()}`;
    // Mutable catalog lives on raw only — never fall back to Pages CDN.
    const url = new URL(`catalog.json?${bust}`, remoteBaseUrl()).toString();
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`catalog.json failed (${res.status})`);
    }
    catalog = await res.json();
    for (const [id, tpl] of kept) {
      if (!templateCache.has(id)) templateCache.set(id, tpl);
    }
    renderChips(categoriesFrom(catalog.drills || []));
    renderGrid();
    updateCatalogMeta();
    return catalog;
  }

  /** Apply an already-fetched catalog object (e.g. after admin Save/Delete). */
  function applyCatalog(next) {
    if (!next || typeof next !== "object") return;
    catalog = next;
    renderChips(categoriesFrom(catalog.drills || []));
    renderGrid();
    updateCatalogMeta();
    return catalog;
  }

  async function refreshCatalogClick() {
    if (refreshCatalogBtn) refreshCatalogBtn.disabled = true;
    setStatus("Refreshing catalog…");
    try {
      await reloadCatalog({ fromRemote: true });
      setStatus("Catalog refreshed from GitHub");
    } catch (err) {
      setStatus(err.message || "Refresh failed");
    } finally {
      if (refreshCatalogBtn) refreshCatalogBtn.disabled = false;
    }
  }

  async function init() {
    applyTheme();
    if (themeToggleBtn) themeToggleBtn.addEventListener("click", cycleTheme);
    if (refreshCatalogBtn) {
      refreshCatalogBtn.addEventListener("click", () => refreshCatalogClick());
    }
    if (window.matchMedia) {
      window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
        if (themePreference() === "system") applyTheme("system");
      });
    }
    setStatus("Loading catalog…");
    try {
      await loadImageIndex();
      await Promise.all([loadGuidesCopy(), loadActivityCatalog()]);
      await reloadCatalog();
    } catch (err) {
      setStatus(err.message || "Failed to load catalog");
    }
  }

  if (previewCloseBtn) previewCloseBtn.addEventListener("click", () => closePreview());
  if (previewDownloadBtn) {
    previewDownloadBtn.addEventListener("click", async () => {
      if (!previewEntry) return;
      previewDownloadBtn.disabled = true;
      try {
        await downloadDrill(previewEntry);
        setStatus(`Downloaded ${previewEntry.id}.json`);
      } catch (err) {
        setStatus(err.message || "Download failed");
      } finally {
        previewDownloadBtn.disabled = false;
      }
    });
  }
  const previewEditBtn = document.getElementById("preview-edit");
  const previewDeleteBtn = document.getElementById("preview-delete");
  if (previewEditBtn) {
    previewEditBtn.addEventListener("click", () => {
      if (!previewEntry) return;
      window.dispatchEvent(
        new CustomEvent("tabata-admin-edit", { detail: { entry: previewEntry } }),
      );
    });
  }
  if (previewDeleteBtn) {
    previewDeleteBtn.addEventListener("click", () => {
      if (!previewEntry) return;
      window.dispatchEvent(
        new CustomEvent("tabata-admin-delete", { detail: { entry: previewEntry } }),
      );
    });
  }
  if (dialog) {
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) closePreview();
    });
    dialog.addEventListener("cancel", (e) => {
      e.preventDefault();
      closePreview();
    });
  }
  if (exerciseCloseBtn) exerciseCloseBtn.addEventListener("click", () => closeExercise());
  if (exerciseDialog) {
    exerciseDialog.addEventListener("click", (e) => {
      if (e.target === exerciseDialog) closeExercise();
    });
    exerciseDialog.addEventListener("cancel", (e) => {
      e.preventDefault();
      closeExercise();
    });
  }

  if (searchEl) searchEl.addEventListener("input", () => renderGrid());

  window.TabataDrillsSite = {
    setStatus,
    reloadCatalog,
    applyCatalog,
    getCatalog: () => catalog,
    getPreviewEntry: () => previewEntry,
    closePreview,
    openPreview,
    fetchTemplate,
    activityCatalog: () => activityCatalog,
    activityLabel,
    activityImageUrl,
    imageIds,
    invalidateTemplate: (id) => templateCache.delete(id),
    cacheTemplate: (id, template) => {
      if (id && template) templateCache.set(id, template);
    },
    setLocalCover,
    getLocalCover,
    clearLocalCover,
    escapeHtml,
    escapeAttr,
  };

  init();
})();
