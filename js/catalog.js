(() => {
  const statusEl = document.getElementById("status");
  const gridEl = document.getElementById("grid");
  const searchEl = document.getElementById("search");
  const categoriesEl = document.getElementById("categories");
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

  function drillFileUrl(entry) {
    return new URL(entry.file, window.location.href).toString();
  }

  function coverUrl(entry) {
    if (entry.coverImage) return new URL(entry.coverImage, window.location.href).toString();
    return "";
  }

  function activityImageUrl(activityId) {
    if (!activityId || !imageIds.has(activityId)) return "";
    return new URL(`exercise_guides/${activityId}.webp`, window.location.href).toString();
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

  async function fetchTemplate(entry) {
    if (templateCache.has(entry.id)) return templateCache.get(entry.id);
    const res = await fetch(drillFileUrl(entry), { cache: "no-store" });
    if (!res.ok) throw new Error(`Could not fetch ${entry.file} (${res.status})`);
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
    const coverActivity =
      (entry.activityIds && entry.activityIds[0]) ||
      sets[0]?.rounds?.[0]?.activityId ||
      "";
    const coverHtml = cover
      ? coverActivity
        ? `<button type="button" class="preview-cover-btn" data-open-exercise="${escapeAttr(
            coverActivity,
          )}" aria-label="Open exercise details"><img class="preview-cover" src="${escapeAttr(
            cover,
          )}" alt="" loading="lazy" /></button>`
        : `<img class="preview-cover" src="${escapeAttr(cover)}" alt="" loading="lazy" />`
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
    previewEntry = entry;
    if (previewTitle) previewTitle.textContent = entry.name || entry.id;
    if (previewBody) previewBody.innerHTML = `<p class="muted">Loading preview…</p>`;
    if (previewDownloadBtn) previewDownloadBtn.disabled = true;
    showModal(dialog);
    try {
      const template = await fetchTemplate(entry);
      if (previewBody) {
        previewBody.innerHTML = buildPreviewHtml(entry, template);
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
      setStatus("No drills match your filters.");
      return;
    }
    setStatus(`${drills.length} drill${drills.length === 1 ? "" : "s"} — click a card to preview`);
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
        <span class="badge">${escapeHtml(d.category || "drill")}</span>
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
      downloadBtn.textContent = "Download JSON";
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

  async function loadImageIndex() {
    try {
      const res = await fetch("exercise_guides_manifest.json", { cache: "no-store" });
      if (!res.ok) return;
      const manifest = await res.json();
      for (const img of manifest.images || []) {
        if (img && img.id) imageIds.add(img.id);
      }
    } catch (_) {
      /* optional */
    }
  }

  async function loadGuidesCopy() {
    try {
      const res = await fetch("exercise_guides_copy.json", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      guidesCopy = data.guides || {};
    } catch (_) {
      /* optional */
    }
  }

  async function loadActivityCatalog() {
    try {
      const res = await fetch("exercise_catalog.json", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      activityCatalog = data.activities || [];
    } catch (_) {
      /* optional */
    }
  }

  async function reloadCatalog() {
    templateCache.clear();
    const res = await fetch("catalog.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`catalog.json failed (${res.status})`);
    catalog = await res.json();
    renderChips(categoriesFrom(catalog.drills || []));
    renderGrid();
    return catalog;
  }

  async function init() {
    setStatus("Loading catalog…");
    try {
      await Promise.all([loadImageIndex(), loadGuidesCopy(), loadActivityCatalog()]);
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
    escapeHtml,
    escapeAttr,
  };

  init();
})();
