(() => {
  const ADMIN_USER = "admin";
  const ADMIN_PASS = "tabataCore1";
  const GH_OWNER = "tasosstyl1984";
  const GH_REPO = "tabataCoreDrills";
  const GH_BRANCH = "main";
  const MAX_SETS = 50;
  const MAX_ROUNDS = 100;
  const SESSION_KEY = "tabataDrillsAdmin";

  const loginBtn = document.getElementById("admin-login-btn");
  const logoutBtn = document.getElementById("admin-logout-btn");
  const adminBar = document.getElementById("admin-bar");
  const newDrillBtn = document.getElementById("admin-new-drill");
  const loginDialog = document.getElementById("login-dialog");
  const loginForm = document.getElementById("login-form");
  const loginError = document.getElementById("login-error");
  const loginClose = document.getElementById("login-close");
  const loginCancel = document.getElementById("login-cancel");
  const editorDialog = document.getElementById("editor-dialog");
  const editorTitle = document.getElementById("editor-title");
  const editorClose = document.getElementById("editor-close");
  const editorCancel = document.getElementById("editor-cancel");
  const editorSave = document.getElementById("editor-save");
  const editorError = document.getElementById("editor-error");
  const planEditor = document.getElementById("plan-editor");
  const planToolbar = document.getElementById("plan-toolbar");
  const editName = document.getElementById("edit-name");
  const editCategory = document.getElementById("edit-category");
  const editDescription = document.getElementById("edit-description");
  const editCover = document.getElementById("edit-cover");
  const editCoverPreview = document.getElementById("edit-cover-preview");
  const editCoverPlaceholder = document.getElementById("edit-cover-placeholder");
  const editCoverUpload = document.getElementById("edit-cover-upload");
  const editCoverClear = document.getElementById("edit-cover-clear");
  const editCoverFile = document.getElementById("edit-cover-file");
  const cropDialog = document.getElementById("crop-dialog");
  const cropImage = document.getElementById("crop-image");
  const cropApply = document.getElementById("crop-apply");
  const cropCancel = document.getElementById("crop-cancel");
  const cropClose = document.getElementById("crop-close");
  const categorySuggestions = document.getElementById("category-suggestions");

  let editingEntry = null;
  let plan = classicStarterPlan();
  let categoryManual = false;
  let setCollapsed = [false];
  let dragKind = null; // 'set' | 'round'
  let dragFromSet = -1;
  let dragFromRound = -1;
  let pendingCoverBlob = null;
  let pendingCoverUrl = null;
  let cropper = null;
  let cropObjectUrl = null;

  const GROUP_TO_CATEGORY = {
    General: "conditioning",
    Conditioning: "conditioning",
    Combat: "boxing",
    Core: "core",
    Strength: "strength",
    Dumbbell: "dumbbell",
    Chest: "chest",
    Kettlebell: "kettlebell",
    Plyometrics: "plyometrics",
    Football: "football",
  };

  const categoryHint = document.getElementById("category-hint");
  const categoryAutoBadge = document.getElementById("category-auto-badge");

  function site() {
    return window.TabataDrillsSite;
  }

  function showModal(el) {
    if (!el) return;
    try {
      if (typeof el.showModal === "function") {
        if (!el.open) el.showModal();
      } else el.setAttribute("open", "");
    } catch (_) {
      el.setAttribute("open", "");
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

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  function classicStarterPlan() {
    return {
      sets: [
        {
          rounds: [{ workSeconds: 20, restAfterSeconds: 10, activityId: null }],
          restAfterSetSeconds: 60,
        },
      ],
    };
  }

  function clonePlan(src) {
    return JSON.parse(JSON.stringify(src));
  }

  function normalizePlan(raw) {
    const sets = (raw?.sets || [])
      .slice(0, MAX_SETS)
      .map((set) => {
        const rounds = (set.rounds || [])
          .slice(0, MAX_ROUNDS)
          .map((r) => ({
            workSeconds: clamp(Number(r.workSeconds) || 20, 10, 3600),
            restAfterSeconds: clamp(Number(r.restAfterSeconds) || 10, 10, 3600),
            activityId: r.activityId || null,
          }));
        if (!rounds.length) {
          rounds.push({ workSeconds: 20, restAfterSeconds: 10, activityId: null });
        }
        return {
          rounds,
          restAfterSetSeconds: clamp(Number(set.restAfterSetSeconds) || 60, 10, 3600),
        };
      });
    if (!sets.length) return classicStarterPlan();
    return { sets };
  }

  function session() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function saveSession(data) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
  }

  function clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
  }

  function isAuthed() {
    const s = session();
    return !!(s && s.ok && s.pat);
  }

  function updateAuthUi() {
    const ok = isAuthed();
    document.body.classList.toggle("admin-authed", ok);
    if (adminBar) adminBar.classList.toggle("is-visible", ok);
    if (loginBtn) loginBtn.hidden = ok;
    if (logoutBtn) logoutBtn.hidden = !ok;
  }

  function slugify(name) {
    const base = String(name || "drill")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40);
    return `remote_${base || "drill"}`;
  }

  function uniqueId(preferred) {
    const catalog = site()?.getCatalog();
    const ids = new Set((catalog?.drills || []).map((d) => d.id));
    let id = preferred.startsWith("remote_") ? preferred : `remote_${preferred}`;
    if (!ids.has(id)) return id;
    let i = 2;
    while (ids.has(`${id}_${i}`)) i += 1;
    return `${id}_${i}`;
  }

  function activityOptionsHtml(selected) {
    const activities = site()?.activityCatalog?.() || [];
    const groups = new Map();
    for (const a of activities) {
      const g = a.group || "Other";
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push(a);
    }
    let html = `<option value="">No label</option>`;
    for (const [group, list] of groups) {
      html += `<optgroup label="${escape(group)}">`;
      for (const a of list) {
        const sel = a.id === selected ? " selected" : "";
        html += `<option value="${escape(a.id)}"${sel}>${escape(a.label)}</option>`;
      }
      html += `</optgroup>`;
    }
    return html;
  }

  function escape(s) {
    return site()?.escapeHtml?.(s) ?? String(s);
  }

  function suggestCategoryFromPlan() {
    const activities = site()?.activityCatalog?.() || [];
    const byId = new Map(activities.map((a) => [a.id, a]));
    const cats = new Set();
    for (const set of plan.sets || []) {
      for (const r of set.rounds || []) {
        const id = r.activityId;
        if (!id) continue;
        const group = byId.get(id)?.group;
        const cat = GROUP_TO_CATEGORY[group] || null;
        if (cat) cats.add(cat);
      }
    }
    if (cats.size === 0) return "classic";
    if (cats.size > 1) return "combos";
    return [...cats][0];
  }

  function applySuggestedCategory({ force = false } = {}) {
    if (!editCategory) return;
    if (categoryManual && !force) {
      if (categoryAutoBadge) categoryAutoBadge.hidden = true;
      if (categoryHint) {
        categoryHint.textContent =
          "Manual override — clear the field to auto from exercises again.";
      }
      return;
    }
    const suggested = suggestCategoryFromPlan();
    editCategory.value = suggested;
    categoryManual = false;
    if (categoryAutoBadge) categoryAutoBadge.hidden = false;
    if (categoryHint) {
      const hasExercise = (plan.sets || []).some((s) =>
        (s.rounds || []).some((r) => r.activityId),
      );
      categoryHint.textContent = hasExercise
        ? `Auto from exercises → ${suggested} (filter chip on the site).`
        : `Auto → ${suggested} (updates when you pick exercises).`;
    }
  }

  function iconAct(act, icon, title, disabled = false) {
    return `<button type="button" class="icon-act" data-act="${act}" title="${title}" aria-label="${title}"${
      disabled ? " disabled" : ""
    }><span class="material-symbols-outlined" aria-hidden="true">${icon}</span></button>`;
  }

  function activityLabel(id) {
    if (!id) return "No exercise";
    const activities = site()?.activityCatalog?.() || [];
    return activities.find((a) => a.id === id)?.label || id;
  }

  function ensureCollapseState() {
    while (setCollapsed.length < plan.sets.length) setCollapsed.push(false);
    if (setCollapsed.length > plan.sets.length) {
      setCollapsed.length = plan.sets.length;
    }
  }

  function resetCollapseState({ expandFirst = true } = {}) {
    setCollapsed = plan.sets.map((_, i) => (expandFirst ? i > 0 : true));
  }

  function setSummary(set) {
    const n = set.rounds.length;
    const first = activityLabel(set.rounds[0]?.activityId);
    return `${n} round${n === 1 ? "" : "s"} · rest ${set.restAfterSetSeconds}s · ${first}`;
  }

  function renderPlanEditor() {
    if (!planEditor) return;
    plan = normalizePlan(plan);
    ensureCollapseState();
    applySuggestedCategory();
    planEditor.innerHTML = plan.sets
      .map((set, si) => {
        const collapsed = Boolean(setCollapsed[si]);
        const roundsHtml = set.rounds
          .map((round, ri) => {
            return `
            <div class="round-block" data-set="${si}" data-round="${ri}">
              <span class="drag-handle" draggable="true" data-drag="round" title="Drag round" aria-label="Drag round">⋮⋮</span>
              <span class="round-index">R${ri + 1}</span>
              <select class="round-exercise" data-field="activityId" aria-label="Exercise">${activityOptionsHtml(round.activityId)}</select>
              <div class="stepper" title="Work">
                <button type="button" data-act="work-dec" aria-label="Decrease work">−</button>
                <span data-field="workLabel">${round.workSeconds}s</span>
                <button type="button" data-act="work-inc" aria-label="Increase work">+</button>
              </div>
              <div class="stepper" title="Rest after round">
                <button type="button" data-act="rest-dec" aria-label="Decrease rest">−</button>
                <span data-field="restLabel">${round.restAfterSeconds}s</span>
                <button type="button" data-act="rest-inc" aria-label="Increase rest">+</button>
              </div>
              <div class="round-actions">
                ${iconAct("round-up", "arrow_upward", "Move up", ri === 0)}
                ${iconAct(
                  "round-down",
                  "arrow_downward",
                  "Move down",
                  ri >= set.rounds.length - 1,
                )}
                ${iconAct("round-dup", "content_copy", "Clone round")}
                ${iconAct("round-del", "delete", "Delete round", set.rounds.length <= 1)}
              </div>
            </div>`;
          })
          .join("");
        return `
        <section class="set-block${collapsed ? " is-collapsed" : ""}" data-set="${si}">
          <div class="set-head">
            <button type="button" class="set-toggle" data-act="set-toggle" aria-expanded="${
              collapsed ? "false" : "true"
            }" title="${collapsed ? "Expand set" : "Collapse set"}" aria-label="${
              collapsed ? "Expand set" : "Collapse set"
            }">
              <span class="material-symbols-outlined" aria-hidden="true">${
                collapsed ? "expand_more" : "expand_less"
              }</span>
            </button>
            <span class="drag-handle" draggable="true" data-drag="set" title="Drag set" aria-label="Drag set">⋮⋮</span>
            <div class="set-title-wrap">
              <h3>Set ${si + 1}</h3>
              <p class="set-summary">${escape(setSummary(set))}</p>
            </div>
            <div class="set-actions">
              ${iconAct("set-up", "arrow_upward", "Move set up", si === 0)}
              ${iconAct(
                "set-down",
                "arrow_downward",
                "Move set down",
                si >= plan.sets.length - 1,
              )}
              ${iconAct("set-dup", "content_copy", "Clone set")}
              ${iconAct("set-del", "delete", "Delete set", plan.sets.length <= 1)}
              <button type="button" data-act="round-add" title="Add round">+ Round</button>
            </div>
          </div>
          <div class="set-body"${collapsed ? " hidden" : ""}>
            ${roundsHtml}
            <div class="set-rest-row">
              <span>Rest after set</span>
              <div class="stepper">
                <button type="button" data-act="set-rest-dec">−</button>
                <span data-field="setRestLabel">${set.restAfterSetSeconds}s</span>
                <button type="button" data-act="set-rest-inc">+</button>
              </div>
            </div>
          </div>
        </section>`;
      })
      .join("");
  }

  function swap(arr, i, j) {
    const copy = [...arr];
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
    return copy;
  }

  function moveItem(arr, from, to) {
    if (from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length) {
      return arr;
    }
    const copy = [...arr];
    const [item] = copy.splice(from, 1);
    copy.splice(to, 0, item);
    return copy;
  }

  function clearDragOverUi() {
    planEditor?.querySelectorAll(".drag-over").forEach((el) => {
      el.classList.remove("drag-over");
    });
  }

  function clearDragUi() {
    clearDragOverUi();
    planEditor?.querySelectorAll(".is-dragging").forEach((el) => {
      el.classList.remove("is-dragging");
    });
  }

  function onPlanDragStart(e) {
    const handle = e.target.closest(".drag-handle");
    if (!handle || !planEditor.contains(handle)) {
      e.preventDefault();
      return;
    }
    const kind = handle.getAttribute("data-drag");
    if (kind === "set") {
      const block = handle.closest(".set-block");
      dragKind = "set";
      dragFromSet = Number(block?.getAttribute("data-set"));
      dragFromRound = -1;
      block?.classList.add("is-dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", `set:${dragFromSet}`);
      if (block && e.dataTransfer.setDragImage) {
        e.dataTransfer.setDragImage(block, 24, 16);
      }
    } else if (kind === "round") {
      const block = handle.closest(".round-block");
      dragKind = "round";
      dragFromSet = Number(block?.getAttribute("data-set"));
      dragFromRound = Number(block?.getAttribute("data-round"));
      block?.classList.add("is-dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", `round:${dragFromSet}:${dragFromRound}`);
      if (block && e.dataTransfer.setDragImage) {
        e.dataTransfer.setDragImage(block, 24, 16);
      }
    } else {
      e.preventDefault();
    }
  }

  function onPlanDragOver(e) {
    if (!dragKind) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    clearDragOverUi();
    if (dragKind === "set") {
      const block = e.target.closest(".set-block");
      if (block && planEditor.contains(block)) block.classList.add("drag-over");
    } else if (dragKind === "round") {
      const block = e.target.closest(".round-block");
      if (block && planEditor.contains(block)) block.classList.add("drag-over");
    }
  }

  function onPlanDrop(e) {
    if (!dragKind) return;
    e.preventDefault();
    e.stopPropagation();
    const sets = clonePlan(plan).sets;
    if (dragKind === "set") {
      const block = e.target.closest(".set-block");
      const to = Number(block?.getAttribute("data-set"));
      if (Number.isFinite(to)) {
        plan = { sets: moveItem(sets, dragFromSet, to) };
        setCollapsed = moveItem(setCollapsed, dragFromSet, to);
      }
    } else if (dragKind === "round") {
      const block = e.target.closest(".round-block");
      const toSet = Number(block?.getAttribute("data-set"));
      const toRound = Number(block?.getAttribute("data-round"));
      if (Number.isFinite(toSet) && Number.isFinite(toRound) && toSet === dragFromSet) {
        sets[toSet].rounds = moveItem(sets[toSet].rounds, dragFromRound, toRound);
        plan = { sets };
      } else if (Number.isFinite(toSet) && toSet !== dragFromSet) {
        const [item] = sets[dragFromSet].rounds.splice(dragFromRound, 1);
        if (sets[dragFromSet].rounds.length === 0) {
          sets[dragFromSet].rounds.push({
            workSeconds: item.workSeconds,
            restAfterSeconds: item.restAfterSeconds,
            activityId: null,
          });
        }
        const insertAt = Number.isFinite(toRound) ? toRound : sets[toSet].rounds.length;
        sets[toSet].rounds.splice(insertAt, 0, item);
        plan = { sets };
        setCollapsed[toSet] = false;
      }
    }
    dragKind = null;
    dragFromSet = -1;
    dragFromRound = -1;
    clearDragUi();
    renderPlanEditor();
  }

  function onPlanDragEnd() {
    dragKind = null;
    dragFromSet = -1;
    dragFromRound = -1;
    clearDragUi();
  }

  function onPlanClick(e) {
    const btn = e.target.closest("button[data-act]");
    if (!btn || !planEditor.contains(btn)) return;
    const act = btn.getAttribute("data-act");
    const block = btn.closest("[data-set]");
    const si = Number(block?.getAttribute("data-set"));
    const roundBlock = btn.closest("[data-round]");
    const ri = roundBlock ? Number(roundBlock.getAttribute("data-round")) : -1;
    const sets = clonePlan(plan).sets;
    ensureCollapseState();

    if (act === "set-toggle") {
      setCollapsed[si] = !setCollapsed[si];
      renderPlanEditor();
      return;
    }

    if (act === "set-up" && si > 0) {
      plan = { sets: swap(sets, si, si - 1) };
      setCollapsed = swap(setCollapsed, si, si - 1);
    } else if (act === "set-down" && si < sets.length - 1) {
      plan = { sets: swap(sets, si, si + 1) };
      setCollapsed = swap(setCollapsed, si, si + 1);
    } else if (act === "set-dup") {
      if (sets.length >= MAX_SETS) return toast("Max sets reached");
      sets.splice(si + 1, 0, clonePlan(sets[si]));
      setCollapsed.splice(si + 1, 0, false);
      plan = { sets };
    } else if (act === "set-del") {
      if (sets.length <= 1) return;
      sets.splice(si, 1);
      setCollapsed.splice(si, 1);
      plan = { sets };
    } else if (act === "round-add") {
      const rounds = sets[si].rounds;
      if (rounds.length >= MAX_ROUNDS) return toast("Max rounds reached");
      const prev = rounds[rounds.length - 1];
      rounds.push(clonePlan(prev));
      plan = { sets };
      setCollapsed[si] = false;
    } else if (act === "round-up" && ri > 0) {
      sets[si].rounds = swap(sets[si].rounds, ri, ri - 1);
      plan = { sets };
    } else if (act === "round-down" && ri < sets[si].rounds.length - 1) {
      sets[si].rounds = swap(sets[si].rounds, ri, ri + 1);
      plan = { sets };
    } else if (act === "round-dup") {
      const rounds = sets[si].rounds;
      if (rounds.length >= MAX_ROUNDS) return toast("Max rounds reached");
      rounds.splice(ri + 1, 0, clonePlan(rounds[ri]));
      plan = { sets };
    } else if (act === "round-del") {
      if (sets[si].rounds.length <= 1) return;
      sets[si].rounds.splice(ri, 1);
      plan = { sets };
    } else if (act === "work-inc" || act === "work-dec") {
      const delta = act === "work-inc" ? 5 : -5;
      sets[si].rounds[ri].workSeconds = clamp(
        sets[si].rounds[ri].workSeconds + delta,
        10,
        3600,
      );
      plan = { sets };
    } else if (act === "rest-inc" || act === "rest-dec") {
      const delta = act === "rest-inc" ? 5 : -5;
      sets[si].rounds[ri].restAfterSeconds = clamp(
        sets[si].rounds[ri].restAfterSeconds + delta,
        10,
        3600,
      );
      plan = { sets };
    } else if (act === "set-rest-inc" || act === "set-rest-dec") {
      const delta = act === "set-rest-inc" ? 10 : -10;
      sets[si].restAfterSetSeconds = clamp(
        sets[si].restAfterSetSeconds + delta,
        10,
        3600,
      );
      plan = { sets };
    } else {
      return;
    }
    renderPlanEditor();
  }

  function onPlanChange(e) {
    const sel = e.target.closest("select[data-field='activityId']");
    if (!sel || !planEditor.contains(sel)) return;
    const block = sel.closest("[data-round]");
    const si = Number(block.getAttribute("data-set"));
    const ri = Number(block.getAttribute("data-round"));
    const sets = clonePlan(plan).sets;
    sets[si].rounds[ri].activityId = sel.value || null;
    plan = { sets };
    applySuggestedCategory();
  }

  function toast(msg) {
    site()?.setStatus?.(msg);
  }

  function setEditorError(msg) {
    if (!editorError) return;
    if (!msg) {
      editorError.hidden = true;
      editorError.textContent = "";
      return;
    }
    editorError.hidden = false;
    editorError.textContent = msg;
  }

  function fillCategorySuggestions() {
    if (!categorySuggestions) return;
    const cats = new Set();
    for (const d of site()?.getCatalog()?.drills || []) {
      if (d.category) cats.add(d.category);
    }
    categorySuggestions.innerHTML = [...cats]
      .sort()
      .map((c) => `<option value="${escape(c)}"></option>`)
      .join("");
  }

  function openEditor({ entry = null, template = null } = {}) {
    if (!isAuthed()) {
      showModal(loginDialog);
      return;
    }
    editingEntry = entry;
    categoryManual = Boolean(entry?.category);
    if (editorTitle) editorTitle.textContent = entry ? `Edit ${entry.name}` : "New plan";
    if (editName) editName.value = entry?.name || template?.name || "";
    if (editCategory) editCategory.value = entry?.category || "";
    if (editDescription) editDescription.value = entry?.description || "";
    resetCoverUi(entry?.coverImage || "");
    plan = normalizePlan(template?.structuredPlan || classicStarterPlan());
    resetCollapseState({ expandFirst: true });
    fillCategorySuggestions();
    setEditorError("");
    renderPlanEditor();
    if (categoryManual) {
      if (categoryAutoBadge) categoryAutoBadge.hidden = true;
      if (categoryHint) {
        categoryHint.textContent =
          "Saved category — clear the field to auto from exercises again.";
      }
    } else {
      applySuggestedCategory({ force: true });
    }
    showModal(editorDialog);
  }

  function importPlanFromJsonText(raw, { fileName = "" } = {}) {
    const { template, catalogMeta } = parseImportedPlanJson(raw);
    const name = (
      template.name ||
      catalogMeta?.name ||
      fileName.replace(/\.json$/i, "") ||
      "Imported plan"
    ).trim();

    let preferredId = String(template.id || "");
    if (preferredId.startsWith("default_")) {
      preferredId = `remote_${preferredId.slice("default_".length)}`;
    }
    const isRemote = preferredId.startsWith("remote_");

    const activityIds = [];
    for (const set of template.structuredPlan?.sets || []) {
      for (const r of set.rounds || []) {
        if (r.activityId && !activityIds.includes(r.activityId)) {
          activityIds.push(r.activityId);
        }
      }
    }

    const entry = isRemote
      ? {
          id: preferredId,
          name,
          category: catalogMeta?.category || "",
          description: catalogMeta?.description || "",
          coverImage:
            catalogMeta?.coverImage ||
            (activityIds[0] ? `exercise_guides/${activityIds[0]}.webp` : ""),
          file: `drills/${preferredId}.json`,
          activityIds,
        }
      : null;

    openEditor({
      entry,
      template: {
        ...template,
        id: isRemote ? preferredId : template.id,
        name,
      },
    });

    if (editName) editName.value = name;
    if (editDescription) {
      editDescription.value = catalogMeta?.description || editDescription.value || "";
    }
    if (editCover && (catalogMeta?.coverImage || activityIds[0])) {
      editCover.value =
        catalogMeta?.coverImage ||
        `exercise_guides/${activityIds[0]}.webp`;
    }
    if (catalogMeta?.category) {
      categoryManual = true;
      if (editCategory) editCategory.value = catalogMeta.category;
      if (categoryHint) {
        categoryHint.textContent = "Category from imported file (clear to re-auto).";
      }
    } else {
      categoryManual = false;
      applySuggestedCategory({ force: true });
    }
    if (editorTitle) {
      editorTitle.textContent = isRemote ? `Import / update ${name}` : `Import ${name}`;
    }
    toast(`Loaded ${name} — review and Save`);
  }

  function parseImportedPlanJson(raw) {
    let data;
    try {
      data = JSON.parse(raw);
    } catch (_) {
      throw new Error("File is not valid JSON");
    }
    if (!data || typeof data !== "object") {
      throw new Error("JSON must be an object");
    }
    let template = data;
    let catalogMeta = null;
    if (data.format === "tabata_core_template" && data.template) {
      template = data.template;
      catalogMeta = {
        name: data.template.name,
        description: data.description || "",
        category: data.category || "",
        coverImage: data.coverImage || "",
      };
    } else if (data.template && typeof data.template === "object") {
      template = data.template;
    }
    if (!template.structuredPlan && !(template.sets && template.workSeconds)) {
      throw new Error("JSON is not a Tabata Core plan (missing structuredPlan)");
    }
    // Build a synthetic structured plan from classic scalar fields if needed.
    if (!template.structuredPlan) {
      const rounds = [];
      const reps = Math.max(1, Number(template.repsPerSet) || 1);
      for (let i = 0; i < reps; i++) {
        rounds.push({
          workSeconds: Number(template.workSeconds) || 20,
          restAfterSeconds: Number(template.restBetweenRepsSeconds) || 10,
          activityId: null,
        });
      }
      const setCount = Math.max(1, Number(template.sets) || 1);
      template = {
        ...template,
        structuredPlan: {
          sets: Array.from({ length: setCount }, () => ({
            rounds: rounds.map((r) => ({ ...r })),
            restAfterSetSeconds: Number(template.restBetweenSetsSeconds) || 60,
          })),
        },
      };
    }
    return { template, catalogMeta };
  }

  async function onImportFileSelected(e) {
    const file = e.target?.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!isAuthed()) {
      showModal(loginDialog);
      return;
    }
    try {
      const text = await file.text();
      importPlanFromJsonText(text, { fileName: file.name });
    } catch (err) {
      toast(err.message || "Import failed");
    }
  }

  function buildTemplateFromForm(id) {
    plan = normalizePlan(plan);
    const firstSet = plan.sets[0];
    const firstRound = firstSet.rounds[0];
    const activityIds = [];
    for (const set of plan.sets) {
      for (const r of set.rounds) {
        if (r.activityId && !activityIds.includes(r.activityId)) {
          activityIds.push(r.activityId);
        }
      }
    }
    const cover =
      (editCover?.value || "").trim() ||
      (activityIds[0] ? `exercise_guides/${activityIds[0]}.webp` : "exercise_guides/burpees.webp");
    const name = (editName?.value || "").trim() || "Untitled plan";
    const now = Date.now();
    const template = {
      id,
      name,
      createdAtMs: editingEntry ? undefined : now,
      sets: plan.sets.length,
      repsPerSet: firstSet.rounds.length,
      workSeconds: firstRound.workSeconds,
      restBetweenRepsSeconds: firstRound.restAfterSeconds,
      restBetweenSetsSeconds: firstSet.restAfterSetSeconds,
      warmupEnabled: false,
      warmupSeconds: 60,
      cooldownEnabled: false,
      cooldownSeconds: 60,
      structuredPlan: {
        sets: plan.sets.map((set) => ({
          rounds: set.rounds.map((r) => {
            const out = {
              workSeconds: r.workSeconds,
              restAfterSeconds: r.restAfterSeconds,
            };
            if (r.activityId) out.activityId = r.activityId;
            return out;
          }),
          restAfterSetSeconds: set.restAfterSetSeconds,
        })),
      },
    };
    if (editingEntry && template.createdAtMs === undefined) {
      // keep createdAtMs from existing file when available via fetch later
    }
    const catalogEntry = {
      id,
      name,
      file: `drills/${id}.json`,
      updatedAtMs: now,
      category: (editCategory?.value || "").trim() || "custom",
      description: (editDescription?.value || "").trim(),
      coverImage: cover,
      activityIds,
    };
    return { template, catalogEntry };
  }

  async function ghHeaders({ jsonBody = false } = {}) {
    const s = session();
    if (!s?.pat) throw new Error("Missing GitHub PAT — sign in again");
    const headers = {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${s.pat}`,
      "X-GitHub-Api-Version": "2022-11-28",
    };
    // Do not send Cache-Control/Pragma — GitHub CORS allow-list omits them
    // and the browser then fails with a generic "Failed to fetch".
    if (jsonBody) headers["Content-Type"] = "application/json";
    return headers;
  }

  function networkError(err, action) {
    const msg = String(err?.message || err || "");
    if (/failed to fetch|networkerror|load failed/i.test(msg)) {
      return new Error(
        `${action} failed (network/CORS). Hard-refresh the page, confirm your PAT still has Contents write access, then retry.`,
      );
    }
    return err instanceof Error ? err : new Error(msg || action);
  }

  async function ghGetContent(path) {
    const headers = await ghHeaders();
    const url = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${encodeURI(
      path,
    )}?ref=${GH_BRANCH}&_=${Date.now()}`;
    let res;
    try {
      res = await fetch(url, { headers, cache: "no-store" });
    } catch (err) {
      throw networkError(err, `GitHub GET ${path}`);
    }
    if (res.status === 404) return null;
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GitHub GET ${path} failed (${res.status}): ${text.slice(0, 200)}`);
    }
    return res.json();
  }

  function encodeBytes(bytes) {
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  }

  function encodeContent(text) {
    return encodeBytes(new TextEncoder().encode(text));
  }

  async function encodeBlob(blob) {
    const buf = await blob.arrayBuffer();
    return encodeBytes(new Uint8Array(buf));
  }

  function decodeContent(b64) {
    const cleaned = String(b64 || "").replace(/\s/g, "");
    const binary = atob(cleaned);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  async function ghPutContent(path, textOrBase64, message, sha, { rawBase64 = false } = {}) {
    const headers = await ghHeaders({ jsonBody: true });
    const url = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${encodeURI(path)}`;
    const body = {
      message,
      content: rawBase64 ? textOrBase64 : encodeContent(textOrBase64),
      branch: GH_BRANCH,
    };
    if (sha) body.sha = sha;
    let res;
    try {
      res = await fetch(url, {
        method: "PUT",
        headers,
        body: JSON.stringify(body),
        cache: "no-store",
      });
    } catch (err) {
      throw networkError(err, `GitHub PUT ${path}`);
    }
    if (!res.ok) {
      const t = await res.text();
      const err = new Error(`GitHub PUT ${path} failed (${res.status}): ${t.slice(0, 240)}`);
      err.status = res.status;
      throw err;
    }
    return res.json();
  }

  async function ghDeleteContent(path, sha, message) {
    const headers = await ghHeaders({ jsonBody: true });
    const url = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${encodeURI(path)}`;
    let res;
    try {
      res = await fetch(url, {
        method: "DELETE",
        headers,
        body: JSON.stringify({ message, sha, branch: GH_BRANCH }),
        cache: "no-store",
      });
    } catch (err) {
      throw networkError(err, `GitHub DELETE ${path}`);
    }
    if (!res.ok) {
      const t = await res.text();
      const err = new Error(`GitHub DELETE ${path} failed (${res.status}): ${t.slice(0, 240)}`);
      err.status = res.status;
      throw err;
    }
  }

  async function readGhFileText(file, pathLabel) {
    if (file?.encoding === "base64" && file.content) {
      try {
        return decodeContent(file.content);
      } catch (err) {
        if (!file.download_url) {
          throw new Error(`Could not decode ${pathLabel}: ${err.message}`);
        }
      }
    }
    if (file?.download_url) {
      const res = await fetch(file.download_url, { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`Could not download ${pathLabel} (${res.status})`);
      }
      return res.text();
    }
    throw new Error(`${pathLabel} has no readable content from GitHub`);
  }

  async function loadRemoteCatalogJson() {
    const file = await ghGetContent("catalog.json");
    if (!file) throw new Error("catalog.json not found on GitHub");
    const text = await readGhFileText(file, "catalog.json");
    try {
      return { file, json: JSON.parse(text) };
    } catch (err) {
      throw new Error(`catalog.json is not valid JSON: ${err.message}`);
    }
  }

  async function putCatalogJson(mutator, message) {
    const maxAttempts = 5;
    let lastErr = null;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, 250 * attempt));
      }
      const { file, json } = await loadRemoteCatalogJson();
      const next = mutator(clonePlan(json));
      if (!next.baseUrl) {
        next.baseUrl = `https://raw.githubusercontent.com/${GH_OWNER}/${GH_REPO}/main/`;
      }
      next.version = Number(next.version || 0) + 1;
      next.updatedAtMs = Date.now();
      try {
        await ghPutContent(
          "catalog.json",
          `${JSON.stringify(next, null, 2)}\n`,
          message,
          file.sha,
        );
        return next;
      } catch (err) {
        lastErr = err;
        if (err.status === 409 || /\(409\)/.test(String(err.message))) {
          continue;
        }
        throw err;
      }
    }
    throw lastErr || new Error("catalog.json update failed after retries");
  }

  function revokePendingCoverUrl() {
    if (pendingCoverUrl) {
      URL.revokeObjectURL(pendingCoverUrl);
      pendingCoverUrl = null;
    }
  }

  function setCoverPreview(src) {
    if (editCoverPreview && src) {
      editCoverPreview.src = src;
      editCoverPreview.hidden = false;
      if (editCoverPlaceholder) editCoverPlaceholder.hidden = true;
    } else {
      if (editCoverPreview) {
        editCoverPreview.removeAttribute("src");
        editCoverPreview.hidden = true;
      }
      if (editCoverPlaceholder) editCoverPlaceholder.hidden = false;
    }
  }

  function clearPendingCover() {
    revokePendingCoverUrl();
    pendingCoverBlob = null;
  }

  function resetCoverUi(path = "") {
    clearPendingCover();
    if (editCover) editCover.value = path || "";
    if (path) {
      try {
        setCoverPreview(new URL(path, window.location.href).toString());
      } catch (_) {
        setCoverPreview("");
      }
    } else {
      setCoverPreview("");
    }
  }

  function destroyCropper() {
    if (cropper) {
      cropper.destroy();
      cropper = null;
    }
    if (cropObjectUrl) {
      URL.revokeObjectURL(cropObjectUrl);
      cropObjectUrl = null;
    }
    if (cropImage) {
      cropImage.removeAttribute("src");
    }
  }

  function openCropDialog(file) {
    if (!cropDialog || !cropImage || typeof Cropper === "undefined") {
      toast("Cropper failed to load — refresh the page");
      return;
    }
    destroyCropper();
    cropObjectUrl = URL.createObjectURL(file);
    cropImage.src = cropObjectUrl;
    showModal(cropDialog);
    cropImage.onload = () => {
      cropper = new Cropper(cropImage, {
        aspectRatio: 16 / 10,
        viewMode: 1,
        autoCropArea: 1,
        background: false,
        responsive: true,
      });
    };
  }

  function applyCrop() {
    if (!cropper) return;
    const canvas = cropper.getCroppedCanvas({
      maxWidth: 1200,
      maxHeight: 750,
      imageSmoothingEnabled: true,
      imageSmoothingQuality: "high",
    });
    if (!canvas) {
      toast("Could not crop image");
      return;
    }
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          toast("Could not encode cover image");
          return;
        }
        clearPendingCover();
        pendingCoverBlob = blob;
        pendingCoverUrl = URL.createObjectURL(blob);
        if (editCover) editCover.value = "";
        setCoverPreview(pendingCoverUrl);
        destroyCropper();
        hideModal(cropDialog);
      },
      "image/webp",
      0.88,
    );
  }

  async function uploadPendingCover(id) {
    if (!pendingCoverBlob) return editCover?.value?.trim() || "";
    const path = `plan_covers/${id}.webp`;
    const existing = await ghGetContent(path);
    const content = await encodeBlob(pendingCoverBlob);
    try {
      await ghPutContent(
        path,
        content,
        `Cover: ${id}`,
        existing?.sha,
        { rawBase64: true },
      );
    } catch (err) {
      if (err.status === 409 || /\(409\)/.test(String(err.message))) {
        const latest = await ghGetContent(path);
        await ghPutContent(path, content, `Cover: ${id}`, latest?.sha, {
          rawBase64: true,
        });
      } else {
        throw err;
      }
    }
    return path;
  }

  async function saveDrill() {
    setEditorError("");
    if (!editName?.value.trim()) {
      setEditorError("Name is required");
      return;
    }
    editorSave.disabled = true;
    try {
      const id = editingEntry?.id || uniqueId(slugify(editName.value));
      if (pendingCoverBlob) {
        const coverPath = await uploadPendingCover(id);
        if (editCover) editCover.value = coverPath;
        clearPendingCover();
        setCoverPreview(new URL(coverPath, window.location.href).toString());
      }
      const { template, catalogEntry } = buildTemplateFromForm(id);

      // Preserve createdAtMs when editing
      if (editingEntry) {
        try {
          const existing = await site().fetchTemplate(editingEntry);
          if (existing?.createdAtMs) template.createdAtMs = existing.createdAtMs;
        } catch (_) {
          template.createdAtMs = Date.now();
        }
      } else {
        template.createdAtMs = Date.now();
      }

      const drillPath = `drills/${id}.json`;
      const existingDrill = await ghGetContent(drillPath);
      try {
        await ghPutContent(
          drillPath,
          `${JSON.stringify(template, null, 2)}\n`,
          editingEntry ? `Update drill ${id}` : `Add drill ${id}`,
          existingDrill?.sha,
        );
      } catch (err) {
        if (err.status === 409 || /\(409\)/.test(String(err.message))) {
          const latest = await ghGetContent(drillPath);
          await ghPutContent(
            drillPath,
            `${JSON.stringify(template, null, 2)}\n`,
            editingEntry ? `Update drill ${id}` : `Add drill ${id}`,
            latest?.sha,
          );
        } else {
          throw err;
        }
      }

      await putCatalogJson((catalogJson) => {
        const drills = Array.isArray(catalogJson.drills) ? [...catalogJson.drills] : [];
        const idx = drills.findIndex((d) => d.id === id);
        if (idx >= 0) drills[idx] = catalogEntry;
        else drills.push(catalogEntry);
        drills.sort((a, b) => String(a.name).localeCompare(String(b.name)));
        catalogJson.drills = drills;
        return catalogJson;
      }, `Catalog: ${editingEntry ? "update" : "add"} ${id}`);

      hideModal(editorDialog);
      toast(`Saved ${id}`);
      try {
        site()?.cacheTemplate?.(id, template);
        await site()?.reloadCatalog?.({ fromRemote: true });
        site()?.openPreview?.(catalogEntry);
      } catch (refreshErr) {
        toast(`Saved ${id}, but refresh failed: ${refreshErr.message || refreshErr}`);
      }
    } catch (err) {
      setEditorError(networkError(err, "Save").message || "Save failed");
    } finally {
      editorSave.disabled = false;
    }
  }

  let deleteInFlight = false;

  async function deleteDrill(entry) {
    if (!isAuthed()) {
      showModal(loginDialog);
      return;
    }
    if (!entry?.id || deleteInFlight) return;
    if (!window.confirm(`Delete ${entry.name || entry.id}? This commits to GitHub.`)) return;
    deleteInFlight = true;
    try {
      // Catalog first so a later file-delete failure cannot leave a ghost card.
      await putCatalogJson((catalogJson) => {
        catalogJson.drills = (catalogJson.drills || []).filter((d) => d.id !== entry.id);
        return catalogJson;
      }, `Catalog: remove ${entry.id}`);

      const drillPath = entry.file || `drills/${entry.id}.json`;
      const existing = await ghGetContent(drillPath);
      if (existing?.sha) {
        try {
          await ghDeleteContent(drillPath, existing.sha, `Delete drill ${entry.id}`);
        } catch (err) {
          if (err.status === 409 || /\(409\)/.test(String(err.message))) {
            const latest = await ghGetContent(drillPath);
            if (latest?.sha) {
              await ghDeleteContent(drillPath, latest.sha, `Delete drill ${entry.id}`);
            }
          } else {
            throw err;
          }
        }
      }

      const coverPath = String(entry.coverImage || "");
      if (coverPath.startsWith("plan_covers/")) {
        try {
          const cover = await ghGetContent(coverPath);
          if (cover?.sha) {
            await ghDeleteContent(coverPath, cover.sha, `Delete cover ${entry.id}`);
          }
        } catch (_) {
          /* cover cleanup is best-effort */
        }
      }

      site()?.invalidateTemplate?.(entry.id);
      site()?.closePreview?.();
      await site()?.reloadCatalog?.({ fromRemote: true });
      toast(`Deleted ${entry.id}`);
    } catch (err) {
      toast(networkError(err, "Delete").message || "Delete failed");
    } finally {
      deleteInFlight = false;
    }
  }

  async function editDrill(entry) {
    if (!isAuthed()) {
      showModal(loginDialog);
      return;
    }
    try {
      const template = await site().fetchTemplate(entry);
      openEditor({ entry, template });
    } catch (err) {
      toast(err.message || "Could not load plan");
    }
  }

  // Events
  if (loginBtn) loginBtn.addEventListener("click", () => showModal(loginDialog));
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      clearSession();
      updateAuthUi();
      toast("Logged out");
    });
  }
  if (loginClose) loginClose.addEventListener("click", () => hideModal(loginDialog));
  if (loginCancel) loginCancel.addEventListener("click", () => hideModal(loginDialog));
  if (loginDialog) {
    loginDialog.addEventListener("click", (e) => {
      if (e.target === loginDialog) hideModal(loginDialog);
    });
  }
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const user = document.getElementById("login-user")?.value.trim();
      const pass = document.getElementById("login-pass")?.value;
      const pat = document.getElementById("login-pat")?.value.trim();
      if (loginError) {
        loginError.hidden = true;
        loginError.textContent = "";
      }
      if (user !== ADMIN_USER || pass !== ADMIN_PASS) {
        if (loginError) {
          loginError.hidden = false;
          loginError.textContent = "Invalid username or password";
        }
        return;
      }
      if (!pat) {
        if (loginError) {
          loginError.hidden = false;
          loginError.textContent = "GitHub PAT is required to save plans";
        }
        return;
      }
      saveSession({ ok: true, pat, at: Date.now() });
      updateAuthUi();
      hideModal(loginDialog);
      toast("Admin signed in");
    });
  }

  if (newDrillBtn) {
    newDrillBtn.addEventListener("click", () => openEditor({ entry: null, template: null }));
  }
  const importJsonBtn = document.getElementById("admin-import-json");
  const importFileInput = document.getElementById("admin-import-file");
  if (importJsonBtn && importFileInput) {
    importJsonBtn.addEventListener("click", () => {
      if (!isAuthed()) {
        showModal(loginDialog);
        return;
      }
      importFileInput.click();
    });
    importFileInput.addEventListener("change", onImportFileSelected);
  }
  if (editCategory) {
    editCategory.addEventListener("input", () => {
      if (editCategory.value.trim().length === 0) {
        categoryManual = false;
        applySuggestedCategory({ force: true });
        return;
      }
      categoryManual = true;
      if (categoryAutoBadge) categoryAutoBadge.hidden = true;
      if (categoryHint) {
        categoryHint.textContent =
          "Manual override — clear the field to auto from exercises again.";
      }
    });
  }
  if (editCoverUpload && editCoverFile) {
    editCoverUpload.addEventListener("click", () => editCoverFile.click());
    editCoverFile.addEventListener("change", () => {
      const file = editCoverFile.files?.[0];
      editCoverFile.value = "";
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        toast("Pick an image file");
        return;
      }
      openCropDialog(file);
    });
  }
  if (editCoverClear) {
    editCoverClear.addEventListener("click", () => resetCoverUi(""));
  }
  if (cropApply) cropApply.addEventListener("click", () => applyCrop());
  if (cropCancel) {
    cropCancel.addEventListener("click", () => {
      destroyCropper();
      hideModal(cropDialog);
    });
  }
  if (cropClose) {
    cropClose.addEventListener("click", () => {
      destroyCropper();
      hideModal(cropDialog);
    });
  }
  if (cropDialog) {
    cropDialog.addEventListener("click", (e) => {
      if (e.target === cropDialog) {
        destroyCropper();
        hideModal(cropDialog);
      }
    });
    cropDialog.addEventListener("cancel", (e) => {
      e.preventDefault();
      destroyCropper();
      hideModal(cropDialog);
    });
  }
  if (editorClose) editorClose.addEventListener("click", () => hideModal(editorDialog));
  if (editorCancel) editorCancel.addEventListener("click", () => hideModal(editorDialog));
  if (editorSave) editorSave.addEventListener("click", () => saveDrill());
  if (editorDialog) {
    editorDialog.addEventListener("click", (e) => {
      if (e.target === editorDialog) hideModal(editorDialog);
    });
  }
  if (planToolbar) {
    planToolbar.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      const action = btn.getAttribute("data-action");
      const sets = clonePlan(plan).sets;
      ensureCollapseState();
      if (action === "add-set") {
        if (sets.length >= MAX_SETS) return toast("Max sets reached");
        const last = sets[sets.length - 1];
        sets.push(clonePlan(last));
        plan = { sets };
        setCollapsed.push(false);
        renderPlanEditor();
      } else if (action === "dup-last-set") {
        if (sets.length >= MAX_SETS) return toast("Max sets reached");
        sets.push(clonePlan(sets[sets.length - 1]));
        plan = { sets };
        setCollapsed.push(false);
        renderPlanEditor();
      } else if (action === "collapse-all") {
        setCollapsed = plan.sets.map(() => true);
        renderPlanEditor();
      } else if (action === "expand-all") {
        setCollapsed = plan.sets.map(() => false);
        renderPlanEditor();
      }
    });
  }
  if (planEditor) {
    planEditor.addEventListener("click", onPlanClick);
    planEditor.addEventListener("change", onPlanChange);
    planEditor.addEventListener("dragstart", onPlanDragStart);
    planEditor.addEventListener("dragover", onPlanDragOver);
    planEditor.addEventListener("drop", onPlanDrop);
    planEditor.addEventListener("dragend", onPlanDragEnd);
  }

  window.addEventListener("tabata-admin-edit", (e) => editDrill(e.detail?.entry));
  window.addEventListener("tabata-admin-delete", (e) => deleteDrill(e.detail?.entry));

  updateAuthUi();
})();
