/**
 * SkillBridge Dashboard Controller
 * Modern SaaS Dashboard & Multi-Column Learning/Career Hub
 */

let placeholderCycleInterval = null;
const exampleQueries = [
  "Python and PyTorch available",
  "Frontend UI and UX design",
  "3rd year Robotics",
  "Data Science and SQL students",
  "Embedded systems in Electrical Eng"
];

async function initDashboard() {
  const railContainer = document.getElementById("rail-container");
  if (railContainer) {
    railContainer.innerHTML = renderRailNav("dashboard");
  }

  const headerContainer = document.getElementById("header-container");
  if (headerContainer) {
    headerContainer.innerHTML = renderTopHeader();
  }

  // Clear validation on input typing
  const askInput = document.getElementById("ask-input");
  if (askInput) {
    askInput.addEventListener("input", () => {
      const errBox = document.getElementById("ask-input-error");
      if (errBox) errBox.style.display = "none";
      askInput.classList.remove("has-error");
    });

    startPlaceholderCycling(askInput);
  }

  await Promise.all([
    loadDashboardStats(),
    loadRecommendedCourses(),
    loadRecommendedProjects()
  ]);

  // If redirected with ?ask= query from Command Palette
  const urlParams = new URLSearchParams(window.location.search);
  const askQuery = urlParams.get("ask");
  if (askQuery && askInput) {
    askInput.value = askQuery;
    handleAskSkillBridge(new Event("submit"));
  }
}

/**
 * Cycles the Ask placeholder through realistic faculty queries
 */
function startPlaceholderCycling(inputEl) {
  let queryIdx = 0;
  let charIdx = 0;
  let isDeleting = false;
  let currentText = "";

  function typeTick() {
    if (document.documentElement.classList.contains("motion-off")) {
      inputEl.placeholder = `Ask anything: for example, ${exampleQueries[0]}`;
      return;
    }

    if (document.activeElement === inputEl || inputEl.value.length > 0) {
      setTimeout(typeTick, 1000);
      return;
    }

    const fullQuery = exampleQueries[queryIdx];

    if (!isDeleting) {
      charIdx++;
      currentText = fullQuery.substring(0, charIdx);
      inputEl.placeholder = `Ask anything: for example, ${currentText}`;

      if (charIdx === fullQuery.length) {
        isDeleting = true;
        setTimeout(typeTick, 2000);
        return;
      }
    } else {
      charIdx--;
      currentText = fullQuery.substring(0, charIdx);
      inputEl.placeholder = `Ask anything: for example, ${currentText}`;

      if (charIdx === 0) {
        isDeleting = false;
        queryIdx = (queryIdx + 1) % exampleQueries.length;
        setTimeout(typeTick, 400);
        return;
      }
    }

    const speed = isDeleting ? 30 : 60;
    setTimeout(typeTick, speed);
  }

  typeTick();
}

async function loadDashboardStats() {
  try {
    const stats = await apiRequest("/dashboard/stats");

    // 1. Key Stat Metrics
    animateCountUp("total-courses", stats.totals.courses, 350);
    animateCountUp("total-skills", stats.totals.skills, 400);
    animateCountUp("total-projects", stats.totals.projects, 350);
    animateCountUp("total-shortlists", stats.totals.shortlists, 350);
    animateCountUp("total-students", stats.totals.students, 450);
    animateCountUp("total-departments", stats.totals.departments, 350);

    // 2. Supply vs Demand Benchmark
    renderSupplyDemandChart(stats.top_skills || []);

    // 3. Ranked Department Distribution
    renderRankedDepartments(stats.students_per_department || [], stats.totals.students);

  } catch (err) {
    console.error("Failed to load dashboard stats:", err);
  }
}

async function loadRecommendedCourses() {
  const container = document.getElementById("recommended-courses-list");
  if (!container) return;

  try {
    const courses = await apiRequest("/courses/");
    container.innerHTML = "";

    if (!courses || courses.length === 0) {
      container.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem;">No degree programs registered yet.</div>';
      return;
    }

    courses.slice(0, 4).forEach(c => {
      const card = document.createElement("div");
      card.style.background = "var(--bg-surface)";
      card.style.border = "1px solid var(--border)";
      card.style.borderRadius = "var(--radius-md)";
      card.style.padding = "1rem";
      card.style.display = "flex";
      card.style.flexDirection = "column";
      card.style.justifyContent = "space-between";
      card.style.gap = "0.75rem";
      card.style.transition = "transform var(--t-fast)";

      card.onmouseenter = () => card.style.transform = "translateY(-2px)";
      card.onmouseleave = () => card.style.transform = "translateY(0)";

      card.innerHTML = `
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
            <span class="badge badge-open" style="font-size: 0.72rem;">${c.code}</span>
            <span style="font-size: 0.75rem; color: var(--text-muted);">Degree</span>
          </div>
          <div style="font-weight: 600; font-size: 0.95rem; color: var(--text-primary);">${c.name}</div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-subtle); padding-top: 0.5rem;">
          <span style="font-size: 0.78rem; color: var(--text-secondary);">4-Year Curriculum</span>
          <a href="/app/students.html" style="font-size: 0.8rem; font-weight: 600; color: var(--primary); text-decoration: none;">View Cohort →</a>
        </div>
      `;

      container.appendChild(card);
    });

  } catch (err) {
    console.error("Failed to load recommended courses:", err);
  }
}

async function loadRecommendedProjects() {
  const container = document.getElementById("recommended-projects-list");
  if (!container) return;

  try {
    const projects = await apiRequest("/projects/");
    container.innerHTML = "";

    if (!projects || projects.length === 0) {
      container.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem;">No active projects available.</div>';
      return;
    }

    projects.slice(0, 3).forEach(p => {
      const card = document.createElement("div");
      card.style.background = "var(--bg-surface)";
      card.style.border = "1px solid var(--border)";
      card.style.borderRadius = "var(--radius-md)";
      card.style.padding = "0.85rem 1rem";
      card.style.display = "flex";
      card.style.justifyContent = "space-between";
      card.style.alignItems = "center";
      card.style.gap = "0.75rem";
      card.style.transition = "transform var(--t-fast)";

      card.onmouseenter = () => card.style.transform = "translateY(-2px)";
      card.onmouseleave = () => card.style.transform = "translateY(0)";

      const deadlineInfo = formatDateWithChip(p.deadline);

      card.innerHTML = `
        <div style="flex: 1; min-width: 0;">
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
            <div style="font-weight: 600; font-size: 0.88rem; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.title}</div>
            <span class="badge badge-open" style="font-size: 0.7rem; text-transform: capitalize;">${p.status.replace('_', ' ')}</span>
          </div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${deadlineInfo.formatted} (${deadlineInfo.chipText})</div>
        </div>
        <a href="/app/project.html?id=${p.id}" class="btn btn-secondary" style="padding: 0.35rem 0.65rem; font-size: 0.75rem; white-space: nowrap;">
          Match
        </a>
      `;

      container.appendChild(card);
    });

  } catch (err) {
    console.error("Failed to load recommended projects:", err);
  }
}

function renderSupplyDemandChart(skills) {
  const container = document.getElementById("sd-rows-container");
  if (!container) return;
  container.innerHTML = "";

  if (skills.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: var(--text-muted); font-size: 0.88rem;">
        No skill demand data available yet. Create projects or map student skills to populate this benchmark.
      </div>
    `;
    return;
  }

  // Thin bench skills (demand > 0 and supply <= 3) sorted FIRST
  const sortedSkills = [...skills].sort((a, b) => {
    const aThin = (a.project_count > 0 && a.student_count <= 3);
    const bThin = (b.project_count > 0 && b.student_count <= 3);

    if (aThin && !bThin) return -1;
    if (!aThin && bThin) return 1;
    return (b.project_count + b.student_count) - (a.project_count + a.student_count);
  });

  let maxSharedScale = 1;
  sortedSkills.forEach(s => {
    if (s.student_count > maxSharedScale) maxSharedScale = s.student_count;
    if (s.project_count > maxSharedScale) maxSharedScale = s.project_count;
  });

  sortedSkills.forEach(s => {
    const isThinBench = (s.project_count > 0 && s.student_count <= 3);
    const row = document.createElement("div");
    row.className = `sd-row ${isThinBench ? "is-thin-bench" : ""}`;

    // Left Col: Student Supply
    const supplyCol = document.createElement("div");
    supplyCol.style.display = "flex";
    supplyCol.style.alignItems = "center";
    supplyCol.style.justifyContent = "flex-end";
    supplyCol.style.gap = "0.6rem";
    supplyCol.style.paddingRight = "0.75rem";

    const supplyNum = document.createElement("span");
    supplyNum.style.fontSize = "0.82rem";
    supplyNum.style.color = "var(--text-secondary)";
    supplyNum.style.fontWeight = "600";
    supplyNum.textContent = s.student_count;
    supplyCol.appendChild(supplyNum);

    const supplyBar = document.createElement("div");
    const supplyPct = Math.round((s.student_count / maxSharedScale) * 85);
    supplyBar.style.height = "8px";
    supplyBar.style.borderRadius = "4px";
    supplyBar.style.background = "var(--emerald-gradient)";
    supplyBar.style.width = `${Math.max(4, supplyPct)}%`;
    supplyBar.title = `${s.student_count} student(s) offer ${s.skill_name}`;
    supplyCol.appendChild(supplyBar);

    row.appendChild(supplyCol);

    // Center Col: Skill Name
    const skillCell = document.createElement("div");
    skillCell.style.display = "flex";
    skillCell.style.alignItems = "center";
    skillCell.style.justifyContent = "center";
    skillCell.style.gap = "0.35rem";

    const nameSpan = document.createElement("span");
    nameSpan.style.fontSize = "0.85rem";
    nameSpan.style.fontWeight = "600";
    nameSpan.style.color = "var(--text-primary)";
    nameSpan.textContent = s.skill_name;
    skillCell.appendChild(nameSpan);

    if (isThinBench) {
      const thinTag = document.createElement("span");
      thinTag.className = "thin-bench-tag";
      thinTag.textContent = "Thin bench";
      thinTag.title = `Low supply (${s.student_count}) against active project demand (${s.project_count})`;
      skillCell.appendChild(thinTag);
    }

    row.appendChild(skillCell);

    // Right Col: Project Demand
    const demandCol = document.createElement("div");
    demandCol.style.display = "flex";
    demandCol.style.alignItems = "center";
    demandCol.style.justifyContent = "flex-start";
    demandCol.style.gap = "0.6rem";
    demandCol.style.paddingLeft = "0.75rem";

    const demandBar = document.createElement("div");
    const demandPct = Math.round((s.project_count / maxSharedScale) * 85);
    demandBar.style.height = "8px";
    demandBar.style.borderRadius = "4px";
    demandBar.style.background = "var(--status-progress)";
    demandBar.style.width = `${Math.max(4, demandPct)}%`;
    demandBar.title = `${s.project_count} project(s) require ${s.skill_name}`;
    demandCol.appendChild(demandBar);

    const demandNum = document.createElement("span");
    demandNum.style.fontSize = "0.82rem";
    demandNum.style.color = "var(--text-secondary)";
    demandNum.style.fontWeight = "600";
    demandNum.textContent = s.project_count;
    demandCol.appendChild(demandNum);

    row.appendChild(demandCol);

    container.appendChild(row);
  });
}

function renderRankedDepartments(depts, totalStudents) {
  const container = document.getElementById("dept-ranked-container");
  if (!container) return;
  container.innerHTML = "";

  if (depts.length === 0) {
    container.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem;">No department data recorded.</div>';
    return;
  }

  const sorted = [...depts].sort((a, b) => b.student_count - a.student_count);
  const maxStudents = sorted[0].student_count || 1;

  sorted.forEach((d, idx) => {
    const item = document.createElement("div");
    item.style.display = "flex";
    item.style.flexDirection = "column";
    item.style.gap = "0.25rem";
    item.style.marginBottom = "0.85rem";

    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.justifyContent = "space-between";
    header.style.fontSize = "0.85rem";

    const nameBox = document.createElement("span");
    nameBox.style.fontWeight = "600";
    nameBox.style.color = "var(--text-primary)";
    nameBox.textContent = `${idx + 1}. ${d.department_name}`;
    header.appendChild(nameBox);

    const pct = totalStudents > 0 ? Math.round((d.student_count / totalStudents) * 100) : 0;
    const countSpan = document.createElement("span");
    countSpan.style.color = "var(--text-muted)";
    countSpan.textContent = `${d.student_count} (${pct}%)`;
    header.appendChild(countSpan);

    item.appendChild(header);

    const track = document.createElement("div");
    track.style.width = "100%";
    track.style.height = "6px";
    track.style.background = "var(--bg-surface)";
    track.style.borderRadius = "4px";
    track.style.overflow = "hidden";

    const fill = document.createElement("div");
    fill.style.height = "100%";
    fill.style.width = `${Math.round((d.student_count / maxStudents) * 100)}%`;
    fill.style.background = "var(--emerald-gradient)";
    fill.style.borderRadius = "4px";

    track.appendChild(fill);
    item.appendChild(track);

    container.appendChild(item);
  });
}

function applySampleQuery(queryText) {
  const input = document.getElementById("ask-input");
  input.value = queryText;
  const errBox = document.getElementById("ask-input-error");
  if (errBox) errBox.style.display = "none";
  input.classList.remove("has-error");
  handleAskSkillBridge(new Event("submit"));
}

async function handleAskSkillBridge(event) {
  if (event && event.preventDefault) event.preventDefault();

  const input = document.getElementById("ask-input");
  const query = input.value.trim();
  const errBox = document.getElementById("ask-input-error");

  if (!query) {
    input.classList.add("has-error");
    errBox.textContent = "Enter a question, for example: Python and SQL students";
    errBox.style.display = "block";
    input.focus();
    return;
  }

  errBox.style.display = "none";
  input.classList.remove("has-error");

  const submitBtn = document.getElementById("btn-ask-submit");
  const resultsContainer = document.getElementById("ask-results-container");
  const filtersArea = document.getElementById("ask-interpreted-filters");
  const resultsList = document.getElementById("ask-results-list");
  const seeAllArea = document.getElementById("ask-see-all-container");

  submitBtn.disabled = true;
  submitBtn.textContent = "Searching...";
  resultsContainer.style.display = "block";
  filtersArea.textContent = "Interpreting query...";
  resultsList.innerHTML = renderSkeletonRows(2);
  seeAllArea.innerHTML = "";

  try {
    const res = await apiRequest("/ai/search", {
      method: "POST",
      body: JSON.stringify({ query })
    });

    const f = res.interpreted_filters || {};
    const filterTokens = [];
    if (f.skills && f.skills.length > 0) filterTokens.push(`Skills: ${f.skills.join(", ")}`);
    if (f.mode) filterTokens.push(`Mode: ${f.mode.toUpperCase()}`);
    if (f.course) filterTokens.push(`Course: ${f.course}`);
    if (f.department) filterTokens.push(`Department: ${f.department}`);
    if (f.year) filterTokens.push(`Year: ${f.year}`);
    if (f.available !== null && f.available !== undefined) filterTokens.push(`Available: ${f.available ? "Yes" : "Any"}`);

    const methodLabel = res.used_ai ? "Interpreted with AI" : "Interpreted via keywords";
    filtersArea.textContent = `${methodLabel}: ${filterTokens.length > 0 ? filterTokens.join(" · ") : "General query"}`;

    const students = res.results || [];
    resultsList.innerHTML = "";

    if (students.length === 0) {
      resultsList.innerHTML = `
        <div style="text-align: center; padding: 1.5rem; color: var(--text-muted); font-size: 0.88rem;">
          No students matched these criteria. Try adjusting the query terms or remove a skill requirement.
        </div>
      `;
    } else {
      const first5 = students.slice(0, 5);
      first5.forEach((s) => {
        const row = document.createElement("div");
        row.className = "ask-result-row";
        row.style.display = "flex";
        row.style.justifyContent = "space-between";
        row.style.alignItems = "center";
        row.style.padding = "0.75rem 1rem";
        row.style.background = "var(--bg-surface)";
        row.style.border = "1px solid var(--border)";
        row.style.borderRadius = "var(--radius-md)";
        row.style.gap = "1rem";
        row.style.flexWrap = "wrap";

        const left = document.createElement("div");
        left.style.display = "flex";
        left.style.alignItems = "center";
        left.style.gap = "0.5rem";

        const dot = document.createElement("span");
        dot.style.width = "8px";
        dot.style.height = "8px";
        dot.style.borderRadius = "50%";
        dot.style.background = s.available ? "var(--primary)" : "var(--text-muted)";
        left.appendChild(dot);

        const nameLink = document.createElement("a");
        nameLink.href = `/app/student.html?id=${s.id}`;
        nameLink.style.fontFamily = "var(--font-heading)";
        nameLink.style.fontWeight = "700";
        nameLink.style.color = "var(--text-primary)";
        nameLink.style.textDecoration = "none";
        nameLink.textContent = s.full_name;
        left.appendChild(nameLink);

        const degree = document.createElement("span");
        degree.style.fontSize = "0.82rem";
        degree.style.color = "var(--text-muted)";
        degree.textContent = `(${s.course_name || "Degree"} · Year ${s.year_of_study})`;
        left.appendChild(degree);

        row.appendChild(left);

        const right = document.createElement("div");
        right.style.display = "flex";
        right.style.alignItems = "center";
        right.style.gap = "0.75rem";

        const topSkills = (s.skills || []).slice(0, 3);
        topSkills.forEach(sk => {
          const badge = document.createElement("div");
          badge.style.display = "inline-flex";
          badge.style.alignItems = "center";
          badge.style.gap = "0.35rem";
          badge.style.background = "var(--bg-card)";
          badge.style.padding = "0.2rem 0.45rem";
          badge.style.border = "1px solid var(--border)";
          badge.style.borderRadius = "var(--radius-sm)";

          const skLbl = document.createElement("span");
          skLbl.style.fontSize = "0.78rem";
          skLbl.style.fontWeight = "600";
          skLbl.textContent = sk.name;
          badge.appendChild(skLbl);

          const gauge = createSkillGauge({
            level: sk.proficiency,
            mode: "student",
            skillName: sk.name,
            compact: true
          });
          badge.appendChild(gauge);
          right.appendChild(badge);
        });

        row.appendChild(right);
        resultsList.appendChild(row);
      });
    }

    const params = new URLSearchParams();
    if (f.skills && f.skills.length > 0) params.append("skills", f.skills.join(","));
    if (f.mode) params.append("mode", f.mode);
    if (f.year) params.append("year", f.year);
    if (f.available) params.append("available", "true");

    const seeAllLink = document.createElement("a");
    seeAllLink.href = `/app/students.html?${params.toString()}`;
    seeAllLink.className = "btn btn-secondary";
    seeAllLink.style.padding = "0.4rem 0.85rem";
    seeAllLink.style.fontSize = "0.82rem";
    seeAllLink.textContent = `See all results (${students.length}) in student roster`;
    seeAllArea.appendChild(seeAllLink);

  } catch (err) {
    resultsList.innerHTML = `<div style="padding: 1rem; color: var(--status-urgent);">${err.message || "Failed to execute smart search."}</div>`;
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Ask";
  }
}

document.addEventListener("DOMContentLoaded", initDashboard);
