(() => {
  const GH_OWNER = "tasosstyl1984";
  const GH_REPO = "tabataCoreDrills";
  const GH_BRANCH = "main";
  const RAW_BASE = `https://raw.githubusercontent.com/${GH_OWNER}/${GH_REPO}/main/`;
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
  const cropBrand = document.getElementById("crop-brand");
  const cropTitle = document.getElementById("crop-title");
  const cropHint = document.getElementById("crop-hint");
  const cropImage = document.getElementById("crop-image");
  const cropApply = document.getElementById("crop-apply");
  const cropCancel = document.getElementById("crop-cancel");
  const cropClose = document.getElementById("crop-close");
  const categorySuggestions = document.getElementById("category-suggestions");
  const activityPickerDialog = document.getElementById("activity-picker-dialog");
  const activityPickerClose = document.getElementById("activity-picker-close");
  const activityPickerChips = document.getElementById("activity-picker-chips");
  const activityPickerList = document.getElementById("activity-picker-list");

  const newWeeklyBtn = document.getElementById("admin-new-weekly");
  const weeklyEditorDialog = document.getElementById("weekly-editor-dialog");
  const weeklyEditorTitle = document.getElementById("weekly-editor-title");
  const weeklyEditorClose = document.getElementById("weekly-editor-close");
  const weeklyEditorCancel = document.getElementById("weekly-editor-cancel");
  const weeklyEditorSave = document.getElementById("weekly-editor-save");
  const weeklyEditorError = document.getElementById("weekly-editor-error");
  const weeklyEditName = document.getElementById("weekly-edit-name");
  const weeklyEditDescription = document.getElementById("weekly-edit-description");
  const weeklyDayRows = document.getElementById("weekly-day-rows");

  const adminTabPlans = document.getElementById("admin-tab-plans");
  const adminTabExerciseImages = document.getElementById("admin-tab-exercise-images");
  const adminPanelPlans = document.getElementById("admin-panel-plans");
  const adminPanelExerciseImages = document.getElementById("admin-panel-exercise-images");
  const adminBarPlans = document.getElementById("admin-bar-plans");
  const exerciseImagesStatus = document.getElementById("exercise-images-status");
  const exerciseImagesSearch = document.getElementById("exercise-images-search");
  const exerciseImagesCategories = document.getElementById("exercise-images-categories");
  const exerciseImagesGrid = document.getElementById("exercise-images-grid");
  const exerciseImagesEmpty = document.getElementById("exercise-images-empty");
  const exerciseImagesEditor = document.getElementById("exercise-images-editor");
  const exerciseImagesSelectedTitle = document.getElementById("exercise-images-selected-title");
  const exerciseImagesIdCode = document.getElementById("exercise-images-selected-id");
  const exerciseImagesManifestLine = document.getElementById("exercise-images-manifest-line");
  const exerciseImagesCurrentPreview = document.getElementById("exercise-images-current-preview");
  const exerciseImagesCurrentPlaceholder = document.getElementById("exercise-images-current-placeholder");
  const exerciseImagesCurrentZoomStack = document.getElementById(
    "exercise-images-current-zoom-stack",
  );
  const exerciseImagesCurrentZoom = document.getElementById("exercise-images-current-zoom");
  const exerciseImagesNewPreview = document.getElementById("exercise-images-new-preview");
  const exerciseImagesNewPlaceholder = document.getElementById("exercise-images-new-placeholder");
  const exerciseImagesNewZoomStack = document.getElementById("exercise-images-new-zoom-stack");
  const exerciseImagesNewZoom = document.getElementById("exercise-images-new-zoom");
  const exerciseImagesPick = document.getElementById("exercise-images-pick");
  const exerciseImagesFile = document.getElementById("exercise-images-file");
  const exerciseImagesClear = document.getElementById("exercise-images-clear");
  const exerciseImagesError = document.getElementById("exercise-images-error");
  const exerciseImagesSave = document.getElementById("exercise-images-save");

  const ADMIN_PANEL_KEY = "tabataDrillsAdminPanel";
  let exerciseImagesManifestCache = null;
  /** @type {string} Exercise group chip: "all" or catalog group name */
  let exerciseImagesActiveCategory = "all";
  let exerciseImagesSelectedId = "";
  let exerciseImagesPendingBlob = null;
  let exerciseImagesPendingPreviewUrl = null;
  let detachCurrentZoom = null;
  let detachNewZoom = null;

  let editingWeeklyWeek = null;
  let plan = classicStarterPlan();
  let categoryManual = false;
  /** Activity group chip for the exercise picker. Shared across rounds in one edit. */
  let activityGroupFilter = null;
  let pickerSet = -1;
  let pickerRound = -1;
  let setCollapsed = [false];
  let dragKind = null; // 'set' | 'round'
  let dragFromSet = -1;
  let dragFromRound = -1;
  let pendingCoverBlob = null;
  let pendingCoverUrl = null;
  let cropper = null;
  let cropObjectUrl = null;
  /** @type {'planCover' | 'exerciseGuide'} */
  let cropMode = "planCover";

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
    applyAdminPanelVisibility();
    window.dispatchEvent(
      new CustomEvent("tabata-admin-auth", { detail: { ok } }),
    );
  }

  function adminPanelFromStorage() {
    try {
      const v = sessionStorage.getItem(ADMIN_PANEL_KEY);
      return v === "exercise-images" ? "exercise-images" : "plans";
    } catch (_) {
      return "plans";
    }
  }

  function saveAdminPanel(panel) {
    try {
      sessionStorage.setItem(ADMIN_PANEL_KEY, panel);
    } catch (_) {
      /* ignore */
    }
  }

  function applyAdminPanelVisibility() {
    const ok = isAuthed();
    const panel = adminPanelFromStorage();
    const useExercise = ok && panel === "exercise-images";
    if (adminPanelPlans) {
      adminPanelPlans.hidden = useExercise;
    }
    if (adminPanelExerciseImages) {
      adminPanelExerciseImages.hidden = !useExercise;
    }
    if (adminBarPlans) {
      adminBarPlans.hidden = useExercise;
    }
    if (adminTabPlans) {
      adminTabPlans.classList.toggle("is-active", !useExercise);
      adminTabPlans.setAttribute("aria-selected", useExercise ? "false" : "true");
    }
    if (adminTabExerciseImages) {
      adminTabExerciseImages.classList.toggle("is-active", useExercise);
      adminTabExerciseImages.setAttribute("aria-selected", useExercise ? "true" : "false");
    }
    if (useExercise) {
      ensureExerciseImagesManifest().catch(() => {});
      renderExerciseImagesBrowser();
    }
  }

  function setExerciseImagesError(msg) {
    if (!exerciseImagesError) return;
    if (!msg) {
      exerciseImagesError.hidden = true;
      exerciseImagesError.textContent = "";
      return;
    }
    exerciseImagesError.hidden = false;
    exerciseImagesError.textContent = msg;
  }

  function detachZoomHandlers() {
    if (typeof detachCurrentZoom === "function") {
      try {
        detachCurrentZoom();
      } catch (_) {
        /* ignore */
      }
    }
    detachCurrentZoom = null;
    if (typeof detachNewZoom === "function") {
      try {
        detachNewZoom();
      } catch (_) {
        /* ignore */
      }
    }
    detachNewZoom = null;
  }

  async function ensureExerciseImagesManifest() {
    if (exerciseImagesManifestCache) return exerciseImagesManifestCache;
    const res = await fetch(`exercise_guides_manifest.json?_=${Date.now()}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Could not load exercise_guides_manifest.json");
    exerciseImagesManifestCache = await res.json();
    return exerciseImagesManifestCache;
  }

  function manifestEntryForId(manifest, id) {
    const imgs = manifest?.images || [];
    return imgs.find((e) => e && e.id === id) || null;
  }

  function exerciseImagesActivitiesWithGuides() {
    const activities = site()?.activityCatalog() || [];
    const imageIds = site()?.imageIds;
    return activities
      .filter((a) => a && a.id)
      .filter((a) => !imageIds || imageIds.has(a.id));
  }

  function renderExerciseImagesCategoryChips() {
    if (!exerciseImagesCategories || !isAuthed()) return;
    const acts = exerciseImagesActivitiesWithGuides();
    const groups = new Set();
    for (const a of acts) {
      groups.add((a.group && String(a.group).trim()) || "Other");
    }
    const cats = ["all", ...Array.from(groups).sort((x, y) => x.localeCompare(y))];
    if (!cats.includes(exerciseImagesActiveCategory)) {
      exerciseImagesActiveCategory = "all";
    }
    exerciseImagesCategories.innerHTML = "";
    for (const cat of cats) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip";
      btn.textContent = cat === "all" ? "All" : cat;
      btn.setAttribute("aria-pressed", cat === exerciseImagesActiveCategory ? "true" : "false");
      btn.addEventListener("click", () => {
        exerciseImagesActiveCategory = cat;
        renderExerciseImagesCategoryChips();
        renderExerciseImagesGrid();
      });
      exerciseImagesCategories.appendChild(btn);
    }
  }

  function renderExerciseImagesGrid() {
    if (!exerciseImagesGrid || !isAuthed()) return;
    const q = (exerciseImagesSearch?.value || "").trim().toLowerCase();
    const catalog = site()?.activityCatalog();
    if (!catalog || catalog.length === 0) {
      exerciseImagesGrid.innerHTML = `<p class="muted exercise-images-grid-empty">Loading exercise catalog…</p>`;
      return;
    }
    const acts = exerciseImagesActivitiesWithGuides();
    const filtered = acts
      .filter((a) => {
        if (exerciseImagesActiveCategory !== "all") {
          const g = (a.group && String(a.group).trim()) || "Other";
          if (g !== exerciseImagesActiveCategory) return false;
        }
        if (!q) return true;
        const label = String(a.label || "").toLowerCase();
        const id = String(a.id).toLowerCase();
        return label.includes(q) || id.includes(q);
      })
      .sort((a, b) => String(a.label || a.id).localeCompare(String(b.label || b.id)));
    exerciseImagesGrid.innerHTML = "";
    if (!filtered.length) {
      exerciseImagesGrid.innerHTML = `<p class="muted exercise-images-grid-empty">No exercises match.</p>`;
      if (exerciseImagesStatus) {
        exerciseImagesStatus.textContent = acts.length
          ? "No exercises match your filters."
          : "No exercises with guide images in the manifest yet.";
      }
      return;
    }
    if (exerciseImagesStatus) {
      exerciseImagesStatus.textContent = `${filtered.length} guide${filtered.length === 1 ? "" : "s"} — click a card to edit`;
    }
    const esc = (s) => site()?.escapeHtml?.(String(s)) ?? String(s);
    const escAttr = (s) => site()?.escapeAttr?.(String(s)) ?? String(s);
    for (const a of filtered) {
      const card = document.createElement("article");
      card.className = "card card-clickable exercise-images-card";
      if (a.id === exerciseImagesSelectedId) card.classList.add("is-selected");
      card.tabIndex = 0;
      card.setAttribute("role", "listitem");
      card.dataset.activityId = a.id;
      card.setAttribute("aria-label", `${a.label || a.id}`);
      const thumb = site()?.activityImageUrl?.(a.id) || "";
      const coverHtml = thumb
        ? `<img class="card-cover exercise-images-card-cover" src="${escAttr(thumb)}" alt="" loading="lazy" />`
        : `<div class="card-cover exercise-images-card-cover exercise-images-card-cover--empty" aria-hidden="true"></div>`;
      const group = (a.group && String(a.group).trim()) || "Exercise";
      card.innerHTML = `
        ${coverHtml}
        <span class="badge">${esc(group)}</span>
        <h3>${esc(a.label || a.id)}</h3>
        <p class="exercise-images-card-id"><code>${esc(a.id)}</code></p>
      `;
      const open = (e) => {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        selectExerciseForImages(a.id);
      };
      card.addEventListener("click", open);
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open(e);
        }
      });
      exerciseImagesGrid.appendChild(card);
    }
  }

  function renderExerciseImagesBrowser() {
    renderExerciseImagesCategoryChips();
    renderExerciseImagesGrid();
  }

  async function selectExerciseForImages(id) {
    exerciseImagesSelectedId = id;
    setExerciseImagesError("");
    exerciseImagesPendingBlob = null;
    if (exerciseImagesPendingPreviewUrl) {
      try {
        URL.revokeObjectURL(exerciseImagesPendingPreviewUrl);
      } catch (_) {
        /* ignore */
      }
      exerciseImagesPendingPreviewUrl = null;
    }
    refreshExerciseSaveButton();
    detachZoomHandlers();
    if (exerciseImagesEmpty) exerciseImagesEmpty.hidden = true;
    if (exerciseImagesEditor) exerciseImagesEditor.hidden = false;
    const title = site()?.activityLabel?.(id) || id;
    if (exerciseImagesSelectedTitle) exerciseImagesSelectedTitle.textContent = title;
    if (exerciseImagesIdCode) exerciseImagesIdCode.textContent = id;

    try {
      const manifest = await ensureExerciseImagesManifest();
      const ent = manifestEntryForId(manifest, id);
      if (exerciseImagesManifestLine) {
        if (ent) {
          exerciseImagesManifestLine.hidden = false;
          exerciseImagesManifestLine.textContent = `Manifest: v${manifest.version || "—"} · ${ent.bytes != null ? `${ent.bytes} bytes` : ""} · ${ent.sha256 || ""}`;
        } else {
          exerciseImagesManifestLine.hidden = true;
          exerciseImagesManifestLine.textContent = "";
        }
      }
    } catch (_) {
      if (exerciseImagesManifestLine) {
        exerciseImagesManifestLine.hidden = false;
        exerciseImagesManifestLine.textContent = "Manifest: (could not load)";
      }
    }

    const url = site()?.activityImageUrl?.(id);
    if (exerciseImagesCurrentPreview && url) {
      const runAttach = () => {
        if (typeof window.attachExerciseImageZoomPan === "function" && exerciseImagesCurrentZoom) {
          detachCurrentZoom = window.attachExerciseImageZoomPan(exerciseImagesCurrentZoom);
        }
      };
      exerciseImagesCurrentPreview.onload = () => runAttach();
      exerciseImagesCurrentPreview.src = `${url}${url.includes("?") ? "&" : "?"}_=${Date.now()}`;
      exerciseImagesCurrentPreview.hidden = false;
      if (exerciseImagesCurrentZoomStack) exerciseImagesCurrentZoomStack.hidden = false;
      if (exerciseImagesCurrentPlaceholder) exerciseImagesCurrentPlaceholder.hidden = true;
      if (exerciseImagesCurrentPreview.complete) {
        runAttach();
      }
    } else if (exerciseImagesCurrentPreview) {
      exerciseImagesCurrentPreview.removeAttribute("src");
      exerciseImagesCurrentPreview.hidden = true;
      if (exerciseImagesCurrentZoomStack) exerciseImagesCurrentZoomStack.hidden = true;
      if (exerciseImagesCurrentPlaceholder) {
        exerciseImagesCurrentPlaceholder.hidden = false;
      }
    }

    if (exerciseImagesNewPreview) {
      exerciseImagesNewPreview.removeAttribute("src");
      exerciseImagesNewPreview.hidden = true;
    }
    if (exerciseImagesNewZoomStack) exerciseImagesNewZoomStack.hidden = true;
    if (exerciseImagesNewPlaceholder) exerciseImagesNewPlaceholder.hidden = false;

    renderExerciseImagesGrid();
    if (exerciseImagesStatus) exerciseImagesStatus.textContent = "";
  }

  function onExerciseImageFile(file) {
    setExerciseImagesError("");
    exerciseImagesPendingBlob = null;
    if (exerciseImagesPendingPreviewUrl) {
      try {
        URL.revokeObjectURL(exerciseImagesPendingPreviewUrl);
      } catch (_) {
        /* ignore */
      }
      exerciseImagesPendingPreviewUrl = null;
    }
    refreshExerciseSaveButton();
    detachZoomHandlers();
    if (!file) {
      if (exerciseImagesNewPreview) {
        exerciseImagesNewPreview.removeAttribute("src");
        exerciseImagesNewPreview.hidden = true;
      }
      if (exerciseImagesNewZoomStack) exerciseImagesNewZoomStack.hidden = true;
      if (exerciseImagesNewPlaceholder) exerciseImagesNewPlaceholder.hidden = false;
      return;
    }
    const okType =
      file.type === "image/png" || file.type === "image/jpeg" || file.type === "image/webp";
    if (!okType) {
      setExerciseImagesError("Choose a PNG, JPEG, or WebP image.");
      return;
    }
    openCropDialog(file, "exerciseGuide");
  }

  async function sha256HexPrefix16(bytes) {
    const buf = await crypto.subtle.digest("SHA-256", bytes);
    const hex = Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return hex.slice(0, 16);
  }

  function refreshExerciseSaveButton() {
    if (!exerciseImagesSave) return;
    const id = exerciseImagesSelectedId?.trim();
    const img = exerciseImagesNewPreview;
    const hasPreview =
      img &&
      !img.hidden &&
      img.getAttribute("src") &&
      img.complete &&
      img.naturalWidth > 0;
    exerciseImagesSave.disabled = !(id && (exerciseImagesPendingBlob != null || hasPreview));
  }

  function updateManifestImages(manifest, id, relFile, byteLen, sha16) {
    const imgs = Array.isArray(manifest.images) ? [...manifest.images] : [];
    const idx = imgs.findIndex((e) => e && e.id === id);
    const nextEntry = {
      id,
      file: relFile,
      bytes: byteLen,
      sha256: sha16,
    };
    if (idx >= 0) imgs[idx] = nextEntry;
    else imgs.push(nextEntry);
    manifest.images = imgs;
    let total = 0;
    for (const im of imgs) {
      if (im && typeof im.bytes === "number") total += im.bytes;
    }
    manifest.totalBytes = total;
    manifest.version = Number(manifest.version || 0) + 1;
    manifest.updatedAtMs = Date.now();
    if (!manifest.baseUrl) manifest.baseUrl = RAW_BASE;
    return manifest;
  }

  function uint8ArrayFromDataUrl(dataUrl) {
    const comma = dataUrl.indexOf(",");
    if (comma < 0) throw new Error("Invalid image data URL");
    const base64 = dataUrl.slice(comma + 1);
    const bin = atob(base64);
    const len = bin.length;
    const out = new Uint8Array(len);
    for (let i = 0; i < len; i += 1) out[i] = bin.charCodeAt(i);
    return out;
  }

  /**
   * WebP from canvas — `toBlob('image/webp')` returns null on some Safari / Firefox builds.
   * @param {HTMLCanvasElement} canvas
   * @param {number} quality 0..1
   * @returns {Promise<Uint8Array>}
   */
  async function canvasToWebpBytes(canvas, quality) {
    const blob = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/webp", quality),
    );
    if (blob) return new Uint8Array(await blob.arrayBuffer());
    let dataUrl = "";
    try {
      dataUrl = canvas.toDataURL("image/webp", quality);
    } catch (e) {
      const msg = e && e.message ? String(e.message) : String(e);
      throw new Error(`Could not encode WebP (${msg}). Try Chrome or Edge, or reduce zoom.`);
    }
    if (dataUrl && dataUrl.startsWith("data:image/webp")) {
      return uint8ArrayFromDataUrl(dataUrl);
    }
    throw new Error(
      "This browser cannot encode WebP from the preview. Use Chrome or Edge, or update Safari.",
    );
  }

  /**
   * Renders the replacement preview exactly as shown (3:2 viewport, zoom/pan, letterbox)
   * to 1536×1024 WebP bytes — matches Tabata Core exercise guide slot.
   * @returns {Promise<Uint8Array>}
   */
  async function exportExerciseReplacementViewportToWebpBytes() {
    const img = exerciseImagesNewPreview;
    const viewport = exerciseImagesNewZoom;
    if (!img || !viewport || !img.naturalWidth) {
      throw new Error("No preview image to export");
    }
    const bg = "#EDEEF0";
    const outW = 1536;
    const outH = 1024;
    const vr = viewport.getBoundingClientRect();
    const ir = img.getBoundingClientRect();
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    if (!vr.width || !vr.height || !nw || !nh) {
      throw new Error("Could not measure preview for export");
    }
    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, outW, outH);
    // Map viewport CSS pixels → output; draw full natural image into its on-screen rect (after zoom/pan).
    try {
      ctx.setTransform(
        outW / vr.width,
        0,
        0,
        outH / vr.height,
        (-vr.left * outW) / vr.width,
        (-vr.top * outH) / vr.height,
      );
      ctx.drawImage(img, 0, 0, nw, nh, ir.left, ir.top, ir.width, ir.height);
    } catch (e) {
      const msg = e && e.message ? String(e.message) : String(e);
      throw new Error(`Could not composite preview (${msg}). Try Reset zoom, then Save.`);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    return canvasToWebpBytes(canvas, 0.88);
  }

  async function saveExerciseImageToGithub() {
    if (!isAuthed()) {
      showModal(loginDialog);
      return;
    }
    const id = exerciseImagesSelectedId;
    if (!id?.trim()) {
      setExerciseImagesError("Select an exercise first.");
      return;
    }
    const img = exerciseImagesNewPreview;
    const hasPreview =
      img &&
      !img.hidden &&
      img.getAttribute("src") &&
      img.complete &&
      img.naturalWidth > 0;
    if (!hasPreview && !exerciseImagesPendingBlob) {
      setExerciseImagesError("Choose a replacement image and finish crop first.");
      return;
    }
    setExerciseImagesError("");
    showBusy("Encoding and uploading image…");
    try {
      const webpBytes = await exportExerciseReplacementViewportToWebpBytes();
      const b64 = encodeBytes(webpBytes);
      const sha16 = await sha256HexPrefix16(webpBytes);
      const path = `exercise_guides/${id}.webp`;
      const relFile = path;

      const man1File = await ghGetContent("exercise_guides/manifest.json");
      const man2File = await ghGetContent("exercise_guides_manifest.json");
      if (!man1File?.sha || !man2File?.sha) {
        throw new Error("Could not load manifest SHAs from GitHub");
      }
      const man1Text = await readGhFileText(man1File, "exercise_guides/manifest.json");
      const man2Text = await readGhFileText(man2File, "exercise_guides_manifest.json");
      const manifest1 = JSON.parse(man1Text);
      const manifest2 = JSON.parse(man2Text);

      updateManifestImages(manifest1, id, relFile, webpBytes.length, sha16);
      updateManifestImages(manifest2, id, `exercise_guides/${id}.webp`, webpBytes.length, sha16);

      await commitFilesAtomic(`Exercise guide image: ${id}`, [
        {
          path,
          content: b64,
          encoding: "base64",
        },
        {
          path: "exercise_guides/manifest.json",
          content: `${JSON.stringify(manifest1, null, 4)}\n`,
          encoding: "utf-8",
        },
        {
          path: "exercise_guides_manifest.json",
          content: `${JSON.stringify(manifest2, null, 2)}\n`,
          encoding: "utf-8",
        },
      ]);

      exerciseImagesManifestCache = manifest2;
      if (exerciseImagesStatus) {
        exerciseImagesStatus.textContent = `Saved ${id}.webp — manifests v${manifest2.version}`;
      }
      toast(`Saved ${id}.webp`);
      exerciseImagesPendingBlob = null;
      if (exerciseImagesFile) exerciseImagesFile.value = "";
      await selectExerciseForImages(id);
    } catch (err) {
      const msg = err?.message || String(err);
      setExerciseImagesError(msg);
      toast(msg);
    } finally {
      hideBusy();
    }
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
    const presets = site()?.getPresets?.();
    const ids = new Set([
      ...(catalog?.drills || []).map((d) => d.id),
      ...(presets?.drills || []).map((d) => d.id),
    ]);
    let id = preferred.startsWith("remote_") ? preferred : `remote_${preferred}`;
    if (!ids.has(id)) return id;
    let i = 2;
    while (ids.has(`${id}_${i}`)) i += 1;
    return `${id}_${i}`;
  }

  function groupedActivities() {
    const activities = site()?.activityCatalog?.() || [];
    const groups = new Map();
    for (const a of activities) {
      const g = a.group || "Other";
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push(a);
    }
    return groups;
  }

  function exerciseButtonLabel(id) {
    if (!id) return "No label";
    return activityLabel(id);
  }

  function renderActivityChips() {
    if (!activityPickerChips) return;
    const names = ["All", ...groupedActivities().keys()];
    activityPickerChips.innerHTML = names
      .map((name) => {
        const group = name === "All" ? "" : name;
        const pressed = group ? activityGroupFilter === group : activityGroupFilter == null;
        return `<button type="button" class="chip" data-group="${escape(group)}" aria-pressed="${
          pressed ? "true" : "false"
        }">${escape(name)}</button>`;
      })
      .join("");
  }

  function renderActivityList() {
    if (!activityPickerList) return;
    const selectedId = plan.sets[pickerSet]?.rounds[pickerRound]?.activityId || "";
    const sections = [];
    for (const [group, list] of groupedActivities()) {
      if (activityGroupFilter && group !== activityGroupFilter) continue;
      if (list.length) sections.push({ group, list });
    }
    if (!sections.length) {
      const empty = activityGroupFilter
        ? `No ${activityGroupFilter} activities`
        : "No activities";
      activityPickerList.innerHTML = `<p class="activity-picker-empty">${escape(empty)}</p>`;
      return;
    }
    let html = "";
    html += `<button type="button" class="activity-option" role="option" data-activity="" aria-selected="${
      !selectedId ? "true" : "false"
    }">No label</button>`;
    for (const section of sections) {
      html += `<div class="activity-group-label">${escape(section.group)}</div>`;
      for (const activity of section.list) {
        const selected = activity.id === selectedId;
        html += `<button type="button" class="activity-option" role="option" data-activity="${escape(
          activity.id,
        )}" aria-selected="${selected ? "true" : "false"}">${escape(activity.label)}</button>`;
      }
    }
    activityPickerList.innerHTML = html;
  }

  function openActivityPicker(setIndex, roundIndex) {
    pickerSet = setIndex;
    pickerRound = roundIndex;
    renderActivityChips();
    renderActivityList();
    showModal(activityPickerDialog);
    requestAnimationFrame(() => {
      activityPickerChips
        ?.querySelector('.chip[aria-pressed="true"]')
        ?.scrollIntoView({ inline: "center", block: "nearest" });
    });
  }

  function closeActivityPicker() {
    hideModal(activityPickerDialog);
  }

  function chooseActivity(activityId) {
    const sets = clonePlan(plan).sets;
    const round = sets[pickerSet]?.rounds[pickerRound];
    if (!round) return;
    round.activityId = activityId || null;
    plan = { sets };
    closeActivityPicker();
    renderPlanEditor();
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
              <button type="button" class="round-exercise" data-act="pick-activity" aria-label="Exercise, ${escape(exerciseButtonLabel(round.activityId))}">
                <span class="round-exercise-label">${escape(exerciseButtonLabel(round.activityId))}</span>
                <span class="material-symbols-outlined" aria-hidden="true">arrow_drop_down</span>
              </button>
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
            <div class="set-foot">
              <button type="button" data-act="round-add" title="Add round">+ Round</button>
            </div>
          </div>
        </section>`;
      })
      .join("") +
      `<div class="plan-foot">
        <button type="button" data-act="add-set">Add set</button>
      </div>`;
  }

  function scrollFormChildIntoView(el) {
    const scroller = el?.closest(".form-body");
    if (!el || !scroller) return;
    const elRect = el.getBoundingClientRect();
    const scRect = scroller.getBoundingClientRect();
    if (elRect.bottom > scRect.bottom) {
      scroller.scrollTop += elRect.bottom - scRect.bottom + 8;
    }
  }

  function appendClonedLastSet(sets) {
    if (sets.length >= MAX_SETS) {
      toast("Max sets reached");
      return false;
    }
    sets.push(clonePlan(sets[sets.length - 1]));
    plan = { sets };
    setCollapsed.push(true);
    return true;
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
    const fromFoot = Boolean(btn.closest(".set-foot, .plan-foot"));
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

    if (act === "pick-activity" && ri >= 0) {
      openActivityPicker(si, ri);
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
    } else if (act === "add-set") {
      if (!appendClonedLastSet(sets)) return;
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
    if (fromFoot && (act === "round-add" || act === "add-set")) {
      const selector =
        act === "round-add" ? `.set-block[data-set="${si}"] .set-foot` : ".plan-foot";
      scrollFormChildIntoView(planEditor.querySelector(selector));
    }
  }

  function toast(msg) {
    site()?.setStatus?.(msg);
  }

  const busyDialog = document.getElementById("busy-dialog");
  const busyMessage = document.getElementById("busy-message");
  if (busyDialog) {
    busyDialog.addEventListener("cancel", (event) => {
      event.preventDefault();
    });
  }

  function showBusy(message) {
    if (busyMessage) busyMessage.textContent = message || "Working…";
    if (!busyDialog) return;
    busyDialog.setAttribute("aria-busy", "true");
    try {
      if (typeof busyDialog.showModal === "function") {
        if (!busyDialog.open) busyDialog.showModal();
      } else {
        busyDialog.setAttribute("open", "");
      }
    } catch (_) {
      busyDialog.setAttribute("open", "");
    }
  }

  function hideBusy() {
    if (!busyDialog) return;
    busyDialog.setAttribute("aria-busy", "false");
    try {
      if (typeof busyDialog.close === "function" && busyDialog.open) {
        busyDialog.close();
      } else {
        busyDialog.removeAttribute("open");
      }
    } catch (_) {
      busyDialog.removeAttribute("open");
    }
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
    activityGroupFilter = null;
    const isPreset = Boolean(entry?.preset || entry?.shipsWithApp);
    if (editorTitle) {
      editorTitle.textContent = entry
        ? isPreset
          ? `Edit preset · ${entry.name}`
          : `Edit ${entry.name}`
        : "New plan";
    }
    if (editName) editName.value = entry?.name || template?.name || "";
    if (editCategory) editCategory.value = entry?.category || "";
    if (editDescription) {
      editDescription.value =
        entry?.description || template?.description || "";
    }
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
    const description = (editDescription?.value || "").trim();
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
    if (description) template.description = description;
    if (editingEntry && template.createdAtMs === undefined) {
      // keep createdAtMs from existing file when available via fetch later
    }
    const catalogEntry = {
      id,
      name,
      file: `drills/${id}.json`,
      updatedAtMs: now,
      category: (editCategory?.value || "").trim() || "custom",
      description,
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

  async function ghApi(method, apiPath, body) {
    const headers = await ghHeaders({ jsonBody: body != null });
    const url = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}${apiPath}`;
    let res;
    try {
      res = await fetch(url, {
        method,
        headers,
        body: body != null ? JSON.stringify(body) : undefined,
        cache: "no-store",
      });
    } catch (err) {
      throw networkError(err, `GitHub ${method} ${apiPath}`);
    }
    if (!res.ok) {
      const t = await res.text();
      const err = new Error(
        `GitHub ${method} ${apiPath} failed (${res.status}): ${t.slice(0, 240)}`,
      );
      err.status = res.status;
      throw err;
    }
    if (res.status === 204) return null;
    return res.json();
  }

  /**
   * Single commit for multiple file creates/updates/deletes via Git Trees API.
   * changes: [{ path, content, encoding: 'utf-8'|'base64' }] or [{ path, delete: true }]
   */
  async function commitFilesAtomic(message, changes) {
    const maxAttempts = 5;
    let lastErr = null;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, 250 * attempt));
      }
      try {
        const ref = await ghApi("GET", `/git/ref/heads/${GH_BRANCH}`);
        const latestCommitSha = ref.object.sha;
        const latestCommit = await ghApi("GET", `/git/commits/${latestCommitSha}`);
        const baseTreeSha = latestCommit.tree.sha;

        const tree = [];
        for (const change of changes) {
          if (change.delete) {
            tree.push({
              path: change.path,
              mode: "100644",
              type: "blob",
              sha: null,
            });
            continue;
          }
          const encoding = change.encoding || "utf-8";
          const blob = await ghApi("POST", "/git/blobs", {
            content: change.content,
            encoding,
          });
          tree.push({
            path: change.path,
            mode: "100644",
            type: "blob",
            sha: blob.sha,
          });
        }

        const newTree = await ghApi("POST", "/git/trees", {
          base_tree: baseTreeSha,
          tree,
        });
        const newCommit = await ghApi("POST", "/git/commits", {
          message,
          tree: newTree.sha,
          parents: [latestCommitSha],
        });
        await ghApi("PATCH", `/git/refs/heads/${GH_BRANCH}`, {
          sha: newCommit.sha,
        });
        return newCommit;
      } catch (err) {
        lastErr = err;
        // Ref moved / conflict — retry from tip.
        if (err.status === 409 || err.status === 422 || /\(409\)|\(422\)/.test(String(err.message))) {
          continue;
        }
        throw err;
      }
    }
    throw lastErr || new Error("Atomic commit failed after retries");
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

  async function loadRemotePresetsJson() {
    const file = await ghGetContent("presets.json");
    if (!file) throw new Error("presets.json not found on GitHub");
    const text = await readGhFileText(file, "presets.json");
    try {
      return { file, json: JSON.parse(text) };
    } catch (err) {
      throw new Error(`presets.json is not valid JSON: ${err.message}`);
    }
  }

  async function putCatalogJson(mutator, message) {
    const maxAttempts = 5;
    let lastErr = null;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, 250 * attempt));
      }
      try {
        const { json } = await loadRemoteCatalogJson();
        const next = mutator(clonePlan(json));
        if (!next.baseUrl) {
          next.baseUrl = RAW_BASE;
        }
        next.version = Number(next.version || 0) + 1;
        next.updatedAtMs = Date.now();
        await commitFilesAtomic(message, [
          {
            path: "catalog.json",
            content: `${JSON.stringify(next, null, 2)}\n`,
            encoding: "utf-8",
          },
        ]);
        return next;
      } catch (err) {
        lastErr = err;
        if (err.status === 409 || err.status === 422 || /\(409\)|\(422\)/.test(String(err.message))) {
          continue;
        }
        throw err;
      }
    }
    throw lastErr || new Error("catalog.json update failed after retries");
  }

  async function loadRemoteWeeklyPlansJson() {
    const file = await ghGetContent("weekly_plans.json");
    if (!file) {
      return {
        file: null,
        json: {
          version: 0,
          updatedAtMs: 0,
          baseUrl: RAW_BASE,
          weeks: [],
        },
      };
    }
    const text = await readGhFileText(file, "weekly_plans.json");
    try {
      return { file, json: JSON.parse(text) };
    } catch (err) {
      throw new Error(`weekly_plans.json is not valid JSON: ${err.message}`);
    }
  }

  async function putWeeklyPlansJson(mutator, message) {
    const maxAttempts = 5;
    let lastErr = null;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, 250 * attempt));
      }
      try {
        const { json } = await loadRemoteWeeklyPlansJson();
        const next = mutator(clonePlan(json));
        if (!next.baseUrl) {
          next.baseUrl = RAW_BASE;
        }
        if (!Array.isArray(next.weeks)) {
          next.weeks = [];
        }
        next.version = Number(next.version || 0) + 1;
        next.updatedAtMs = Date.now();
        await commitFilesAtomic(message, [
          {
            path: "weekly_plans.json",
            content: `${JSON.stringify(next, null, 2)}\n`,
            encoding: "utf-8",
          },
        ]);
        return next;
      } catch (err) {
        lastErr = err;
        if (err.status === 409 || err.status === 422 || /\(409\)|\(422\)/.test(String(err.message))) {
          continue;
        }
        throw err;
      }
    }
    throw lastErr || new Error("weekly_plans.json update failed after retries");
  }

  function slugifyWeekName(name) {
    const base = String(name || "week")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 48);
    return `remote_week_${base || "plan"}`;
  }

  function uniqueWeekId(preferred) {
    const weeks = window.TabataDrillsWeekly?.getWeeklyPlans?.()?.weeks || [];
    const ids = new Set(weeks.map((w) => w.id));
    let id = preferred.startsWith("remote_week_") ? preferred : slugifyWeekName(preferred);
    if (!ids.has(id)) return id;
    let i = 2;
    while (ids.has(`${id}_${i}`)) i += 1;
    return `${id}_${i}`;
  }

  function weeklyDayKeys() {
    return window.TabataDrillsWeekly?.DAY_KEYS || ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  }

  function weeklyDayLabel(key) {
    const labels = window.TabataDrillsWeekly?.DAY_LABELS || {};
    return labels[key] || key;
  }

  function drillOptionsHtml(selectedId) {
    const drills = (site()?.getVisibleDrills?.() || [])
      .filter((d) => d && d.id)
      .slice()
      .sort((a, b) => String(a.name || a.id).localeCompare(String(b.name || b.id)));
    const sel = selectedId || "";
    let html = `<option value=""${sel ? "" : " selected"}>Rest</option>`;
    for (const d of drills) {
      const id = d.id;
      const label = d.preset ? `${d.name || id} (preset)` : d.name || id;
      html += `<option value="${site()?.escapeAttr?.(id) || id}"${
        id === sel ? " selected" : ""
      }>${site()?.escapeHtml?.(label) || label}</option>`;
    }
    return html;
  }

  function renderWeeklyDayRows(slots = {}) {
    if (!weeklyDayRows) return;
    weeklyDayRows.innerHTML = weeklyDayKeys()
      .map(
        (key) => `<div class="weekly-day-row">
          <label class="weekly-day-label" for="weekly-slot-${key}">${weeklyDayLabel(key)}</label>
          <select id="weekly-slot-${key}" class="weekly-day-select" data-day="${key}">
            ${drillOptionsHtml(slots[key] || null)}
          </select>
        </div>`,
      )
      .join("");
  }

  function setWeeklyEditorError(msg) {
    if (!weeklyEditorError) return;
    if (!msg) {
      weeklyEditorError.hidden = true;
      weeklyEditorError.textContent = "";
      return;
    }
    weeklyEditorError.hidden = false;
    weeklyEditorError.textContent = msg;
  }

  function readWeeklyForm() {
    const slots = {};
    for (const key of weeklyDayKeys()) {
      const el = document.getElementById(`weekly-slot-${key}`);
      const v = el?.value?.trim() || "";
      slots[key] = v || null;
    }
    return {
      id: editingWeeklyWeek?.id || uniqueWeekId(slugifyWeekName(weeklyEditName?.value)),
      name: weeklyEditName?.value?.trim() || "",
      description: weeklyEditDescription?.value?.trim() || "",
      updatedAtMs: Date.now(),
      slots,
    };
  }

  function validateWeeklyWeek(week) {
    if (!week.name) return "Name is required.";
    const drillIds = new Set((site()?.getVisibleDrills?.() || []).map((d) => d.id));
    for (const key of weeklyDayKeys()) {
      const id = week.slots?.[key];
      if (id && !drillIds.has(id)) {
        return `${weeklyDayLabel(key)}: plan "${id}" is not in the catalog.`;
      }
    }
    const hasWorkout = weeklyDayKeys().some((k) => week.slots?.[k]);
    if (!hasWorkout) return "Pick at least one workout day (or delete this weekly plan).";
    return null;
  }

  function openWeeklyEditor(week) {
    if (!isAuthed()) {
      showModal(loginDialog);
      return;
    }
    editingWeeklyWeek = week ? clonePlan(week) : null;
    setWeeklyEditorError("");
    if (weeklyEditorTitle) {
      weeklyEditorTitle.textContent = week ? "Edit weekly plan" : "New weekly plan";
    }
    if (weeklyEditName) weeklyEditName.value = week?.name || "";
    if (weeklyEditDescription) weeklyEditDescription.value = week?.description || "";
    renderWeeklyDayRows(week?.slots || {});
    showModal(weeklyEditorDialog);
  }

  function hideWeeklyEditor() {
    editingWeeklyWeek = null;
    setWeeklyEditorError("");
    hideModal(weeklyEditorDialog);
  }

  async function saveWeeklyEditor() {
    if (!isAuthed()) {
      showModal(loginDialog);
      return;
    }
    const week = readWeeklyForm();
    const err = validateWeeklyWeek(week);
    if (err) {
      setWeeklyEditorError(err);
      return;
    }
    setWeeklyEditorError("");
    showBusy("Saving weekly plan…");
    try {
      const isNew = !editingWeeklyWeek?.id;
      const weekId = editingWeeklyWeek?.id || week.id;
      const payload = { ...week, id: weekId };
      const next = await putWeeklyPlansJson((json) => {
        const weeks = json.weeks || [];
        const idx = weeks.findIndex((w) => w.id === weekId);
        if (idx >= 0) {
          weeks[idx] = payload;
        } else {
          weeks.push(payload);
        }
        json.weeks = weeks;
        return json;
      }, isNew ? `Weekly: add ${weekId}` : `Weekly: update ${weekId}`);
      window.TabataDrillsWeekly?.apply?.(next);
      window.dispatchEvent(
        new CustomEvent("tabata-weekly-changed", { detail: { weekly: next } }),
      );
      hideWeeklyEditor();
      toast(`Saved ${weekId}`);
    } catch (e) {
      setWeeklyEditorError(networkError(e, "Save").message || "Save failed");
    } finally {
      hideBusy();
    }
  }

  async function deleteWeeklyWeek(week) {
    if (!isAuthed() || !week?.id) return;
    const ok = window.confirm(`Delete weekly plan "${week.name || week.id}"?`);
    if (!ok) return;
    showBusy("Deleting weekly plan…");
    try {
      const next = await putWeeklyPlansJson((json) => {
        json.weeks = (json.weeks || []).filter((w) => w.id !== week.id);
        return json;
      }, `Weekly: delete ${week.id}`);
      window.TabataDrillsWeekly?.apply?.(next);
      window.dispatchEvent(
        new CustomEvent("tabata-weekly-changed", { detail: { weekly: next } }),
      );
      toast(`Deleted ${week.id}`);
    } catch (e) {
      toast(networkError(e, "Delete").message || "Delete failed");
    } finally {
      hideBusy();
    }
  }

  async function moveWeeklyWeek(index, direction) {
    if (!isAuthed()) return;
    const delta = direction === "up" ? -1 : direction === "down" ? 1 : 0;
    if (!delta) return;
    const current = window.TabataDrillsWeekly?.getWeeklyPlans?.();
    const weeks = current?.weeks || [];
    const j = index + delta;
    if (index < 0 || index >= weeks.length || j < 0 || j >= weeks.length) return;
    showBusy("Reordering…");
    try {
      const next = await putWeeklyPlansJson((json) => {
        const list = [...(json.weeks || [])];
        const a = list[index];
        list[index] = list[j];
        list[j] = a;
        json.weeks = list;
        return json;
      }, "Weekly: reorder");
      window.TabataDrillsWeekly?.apply?.(next);
      window.dispatchEvent(
        new CustomEvent("tabata-weekly-changed", { detail: { weekly: next } }),
      );
    } catch (e) {
      toast(networkError(e, "Reorder").message || "Reorder failed");
    } finally {
      hideBusy();
    }
  }

  window.TabataDrillsWeeklyAdmin = {
    openEditor: openWeeklyEditor,
    deleteWeek: deleteWeeklyWeek,
    moveWeek: moveWeeklyWeek,
  };

  function revokePendingCoverUrl() {
    if (pendingCoverUrl) {
      URL.revokeObjectURL(pendingCoverUrl);
      pendingCoverUrl = null;
    }
  }

  function setCoverPreview(src) {
    if (editCoverPreview && src) {
      // Drop prior src first so the browser does not keep a previous plan's bitmap.
      editCoverPreview.removeAttribute("src");
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
    if (!path) {
      setCoverPreview("");
      return;
    }
    const local = editingEntry?.id ? site()?.getLocalCover?.(editingEntry.id) : "";
    if (local) {
      setCoverPreview(local);
      return;
    }
    try {
      const url = new URL(String(path), RAW_BASE);
      url.searchParams.set(
        "v",
        String(editingEntry?.updatedAtMs || Date.now()),
      );
      setCoverPreview(url.toString());
    } catch (_) {
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

  function setCropDialogLabels() {
    if (cropMode === "exerciseGuide") {
      if (cropBrand) cropBrand.textContent = "Exercise guide";
      if (cropTitle) cropTitle.textContent = "Crop image (3:2)";
      if (cropHint) {
        cropHint.textContent =
          "Same frame as Tabata Core “How to”: 3:2 slot, 1536×1024 WebP export. Drag to reposition; pinch/scroll to zoom.";
      }
      return;
    }
    if (cropBrand) cropBrand.textContent = "Plan cover";
    if (cropTitle) cropTitle.textContent = "Crop image (8:5)";
    if (cropHint) {
      cropHint.textContent =
        "Same as the Android app when you pick a plan cover: 8:5, max 1200×750. Drag to reposition; pinch/scroll to zoom.";
    }
  }

  /**
   * @param {File} file
   * @param {'planCover' | 'exerciseGuide'} [mode]
   */
  function openCropDialog(file, mode) {
    if (!cropDialog || !cropImage || typeof Cropper === "undefined") {
      toast("Cropper failed to load — refresh the page");
      return;
    }
    cropMode = mode === "exerciseGuide" ? "exerciseGuide" : "planCover";
    setCropDialogLabels();
    destroyCropper();
    cropObjectUrl = URL.createObjectURL(file);
    cropImage.src = cropObjectUrl;
    showModal(cropDialog);
    const aspectRatio = cropMode === "exerciseGuide" ? 3 / 2 : 8 / 5;
    cropImage.onload = () => {
      cropper = new Cropper(cropImage, {
        aspectRatio,
        viewMode: 1,
        dragMode: "move",
        autoCropArea: 1,
        background: false,
        responsive: true,
        restore: false,
      });
    };
  }

  async function applyCrop() {
    if (!cropper) return;
    const isExercise = cropMode === "exerciseGuide";
    // Plan cover: matches Tabata Core Android [pickAndCropPlanCover] — 8:5, max 1200×750.
    // Exercise: 3:2 @ 1536×1024 — matches shipped guide art / ExerciseHowToDialog frame.
    const canvas = isExercise
      ? cropper.getCroppedCanvas({
          width: 1536,
          height: 1024,
          fillColor: "#EDEEF0",
          imageSmoothingEnabled: true,
          imageSmoothingQuality: "high",
        })
      : cropper.getCroppedCanvas({
          width: 1200,
          height: 750,
          fillColor: "#111418",
          imageSmoothingEnabled: true,
          imageSmoothingQuality: "high",
        });
    if (!canvas) {
      toast("Could not crop image");
      return;
    }
    let webpBytes;
    try {
      webpBytes = await canvasToWebpBytes(canvas, 0.88);
    } catch (e) {
      const msg = e && e.message ? String(e.message) : String(e);
      toast(
        isExercise
          ? `Could not encode exercise image — ${msg}`
          : `Could not encode cover image — ${msg}`,
      );
      return;
    }
    const blob = new Blob([webpBytes], { type: "image/webp" });
    destroyCropper();
    hideModal(cropDialog);
    if (isExercise) {
      if (exerciseImagesPendingPreviewUrl) {
        try {
          URL.revokeObjectURL(exerciseImagesPendingPreviewUrl);
        } catch (_) {
          /* ignore */
        }
        exerciseImagesPendingPreviewUrl = null;
      }
      exerciseImagesPendingBlob = blob;
      exerciseImagesPendingPreviewUrl = URL.createObjectURL(blob);
      if (exerciseImagesNewPreview) {
        exerciseImagesNewPreview.onload = () => {
          if (typeof window.attachExerciseImageZoomPan === "function" && exerciseImagesNewZoom) {
            if (detachNewZoom) detachNewZoom();
            detachNewZoom = window.attachExerciseImageZoomPan(exerciseImagesNewZoom);
          }
          refreshExerciseSaveButton();
        };
        exerciseImagesNewPreview.src = exerciseImagesPendingPreviewUrl;
        exerciseImagesNewPreview.hidden = false;
        if (exerciseImagesNewPreview.complete) {
          refreshExerciseSaveButton();
        }
      }
      if (exerciseImagesNewZoomStack) exerciseImagesNewZoomStack.hidden = false;
      if (exerciseImagesNewPlaceholder) exerciseImagesNewPlaceholder.hidden = true;
      refreshExerciseSaveButton();
      return;
    }
    clearPendingCover();
    pendingCoverBlob = blob;
    pendingCoverUrl = URL.createObjectURL(blob);
    if (editCover) editCover.value = "";
    setCoverPreview(pendingCoverUrl);
  }

  async function deleteCoverPathBestEffort(path) {
    const coverPath = String(path || "");
    if (!coverPath.startsWith("plan_covers/")) return;
    try {
      await commitFilesAtomic(`Delete old cover ${coverPath}`, [
        { path: coverPath, delete: true },
      ]);
    } catch (_) {
      /* best-effort */
    }
  }

  async function saveDrill() {
    setEditorError("");
    if (!editName?.value.trim()) {
      setEditorError("Name is required");
      return;
    }
    editorSave.disabled = true;
    if (editorCancel) editorCancel.disabled = true;
    showBusy(editingEntry ? "Saving plan…" : "Publishing plan…");
    try {
      const id = editingEntry?.id || uniqueId(slugify(editName.value));
      const previousCoverPath = (
        editCover?.value ||
        editingEntry?.coverImage ||
        ""
      ).trim();
      let coverBlobForLocal = null;
      let newCoverPath = null;
      let newCoverBase64 = null;

      const savingPreset = Boolean(
        editingEntry?.preset || editingEntry?.shipsWithApp,
      );
      const defaultId =
        editingEntry?.defaultId ||
        (id.startsWith("remote_")
          ? `default_${id.slice("remote_".length)}`
          : null);

      if (pendingCoverBlob) {
        coverBlobForLocal = pendingCoverBlob;
        // Presets keep a stable default_* cover path so the Android seed
        // does not need a path change on every cover refresh.
        newCoverPath =
          savingPreset && defaultId
            ? `plan_covers/${defaultId}.webp`
            : `plan_covers/${id}_${Date.now()}.webp`;
        newCoverBase64 = await encodeBlob(pendingCoverBlob);
        if (editCover) editCover.value = newCoverPath;
        clearPendingCover();
      }

      const { template, catalogEntry } = buildTemplateFromForm(id);

      // Preserve createdAtMs when editing — read via Contents API (no CDN).
      if (editingEntry) {
        try {
          const existingFile = await ghGetContent(`drills/${id}.json`);
          if (existingFile) {
            const text = await readGhFileText(existingFile, `drills/${id}.json`);
            const existing = JSON.parse(text);
            if (existing?.createdAtMs) template.createdAtMs = existing.createdAtMs;
          }
        } catch (_) {
          template.createdAtMs = Date.now();
        }
      } else {
        template.createdAtMs = Date.now();
      }

      const drillPath = `drills/${id}.json`;
      // Presets stay out of public catalog.json (app download list).
      const catalogEntryToSave = savingPreset
        ? {
            ...catalogEntry,
            preset: true,
            shipsWithApp: true,
            defaultId: defaultId || undefined,
            description:
              catalogEntry.description || "Shipped Android preset",
          }
        : catalogEntry;
      const maxAttempts = 5;
      let nextCatalog = null;
      let nextPresets = null;
      let lastErr = null;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        if (attempt > 0) {
          await new Promise((r) => setTimeout(r, 250 * attempt));
        }
        try {
          const changes = [
            {
              path: drillPath,
              content: `${JSON.stringify(template, null, 2)}\n`,
              encoding: "utf-8",
            },
          ];

          if (savingPreset) {
            const { json } = await loadRemotePresetsJson();
            nextPresets = clonePlan(json);
            if (!nextPresets.baseUrl) nextPresets.baseUrl = RAW_BASE;
            const drills = Array.isArray(nextPresets.drills)
              ? [...nextPresets.drills]
              : [];
            const idx = drills.findIndex((d) => d.id === id);
            if (idx >= 0) drills[idx] = catalogEntryToSave;
            else drills.push(catalogEntryToSave);
            drills.sort((a, b) => String(a.name).localeCompare(String(b.name)));
            nextPresets.drills = drills;
            nextPresets.version = Number(nextPresets.version || 0) + 1;
            nextPresets.updatedAtMs = Date.now();
            changes.push({
              path: "presets.json",
              content: `${JSON.stringify(nextPresets, null, 2)}\n`,
              encoding: "utf-8",
            });
          } else {
            const { json } = await loadRemoteCatalogJson();
            nextCatalog = clonePlan(json);
            if (!nextCatalog.baseUrl) nextCatalog.baseUrl = RAW_BASE;
            const drills = Array.isArray(nextCatalog.drills)
              ? [...nextCatalog.drills]
              : [];
            const idx = drills.findIndex((d) => d.id === id);
            if (idx >= 0) drills[idx] = catalogEntryToSave;
            else drills.push(catalogEntryToSave);
            drills.sort((a, b) => String(a.name).localeCompare(String(b.name)));
            nextCatalog.drills = drills;
            nextCatalog.version = Number(nextCatalog.version || 0) + 1;
            nextCatalog.updatedAtMs = Date.now();
            changes.push({
              path: "catalog.json",
              content: `${JSON.stringify(nextCatalog, null, 2)}\n`,
              encoding: "utf-8",
            });
          }

          if (newCoverPath && newCoverBase64) {
            changes.unshift({
              path: newCoverPath,
              content: newCoverBase64,
              encoding: "base64",
            });
            if (
              previousCoverPath.startsWith("plan_covers/") &&
              previousCoverPath !== newCoverPath
            ) {
              changes.push({ path: previousCoverPath, delete: true });
            }
          }

          await commitFilesAtomic(
            editingEntry
              ? savingPreset
                ? `Update preset ${id}`
                : `Update plan ${id}`
              : `Add plan ${id}`,
            changes,
          );
          lastErr = null;
          break;
        } catch (err) {
          lastErr = err;
          if (
            err.status === 409 ||
            err.status === 422 ||
            /\(409\)|\(422\)/.test(String(err.message))
          ) {
            continue;
          }
          throw err;
        }
      }
      if (lastErr) throw lastErr;
      if (savingPreset) {
        if (!nextPresets) throw new Error("Save produced no presets catalog");
      } else if (!nextCatalog) {
        throw new Error("Save produced no catalog");
      }

      if (coverBlobForLocal && newCoverPath) {
        const localUrl = URL.createObjectURL(coverBlobForLocal);
        site()?.setLocalCover?.(id, localUrl);
        setCoverPreview(localUrl);
      } else if (!(editCover?.value || "").trim().startsWith("plan_covers/")) {
        site()?.clearLocalCover?.(id);
      }

      hideModal(editorDialog);
      toast(
        savingPreset
          ? `Saved preset ${id} — sync into TabataCore for the next Android release`
          : `Saved ${id} — live on site via GitHub raw`,
      );
      try {
        site()?.cacheTemplate?.(id, template);
        if (savingPreset) {
          site()?.applyPresets?.(nextPresets);
        } else {
          site()?.applyCatalog?.(nextCatalog);
        }
        const savedEntry =
          (
            (savingPreset ? nextPresets?.drills : nextCatalog?.drills) || []
          ).find((d) => d.id === id) || catalogEntryToSave;
        site()?.openPreview?.(savedEntry);
      } catch (refreshErr) {
        toast(`Saved ${id}, but refresh failed: ${refreshErr.message || refreshErr}`);
      }
    } catch (err) {
      setEditorError(networkError(err, "Save").message || "Save failed");
    } finally {
      hideBusy();
      editorSave.disabled = false;
      if (editorCancel) editorCancel.disabled = false;
    }
  }

  let deleteInFlight = false;

  async function deleteDrill(entry) {
    if (!isAuthed()) {
      showModal(loginDialog);
      return;
    }
    if (!entry?.id || deleteInFlight) return;
    if (entry.preset || entry.shipsWithApp) {
      toast(
        "Presets can’t be deleted here — Edit to change them, then sync into TabataCore for the next release.",
      );
      return;
    }
    // Close modal preview first — confirm() while a <dialog> is open often fails.
    site()?.closePreview?.();
    if (!window.confirm(`Delete ${entry.name || entry.id}? This commits to GitHub.`)) {
      return;
    }
    deleteInFlight = true;
    showBusy(`Deleting ${entry.name || entry.id}…`);
    toast(`Deleting ${entry.id}…`);
    try {
      const drillPath = entry.file || `drills/${entry.id}.json`;
      const coverPath = String(entry.coverImage || "");
      const maxAttempts = 5;
      let nextCatalog = null;
      let lastErr = null;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        if (attempt > 0) {
          await new Promise((r) => setTimeout(r, 250 * attempt));
        }
        try {
          const { json } = await loadRemoteCatalogJson();
          nextCatalog = clonePlan(json);
          if (!nextCatalog.baseUrl) nextCatalog.baseUrl = RAW_BASE;
          nextCatalog.drills = (nextCatalog.drills || []).filter(
            (d) => d.id !== entry.id,
          );
          nextCatalog.version = Number(nextCatalog.version || 0) + 1;
          nextCatalog.updatedAtMs = Date.now();

          const changes = [
            {
              path: "catalog.json",
              content: `${JSON.stringify(nextCatalog, null, 2)}\n`,
              encoding: "utf-8",
            },
            { path: drillPath, delete: true },
          ];
          if (coverPath.startsWith("plan_covers/")) {
            changes.push({ path: coverPath, delete: true });
          }

          await commitFilesAtomic(`Delete plan ${entry.id}`, changes);
          lastErr = null;
          break;
        } catch (err) {
          lastErr = err;
          // Deleting a missing blob can 422 — retry without deletes that already gone.
          if (
            err.status === 409 ||
            err.status === 422 ||
            /\(409\)|\(422\)/.test(String(err.message))
          ) {
            continue;
          }
          throw err;
        }
      }
      if (lastErr) {
        // Fallback: catalog-first then best-effort file deletes (legacy path).
        nextCatalog = await putCatalogJson((catalogJson) => {
          catalogJson.drills = (catalogJson.drills || []).filter(
            (d) => d.id !== entry.id,
          );
          return catalogJson;
        }, `Catalog: remove ${entry.id}`);
        try {
          const existing = await ghGetContent(drillPath);
          if (existing?.sha) {
            await ghDeleteContent(drillPath, existing.sha, `Delete drill ${entry.id}`);
          }
        } catch (_) {
          /* ignore */
        }
        if (coverPath.startsWith("plan_covers/")) {
          await deleteCoverPathBestEffort(coverPath);
        }
      }

      site()?.invalidateTemplate?.(entry.id);
      site()?.clearLocalCover?.(entry.id);
      site()?.applyCatalog?.(nextCatalog);

      toast(`Deleted ${entry.id}`);
    } catch (err) {
      toast(networkError(err, "Delete").message || "Delete failed");
      try {
        await site()?.reloadCatalog?.({ fromRemote: true });
      } catch (_) {
        /* ignore */
      }
    } finally {
      hideBusy();
      deleteInFlight = false;
    }
  }

  async function editDrill(entry) {
    if (!isAuthed()) {
      showModal(loginDialog);
      return;
    }
    try {
      site()?.invalidateTemplate?.(entry.id);
      const drillPath = entry.file || `drills/${entry.id}.json`;
      let template = null;
      try {
        const file = await ghGetContent(drillPath);
        if (file) {
          const text = await readGhFileText(file, drillPath);
          template = JSON.parse(text);
          site()?.cacheTemplate?.(entry.id, template);
        }
      } catch (_) {
        /* fall through to raw fetch */
      }
      if (!template) {
        template = await site().fetchTemplate(entry, { bypassCache: true });
      }
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
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const pat = document.getElementById("login-pat")?.value.trim();
      if (loginError) {
        loginError.hidden = true;
        loginError.textContent = "";
      }
      if (!pat) {
        if (loginError) {
          loginError.hidden = false;
          loginError.textContent = "GitHub PAT is required";
        }
        return;
      }
      const submitBtn = document.getElementById("login-submit");
      if (submitBtn) submitBtn.disabled = true;
      try {
        // Validate PAT can read this repo before storing session.
        const headers = {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${pat}`,
          "X-GitHub-Api-Version": "2022-11-28",
        };
        const res = await fetch(
          `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}`,
          { headers, cache: "no-store" },
        );
        if (!res.ok) {
          throw new Error(
            res.status === 401 || res.status === 403
              ? "PAT rejected — check token and Contents access for this repo"
              : `GitHub check failed (${res.status})`,
          );
        }
        saveSession({ ok: true, pat, at: Date.now() });
        updateAuthUi();
        hideModal(loginDialog);
        toast("Admin signed in");
      } catch (err) {
        if (loginError) {
          loginError.hidden = false;
          loginError.textContent =
            err.message || "Could not validate GitHub PAT";
        }
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  if (newDrillBtn) {
    newDrillBtn.addEventListener("click", () => openEditor({ entry: null, template: null }));
  }
  if (newWeeklyBtn) {
    newWeeklyBtn.addEventListener("click", () => openWeeklyEditor(null));
  }
  if (weeklyEditorClose) weeklyEditorClose.addEventListener("click", hideWeeklyEditor);
  if (weeklyEditorCancel) weeklyEditorCancel.addEventListener("click", hideWeeklyEditor);
  if (weeklyEditorSave) {
    weeklyEditorSave.addEventListener("click", () => {
      saveWeeklyEditor();
    });
  }
  if (weeklyEditorDialog) {
    weeklyEditorDialog.addEventListener("click", (e) => {
      if (e.target === weeklyEditorDialog) hideWeeklyEditor();
    });
    weeklyEditorDialog.addEventListener("cancel", (e) => {
      e.preventDefault();
      hideWeeklyEditor();
    });
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
      openCropDialog(file, "planCover");
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
        if (!appendClonedLastSet(sets)) return;
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
  if (activityPickerClose) {
    activityPickerClose.addEventListener("click", closeActivityPicker);
  }
  if (activityPickerChips) {
    activityPickerChips.addEventListener("click", (e) => {
      const chip = e.target.closest("button[data-group]");
      if (!chip || !activityPickerChips.contains(chip)) return;
      const group = chip.getAttribute("data-group") || "";
      activityGroupFilter = group || null;
      renderActivityChips();
      renderActivityList();
    });
  }
  if (activityPickerList) {
    activityPickerList.addEventListener("click", (e) => {
      const option = e.target.closest("button[data-activity]");
      if (!option || !activityPickerList.contains(option)) return;
      chooseActivity(option.getAttribute("data-activity") || null);
    });
  }
  if (activityPickerDialog) {
    activityPickerDialog.addEventListener("click", (e) => {
      if (e.target === activityPickerDialog) closeActivityPicker();
    });
    activityPickerDialog.addEventListener("cancel", (e) => {
      e.preventDefault();
      closeActivityPicker();
    });
  }
  if (planEditor) {
    planEditor.addEventListener("click", onPlanClick);
    planEditor.addEventListener("dragstart", onPlanDragStart);
    planEditor.addEventListener("dragover", onPlanDragOver);
    planEditor.addEventListener("drop", onPlanDrop);
    planEditor.addEventListener("dragend", onPlanDragEnd);
  }

  window.addEventListener("tabata-admin-edit", (e) => editDrill(e.detail?.entry));
  window.addEventListener("tabata-admin-delete", (e) => deleteDrill(e.detail?.entry));

  if (adminTabPlans) {
    adminTabPlans.addEventListener("click", () => {
      saveAdminPanel("plans");
      applyAdminPanelVisibility();
    });
  }
  if (adminTabExerciseImages) {
    adminTabExerciseImages.addEventListener("click", () => {
      saveAdminPanel("exercise-images");
      applyAdminPanelVisibility();
    });
  }
  if (exerciseImagesSearch) {
    exerciseImagesSearch.addEventListener("input", () => {
      renderExerciseImagesGrid();
    });
  }
  window.addEventListener("tabata-activity-catalog-ready", () => {
    if (isAuthed() && adminPanelFromStorage() === "exercise-images") {
      renderExerciseImagesBrowser();
    }
  });
  window.addEventListener("tabata-admin-auth", () => {
    if (isAuthed() && adminPanelFromStorage() === "exercise-images") {
      renderExerciseImagesBrowser();
    }
  });
  if (exerciseImagesPick && exerciseImagesFile) {
    exerciseImagesPick.addEventListener("click", () => exerciseImagesFile.click());
    exerciseImagesFile.addEventListener("change", () => {
      const file = exerciseImagesFile.files?.[0];
      onExerciseImageFile(file || null);
    });
  }
  if (exerciseImagesClear) {
    exerciseImagesClear.addEventListener("click", () => {
      if (exerciseImagesFile) exerciseImagesFile.value = "";
      onExerciseImageFile(null);
    });
  }
  if (exerciseImagesSave) {
    exerciseImagesSave.addEventListener("click", () => {
      saveExerciseImageToGithub();
    });
  }

  updateAuthUi();
})();
