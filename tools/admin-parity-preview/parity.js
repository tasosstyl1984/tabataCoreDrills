/**
 * Exercise / Cover image lab — slider + wheel zoom, drag pan, live App preview.
 */
(function () {
  "use strict";

  const EX = { w: 1536, h: 1024, fill: "#EDEEF0", name: "exercise-parity.webp" };
  const COV = { w: 1200, h: 750, fill: "#111418", name: "plan-cover-parity.webp" };
  const WHEEL_ZOOM_SENS = 0.001;
  const PREVIEW_DEBOUNCE_MS = 80;

  let ghOwner = "tasosstyl1984";
  let ghRepo = "tabataCoreDrills";
  let ghBranch = "main";

  function parseRepoQuery() {
    try {
      const q = new URLSearchParams(window.location.search);
      const o = q.get("owner");
      const r = q.get("repo");
      const b = q.get("branch");
      if (o && o.trim()) ghOwner = o.trim();
      if (r && r.trim()) ghRepo = r.trim();
      if (b && b.trim()) ghBranch = b.trim();
    } catch (_) {
      /* ignore */
    }
  }

  function rawUrlForRepoPath(relPath) {
    const trimmed = String(relPath || "")
      .trim()
      .replace(/^\/+/, "");
    if (!trimmed) throw new Error("Path is empty");
    const segs = trimmed.split("/").filter(Boolean).map(encodeURIComponent);
    return `https://raw.githubusercontent.com/${encodeURIComponent(ghOwner)}/${encodeURIComponent(ghRepo)}/${encodeURIComponent(ghBranch)}/${segs.join("/")}`;
  }

  function sanitizeExerciseId(id) {
    return String(id || "")
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, "");
  }

  function clamp(n, a, b) {
    return Math.min(b, Math.max(a, n));
  }

  function initTheme() {
    let t = "light";
    try {
      t = localStorage.getItem("parity-theme") || "light";
    } catch (_) {
      /* ignore */
    }
    document.documentElement.setAttribute("data-theme", t === "dark" ? "dark" : "light");
  }

  function toggleTheme() {
    const cur = document.documentElement.getAttribute("data-theme") || "light";
    const next = cur === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("parity-theme", next);
    } catch (_) {
      /* ignore */
    }
  }

  function uint8FromDataUrl(dataUrl) {
    const i = dataUrl.indexOf(",");
    if (i < 0) throw new Error("Invalid data URL");
    const bin = atob(dataUrl.slice(i + 1));
    const out = new Uint8Array(bin.length);
    for (let n = 0; n < bin.length; n += 1) out[n] = bin.charCodeAt(n);
    return out;
  }

  async function canvasToWebpBlob(canvas, quality) {
    const blob = await new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/webp", quality);
    });
    if (blob) return blob;
    let dataUrl = "";
    try {
      dataUrl = canvas.toDataURL("image/webp", quality);
    } catch (e) {
      throw new Error(e && e.message ? String(e.message) : String(e));
    }
    if (dataUrl && dataUrl.startsWith("data:image/webp")) {
      return new Blob([uint8FromDataUrl(dataUrl)], { type: "image/webp" });
    }
    throw new Error("This browser cannot encode WebP. Use Chrome or Edge.");
  }

  /**
   * Fixed-aspect viewport: slider + wheel zoom, drag pan.
   * @param {HTMLElement} viewport
   * @param {HTMLInputElement|null} slider
   * @param {HTMLElement|null} pctEl
   * @param {{ onChange?: () => void }} [opts]
   */
  function createZoomPan(viewport, slider, pctEl, opts) {
    const onChange = opts && typeof opts.onChange === "function" ? opts.onChange : null;
    const inner = viewport.querySelector(".viewport-inner");
    const img = viewport.querySelector(".viewport-img");
    if (!inner || !img) {
      return {
        destroy() {},
        reset() {},
        setImage() {},
        clearImage() {},
        hasImage() {
          return false;
        },
        exportToWebp() {
          return Promise.reject(new Error("No viewport"));
        },
      };
    }

    let scale = 1;
    let tx = 0;
    let ty = 0;
    let dragging = false;
    let sx = 0;
    let sy = 0;
    let stx = 0;
    let sty = 0;
    let objectUrl = null;
    const ac = new AbortController();
    const opt = { signal: ac.signal };

    function notify() {
      if (onChange) onChange();
    }

    function baseSize() {
      const vr = viewport.getBoundingClientRect();
      const vw = vr.width;
      const vh = vr.height;
      const nw = img.naturalWidth;
      const nh = img.naturalHeight;
      if (!nw || !nh || !vw || !vh) return { vw, vh, cw: vw, ch: vh };
      const k = Math.min(vw / nw, vh / nh);
      return { vw, vh, cw: nw * k, ch: nh * k };
    }

    function clampPan() {
      const { vw, vh, cw, ch } = baseSize();
      const maxX = Math.max(0, (cw * scale - vw) / 2);
      const maxY = Math.max(0, (ch * scale - vh) / 2);
      tx = clamp(tx, -maxX, maxX);
      ty = clamp(ty, -maxY, maxY);
    }

    function apply(silent) {
      inner.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
      if (slider) slider.value = String(Math.round(scale * 100));
      if (pctEl) pctEl.textContent = `${Math.round(scale * 100)}%`;
      if (!silent) notify();
    }

    function reset() {
      scale = 1;
      tx = 0;
      ty = 0;
      apply();
    }

    function setScalePct(pct, silent) {
      scale = clamp(pct / 100, 1, 5);
      clampPan();
      apply(silent);
    }

    viewport.addEventListener(
      "pointerdown",
      (e) => {
        if (e.button !== 0) return;
        dragging = true;
        sx = e.clientX;
        sy = e.clientY;
        stx = tx;
        sty = ty;
        try {
          viewport.setPointerCapture(e.pointerId);
        } catch (_) {
          /* ignore */
        }
      },
      opt,
    );
    viewport.addEventListener(
      "pointermove",
      (e) => {
        if (!dragging) return;
        tx = stx + (e.clientX - sx);
        ty = sty + (e.clientY - sy);
        clampPan();
        apply();
      },
      opt,
    );
    const up = (e) => {
      if (dragging) {
        dragging = false;
        notify();
      }
      try {
        viewport.releasePointerCapture(e.pointerId);
      } catch (_) {
        /* ignore */
      }
    };
    viewport.addEventListener("pointerup", up, opt);
    viewport.addEventListener("pointercancel", up, opt);

    viewport.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        if (!img.naturalWidth) return;
        const factor = Math.exp(-e.deltaY * WHEEL_ZOOM_SENS);
        scale = clamp(scale * factor, 1, 5);
        clampPan();
        apply();
      },
      { passive: false, signal: ac.signal },
    );

    if (slider) {
      slider.addEventListener(
        "input",
        () => {
          setScalePct(Number(slider.value) || 100);
        },
        opt,
      );
    }

    img.addEventListener(
      "load",
      () => {
        reset();
      },
      opt,
    );

    return {
      reset,
      setImage(fileOrBlob, label) {
        if (objectUrl) {
          try {
            URL.revokeObjectURL(objectUrl);
          } catch (_) {
            /* ignore */
          }
        }
        objectUrl = URL.createObjectURL(fileOrBlob);
        img.alt = label || "";
        img.src = objectUrl;
        if (img.complete && img.naturalWidth) reset();
        return objectUrl;
      },
      clearImage() {
        if (objectUrl) {
          try {
            URL.revokeObjectURL(objectUrl);
          } catch (_) {
            /* ignore */
          }
          objectUrl = null;
        }
        img.removeAttribute("src");
        scale = 1;
        tx = 0;
        ty = 0;
        apply(true);
      },
      hasImage() {
        return Boolean(img.getAttribute("src") && img.naturalWidth);
      },
      async exportToWebp(outW, outH, fill) {
        if (!img.naturalWidth) throw new Error("No image loaded");
        const vr = viewport.getBoundingClientRect();
        const ir = img.getBoundingClientRect();
        const nw = img.naturalWidth;
        const nh = img.naturalHeight;
        if (!vr.width || !vr.height) throw new Error("Could not measure frame");

        const canvas = document.createElement("canvas");
        canvas.width = outW;
        canvas.height = outH;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas not supported");
        ctx.fillStyle = fill;
        ctx.fillRect(0, 0, outW, outH);
        ctx.setTransform(
          outW / vr.width,
          0,
          0,
          outH / vr.height,
          (-vr.left * outW) / vr.width,
          (-vr.top * outH) / vr.height,
        );
        ctx.drawImage(img, 0, 0, nw, nh, ir.left, ir.top, ir.width, ir.height);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        return canvasToWebpBlob(canvas, 0.88);
      },
      destroy() {
        ac.abort();
        if (objectUrl) {
          try {
            URL.revokeObjectURL(objectUrl);
          } catch (_) {
            /* ignore */
          }
          objectUrl = null;
        }
      },
    };
  }

  function downloadBlob(blob, filename) {
    const a = document.createElement("a");
    const u = URL.createObjectURL(blob);
    a.href = u;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(u), 2500);
  }

  function setTab(mode) {
    const isEx = mode === "exercise";
    const tabEx = document.getElementById("tab-exercise");
    const tabCov = document.getElementById("tab-cover");
    const panelEx = document.getElementById("panel-exercise");
    const panelCov = document.getElementById("panel-cover");

    tabEx.classList.toggle("is-active", isEx);
    tabCov.classList.toggle("is-active", !isEx);
    tabEx.setAttribute("aria-selected", isEx ? "true" : "false");
    tabCov.setAttribute("aria-selected", isEx ? "false" : "true");

    panelEx.hidden = !isEx;
    panelCov.hidden = isEx;
    panelEx.classList.toggle("is-active", isEx);
    panelCov.classList.toggle("is-active", !isEx);
  }

  function makeMode(cfg) {
    const {
      file,
      clear,
      drop,
      err,
      stage,
      empty,
      viewport,
      zoom,
      zoomPct,
      zoomReset,
      exportBtn,
      downloadBtn,
      status,
      previewIds,
      dims,
      urlInput,
      urlLoadBtn,
      repoPathInput,
      repoLoadBtn,
      /** e.g. (id) => `exercise_guides/${id}.webp` */
      repoPathFromId,
      extraClearFields,
    } = cfg;

    let outBlob = null;
    let outUrl = null;
    let previewUrl = null;
    let previewTimer = 0;
    let previewGen = 0;
    /** Basename hint for download filename */
    let lastSourceName = null;

    function webpDownloadName(last, fallback) {
      const s = String(last || "").trim();
      if (!s) return fallback;
      return s.replace(/\.(png|jpe?g|gif|webp|bmp|tif?f)$/i, "") + ".webp";
    }

    function showError(msg) {
      if (!err) return;
      if (msg) {
        err.hidden = false;
        err.textContent = msg;
      } else {
        err.hidden = true;
        err.textContent = "";
      }
    }

    function setStage(on) {
      if (stage) stage.hidden = !on;
      if (empty) empty.hidden = on;
      if (downloadBtn) downloadBtn.disabled = !outBlob;
    }

    function revokeOut() {
      if (outUrl) {
        try {
          URL.revokeObjectURL(outUrl);
        } catch (_) {
          /* ignore */
        }
      }
      outUrl = null;
      outBlob = null;
      if (downloadBtn) downloadBtn.disabled = true;
    }

    function revokePreview() {
      if (previewUrl) {
        try {
          URL.revokeObjectURL(previewUrl);
        } catch (_) {
          /* ignore */
        }
      }
      previewUrl = null;
    }

    function setPreviewImgs(url) {
      (previewIds || []).forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (url) el.src = url;
        else el.removeAttribute("src");
      });
      if (typeof cfg.onPreview === "function") cfg.onPreview(url);
    }

    async function refreshLivePreview() {
      if (!zp.hasImage()) {
        revokePreview();
        setPreviewImgs("");
        return;
      }
      const gen = ++previewGen;
      try {
        const blob = await zp.exportToWebp(dims.w, dims.h, dims.fill);
        if (gen !== previewGen) return;
        revokePreview();
        previewUrl = URL.createObjectURL(blob);
        setPreviewImgs(previewUrl);
        /* Keep downloadable blob in sync with what the preview shows */
        revokeOut();
        outBlob = blob;
        outUrl = previewUrl;
        previewUrl = null;
        if (downloadBtn) downloadBtn.disabled = false;
        if (status) {
          status.textContent = `Live preview · ${dims.w}×${dims.h} · ${(blob.size / 1024).toFixed(1)} KB — ready to download`;
        }
      } catch (_) {
        /* ignore transient measure errors while layout settles */
      }
    }

    function scheduleLivePreview() {
      if (previewTimer) clearTimeout(previewTimer);
      previewTimer = setTimeout(() => {
        previewTimer = 0;
        refreshLivePreview();
      }, PREVIEW_DEBOUNCE_MS);
    }

    const zp = createZoomPan(viewport, zoom, zoomPct, {
      onChange: scheduleLivePreview,
    });

    function loadBlob(blob, name) {
      lastSourceName = name || null;
      showError("");
      revokeOut();
      revokePreview();
      setPreviewImgs("");
      zp.setImage(blob, name || "image");
      setStage(true);
      if (status) status.textContent = "Zoom / pan — App preview updates automatically.";
      scheduleLivePreview();
    }

    async function loadFromUrl(href, label) {
      const url = String(href || "").trim();
      if (!url) {
        showError("Enter a URL.");
        return;
      }
      showError("");
      try {
        const res = await fetch(url, { mode: "cors" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        if (!blob.type.startsWith("image/")) {
          throw new Error("URL is not an image (check Content-Type).");
        }
        const nice = label || url.split("/").pop() || "remote.webp";
        lastSourceName = nice;
        loadBlob(blob, nice);
      } catch (e) {
        const msg = e && e.message ? String(e.message) : String(e);
        showError(
          msg.includes("Failed to fetch")
            ? "Could not fetch URL (CORS). Paste a raw.githubusercontent.com link or open from the same origin."
            : msg,
        );
      }
    }

    function clearAll() {
      lastSourceName = null;
      showError("");
      if (previewTimer) clearTimeout(previewTimer);
      previewTimer = 0;
      previewGen += 1;
      zp.clearImage();
      revokeOut();
      revokePreview();
      setStage(false);
      setPreviewImgs("");
      if (file) file.value = "";
      if (urlInput) urlInput.value = "";
      if (repoPathInput) repoPathInput.value = "";
      if (Array.isArray(extraClearFields)) {
        extraClearFields.forEach((el) => {
          if (el && "value" in el) el.value = "";
        });
      }
      if (status) status.textContent = "";
      if (zoom) zoom.value = "100";
      if (zoomPct) zoomPct.textContent = "100%";
    }

    if (file) {
      file.addEventListener("change", () => {
        const f = file.files && file.files[0];
        if (!f) return;
        if (!/^image\/(png|jpeg|webp)$/.test(f.type)) {
          showError("Use PNG, JPEG, or WebP.");
          return;
        }
        loadBlob(f, f.name);
      });
    }

    if (clear) clear.addEventListener("click", clearAll);

    if (drop) {
      ["dragenter", "dragover"].forEach((ev) => {
        drop.addEventListener(ev, (e) => {
          e.preventDefault();
          drop.classList.add("is-over");
        });
      });
      drop.addEventListener("dragleave", () => drop.classList.remove("is-over"));
      drop.addEventListener("drop", (e) => {
        e.preventDefault();
        drop.classList.remove("is-over");
        const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (!f || !f.type.startsWith("image/")) {
          showError("Drop a PNG, JPEG, or WebP.");
          return;
        }
        loadBlob(f, f.name);
      });
    }

    if (zoomReset) {
      zoomReset.addEventListener("click", () => {
        zp.reset();
      });
    }

    if (exportBtn) {
      exportBtn.addEventListener("click", async () => {
        showError("");
        if (!zp.hasImage()) {
          showError("Load an image first.");
          return;
        }
        exportBtn.disabled = true;
        try {
          await refreshLivePreview();
          if (status && outBlob) {
            status.textContent = `Exported ${dims.w}×${dims.h} WebP · ${(outBlob.size / 1024).toFixed(1)} KB`;
          }
        } catch (e) {
          showError(e && e.message ? String(e.message) : String(e));
        } finally {
          exportBtn.disabled = false;
        }
      });
    }

    if (downloadBtn) {
      downloadBtn.addEventListener("click", () => {
        if (outBlob) {
          downloadBlob(outBlob, webpDownloadName(lastSourceName, dims.name));
        }
      });
    }

    if (urlLoadBtn && urlInput) {
      urlLoadBtn.addEventListener("click", () => loadFromUrl(urlInput.value, urlInput.value.split("/").pop()));
    }

    if (repoLoadBtn) {
      repoLoadBtn.addEventListener("click", () => {
        let path = "";
        if (repoPathFromId && repoPathInput) {
          const id = sanitizeExerciseId(repoPathInput.value);
          if (!id) {
            showError("Enter an exercise id (e.g. burpees).");
            return;
          }
          path = repoPathFromId(id);
          if (urlInput) urlInput.value = rawUrlForRepoPath(path);
        } else if (repoPathInput) {
          path = repoPathInput.value.trim();
          if (!path) {
            showError("Enter a repo path (e.g. plan_covers/foo.webp).");
            return;
          }
          if (urlInput) urlInput.value = rawUrlForRepoPath(path);
        }
        loadFromUrl(rawUrlForRepoPath(path), path.split("/").pop());
      });
    }

    setStage(false);
    return { clearAll, zp, loadFromUrl };
  }

  function layoutCoverHero(preset) {
    const phone = document.getElementById("cov-phone");
    const slot = document.getElementById("cov-plan-slot");
    if (!phone || !slot) return;
    phone.setAttribute("data-frame", preset);
    if (preset === "portrait") {
      slot.style.width = "";
      slot.style.height = "";
      return;
    }
    const innerW = phone.clientWidth - 20;
    const vh = phone.clientHeight || 200;
    const cap = clamp(vh * 0.28, 120, 200);
    const naturalH = innerW / (8 / 5);
    const h = Math.min(naturalH, cap);
    slot.style.width = `${innerW}px`;
    slot.style.height = `${h}px`;
  }

  function bind() {
    parseRepoQuery();
    initTheme();
    document.getElementById("btn-theme").addEventListener("click", toggleTheme);

    document.getElementById("tab-exercise").addEventListener("click", () => setTab("exercise"));
    document.getElementById("tab-cover").addEventListener("click", () => setTab("cover"));

    const exerciseMode = makeMode({
      file: document.getElementById("ex-file"),
      clear: document.getElementById("ex-clear"),
      drop: document.getElementById("ex-drop"),
      err: document.getElementById("ex-err"),
      stage: document.getElementById("ex-stage"),
      empty: document.getElementById("ex-empty"),
      viewport: document.getElementById("ex-viewport"),
      zoom: document.getElementById("ex-zoom"),
      zoomPct: document.getElementById("ex-zoom-pct"),
      zoomReset: document.getElementById("ex-zoom-reset"),
      exportBtn: document.getElementById("ex-export"),
      downloadBtn: document.getElementById("ex-download"),
      urlInput: document.getElementById("ex-url"),
      urlLoadBtn: document.getElementById("ex-url-load"),
      repoPathInput: document.getElementById("ex-id"),
      repoLoadBtn: document.getElementById("ex-repo-load"),
      repoPathFromId: (id) => `exercise_guides/${id}.webp`,
      extraClearFields: [document.getElementById("ex-id")],
      status: document.getElementById("ex-status"),
      previewIds: ["ex-preview"],
      dims: EX,
      onPreview(url) {
        const insp = document.getElementById("ex-insp");
        if (!insp) return;
        insp.textContent = url
          ? `Live App preview (3∶2 contain)\nShip size: ${EX.w}×${EX.h} WebP\nRepo: ${ghOwner}/${ghRepo}@${ghBranch}`
          : "Load an image — preview updates as you edit.";
      },
    });

    const coverMode = makeMode({
      file: document.getElementById("cov-file"),
      clear: document.getElementById("cov-clear"),
      drop: document.getElementById("cov-drop"),
      err: document.getElementById("cov-err"),
      stage: document.getElementById("cov-stage"),
      empty: document.getElementById("cov-empty"),
      viewport: document.getElementById("cov-viewport"),
      zoom: document.getElementById("cov-zoom"),
      zoomPct: document.getElementById("cov-zoom-pct"),
      zoomReset: document.getElementById("cov-zoom-reset"),
      exportBtn: document.getElementById("cov-export"),
      downloadBtn: document.getElementById("cov-download"),
      urlInput: document.getElementById("cov-url"),
      urlLoadBtn: document.getElementById("cov-url-load"),
      repoPathInput: document.getElementById("cov-path"),
      repoLoadBtn: document.getElementById("cov-repo-load"),
      extraClearFields: [document.getElementById("cov-path")],
      status: document.getElementById("cov-status"),
      previewIds: ["cov-preview-plan", "cov-preview-ready"],
      dims: COV,
      onPreview(url) {
        const insp = document.getElementById("cov-insp");
        if (!insp) return;
        insp.textContent = url
          ? `Live: View plan contain · Ready cover\nShip size: ${COV.w}×${COV.h} WebP\nRepo: ${ghOwner}/${ghRepo}@${ghBranch}`
          : "Load an image — previews update as you edit.";
      },
    });

    let coverPreset = "portrait";
    const btnP = document.getElementById("cov-preset-portrait");
    const btnL = document.getElementById("cov-preset-landscape");
    btnP.addEventListener("click", () => {
      coverPreset = "portrait";
      btnP.classList.add("is-on");
      btnL.classList.remove("is-on");
      btnP.setAttribute("aria-pressed", "true");
      btnL.setAttribute("aria-pressed", "false");
      layoutCoverHero(coverPreset);
    });
    btnL.addEventListener("click", () => {
      coverPreset = "landscape";
      btnL.classList.add("is-on");
      btnP.classList.remove("is-on");
      btnL.setAttribute("aria-pressed", "true");
      btnP.setAttribute("aria-pressed", "false");
      layoutCoverHero(coverPreset);
    });
    layoutCoverHero("portrait");
    window.addEventListener("resize", () => layoutCoverHero(coverPreset));

    const scrimChk = document.getElementById("cov-scrim");
    const scrimEl = document.getElementById("cov-scrim-el");
    scrimChk.addEventListener("change", () => {
      scrimEl.classList.toggle("is-on", scrimChk.checked);
    });

    let tabFromQuery = "exercise";
    try {
      const q = new URLSearchParams(window.location.search);
      const exUrlQ = q.get("ex_url");
      const covUrlQ = q.get("cov_url");
      const exIdQ = q.get("exercise");
      const covPathQ = q.get("cover") || q.get("plan_cover");

      const loadEx =
        (exUrlQ && exUrlQ.trim()) || (exIdQ && sanitizeExerciseId(exIdQ));
      const loadCov =
        (covUrlQ && covUrlQ.trim()) || (covPathQ && covPathQ.trim());
      if (loadCov) tabFromQuery = "cover";
      else if (loadEx) tabFromQuery = "exercise";

      if (exUrlQ && exUrlQ.trim()) {
        const inp = document.getElementById("ex-url");
        if (inp) inp.value = exUrlQ.trim();
        exerciseMode.loadFromUrl(exUrlQ.trim(), exUrlQ.trim().split("/").pop());
      } else if (exIdQ && sanitizeExerciseId(exIdQ)) {
        const id = sanitizeExerciseId(exIdQ);
        const path = `exercise_guides/${id}.webp`;
        const exIdEl = document.getElementById("ex-id");
        const exUrlEl = document.getElementById("ex-url");
        if (exIdEl) exIdEl.value = id;
        if (exUrlEl) exUrlEl.value = rawUrlForRepoPath(path);
        exerciseMode.loadFromUrl(rawUrlForRepoPath(path), `${id}.webp`);
      }

      if (covUrlQ && covUrlQ.trim()) {
        const inp = document.getElementById("cov-url");
        if (inp) inp.value = covUrlQ.trim();
        coverMode.loadFromUrl(covUrlQ.trim(), covUrlQ.trim().split("/").pop());
      } else if (covPathQ && covPathQ.trim()) {
        const path = covPathQ.trim().replace(/^\/+/, "");
        const covUrlEl = document.getElementById("cov-url");
        const covPathEl = document.getElementById("cov-path");
        if (covPathEl) covPathEl.value = path;
        if (covUrlEl) covUrlEl.value = rawUrlForRepoPath(path);
        coverMode.loadFromUrl(rawUrlForRepoPath(path), path.split("/").pop());
      }
    } catch (_) {
      /* ignore bad query */
    }

    setTab(tabFromQuery);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }
})();
