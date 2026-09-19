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
  const categorySuggestions = document.getElementById("category-suggestions");

  let editingEntry = null;
  let plan = classicStarterPlan();

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

  function renderPlanEditor() {
    if (!planEditor) return;
    plan = normalizePlan(plan);
    planEditor.innerHTML = plan.sets
      .map((set, si) => {
        const roundsHtml = set.rounds
          .map((round, ri) => {
            return `
            <div class="round-block" data-set="${si}" data-round="${ri}">
              <div class="round-top">
                <strong>Round ${ri + 1}</strong>
                <div class="round-actions">
                  <button type="button" data-act="round-up" ${ri === 0 ? "disabled" : ""}>Up</button>
                  <button type="button" data-act="round-down" ${
                    ri >= set.rounds.length - 1 ? "disabled" : ""
                  }>Down</button>
                  <button type="button" data-act="round-dup">Clone</button>
                  <button type="button" data-act="round-del" ${
                    set.rounds.length <= 1 ? "disabled" : ""
                  }>Delete</button>
                </div>
              </div>
              <div class="round-fields">
                <div class="form-row">
                  <label>Exercise</label>
                  <select data-field="activityId">${activityOptionsHtml(round.activityId)}</select>
                </div>
                <div class="form-row">
                  <label>Work</label>
                  <div class="stepper">
                    <button type="button" data-act="work-dec">−</button>
                    <span data-field="workLabel">${round.workSeconds}s</span>
                    <button type="button" data-act="work-inc">+</button>
                  </div>
                </div>
                <div class="form-row">
                  <label>Rest after</label>
                  <div class="stepper">
                    <button type="button" data-act="rest-dec">−</button>
                    <span data-field="restLabel">${round.restAfterSeconds}s</span>
                    <button type="button" data-act="rest-inc">+</button>
                  </div>
                </div>
              </div>
            </div>`;
          })
          .join("");
        return `
        <section class="set-block" data-set="${si}">
          <div class="set-head">
            <h3>Set ${si + 1}</h3>
            <div class="set-actions">
              <button type="button" data-act="set-up" ${si === 0 ? "disabled" : ""}>Up</button>
              <button type="button" data-act="set-down" ${
                si >= plan.sets.length - 1 ? "disabled" : ""
              }>Down</button>
              <button type="button" data-act="set-dup">Clone set</button>
              <button type="button" data-act="set-del" ${
                plan.sets.length <= 1 ? "disabled" : ""
              }>Delete set</button>
              <button type="button" data-act="round-add">Add round</button>
            </div>
          </div>
          <div class="set-body">
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

  function onPlanClick(e) {
    const btn = e.target.closest("button[data-act]");
    if (!btn || !planEditor.contains(btn)) return;
    const act = btn.getAttribute("data-act");
    const block = btn.closest("[data-set]");
    const si = Number(block?.getAttribute("data-set"));
    const roundBlock = btn.closest("[data-round]");
    const ri = roundBlock ? Number(roundBlock.getAttribute("data-round")) : -1;
    const sets = clonePlan(plan).sets;

    if (act === "set-up" && si > 0) {
      plan = { sets: swap(sets, si, si - 1) };
    } else if (act === "set-down" && si < sets.length - 1) {
      plan = { sets: swap(sets, si, si + 1) };
    } else if (act === "set-dup") {
      if (sets.length >= MAX_SETS) return toast("Max sets reached");
      sets.splice(si + 1, 0, clonePlan(sets[si]));
      plan = { sets };
    } else if (act === "set-del") {
      if (sets.length <= 1) return;
      sets.splice(si, 1);
      plan = { sets };
    } else if (act === "round-add") {
      const rounds = sets[si].rounds;
      if (rounds.length >= MAX_ROUNDS) return toast("Max rounds reached");
      const prev = rounds[rounds.length - 1];
      rounds.push(clonePlan(prev));
      plan = { sets };
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
    if (editorTitle) editorTitle.textContent = entry ? `Edit ${entry.name}` : "New drill";
    if (editName) editName.value = entry?.name || "";
    if (editCategory) editCategory.value = entry?.category || "";
    if (editDescription) editDescription.value = entry?.description || "";
    if (editCover) editCover.value = entry?.coverImage || "";
    plan = normalizePlan(template?.structuredPlan || classicStarterPlan());
    fillCategorySuggestions();
    setEditorError("");
    renderPlanEditor();
    showModal(editorDialog);
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
    const name = (editName?.value || "").trim() || "Untitled drill";
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

  async function ghHeaders() {
    const s = session();
    if (!s?.pat) throw new Error("Missing GitHub PAT — sign in again");
    return {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${s.pat}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    };
  }

  async function ghGetContent(path) {
    const headers = await ghHeaders();
    const url = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${path}?ref=${GH_BRANCH}`;
    const res = await fetch(url, { headers });
    if (res.status === 404) return null;
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GitHub GET ${path} failed (${res.status}): ${text.slice(0, 200)}`);
    }
    return res.json();
  }

  function encodeContent(text) {
    // utf-8 safe base64
    return btoa(unescape(encodeURIComponent(text)));
  }

  function decodeContent(b64) {
    return decodeURIComponent(escape(atob(b64)));
  }

  async function ghPutContent(path, text, message, sha) {
    const headers = await ghHeaders();
    const url = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${path}`;
    const body = {
      message,
      content: encodeContent(text),
      branch: GH_BRANCH,
    };
    if (sha) body.sha = sha;
    const res = await fetch(url, { method: "PUT", headers, body: JSON.stringify(body) });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`GitHub PUT ${path} failed (${res.status}): ${t.slice(0, 240)}`);
    }
    return res.json();
  }

  async function ghDeleteContent(path, sha, message) {
    const headers = await ghHeaders();
    const url = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${path}`;
    const res = await fetch(url, {
      method: "DELETE",
      headers,
      body: JSON.stringify({ message, sha, branch: GH_BRANCH }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`GitHub DELETE ${path} failed (${res.status}): ${t.slice(0, 240)}`);
    }
  }

  async function loadRemoteCatalogJson() {
    const file = await ghGetContent("catalog.json");
    if (!file) throw new Error("catalog.json not found on GitHub");
    const json = JSON.parse(decodeContent(file.content));
    return { file, json };
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
      await ghPutContent(
        drillPath,
        `${JSON.stringify(template, null, 2)}\n`,
        editingEntry ? `Update drill ${id}` : `Add drill ${id}`,
        existingDrill?.sha,
      );

      const { file: catalogFile, json: catalogJson } = await loadRemoteCatalogJson();
      const drills = Array.isArray(catalogJson.drills) ? [...catalogJson.drills] : [];
      const idx = drills.findIndex((d) => d.id === id);
      if (idx >= 0) drills[idx] = catalogEntry;
      else drills.push(catalogEntry);
      drills.sort((a, b) => String(a.name).localeCompare(String(b.name)));
      catalogJson.drills = drills;
      catalogJson.version = Number(catalogJson.version || 0) + 1;
      catalogJson.updatedAtMs = Date.now();
      if (!catalogJson.baseUrl) {
        catalogJson.baseUrl = `https://raw.githubusercontent.com/${GH_OWNER}/${GH_REPO}/main/`;
      }
      await ghPutContent(
        "catalog.json",
        `${JSON.stringify(catalogJson, null, 2)}\n`,
        `Catalog: ${editingEntry ? "update" : "add"} ${id}`,
        catalogFile.sha,
      );

      site()?.invalidateTemplate?.(id);
      await site()?.reloadCatalog?.();
      hideModal(editorDialog);
      toast(`Saved ${id} — Pages may take a minute to update`);
      site()?.openPreview?.(catalogEntry);
    } catch (err) {
      setEditorError(err.message || "Save failed");
    } finally {
      editorSave.disabled = false;
    }
  }

  async function deleteDrill(entry) {
    if (!isAuthed()) {
      showModal(loginDialog);
      return;
    }
    if (!entry?.id) return;
    if (!window.confirm(`Delete ${entry.name || entry.id}? This commits to GitHub.`)) return;
    try {
      const drillPath = entry.file || `drills/${entry.id}.json`;
      const existing = await ghGetContent(drillPath);
      if (existing?.sha) {
        await ghDeleteContent(drillPath, existing.sha, `Delete drill ${entry.id}`);
      }
      const { file: catalogFile, json: catalogJson } = await loadRemoteCatalogJson();
      catalogJson.drills = (catalogJson.drills || []).filter((d) => d.id !== entry.id);
      catalogJson.version = Number(catalogJson.version || 0) + 1;
      catalogJson.updatedAtMs = Date.now();
      await ghPutContent(
        "catalog.json",
        `${JSON.stringify(catalogJson, null, 2)}\n`,
        `Catalog: remove ${entry.id}`,
        catalogFile.sha,
      );
      site()?.invalidateTemplate?.(entry.id);
      site()?.closePreview?.();
      await site()?.reloadCatalog?.();
      toast(`Deleted ${entry.id}`);
    } catch (err) {
      toast(err.message || "Delete failed");
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
      toast(err.message || "Could not load drill");
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
          loginError.textContent = "GitHub PAT is required to save drills";
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
      if (action === "add-set") {
        if (sets.length >= MAX_SETS) return toast("Max sets reached");
        const last = sets[sets.length - 1];
        sets.push(clonePlan(last));
        plan = { sets };
        renderPlanEditor();
      } else if (action === "dup-last-set") {
        if (sets.length >= MAX_SETS) return toast("Max sets reached");
        sets.push(clonePlan(sets[sets.length - 1]));
        plan = { sets };
        renderPlanEditor();
      }
    });
  }
  if (planEditor) {
    planEditor.addEventListener("click", onPlanClick);
    planEditor.addEventListener("change", onPlanChange);
  }

  window.addEventListener("tabata-admin-edit", (e) => editDrill(e.detail?.entry));
  window.addEventListener("tabata-admin-delete", (e) => deleteDrill(e.detail?.entry));

  updateAuthUi();
})();
