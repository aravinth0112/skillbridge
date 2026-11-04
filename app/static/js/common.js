/**
 * SkillBridge Academic Matching & Career Discovery Common Utilities
 * Premium Modern SaaS Theme (Emerald Green & Light/Dark Mode)
 */

const API_BASE = "/api/v1";

const LEVEL_WORDS = {
  1: "Beginner",
  2: "Basic",
  3: "Intermediate",
  4: "Advanced",
  5: "Expert"
};

// =========================================================
// THEME SYSTEM (LIGHT / DARK MODE)
// =========================================================
function initTheme() {
  const saved = localStorage.getItem("skillbridge_theme") || "light";
  document.documentElement.setAttribute("data-theme", saved);
  updateThemeButtons(saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "light";
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("skillbridge_theme", next);
  updateThemeButtons(next);
}

function updateThemeButtons(theme) {
  const btns = document.querySelectorAll(".theme-toggle-btn");
  btns.forEach(btn => {
    if (theme === "dark") {
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
          <circle cx="12" cy="12" r="5"></circle>
          <line x1="12" y1="1" x2="12" y2="3"></line>
          <line x1="12" y1="21" x2="12" y2="23"></line>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
          <line x1="1" y1="12" x2="3" y2="12"></line>
          <line x1="21" y1="12" x2="23" y2="12"></line>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        </svg>
        <span>Light</span>
      `;
      btn.setAttribute("title", "Switch to Light Mode");
    } else {
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        </svg>
        <span>Dark</span>
      `;
      btn.setAttribute("title", "Switch to Dark Mode");
    }
  });
}

// Initialize theme immediately
initTheme();

// Motion Setting
(function initMotionPreference() {
  const saved = localStorage.getItem("skillbridge_motion");
  if (saved === "off") {
    document.documentElement.classList.add("motion-off");
  } else {
    document.documentElement.classList.remove("motion-off");
  }
})();

function toggleMotion(isEnabled) {
  if (isEnabled) {
    localStorage.setItem("skillbridge_motion", "on");
    document.documentElement.classList.remove("motion-off");
  } else {
    localStorage.setItem("skillbridge_motion", "off");
    document.documentElement.classList.add("motion-off");
  }
}

// Brand Logo SVG (Emerald rising bars + arch bridge)
const BRAND_LOGO_SVG = `
<svg viewBox="0 0 32 32" fill="none" class="bridge-gauge-logo" aria-hidden="true" style="width: 28px; height: 28px;">
  <rect x="4" y="20" width="3" height="6" rx="1" fill="#10B981" opacity="0.6"/>
  <rect x="9.5" y="16" width="3" height="10" rx="1" fill="#10B981" opacity="0.75"/>
  <rect x="15" y="12" width="3" height="14" rx="1" fill="#10B981" opacity="0.9"/>
  <rect x="20.5" y="8" width="3" height="18" rx="1" fill="#10B981"/>
  <rect x="26" y="4" width="3" height="22" rx="1" fill="#10B981"/>
  <path d="M 3 24 Q 16 2 29 24" stroke="#10B981" stroke-width="2.4" stroke-linecap="round" fill="none"/>
</svg>
`;

/**
 * Animated number count-up
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
 * Date formatter with relative chip
 */
function formatDateWithChip(dateStr) {
  if (!dateStr) {
    return { formatted: "None", chipText: null, isUrgent: false, html: '<span style="color:var(--text-muted);">None</span>' };
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

  const badgeClass = isUrgent ? "badge badge-urgent" : "badge badge-open";
  const html = `
    <div style="display: inline-flex; align-items: center; gap: 0.5rem; white-space: nowrap;">
      <span>${formatted}</span>
      <span class="${badgeClass}">${chipText}</span>
    </div>
  `;

  return { formatted, chipText, isUrgent, html };
}

const formatDateWithRelative = formatDateWithChip;

/**
 * Produces skeleton placeholder rows
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
 * Inline confirmation box replacing window.confirm
 */
function showInlinePrompt(containerOrId, promptText, onProceed, onKeep) {
  const container = typeof containerOrId === "string" ? document.getElementById(containerOrId) : containerOrId;
  if (!container) return;

  const existing = container.querySelector(".inline-confirm-box");
  if (existing) existing.remove();

  const box = document.createElement("div");
  box.className = "inline-confirm-box";
  box.style.display = "flex";
  box.style.alignItems = "center";
  box.style.gap = "0.6rem";
  box.style.marginTop = "0.5rem";
  box.style.padding = "0.5rem 0.75rem";
  box.style.backgroundColor = "var(--bg-surface)";
  box.style.borderRadius = "var(--radius-md)";
  box.style.border = "1px solid var(--border)";

  const label = document.createElement("span");
  label.style.fontSize = "0.85rem";
  label.style.color = "var(--text-primary)";
  label.textContent = promptText;
  box.appendChild(label);

  const delBtn = document.createElement("button");
  delBtn.type = "button";
  delBtn.className = "btn btn-danger confirm-yes";
  delBtn.style.padding = "0.3rem 0.75rem";
  delBtn.style.fontSize = "0.8rem";
  delBtn.textContent = "Delete";
  delBtn.onclick = () => {
    box.remove();
    if (onProceed) onProceed();
  };
  box.appendChild(delBtn);

  const keepBtn = document.createElement("button");
  keepBtn.type = "button";
  keepBtn.className = "btn btn-secondary confirm-no";
  keepBtn.style.padding = "0.3rem 0.75rem";
  keepBtn.style.fontSize = "0.8rem";
  keepBtn.textContent = "Keep";
  keepBtn.onclick = () => {
    box.remove();
    if (onKeep) onKeep();
  };
  box.appendChild(keepBtn);

  container.appendChild(box);
}

/**
 * Signature 5-Segment Skill Gauge Renderer
 */
function renderSkillMeter(skillName, level, mode = "display", requiredLevel = null, onLevelChange = null, compact = false) {
  const wrapper = document.createElement("div");
  wrapper.className = "gauge-meter-wrapper";

  const gauge = document.createElement("div");
  gauge.className = "gauge-meter";
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

  // Display Mode (Roster or Match)
  for (let i = 1; i <= numSegments; i++) {
    const seg = document.createElement("div");
    seg.className = "gauge-segment";

    if (mode === "match" && requiredLevel !== null) {
      if (i <= level && i <= requiredLevel) {
        seg.classList.add("active-segment");
      } else if (i > requiredLevel && i <= level) {
        seg.classList.add("surplus-segment");
      } else if (i > level && i <= requiredLevel) {
        seg.classList.add("gap-segment");
      }
    } else {
      if (i <= level) {
        seg.classList.add("active-segment");
      }
    }

    gauge.appendChild(seg);
  }

  // Required Marker needle in match view
  if (mode === "match" && requiredLevel !== null && requiredLevel >= 1 && requiredLevel <= 5) {
    const marker = document.createElement("div");
    marker.className = "gauge-needle-marker";
    const segmentWidth = 18;
    const gapWidth = 3;
    const leftPx = (requiredLevel * (segmentWidth + gapWidth)) - gapWidth;
    marker.style.left = `${leftPx}px`;
    marker.setAttribute("title", `Required: ${requiredLevel}/5`);
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
 * Universal Wrapper for Skill Gauges
 */
function createSkillGauge(opts = {}) {
  const {
    skillName = "Skill",
    level = 0,
    mode = "display",
    requiredLevel = null,
    onLevelChange = null,
    compact = false
  } = opts;
  return renderSkillMeter(skillName, level, mode, requiredLevel, onLevelChange, compact);
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
 * Renders the Left Sidebar Navigation (Matching Inspiration Structure)
 */
function renderRailNav(activeKey = "dashboard") {
  const isMotionOff = localStorage.getItem("skillbridge_motion") === "off";

  return `
    <aside class="rail-nav" aria-label="Main Navigation">
      <a href="/app/index.html" class="rail-brand">
        <div class="rail-brand-logo">
          ${BRAND_LOGO_SVG}
        </div>
        <span class="rail-brand-name">SkillBridge</span>
      </a>

      <div class="rail-section-label">Main Menu</div>
      <ul class="rail-menu">
        <li>
          <a href="/app/index.html" class="rail-link ${activeKey === 'dashboard' ? 'active' : ''}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <rect x="3" y="3" width="7" height="7" rx="1.5"></rect>
              <rect x="14" y="3" width="7" height="7" rx="1.5"></rect>
              <rect x="14" y="14" width="7" height="7" rx="1.5"></rect>
              <rect x="3" y="14" width="7" height="7" rx="1.5"></rect>
            </svg>
            <span>Overview</span>
          </a>
        </li>
        <li>
          <a href="/app/students.html" class="rail-link ${activeKey === 'students' ? 'active' : ''}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <span>Talent Roster</span>
          </a>
        </li>
        <li>
          <a href="/app/projects.html" class="rail-link ${activeKey === 'projects' ? 'active' : ''}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
              <polyline points="2 17 12 22 22 17"></polyline>
              <polyline points="2 12 12 17 22 12"></polyline>
            </svg>
            <span>Projects</span>
          </a>
        </li>
        <li>
          <a href="/docs" target="_blank" class="rail-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            <span>API Docs</span>
          </a>
        </li>
      </ul>

      <div class="rail-footer">
        <div class="rail-user-profile" style="cursor: default;">
          <div class="rail-avatar">AD</div>
          <div class="rail-user-info">
            <span class="rail-user-name">Admin</span>
            <span class="rail-user-role">Workspace Manager</span>
          </div>
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.25rem 0.5rem;">
          <button type="button" class="btn btn-secondary" style="padding: 0.35rem 0.65rem; font-size: 0.75rem;" onclick="openCommandPalette()">
            <span>Search</span>
            <span class="kbd-shortcut" style="margin-left: 0.25rem;">/</span>
          </button>
          
          <label class="motion-toggle-label" style="display: flex; align-items: center; gap: 0.35rem; font-size: 0.75rem; color: var(--text-muted); cursor: pointer;">
            <span>Motion</span>
            <input type="checkbox" id="motion-toggle" ${!isMotionOff ? "checked" : ""} style="display:none;" onchange="toggleMotion(this.checked)">
            <span style="display: inline-block; width: 28px; height: 16px; background: ${!isMotionOff ? 'var(--primary)' : 'var(--border)'}; border-radius: 10px; position: relative;">
              <span style="position: absolute; top: 2px; left: ${!isMotionOff ? '14px' : '2px'}; width: 12px; height: 12px; background: #fff; border-radius: 50%; transition: left 0.15s;"></span>
            </span>
          </label>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0 0.5rem; font-size: 0.75rem; color: var(--text-muted);">
          <a href="/docs" target="_blank" style="color: var(--text-muted); text-decoration: none;">API Docs</a>
          <span>v1.0</span>
        </div>
      </div>
    </aside>
  `;
}

/**
 * Handles Top Bar Ask Search
 */
function handleTopAskSearch(event) {
  if (event && event.preventDefault) event.preventDefault();
  const input = document.getElementById("top-ask-input");
  if (!input) return;
  const query = input.value.trim();
  if (!query) return;

  if (typeof window.runAskQuery === "function") {
    window.runAskQuery(query);
  } else {
    window.location.href = `/app/index.html?ask=${encodeURIComponent(query)}`;
  }
}

/**
 * Renders Top Navigation Bar with Single Ask Search, Theme Toggle, Admin Profile
 */
function renderTopHeader() {
  const currentTheme = document.documentElement.getAttribute("data-theme") || "light";

  return `
    <header class="top-navbar" aria-label="Header Navigation">
      <div class="top-nav-left" style="flex: 1; max-width: 580px;">
        <form class="top-nav-search-form" onsubmit="handleTopAskSearch(event)" style="display: flex; align-items: center; width: 100%; position: relative;" novalidate>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px; color: var(--text-muted); position: absolute; left: 1rem; pointer-events: none;">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            id="top-ask-input"
            class="global-search-input"
            placeholder="Ask SkillBridge: e.g. Python and SQL students, or / for palette..."
            autocomplete="off"
            style="width: 100%; padding: 0.55rem 4.8rem 0.55rem 2.6rem; border-radius: var(--radius-pill); border: 1px solid var(--border); background: var(--bg-surface); color: var(--text-primary); font-size: 0.88rem; outline: none; transition: var(--transition-fast);"
          >
          <button type="submit" class="btn btn-primary top-ask-btn" style="position: absolute; right: 4px; padding: 0.35rem 0.85rem; font-size: 0.78rem; border-radius: var(--radius-pill); height: calc(100% - 8px); display: inline-flex; align-items: center; justify-content: center;">
            Ask
          </button>
        </form>
      </div>

      <div class="top-nav-right">
        <!-- Theme Switcher -->
        <button type="button" class="theme-toggle-btn" onclick="toggleTheme()" aria-label="Toggle theme">
          ${currentTheme === 'dark' ? `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
              <circle cx="12" cy="12" r="5"></circle>
              <line x1="12" y1="1" x2="12" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="23"></line>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
              <line x1="1" y1="12" x2="3" y2="12"></line>
              <line x1="21" y1="12" x2="23" y2="12"></line>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
            <span>Light</span>
          ` : `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
            <span>Dark</span>
          `}
        </button>

        <!-- Plain Admin Label -->
        <div style="display: flex; align-items: center; gap: 0.45rem; padding: 0.35rem 0.75rem; background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius-pill); font-size: 0.8rem; font-weight: 600; color: var(--text-primary);">
          <span style="width: 8px; height: 8px; border-radius: 50%; background: var(--primary);"></span>
          <span>Admin</span>
        </div>
      </div>
    </header>
  `;
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
  backdrop.className = "drawer-backdrop";
  backdrop.innerHTML = `
    <div style="max-width: 600px; width: 90%; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-xl); box-shadow: var(--shadow-lg); overflow: hidden; margin: 10vh auto; display: flex; flex-direction: column;" onclick="event.stopPropagation()">
      <div style="display: flex; align-items: center; gap: 0.75rem; padding: 1rem 1.25rem; border-bottom: 1px solid var(--border);">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 20px; height: 20px; color: var(--text-muted);">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input type="text" id="cmd-palette-input" style="flex: 1; background: transparent; border: none; outline: none; font-size: 1rem; color: var(--text-primary); font-family: inherit;" placeholder="Jump to student, project, skill, or run query..." autocomplete="off">
        <span class="kbd-shortcut" style="cursor: pointer;" onclick="closeCommandPalette()">ESC</span>
      </div>
      <ul id="cmd-palette-results" style="list-style: none; max-height: 340px; overflow-y: auto; padding: 0.5rem;"></ul>
      <div style="display: flex; justify-content: space-between; padding: 0.65rem 1.25rem; border-top: 1px solid var(--border-subtle); font-size: 0.75rem; color: var(--text-muted); background: var(--bg-surface);">
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

  // Default Actions
  if (!query) {
    items.push({ label: "Overview Dashboard", badge: "Page", action: () => window.location.href = "/app/index.html" });
    items.push({ label: "Find Students Roster", badge: "Page", action: () => window.location.href = "/app/students.html" });
    items.push({ label: "Projects Directory", badge: "Page", action: () => window.location.href = "/app/projects.html" });
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

    // Natural Language Ask Action
    items.push({
      label: `Ask SkillBridge: "${input.value.trim()}"`,
      badge: "AI Query",
      action: () => window.location.href = `/app/index.html?ask=${encodeURIComponent(input.value.trim())}`
    });
  }

  resultsList.innerHTML = "";
  items.forEach((item, idx) => {
    const li = document.createElement("li");
    li.style.display = "flex";
    li.style.alignItems = "center";
    li.style.justifyContent = "space-between";
    li.style.padding = "0.75rem 1rem";
    li.style.borderRadius = "var(--radius-md)";
    li.style.cursor = "pointer";
    li.style.backgroundColor = idx === 0 ? "var(--bg-surface)" : "transparent";
    li.className = idx === 0 ? "active" : "";
    li.innerHTML = `
      <strong style="font-weight: 500; font-size: 0.9rem; color: var(--text-primary);">${item.label}</strong>
      <span class="badge badge-open" style="font-size: 0.72rem;">${item.badge}</span>
    `;
    li.onmouseenter = () => {
      resultsList.querySelectorAll("li").forEach(el => {
        el.style.backgroundColor = "transparent";
        el.classList.remove("active");
      });
      li.style.backgroundColor = "var(--bg-surface)";
      li.classList.add("active");
    };
    li.onclick = () => {
      closeCommandPalette();
      item.action();
    };
    resultsList.appendChild(li);
  });
}

function handlePaletteKeydown(e) {
  const resultsList = document.getElementById("cmd-palette-results");
  const items = Array.from(resultsList.querySelectorAll("li"));
  if (items.length === 0) return;

  const currentIdx = items.findIndex(el => el.classList.contains("active"));

  if (e.key === "ArrowDown") {
    e.preventDefault();
    const nextIdx = (currentIdx + 1) % items.length;
    items.forEach((el, idx) => {
      el.style.backgroundColor = idx === nextIdx ? "var(--bg-surface)" : "transparent";
      el.classList.toggle("active", idx === nextIdx);
    });
    items[nextIdx].scrollIntoView({ block: "nearest" });
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    const prevIdx = (currentIdx - 1 + items.length) % items.length;
    items.forEach((el, idx) => {
      el.style.backgroundColor = idx === prevIdx ? "var(--bg-surface)" : "transparent";
      el.classList.toggle("active", idx === prevIdx);
    });
    items[prevIdx].scrollIntoView({ block: "nearest" });
  } else if (e.key === "Enter") {
    e.preventDefault();
    if (currentIdx >= 0) {
      items[currentIdx].click();
    }
  }
}

/**
 * FLIP Animation Helper for smooth 60fps re-ordering
 */
function flipAnimate(container, itemSelector, domUpdateFn) {
  if (!container) {
    if (typeof domUpdateFn === "function") domUpdateFn();
    return;
  }
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
            el.style.transition = "transform var(--t-med, 220ms) var(--ease-standard, ease)";
            el.style.transform = "translateY(0)";
          });
        });
      }
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initCommandPalette();
});
