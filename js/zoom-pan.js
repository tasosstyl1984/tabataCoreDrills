/**
 * Fixed 3:2 viewport: wheel zoom, pointer drag pan (same interaction as review HTML).
 * Expects: .zoom-viewport > .zoom-viewport-inner > img.zoom-viewport-img
 */
(() => {
  /** Button +/− step (smaller = finer control). */
  const BUTTON_ZOOM_STEP = 1.08;
  /** Wheel sensitivity (lower = smaller steps per scroll notch). */
  const WHEEL_ZOOM_SENS = 0.001;

  function clamp(n, a, b) {
    return Math.min(b, Math.max(a, n));
  }

  /**
   * @param {HTMLElement|null} viewport
   * @returns {() => void} detach
   */
  function attachExerciseImageZoomPan(viewport) {
    if (!viewport) return () => {};
    const inner = viewport.querySelector(".zoom-viewport-inner");
    const img = viewport.querySelector(".zoom-viewport-img");
    if (!inner || !img) return () => {};

    let scale = 1;
    let tx = 0;
    let ty = 0;
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let startTx = 0;
    let startTy = 0;

    const ac = new AbortController();
    const opt = { signal: ac.signal };

    function baseContainedSize() {
      const vr = viewport.getBoundingClientRect();
      const vw = vr.width;
      const vh = vr.height;
      const nw = img.naturalWidth;
      const nh = img.naturalHeight;
      if (!nw || !nh || !vw || !vh) {
        return { vw, vh, cw: vw, ch: vh };
      }
      const k = Math.min(vw / nw, vh / nh);
      return { vw, vh, cw: nw * k, ch: nh * k };
    }

    function clampPan() {
      const { vw, vh, cw, ch } = baseContainedSize();
      const sw = cw * scale;
      const sh = ch * scale;
      const maxX = Math.max(0, (sw - vw) / 2);
      const maxY = Math.max(0, (sh - vh) / 2);
      tx = clamp(tx, -maxX, maxX);
      ty = clamp(ty, -maxY, maxY);
    }

    function apply() {
      inner.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    }

    function reset() {
      scale = 1;
      tx = 0;
      ty = 0;
      apply();
    }

    function onWheel(e) {
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * WHEEL_ZOOM_SENS);
      scale = clamp(scale * factor, 1, 5);
      clampPan();
      apply();
    }

    function onPointerDown(e) {
      if (e.button !== 0) return;
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      startTx = tx;
      startTy = ty;
      try {
        viewport.setPointerCapture(e.pointerId);
      } catch (_) {
        /* ignore */
      }
    }

    function onPointerMove(e) {
      if (!dragging) return;
      tx = startTx + (e.clientX - startX);
      ty = startTy + (e.clientY - startY);
      clampPan();
      apply();
    }

    function onPointerUp(e) {
      dragging = false;
      try {
        viewport.releasePointerCapture(e.pointerId);
      } catch (_) {
        /* ignore */
      }
    }

    viewport.addEventListener("wheel", onWheel, { passive: false, ...opt });
    viewport.addEventListener("pointerdown", onPointerDown, opt);
    viewport.addEventListener("pointermove", onPointerMove, opt);
    viewport.addEventListener("pointerup", onPointerUp, opt);
    viewport.addEventListener("pointercancel", onPointerUp, opt);

    const zoomIn = viewport.querySelector("[data-zoom-in]");
    const zoomOut = viewport.querySelector("[data-zoom-out]");
    const zoomReset = viewport.querySelector("[data-zoom-reset]");
    if (zoomIn) {
      zoomIn.addEventListener(
        "click",
        () => {
          scale = clamp(scale * BUTTON_ZOOM_STEP, 1, 5);
          clampPan();
          apply();
        },
        opt,
      );
    }
    if (zoomOut) {
      zoomOut.addEventListener(
        "click",
        () => {
          scale = clamp(scale / BUTTON_ZOOM_STEP, 1, 5);
          clampPan();
          apply();
        },
        opt,
      );
    }
    if (zoomReset) {
      zoomReset.addEventListener("click", reset, opt);
    }

    img.addEventListener(
      "load",
      () => {
        reset();
      },
      opt,
    );

    if (img.complete && img.naturalWidth) {
      reset();
    }

    return () => ac.abort();
  }

  window.attachExerciseImageZoomPan = attachExerciseImageZoomPan;
})();
