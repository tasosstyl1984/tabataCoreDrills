(() => {
  const RAW_BASE =
    "https://raw.githubusercontent.com/tasosstyl1984/tabataCoreDrills/main/";
  const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const DAY_LABELS = {
    mon: "Mon",
    tue: "Tue",
    wed: "Wed",
    thu: "Thu",
    fri: "Fri",
    sat: "Sat",
    sun: "Sun",
  };

  const gridEl = document.getElementById("weekly-grid");
  const metaEl = document.getElementById("weekly-meta");
  const sectionEl = document.getElementById("weekly-section");

  let weeklyData = null;

  function site() {
    return window.TabataDrillsSite;
  }

  function escapeHtml(s) {
    return site()?.escapeHtml?.(s) ?? String(s ?? "");
  }

  function escapeAttr(s) {
    return site()?.escapeAttr?.(s) ?? String(s ?? "");
  }

  function isAdminAuthed() {
    return document.body.classList.contains("admin-authed");
  }

  function drillNameById(id) {
    if (!id) return "Rest";
    const drills = site()?.getVisibleDrills?.() || [];
    const hit = drills.find((d) => d.id === id);
    return hit?.name || id;
  }

  function weekSummary(week) {
    const slots = week?.slots || {};
    const parts = DAY_KEYS.map((k) => {
      const id = slots[k];
      if (!id) return null;
      return `${DAY_LABELS[k]} ${drillNameById(id)}`;
    }).filter(Boolean);
    if (!parts.length) return "All rest days — assign plans in Admin.";
    const line = parts.join(" · ");
    return line.length > 120 ? `${line.slice(0, 117)}…` : line;
  }

  function updateMeta() {
    if (!metaEl) return;
    if (!weeklyData) {
      metaEl.textContent = "";
      return;
    }
    const version = weeklyData.version != null ? String(weeklyData.version) : "—";
    const n = (weeklyData.weeks || []).length;
    metaEl.textContent = `${n} weekly plan${n === 1 ? "" : "s"} · catalog v${version}`;
  }

  function renderGrid() {
    if (!gridEl) return;
    const weeks = weeklyData?.weeks || [];
    if (!weeks.length) {
      gridEl.innerHTML =
        '<p class="muted weekly-empty">No weekly plans published yet. Admins can add one from the bar above.</p>';
      updateMeta();
      return;
    }

    gridEl.innerHTML = weeks
      .map((week, index) => {
        const admin = isAdminAuthed();
        const reorder =
          admin && weeks.length > 1
            ? `<div class="weekly-card-reorder">
            <button type="button" class="btn-ghost weekly-move" data-move="up" data-index="${index}" ${index === 0 ? "disabled" : ""} title="Move up">↑</button>
            <button type="button" class="btn-ghost weekly-move" data-move="down" data-index="${index}" ${index === weeks.length - 1 ? "disabled" : ""} title="Move down">↓</button>
          </div>`
            : "";
        const adminActions = admin
          ? `<div class="weekly-card-actions">
            <button type="button" class="btn-edit-admin weekly-edit" data-id="${escapeAttr(week.id)}">Edit</button>
            <button type="button" class="btn-delete-admin weekly-delete" data-id="${escapeAttr(week.id)}">Delete</button>
          </div>`
          : "";
        return `<article class="card weekly-card" data-week-id="${escapeAttr(week.id)}">
          ${reorder}
          <h3 class="weekly-card-title">${escapeHtml(week.name || week.id)}</h3>
          <p class="weekly-card-desc">${escapeHtml(week.description || "")}</p>
          <p class="weekly-card-summary">${escapeHtml(weekSummary(week))}</p>
          ${adminActions}
        </article>`;
      })
      .join("");

    updateMeta();
  }

  function bindGridEvents() {
    if (!gridEl) return;
    gridEl.addEventListener("click", (e) => {
      const editBtn = e.target.closest(".weekly-edit");
      if (editBtn) {
        const id = editBtn.getAttribute("data-id");
        const week = (weeklyData?.weeks || []).find((w) => w.id === id);
        window.TabataDrillsWeeklyAdmin?.openEditor?.(week || null);
        return;
      }
      const delBtn = e.target.closest(".weekly-delete");
      if (delBtn) {
        const id = delBtn.getAttribute("data-id");
        const week = (weeklyData?.weeks || []).find((w) => w.id === id);
        if (week) window.TabataDrillsWeeklyAdmin?.deleteWeek?.(week);
        return;
      }
      const moveBtn = e.target.closest(".weekly-move");
      if (moveBtn && !moveBtn.disabled) {
        const index = Number(moveBtn.getAttribute("data-index"));
        const dir = moveBtn.getAttribute("data-move");
        window.TabataDrillsWeeklyAdmin?.moveWeek?.(index, dir);
      }
    });
  }

  async function reload({ fromRemote = false } = {}) {
    const bust = `_=${Date.now()}`;
    const url = new URL(`weekly_plans.json?${bust}`, RAW_BASE).toString();
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        if (res.status === 404) {
          weeklyData = {
            version: 0,
            updatedAtMs: 0,
            baseUrl: RAW_BASE,
            weeks: [],
          };
          renderGrid();
          return weeklyData;
        }
        throw new Error(`weekly_plans.json failed (${res.status})`);
      }
      weeklyData = await res.json();
      renderGrid();
      return weeklyData;
    } catch (err) {
      if (sectionEl) {
        const status = document.getElementById("weekly-status");
        if (status) status.textContent = err.message || "Could not load weekly plans";
      }
      return null;
    }
  }

  function apply(next) {
    if (!next || typeof next !== "object") return;
    weeklyData = next;
    renderGrid();
    return weeklyData;
  }

  function getWeeklyPlans() {
    return weeklyData;
  }

  bindGridEvents();

  window.addEventListener("tabata-admin-auth", () => renderGrid());
  window.addEventListener("tabata-weekly-changed", (e) => {
    if (e.detail?.weekly) apply(e.detail.weekly);
  });

  window.TabataDrillsWeekly = {
    reload,
    apply,
    getWeeklyPlans,
    DAY_KEYS,
    DAY_LABELS,
  };

  reload().catch(() => {});
})();
