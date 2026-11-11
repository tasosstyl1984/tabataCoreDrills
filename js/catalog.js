(() => {
  const THEME_KEY = "tabataDrillsTheme";
  const SITE_TAB_KEY = "tabataDrillsSiteTab";
  const SITE_TAB_QUERY = "tab";
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
  /** Shipped Android presets (admin-only overlay; not in public catalog.json). */
  let presetsCatalog = null;
  let activeCategory = "all";
  let previewEntry = null;
  const templateCache = new Map();
  const imageIds = new Set();
  let guidesCopy = {};
  let activityCatalog = [];
  let guidesAssetVersion = "";
  let exerciseImageZoomDetach = null;

  function isAdminAuthed() {
    return document.body.classList.contains("admin-authed");
  }

  function normalizeSiteTab(v) {
    if (v === "weekly" || v === "exercises") return v;
    return "plans";
  }

  function readSiteTabFromQuery() {
    try {
      const p = new URLSearchParams(window.location.search).get(SITE_TAB_QUERY);
      return normalizeSiteTab(p);
    } catch (_) {
      return "plans";
    }
  }

  function applySiteTabToUrl(tab) {
    try {
      const u = new URL(window.location.href);
      if (tab === "plans") u.searchParams.delete(SITE_TAB_QUERY);
      else u.searchParams.set(SITE_TAB_QUERY, tab);
      window.history.replaceState({}, "", u.toString());
    } catch (_) {
      /* ignore */
    }
  }

  function persistSiteTab(tab) {
    try {
      sessionStorage.setItem(SITE_TAB_KEY, tab);
    } catch (_) {
      /* ignore */
    }
  }

  function siteTabFromStorage() {
    try {
      return normalizeSiteTab(sessionStorage.getItem(SITE_TAB_KEY));
    } catch (_) {
      return "plans";
    }
  }

  function currentSiteTab() {
    if (document.body.classList.contains("site-tab-exercises")) return "exercises";
    if (document.body.classList.contains("site-tab-weekly")) return "weekly";
    return "plans";
  }

  function updateSiteTabUi(tab) {
    const t = normalizeSiteTab(tab);
    document.body.classList.remove("site-tab-plans", "site-tab-weekly", "site-tab-exercises");
    document.body.classList.add(`site-tab-${t}`);
    const tablist = document.getElementById("site-tablist");
    if (tablist) {
      const show = isAdminAuthed();
      tablist.hidden = !show;
      if (show) {
        tablist.querySelectorAll(".site-tab").forEach((btn) => {
          const id = btn.getAttribute("data-site-tab");
          const sel = id === t;
          btn.setAttribute("aria-selected", sel ? "true" : "false");
        });
      }
    }
    const plansBundle = document.getElementById("site-panel-plans-bundle");
    const exPanel = document.getElementById("admin-panel-exercise-images");
    if (plansBundle) plansBundle.hidden = t === "exercises";
    if (exPanel) exPanel.hidden = t !== "exercises";
    applySiteTabToUrl(t);
    persistSiteTab(t);
    try {
      sessionStorage.setItem(
        "tabataDrillsAdminPanel",
        t === "exercises" ? "exercise-images" : "plans",
      );
    } catch (_) {
      /* ignore */
    }
    try {
      window.dispatchEvent(
        new CustomEvent("tabata-site-tab", { detail: { tab: t } }),
      );
    } catch (_) {
      /* ignore */
    }
    if (t === "exercises") {
      try {
        window.dispatchEvent(new CustomEvent("tabata-site-tab-exercises"));
      } catch (_) {
        /* ignore */
      }
    }
  }

  function setSiteTab(tab) {
    updateSiteTabUi(tab);
    renderGrid();
  }

  function initSiteTabs() {
    const tablist = document.getElementById("site-tablist");
    if (!tablist) return;
    let initial = "plans";
    if (isAdminAuthed()) {
      const q = readSiteTabFromQuery();
      initial = q !== "plans" ? q : siteTabFromStorage();
    } else {
      initial = "plans";
    }
    updateSiteTabUi(initial);
    if (tablist.dataset.wired === "1") return;
    tablist.dataset.wired = "1";
    tablist.querySelectorAll(".site-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = normalizeSiteTab(btn.getAttribute("data-site-tab"));
        setSiteTab(id);
      });
    });
  }

  function pillCoverKey(id) {
    return id ? `${id}__pill` : "";
  }

  function visibleDrills() {
    const online = catalog?.drills || [];
    if (!isAdminAuthed()) return online;
    const presets = presetsCatalog?.drills || [];
    if (!presets.length) return online;
    const onlineIds = new Set(online.map((d) => d.id));
    const extra = presets
      .filter((d) => d && d.id && !onlineIds.has(d.id))
      .map((d) => ({ ...d, preset: true, shipsWithApp: true }));
    return [...extra, ...online];
  }

  function getVisibleDrills() {
    return visibleDrills();
  }

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
    return visibleDrills().filter((d) => {
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

  function setLocalPillCover(id, objectUrl) {
    setLocalCover(pillCoverKey(id), objectUrl);
  }

  function getLocalCover(id) {
    return id ? localCoverUrls.get(id) || "" : "";
  }

  function getLocalPillCover(id) {
    return id ? localCoverUrls.get(pillCoverKey(id)) || "" : "";
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

  function clearLocalPillCover(id) {
    clearLocalCover(pillCoverKey(id));
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

  function coverPillUrl(entry) {
    if (!entry?.coverImagePill) return "";
    const pk = pillCoverKey(entry.id);
    const local = pk ? localCoverUrls.get(pk) : "";
    if (local) return local;
    try {
      const url = new URL(String(entry.coverImagePill), remoteBaseUrl());
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
    if (typeof exerciseImageZoomDetach === "function") {
      try {
        exerciseImageZoomDetach();
      } catch (_) {
        /* ignore */
      }
    }
    exerciseImageZoomDetach = null;
    const guide = guidesCopy[activityId] || {};
    const title = guide.title || activityLabel(activityId);
    const img = activityImageUrl(activityId);
    const actRow = activityCatalog.find((a) => a && a.id === activityId);
    const equipment = actRow?.equipment;
    let equipmentBlock = "";
    if (Array.isArray(equipment) && equipment.length) {
      equipmentBlock = `<section class="exercise-section exercise-equipment"><h3>Equipment</h3><p>${escapeHtml(
        equipment.join(", "),
      )}</p></section>`;
    }
    if (exerciseTitle) exerciseTitle.textContent = title;
    const sections = [
      ["Setup", guide.setup],
      ["Action", guide.actionPhase],
      ["Form check", guide.formCheck],
    ]
      .filter(([, text]) => text)
      .map(([h, text], index) => {
        const cue = splitExerciseCue(text);
        const more = cue.more
          ? `<span class="exercise-cue-more">${escapeHtml(cue.more)}</span>`
          : "";
        return `<section class="exercise-section exercise-cue"><div class="exercise-cue-n" aria-hidden="true">${
          index + 1
        }</div><div><h3>${escapeHtml(h)}</h3><p>${escapeHtml(cue.lead)}${more}</p></div></section>`;
      })
      .join("");
    if (exerciseBody) {
      const zoomBlock = img
        ? `<div class="zoom-stack exercise-image-viewport-stack">
            <div class="exercise-image-viewport zoom-viewport" id="exercise-detail-zoom" aria-label="Exercise image" tabindex="0">
              <div class="zoom-viewport-inner">
                <img class="exercise-image zoom-viewport-img" src="${escapeAttr(img)}" alt="${escapeAttr(title)}" />
              </div>
            </div>
            <div class="zoom-viewport-toolbar" role="toolbar" aria-label="Zoom">
              <label class="zoom-slider-label">
                <span class="sr-only">Zoom</span>
                <input type="range" class="zoom-viewport-slider" min="100" max="500" step="1" value="100" aria-label="Zoom level" />
              </label>
              <button type="button" class="zoom-tool" data-zoom-reset title="Reset zoom and pan" aria-label="Reset zoom">Reset</button>
            </div>
          </div>
          <p class="zoom-hint muted">Wheel to zoom · drag to pan</p>`
        : "";
      exerciseBody.innerHTML = `
        ${zoomBlock}
        ${equipmentBlock}
        ${
          sections ||
          `<p class="muted">No how-to copy for this exercise yet. Image${img ? "" : " also missing"}.</p>`
        }
      `;
      if (img && typeof window.attachExerciseImageZoomPan === "function") {
        const vp = document.getElementById("exercise-detail-zoom");
        exerciseImageZoomDetach = window.attachExerciseImageZoomPan(vp);
      }
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
    if (typeof exerciseImageZoomDetach === "function") {
      try {
        exerciseImageZoomDetach();
      } catch (_) {
        /* ignore */
      }
    }
    exerciseImageZoomDetach = null;
    hideModal(exerciseDialog);
  }

  function renderGrid() {
    if (!gridEl || !catalog) return;
    const drills = filteredDrills();
    gridEl.innerHTML = "";
    const adminList = isAdminAuthed() && currentSiteTab() === "plans";
    if (adminList) gridEl.classList.add("admin-list");
    else gridEl.classList.remove("admin-list");
    if (!drills.length) {
      setStatus("No plans match your filters.");
      return;
    }
    const hint = adminList
      ? `${drills.length} plan${drills.length === 1 ? "" : "s"} — click a row to edit`
      : `${drills.length} plan${drills.length === 1 ? "" : "s"} — click a card to preview`;
    setStatus(hint);
    for (const d of drills) {
      const cover = coverUrl(d);
      const isPreset = Boolean(d.preset || d.shipsWithApp);
      const badge = isPreset
        ? `${d.category || "plan"} · preset`
        : d.category || "plan";

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
      if (isPreset) {
        deleteBtn.disabled = true;
        deleteBtn.title =
          "Presets can’t be deleted here — use Edit, then sync into TabataCore";
      }

      const open = (e) => {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        openPreview(d);
      };

      const openEdit = (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.dispatchEvent(new CustomEvent("tabata-admin-edit", { detail: { entry: d } }));
      };

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
      editBtn.addEventListener("click", openEdit);
      deleteBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.dispatchEvent(new CustomEvent("tabata-admin-delete", { detail: { entry: d } }));
      });

      if (adminList) {
        const row = document.createElement("div");
        row.className = "catalog-row";
        row.tabIndex = 0;
        row.setAttribute("role", "button");
        row.setAttribute("aria-label", `Edit ${d.name || d.id}`);
        const thumb = document.createElement("div");
        thumb.className = "catalog-row-thumb";
        if (cover) {
          const img = document.createElement("img");
          img.src = cover;
          img.alt = "";
          img.loading = "lazy";
          thumb.appendChild(img);
        } else {
          const ph = document.createElement("span");
          ph.className = "placeholder";
          ph.setAttribute("aria-hidden", "true");
          thumb.appendChild(ph);
        }
        const body = document.createElement("div");
        body.className = "catalog-row-body";
        const badgeEl = document.createElement("span");
        badgeEl.className = "badge";
        badgeEl.textContent = badge;
        const h3 = document.createElement("h3");
        h3.textContent = d.name || d.id;
        const desc = document.createElement("p");
        desc.textContent = d.description || "";
        body.append(badgeEl, h3, desc);
        const actions = document.createElement("div");
        actions.className = "catalog-row-actions";
        actions.append(previewBtn, downloadBtn, editBtn, deleteBtn);
        row.append(thumb, body, actions);
        row.addEventListener("click", (e) => {
          if (e.target.closest("button")) return;
          openEdit(e);
        });
        row.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openEdit(e);
          }
        });
        gridEl.appendChild(row);
      } else {
        const card = document.createElement("article");
        card.className = "card card-clickable";
        card.tabIndex = 0;
        card.setAttribute("role", "button");
        card.setAttribute("aria-label", `Preview ${d.name || d.id}`);
        const coverHtml = cover
          ? `<img class="card-cover" src="${escapeAttr(cover)}" alt="" loading="lazy" />`
          : "";
        card.innerHTML = `
        ${coverHtml}
        <span class="badge">${escapeHtml(badge)}</span>
        <h3>${escapeHtml(d.name || d.id)}</h3>
        <p>${escapeHtml(d.description || "")}</p>
      `;
        const actions = document.createElement("div");
        actions.className = "card-actions";
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
        actions.append(previewBtn, downloadBtn, editBtn, deleteBtn);
        card.appendChild(actions);
        gridEl.appendChild(card);
      }
    }
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function splitExerciseCue(text) {
    const trimmed = String(text).trim();
    const splitAt = trimmed.indexOf(". ");
    if (splitAt < 1 || splitAt > trimmed.length - 3) {
      return { lead: trimmed, more: "" };
    }
    const more = trimmed.slice(splitAt + 2).trim();
    if (!more) return { lead: trimmed, more: "" };
    return { lead: trimmed.slice(0, splitAt + 1), more };
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
      const res = await fetch(`exercise_guides_copy.json?_=${Date.now()}`, {
        cache: "no-store",
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
      const res = await fetch(`exercise_catalog.json?_=${Date.now()}`, {
        cache: "no-store",
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

  async function reloadPresets() {
    const bust = `_=${Date.now()}`;
    const url = new URL(`presets.json?${bust}`, remoteBaseUrl()).toString();
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        presetsCatalog = null;
        return null;
      }
      presetsCatalog = await res.json();
      return presetsCatalog;
    } catch (_) {
      presetsCatalog = null;
      return null;
    }
  }

  function refreshVisibleCatalog() {
    const drills = visibleDrills();
    renderChips(categoriesFrom(drills));
    renderGrid();
    updateCatalogMeta();
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
    await reloadPresets();
    refreshVisibleCatalog();
    if (window.TabataDrillsWeekly?.reload) {
      await window.TabataDrillsWeekly.reload({ fromRemote });
    }
    return catalog;
  }

  /** Apply an already-fetched catalog object (e.g. after admin Save/Delete). */
  function applyCatalog(next) {
    if (!next || typeof next !== "object") return;
    catalog = next;
    refreshVisibleCatalog();
    return catalog;
  }

  function applyPresets(next) {
    if (!next || typeof next !== "object") return;
    presetsCatalog = next;
    refreshVisibleCatalog();
    return presetsCatalog;
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
    initSiteTabs();
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
      try {
        window.dispatchEvent(
          new CustomEvent("tabata-activity-catalog-ready", {
            detail: { activities: activityCatalog.length },
          }),
        );
      } catch (_) {
        /* ignore */
      }
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
    dialog.addEventListener("cancel", (e) => {
      e.preventDefault();
    });
  }
  if (exerciseCloseBtn) exerciseCloseBtn.addEventListener("click", () => closeExercise());
  if (exerciseDialog) {
    exerciseDialog.addEventListener("cancel", (e) => {
      e.preventDefault();
    });
  }

  if (searchEl) searchEl.addEventListener("input", () => renderGrid());

  window.addEventListener("tabata-admin-auth", () => {
    initSiteTabs();
    refreshVisibleCatalog();
  });

  window.TabataDrillsSite = {
    setStatus,
    reloadCatalog,
    applyCatalog,
    applyPresets,
    getCatalog: () => catalog,
    getPresets: () => presetsCatalog,
    getVisibleDrills,
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
    setLocalPillCover,
    getLocalPillCover,
    clearLocalPillCover,
    coverPillUrl,
    initSiteTabs,
    setSiteTab,
    currentSiteTab,
    escapeHtml,
    escapeAttr,
  };

  init();
})();
