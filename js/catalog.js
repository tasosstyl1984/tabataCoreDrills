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

  let catalog = null;
  let activeCategory = "all";
  let previewEntry = null;
  const templateCache = new Map();

  const ACTIVITY_LABELS = {
    footballWallPassing: "Wall passing",
    footballControl: "Ball control",
    footballFootwork: "Footwork",
    shadowBoxing: "Shadow boxing",
    jumpRope: "Jump rope",
    abs: "Abs",
    russianTwists: "Russian twists",
    plank: "Plank",
    hollowHold: "Hollow hold",
    sidePlank: "Side plank",
    deadBug: "Dead bug",
    hangingKneeRaises: "Knee raises",
    birdDog: "Bird dog",
    plateRotations: "Plate rotations",
    pullUps: "Pull-ups",
    dumbbellRow: "DB row",
    reverseFly: "Reverse fly",
    kettlebellRow: "KB row",
    pullover: "Pullover",
  };

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
    return (catalog.drills || []).filter((d) => {
      if (activeCategory !== "all" && d.category !== activeCategory) return false;
      if (!q) return true;
      const hay = `${d.name || ""} ${d.description || ""} ${d.category || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }

  /** Website always loads drills same-origin (Pages / local). App uses catalog.baseUrl. */
  function drillFileUrl(entry) {
    return new URL(entry.file, window.location.href).toString();
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

  function activityLabel(id) {
    if (!id) return "Work";
    if (ACTIVITY_LABELS[id]) return ACTIVITY_LABELS[id];
    return String(id)
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (c) => c.toUpperCase())
      .trim();
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

  function buildPreviewHtml(entry, template) {
    const sets = template.structuredPlan?.sets || [];
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
              return `<li><strong>${activityLabel(round.activityId)}</strong> · ${round.workSeconds}s work ${rest}</li>`;
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

  function showDialog() {
    if (!dialog) return false;
    try {
      if (typeof dialog.showModal === "function") {
        if (!dialog.open) dialog.showModal();
      } else {
        dialog.setAttribute("open", "");
      }
      return true;
    } catch (_) {
      dialog.setAttribute("open", "");
      return true;
    }
  }

  function hideDialog() {
    if (!dialog) return;
    try {
      if (typeof dialog.close === "function" && dialog.open) {
        dialog.close();
      } else {
        dialog.removeAttribute("open");
      }
    } catch (_) {
      dialog.removeAttribute("open");
    }
  }

  async function openPreview(entry) {
    previewEntry = entry;
    if (previewTitle) previewTitle.textContent = entry.name || entry.id;
    if (previewBody) previewBody.innerHTML = `<p class="muted">Loading preview…</p>`;
    if (previewDownloadBtn) previewDownloadBtn.disabled = true;
    showDialog();
    try {
      const template = await fetchTemplate(entry);
      if (previewBody) previewBody.innerHTML = buildPreviewHtml(entry, template);
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
    hideDialog();
  }

  function renderGrid() {
    if (!gridEl) return;
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
      card.innerHTML = `
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

      const open = (e) => {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        openPreview(d);
      };
      card.addEventListener("click", (e) => {
        // Ignore clicks that originated on action buttons (they have their own handlers).
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
      actions.append(previewBtn, downloadBtn);
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

  async function init() {
    setStatus("Loading catalog…");
    try {
      const res = await fetch("catalog.json", { cache: "no-store" });
      if (!res.ok) throw new Error(`catalog.json failed (${res.status})`);
      catalog = await res.json();
      renderChips(categoriesFrom(catalog.drills || []));
      renderGrid();
    } catch (err) {
      setStatus(err.message || "Failed to load catalog");
    }
  }

  if (previewCloseBtn) {
    previewCloseBtn.addEventListener("click", () => closePreview());
  }
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
  if (dialog) {
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) closePreview();
    });
    dialog.addEventListener("cancel", (e) => {
      e.preventDefault();
      closePreview();
    });
  }

  if (searchEl) searchEl.addEventListener("input", () => renderGrid());
  init();
})();
