/**
 * SkillBridge Academic Matching Instrument Common Utilities
 * UI Round B Enhancements:
 * - Motion system tokens (--t-fast, --t-med, --t-slow, cubic-bezier)
 * - Motion On/Off toggle switch in rail with localStorage persistence
 * - Bespoke SVG mark: Five rising bars joined by an arch (bridge + gauge)
 * - Self-drawing animated SVG checkmarks for save feedback
 * - Gauge hover preview, click pop, and fill stagger
 * - Global Command Palette (activated by "/" or "Ctrl+K")
 * - FLIP animation helper for 60fps layout transitions
 * - Number count-up animator
 */

const API_BASE = "/api/v1";

const LEVEL_WORDS = {
  1: "Beginner",
  2: "Basic",
  3: "Intermediate",
  4: "Advanced",
  5: "Expert"
};

// Signature Logo SVG: Five rising bars under a connecting arch (bridge + gauge)
const BRAND_LOGO_SVG = `
<svg viewBox="0 0 32 32" fill="none" class="bridge-gauge-logo" aria-hidden="true">
  <rect x="4" y="20" width="3" height="6" rx="1" fill="currentColor" opacity="0.6"/>
  <rect x="9.5" y="16" width="3" height="10" rx="1" fill="currentColor" opacity="0.75"/>
  <rect x="15" y="12" width="3" height="14" rx="1" fill="currentColor" opacity="0.9"/>
  <rect x="20.5" y="8" width="3" height="18" rx="1" fill="currentColor"/>
  <rect x="26" y="4" width="3" height="22" rx="1" fill="currentColor"/>
  <path d="M 3 24 Q 16 2 29 24" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" fill="none"/>
</svg>
`;

// Signature Empty State Motif SVG
function renderEmptyStateSVG() {
  return `
  <svg viewBox="0 0 32 32" fill="none" class="empty-state-svg" aria-hidden="true">
    <rect x="6" y="20" width="2.5" height="6" rx="1" fill="currentColor" opacity="0.4"/>
    <rect x="10.5" y="16" width="2.5" height="10" rx="1" fill="currentColor" opacity="0.5"/>
    <rect x="15" y="12" width="2.5" height="14" rx="1" fill="currentColor" opacity="0.6"/>
    <rect x="19.5" y="8" width="2.5" height="18" rx="1" fill="currentColor" opacity="0.7"/>
    <rect x="24" y="4" width="2.5" height="22" rx="1" fill="currentColor" opacity="0.8"/>
    <path d="M 4 23 Q 16 4 28 23" stroke="currentColor" stroke-width="1.8" stroke-dasharray="2 2" stroke-linecap="round" fill="none"/>
  </svg>
  `;
}

// Self-Drawing Checkmark SVG
function getDrawCheckSVG() {
  return `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="draw-check-svg">
    <path d="M4 12l5 5L20 6"></path>
  </svg>
  `;
}

// Initialize Motion Setting on Load
(function initMotionPreference() {
  const saved = localStorage.getItem("skillbridge_motion");
  if (saved === "off") {
    document.documentElement.classList.add("motion-off");
  } else {
    document.documentElement.classList.remove("motion-off");
  }
})();

/**
 * Animated number count-up from 0 to target value
 */
function animateCountUp(elementOrId, targetVal, duration = 400) {
  const el = typeof elementOrId === "string" ? document.getElementById(elementOrId) : elementOrId;
  if (!el) return;

  const endVal = parseInt(targetVal) || 0;
  if (endVal === 0 || document.documentElement.classList.contains("motion-off")) {
    el.textContent = String(endVal);
    return;
  }

  const startVal = 0;
  const startTime = performance.now();

  function updateCount(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Standard ease-out curve
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(startVal + (endVal - startVal) * easeProgress);

    el.textContent = String(current);

    if (progress < 1) {
      requestAnimationFrame(updateCount);
    } else {
      el.textContent = String(endVal);
    }
  }

  requestAnimationFrame(updateCount);
}

/**
 * FLIP Animation Helper for smooth 60fps re-ordering
 */
function flipAnimate(container, itemSelector, domUpdateFn) {
  if (document.documentElement.classList.contains("motion-off")) {
    domUpdateFn();
    return;
  }

  const items = container.querySelectorAll(itemSelector);
  const firstPositions = new Map();

  items.forEach(el => {
    const key = el.getAttribute("data-flip-id") || el.textContent;
    firstPositions.set(key, el.getBoundingClientRect().top);
  });

  domUpdateFn();

  const newItems = container.querySelectorAll(itemSelector);
  newItems.forEach(el => {
    const key = el.getAttribute("data-flip-id") || el.textContent;
    if (firstPositions.has(key)) {
      const firstTop = firstPositions.get(key);
      const lastTop = el.getBoundingClientRect().top;
      const deltaY = firstTop - lastTop;

      if (deltaY !== 0) {
        el.style.transform = `translateY(${deltaY}px)`;
        el.style.transition = "none";

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            el.style.transition = "transform var(--t-med) var(--ease-standard)";
            el.style.transform = "translateY(0)";
          });
        });
      }
    }
  });
}

/**
 * Formats a YYYY-MM-DD date into "15 Dec 2026" with a relative status chip.
 */
function formatDateWithRelative(dateStr) {
  if (!dateStr) {
    return { formatted: "None", chipText: null, isUrgent: false, html: '<span style="color:var(--ink-muted);">None</span>' };
  }

  const parts = dateStr.split("-");
  if (parts.length !== 3) {
    return { formatted: dateStr, chipText: null, isUrgent: false, html: `<span>${dateStr}</span>` };
  }

  const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const formatted = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);

  const diffTime = d.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let chipText = "";
  let isUrgent = false;

  if (diffDays < 0) {
    chipText = "overdue";
    isUrgent = true;
  } else if (diffDays === 0) {
    chipText = "today";
    isUrgent = true;
  } else if (diffDays === 1) {
    chipText = "in 1 day";
    isUrgent = true;
  } else {
    chipText = `in ${diffDays} days`;
    if (diffDays <= 14) isUrgent = true;
  }

  const badgeClass = isUrgent ? "relative-badge-urgent" : "relative-badge-normal";
  const html = `
    <div class="date-chip">
      <span>${formatted}</span>
      <span class="relative-badge ${badgeClass}">${chipText}</span>
    </div>
  `;

  return { formatted, chipText, isUrgent, html };
}

/**
 * Produces skeleton placeholder rows for loading states with animated shimmer.
 */
function renderSkeletonRows(count = 3) {
  let html = "";
  for (let i = 0; i < count; i++) {
    html += `
      <div class="skeleton-row" aria-busy="true" aria-label="Loading content">
        <div class="skeleton-bar" style="width: 28%;"></div>
        <div class="skeleton-bar" style="width: 42%;"></div>
        <div class="skeleton-bar" style="width: 18%;"></div>
      </div>
    `;
  }
  return html;
}

/**
 * Replaces window.confirm() with an inline confirmation prompt.
 */
function showInlineConfirm(containerOrId, promptText, onConfirm, onKeep) {
  const container = typeof containerOrId === "string" ? document.getElementById(containerOrId) : containerOrId;
  if (!container) return;

  const existing = container.querySelector(".inline-confirm-box");
  if (existing) existing.remove();

  const box = document.createElement("div");
  box.className = "inline-confirm-box";

  const label = document.createElement("span");
  label.textContent = promptText;
  box.appendChild(label);

  const delBtn = document.createElement("button");
  delBtn.type = "button";
  delBtn.className = "inline-confirm-btn inline-confirm-del";
  delBtn.textContent = "Delete";
  delBtn.onclick = () => {
    box.remove();
    if (onConfirm) onConfirm();
  };
  box.appendChild(delBtn);

  const keepBtn = document.createElement("button");
  keepBtn.type = "button";
  keepBtn.className = "inline-confirm-btn inline-confirm-keep";
  keepBtn.textContent = "Keep";
  keepBtn.onclick = () => {
    box.remove();
    if (onKeep) onKeep();
  };
  box.appendChild(keepBtn);

  container.appendChild(box);
}

/**
 * Inline validation helpers replacing browser-native bubbles.
 */
function showFieldError(inputOrId, message) {
  const input = typeof inputOrId === "string" ? document.getElementById(inputOrId) : inputOrId;
  if (!input) return;

  input.classList.add("has-error");

  let errorEl = input.parentElement.querySelector(".field-error");
  if (!errorEl) {
    errorEl = document.createElement("div");
    errorEl.className = "field-error";
    input.parentElement.appendChild(errorEl);
  }
  errorEl.textContent = message;
}

function clearFieldError(inputOrId) {
  const input = typeof inputOrId === "string" ? document.getElementById(inputOrId) : inputOrId;
  if (!input) return;

  input.classList.remove("has-error");
  const errorEl = input.parentElement.querySelector(".field-error");
  if (errorEl) errorEl.remove();
}

/**
 * Inline feedback notice with self-drawing checkmark for saved status.
 */
function showInlineNotice(containerOrId, message, type = "info", undoAction = null) {
  const container = typeof containerOrId === "string" 
    ? document.getElementById(containerOrId) 
    : containerOrId;
  if (!container) return;

  const existing = container.querySelector(".inline-notice");
  if (existing) existing.remove();

  const notice = document.createElement("div");
  notice.className = `inline-notice inline-notice-${type}`;

  if (type === "success") {
    notice.innerHTML = getDrawCheckSVG();
  }

  const textSpan = document.createElement("span");
  textSpan.textContent = message;
  notice.appendChild(textSpan);

  if (undoAction && typeof undoAction === "function") {
    const undoBtn = document.createElement("button");
    undoBtn.type = "button";
    undoBtn.className = "inline-undo-btn";
    undoBtn.textContent = "Undo";
    undoBtn.onclick = () => {
      undoAction();
      notice.remove();
    };
    notice.appendChild(undoBtn);
  }

  container.appendChild(notice);

  if (type !== "error") {
    setTimeout(() => {
      if (notice.parentElement) notice.remove();
    }, 7000);
  }
}

/**
 * Signature 5-Segment Skill Gauge Component.
 * Enhanced with hover previews, click pop, and segment fill animation.
 */
function createSkillGauge(options = {}) {
  const {
    level = 0,
    requiredLevel = null,
    mode = "student",
    skillName = "Skill",
    onLevelChange = null,
    animate = false,
    staggerIndex = 0,
    compact = false
  } = options;

  const wrapper = document.createElement("div");
  wrapper.className = "skill-gauge-wrapper";

  const levelText = LEVEL_WORDS[level] || "Unrated";
  wrapper.title = `${skillName}: ${levelText} (${level}/5)`;

  const gauge = document.createElement("div");
  gauge.className = "skill-gauge";

  const numSegments = 5;

  if (mode === "interactive") {
    let currentLevel = level;
    let previousLevel = level;

    gauge.setAttribute("role", "radiogroup");
    gauge.setAttribute("aria-label", `${skillName} proficiency level`);

    const buttons = [];

    const updateSegments = (val) => {
      buttons.forEach((btn, idx) => {
        const segVal = idx + 1;
        if (segVal <= val) {
          btn.classList.add("active-segment");
          btn.setAttribute("aria-checked", "true");
        } else {
          btn.classList.remove("active-segment");
          btn.setAttribute("aria-checked", "false");
        }
      });
      labelSpan.textContent = val > 0 ? `${LEVEL_WORDS[val]} (${val}/5)` : "Not rated";
    };

    for (let i = 1; i <= numSegments; i++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "gauge-segment-btn";
      btn.setAttribute("role", "radio");
      btn.setAttribute("aria-label", `Set ${skillName} to ${i} - ${LEVEL_WORDS[i]}`);
      btn.setAttribute("tabindex", i === (currentLevel || 1) ? "0" : "-1");

      if (i <= currentLevel) {
        btn.classList.add("active-segment");
        btn.setAttribute("aria-checked", "true");
      } else {
        btn.setAttribute("aria-checked", "false");
      }

      // Hover Preview: highlights segments 1 to i
      btn.addEventListener("mouseenter", () => {
        buttons.forEach((b, idx) => {
          if (idx + 1 <= i) {
            b.classList.add("hover-preview");
          } else {
            b.classList.remove("hover-preview");
          }
        });
      });

      btn.addEventListener("mouseleave", () => {
        buttons.forEach(b => b.classList.remove("hover-preview"));
      });

      // Click: pop animation and level selection
      btn.addEventListener("click", () => {
        btn.classList.add("pop-click");
        setTimeout(() => btn.classList.remove("pop-click"), 200);

        previousLevel = currentLevel;
        currentLevel = i;
        updateSegments(currentLevel);
        buttons.forEach((b, idx) => b.setAttribute("tabindex", idx + 1 === currentLevel ? "0" : "-1"));
        if (onLevelChange) {
          onLevelChange(currentLevel, () => {
            currentLevel = previousLevel;
            updateSegments(currentLevel);
            if (onLevelChange) onLevelChange(currentLevel, null);
          });
        }
      });

      btn.addEventListener("keydown", (e) => {
        let targetIdx = -1;
        if (e.key === "ArrowRight" || e.key === "ArrowUp") {
          e.preventDefault();
          targetIdx = Math.min(i, 4);
        } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
          e.preventDefault();
          targetIdx = Math.max(i - 2, 0);
        }

        if (targetIdx >= 0) {
          buttons[targetIdx].focus();
          buttons[targetIdx].click();
        }
      });

      buttons.push(btn);
      gauge.appendChild(btn);
    }

    wrapper.appendChild(gauge);

    const labelSpan = document.createElement("span");
    labelSpan.className = "gauge-label";
    labelSpan.textContent = currentLevel > 0 ? `${LEVEL_WORDS[currentLevel]} (${currentLevel}/5)` : "Not rated";
    wrapper.appendChild(labelSpan);

    return wrapper;
  }

  // Non-interactive display: 'student', 'match', or 'requirement'
  for (let i = 1; i <= numSegments; i++) {
    const seg = document.createElement("span");
    seg.className = "gauge-segment";

    if (animate) {
      seg.classList.add("animate-in");
      seg.style.animationDelay = `${(staggerIndex * 35) + (i * 25)}ms`;
    }

    if (mode === "match" && requiredLevel !== null) {
      if (i <= level) {
        seg.classList.add("filled-mint");
      } else if (i <= requiredLevel) {
        seg.classList.add("gap-coral");
      }
    } else if (mode === "requirement") {
      if (i <= (requiredLevel || level)) {
        seg.classList.add("filled-cobalt");
      }
    } else {
      if (i <= level) {
        seg.classList.add("filled-cobalt");
      }
    }

    gauge.appendChild(seg);
  }

  // Required Level Marker (Marigold with ink outline)
  if (requiredLevel !== null && requiredLevel >= 1 && requiredLevel <= 5) {
    const marker = document.createElement("span");
    marker.className = "gauge-marker";
    marker.title = `Required: ${LEVEL_WORDS[requiredLevel]} (${requiredLevel}/5)`;
    const segWidth = 14;
    const gapWidth = 3;
    const leftPx = (requiredLevel * segWidth) + ((requiredLevel - 1) * gapWidth) - 1;
    marker.style.left = `${leftPx}px`;
    gauge.appendChild(marker);
  }

  wrapper.appendChild(gauge);

  const label = document.createElement("span");
  label.className = "gauge-label";

  if (compact) {
    label.textContent = String(level);
  } else if (mode === "match" && requiredLevel !== null) {
    if (level >= requiredLevel) {
      label.textContent = level > requiredLevel
        ? `Surplus: ${LEVEL_WORDS[level]} (${level}/5, req ${requiredLevel})`
        : `Matched: ${LEVEL_WORDS[level]} (${level}/5)`;
    } else if (level === 0) {
      label.textContent = `Missing (req ${LEVEL_WORDS[requiredLevel]} ${requiredLevel}/5)`;
    } else {
      label.textContent = `Gap: ${LEVEL_WORDS[level]} (${level}/5, req ${requiredLevel})`;
    }
  } else if (mode === "requirement") {
    const rVal = requiredLevel || level;
    label.textContent = `${LEVEL_WORDS[rVal]} (${rVal}/5)`;
  } else {
    label.textContent = level > 0 ? `${LEVEL_WORDS[level]} (${level}/5)` : "None";
  }

  wrapper.appendChild(label);
  return wrapper;
}

/**
 * Central API Request Helper
 */
async function apiRequest(endpoint, options = {}) {
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE}${endpoint}`;
  const defaultHeaders = {
    "Content-Type": "application/json",
    "Accept": "application/json"
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options.headers || {})
    }
  };

  try {
    const response = await fetch(url, config);

    if (response.status === 204) {
      return null;
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      let errorMsg = `Request failed (${response.status})`;

      if (response.status === 409) {
        errorMsg = (data && data.detail) 
          ? data.detail 
          : "Conflict: This record already exists or is in active use.";
      } else if (response.status === 422) {
        if (data && Array.isArray(data.detail)) {
          const fieldMsgs = data.detail.map(d => `${d.loc ? d.loc.slice(1).join(".") : "field"}: ${d.msg}`);
          errorMsg = `Validation error: ${fieldMsgs.join(", ")}`;
        } else if (data && typeof data.detail === "string") {
          errorMsg = data.detail;
        }
      } else if (data && data.detail) {
        errorMsg = data.detail;
      }

      const err = new Error(errorMsg);
      err.status = response.status;
      err.data = data;
      throw err;
    }

    return data;
  } catch (err) {
    console.error("API Request Failed:", err);
    throw err;
  }
}

function setText(elementOrId, text) {
  const el = typeof elementOrId === "string" ? document.getElementById(elementOrId) : elementOrId;
  if (el) {
    el.textContent = text !== null && text !== undefined ? String(text) : "";
  }
}

/**
 * Standard Left Rail Navigation with Bespoke Logo, Motion Switch, and Command Palette
 */
function renderRailNav(activeKey = "dashboard") {
  const isMotionOff = localStorage.getItem("skillbridge_motion") === "off";

  return `
    <aside class="rail-nav" aria-label="Main Navigation">
      <div class="rail-brand">
        ${BRAND_LOGO_SVG}
        <span class="rail-brand-name">SkillBridge</span>
      </div>
      <ul class="rail-menu">
        <li>
          <a href="/app/index.html" class="rail-link ${activeKey === 'dashboard' ? 'active' : ''}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            <span>Dashboard</span>
          </a>
        </li>
        <li>
          <a href="/app/students.html" class="rail-link ${activeKey === 'students' ? 'active' : ''}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <span>Students</span>
          </a>
        </li>
        <li>
          <a href="/app/projects.html" class="rail-link ${activeKey === 'projects' ? 'active' : ''}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
              <polyline points="2 17 12 22 22 17"></polyline>
              <polyline points="2 12 12 17 22 12"></polyline>
            </svg>
            <span>Projects</span>
          </a>
        </li>
      </ul>
      <div class="rail-footer">
        <button type="button" class="cmd-palette-btn" onclick="openCommandPalette()">
          <span>Command menu</span>
          <span class="kbd-shortcut">/</span>
        </button>
        <label class="motion-toggle-label">
          <span>Motion</span>
          <div style="position: relative;">
            <input type="checkbox" id="motion-toggle" ${!isMotionOff ? "checked" : ""} style="display:none;" onchange="toggleMotion(this.checked)">
            <span class="motion-toggle-track">
              <span class="motion-toggle-thumb"></span>
            </span>
          </div>
        </label>
        <a href="/docs" target="_blank" style="color: #94A3B8; font-size: 0.8rem; margin-top: 0.25rem;">API Reference</a>
      </div>
    </aside>
  `;
}

function toggleMotion(isEnabled) {
  if (isEnabled) {
    localStorage.setItem("skillbridge_motion", "on");
    document.documentElement.classList.remove("motion-off");
  } else {
    localStorage.setItem("skillbridge_motion", "off");
    document.documentElement.classList.add("motion-off");
  }
}

// =========================================================
// COMMAND PALETTE IMPLEMENTATION ("/" or "Ctrl+K")
// =========================================================
let cmdPaletteData = {
  students: [],
  projects: [],
  skills: []
};

async function ensurePaletteDataLoaded() {
  if (cmdPaletteData.students.length > 0) return;
  try {
    const [students, projects, skills] = await Promise.all([
      apiRequest("/students/search?limit=50"),
      apiRequest("/projects/"),
      apiRequest("/skills/")
    ]);
    cmdPaletteData.students = students || [];
    cmdPaletteData.projects = projects || [];
    cmdPaletteData.skills = skills || [];
  } catch (e) {}
}

function initCommandPalette() {
  if (document.getElementById("cmd-palette-backdrop")) return;

  const backdrop = document.createElement("div");
  backdrop.id = "cmd-palette-backdrop";
  backdrop.className = "cmd-palette-backdrop";
  backdrop.innerHTML = `
    <div class="cmd-palette-modal" onclick="event.stopPropagation()">
      <div class="cmd-palette-input-wrap">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 20px; height: 20px; color: var(--ink-muted);">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input type="text" id="cmd-palette-input" class="cmd-palette-input" placeholder="Jump to student, project, skill, or run query..." autocomplete="off">
        <span class="kbd-shortcut">ESC</span>
      </div>
      <ul id="cmd-palette-results" class="cmd-palette-results"></ul>
      <div class="cmd-palette-footer">
        <span>Use <span class="kbd-shortcut">↑</span> <span class="kbd-shortcut">↓</span> to navigate</span>
        <span>Press <span class="kbd-shortcut">ENTER</span> to select</span>
      </div>
    </div>
  `;

  backdrop.addEventListener("click", closeCommandPalette);
  document.body.appendChild(backdrop);

  const input = document.getElementById("cmd-palette-input");
  input.addEventListener("input", handlePaletteSearch);
  input.addEventListener("keydown", handlePaletteKeydown);

  // Global Keyboard Shortcuts: "/" or Ctrl+K / Cmd+K
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && backdrop.classList.contains("open")) {
      closeCommandPalette();
      return;
    }

    const isInputElement = (el) => {
      if (!el) return false;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) return true;
      if (el.isContentEditable) return true;
      if (el.getAttribute && el.getAttribute("contenteditable") !== null && el.getAttribute("contenteditable") !== "false") return true;
      if (el.closest && el.closest("input, textarea, select, [contenteditable='true'], [contenteditable='']")) return true;
      return false;
    };

    const inInput = isInputElement(document.activeElement) || isInputElement(e.target);
    if (!inInput && e.key === "/") {
      e.preventDefault();
      openCommandPalette();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      openCommandPalette();
    }
  });
}

function openCommandPalette() {
  initCommandPalette();
  ensurePaletteDataLoaded();
  const backdrop = document.getElementById("cmd-palette-backdrop");
  const input = document.getElementById("cmd-palette-input");
  backdrop.classList.add("open");
  input.value = "";
  handlePaletteSearch();
  setTimeout(() => input.focus(), 50);
}

function closeCommandPalette() {
  const backdrop = document.getElementById("cmd-palette-backdrop");
  if (backdrop) backdrop.classList.remove("open");
}

function handlePaletteSearch() {
  const input = document.getElementById("cmd-palette-input");
  const resultsList = document.getElementById("cmd-palette-results");
  const query = input.value.trim().toLowerCase();

  const items = [];

  // Default Navigation Actions
  if (!query) {
    items.push({ label: "Go to Dashboard", badge: "Page", action: () => window.location.href = "/app/index.html" });
    items.push({ label: "Find Students Roster", badge: "Page", action: () => window.location.href = "/app/students.html" });
    items.push({ label: "Projects That Need People", badge: "Page", action: () => window.location.href = "/app/projects.html" });
    items.push({ label: "Interactive API Documentation", badge: "Docs", action: () => window.open("/docs", "_blank") });
  } else {
    // Search Students
    cmdPaletteData.students
      .filter(s => s.full_name.toLowerCase().includes(query) || s.reg_no.toLowerCase().includes(query))
      .slice(0, 3)
      .forEach(s => {
        items.push({
          label: s.full_name,
          badge: `${s.reg_no} · Student`,
          action: () => window.location.href = `/app/student.html?id=${s.id}`
        });
      });

    // Search Projects
    cmdPaletteData.projects
      .filter(p => p.title.toLowerCase().includes(query))
      .slice(0, 3)
      .forEach(p => {
        items.push({
          label: p.title,
          badge: "Project",
          action: () => window.location.href = `/app/project.html?id=${p.id}`
        });
      });

    // Search Skills
    cmdPaletteData.skills
      .filter(sk => sk.name.toLowerCase().includes(query))
      .slice(0, 3)
      .forEach(sk => {
        items.push({
          label: `Filter by skill: ${sk.name}`,
          badge: sk.category,
          action: () => window.location.href = `/app/students.html?skills=${encodeURIComponent(sk.name)}`
        });
      });

    // Ask Query Action
    items.push({
      label: `Ask SkillBridge: "${input.value.trim()}"`,
      badge: "AI Query",
      action: () => window.location.href = `/app/index.html?ask=${encodeURIComponent(input.value.trim())}`
    });
  }

  resultsList.innerHTML = "";
  items.forEach((item, idx) => {
    const li = document.createElement("li");
    li.className = `cmd-palette-item ${idx === 0 ? "active" : ""}`;
    li.innerHTML = `<strong>${item.label}</strong> <span class="cmd-palette-badge">${item.badge}</span>`;
    li.onclick = () => {
      closeCommandPalette();
      item.action();
    };
    resultsList.appendChild(li);
  });
}

function handlePaletteKeydown(e) {
  const resultsList = document.getElementById("cmd-palette-results");
  const items = Array.from(resultsList.querySelectorAll(".cmd-palette-item"));
  if (items.length === 0) return;

  const currentIdx = items.findIndex(el => el.classList.contains("active"));

  if (e.key === "ArrowDown") {
    e.preventDefault();
    const nextIdx = (currentIdx + 1) % items.length;
    items.forEach((el, idx) => el.classList.toggle("active", idx === nextIdx));
    items[nextIdx].scrollIntoView({ block: "nearest" });
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    const prevIdx = (currentIdx - 1 + items.length) % items.length;
    items.forEach((el, idx) => el.classList.toggle("active", idx === prevIdx));
    items[prevIdx].scrollIntoView({ block: "nearest" });
  } else if (e.key === "Enter") {
    e.preventDefault();
    if (currentIdx >= 0) {
      items[currentIdx].click();
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initCommandPalette();
});
