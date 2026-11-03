/**
 * SkillBridge Dashboard Controller
 * UI Round B Enhancements:
 * - Ask placeholder cycles through example queries
 * - Totals count up once with cubic-bezier easing
 * - Supply and demand bars grow from center when visible via IntersectionObserver
 * - Thin bench tags pulse once
 * - Ask results slide down with row stagger (total stagger < 600ms)
 * - Command palette query listener
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

  await loadDashboardStats();

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

    // Pause cycling if user focused on input
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
        setTimeout(typeTick, 2000); // Pause on full text
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

    // 1. Single-Line Compact Figures: Animate Count Up Once
    animateCountUp("total-students", stats.totals.students, 450);
    animateCountUp("total-departments", stats.totals.departments, 350);
    animateCountUp("total-courses", stats.totals.courses, 350);
    animateCountUp("total-skills", stats.totals.skills, 400);
    animateCountUp("total-projects", stats.totals.projects, 350);
    animateCountUp("total-shortlists", stats.totals.shortlists, 350);

    // 2. Diverging Supply & Demand Chart (One Shared Scale)
    renderSupplyDemandChart(stats.top_skills || []);

    // 3. Ranked Department Enrollment List
    renderRankedDepartments(stats.students_per_department || [], stats.totals.students);

  } catch (err) {
    console.error("Failed to load dashboard stats:", err);
  }
}

function renderSupplyDemandChart(skills) {
  const container = document.getElementById("sd-rows-container");
  container.innerHTML = "";

  if (skills.length === 0) {
    container.innerHTML = `
      <div class="empty-notice">
        ${renderEmptyStateSVG()}
        <div>No skill demand data available yet. Create projects or map student skills to populate this chart.</div>
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

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const bars = entry.target.querySelectorAll(".sd-supply-bar, .sd-demand-bar");
        bars.forEach(b => b.classList.add("bar-visible"));
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  sortedSkills.forEach(s => {
    const isThinBench = (s.project_count > 0 && s.student_count <= 3);
    const row = document.createElement("div");
    row.className = `sd-row ${isThinBench ? "is-thin-bench" : ""}`;

    // Left Col: Student Supply (extends right-to-left)
    const supplyCol = document.createElement("div");
    supplyCol.className = "sd-supply-col";

    const supplyNum = document.createElement("span");
    supplyNum.className = "num-tabular";
    supplyNum.style.fontSize = "0.82rem";
    supplyNum.style.color = "var(--ink-muted)";
    supplyNum.textContent = s.student_count;
    supplyCol.appendChild(supplyNum);

    const supplyBar = document.createElement("div");
    supplyBar.className = "sd-supply-bar";
    const supplyPct = Math.round((s.student_count / maxSharedScale) * 85);
    supplyBar.style.width = `${Math.max(3, supplyPct)}%`;
    supplyBar.title = `${s.student_count} student(s) offer ${s.skill_name}`;
    supplyCol.appendChild(supplyBar);

    row.appendChild(supplyCol);

    // Center Col: Skill Name + Thin Bench Tag
    const skillCell = document.createElement("div");
    skillCell.className = "sd-skill-cell";

    const nameSpan = document.createElement("span");
    nameSpan.textContent = s.skill_name;
    skillCell.appendChild(nameSpan);

    if (isThinBench) {
      const thinTag = document.createElement("span");
      thinTag.className = "thin-bench-badge";
      thinTag.textContent = "Thin bench";
      thinTag.title = `Low supply (${s.student_count} students) with active demand (${s.project_count} projects)`;
      skillCell.appendChild(thinTag);
    }

    row.appendChild(skillCell);

    // Right Col: Project Demand (extends left-to-right)
    const demandCol = document.createElement("div");
    demandCol.className = "sd-demand-col";

    const demandBar = document.createElement("div");
    demandBar.className = "sd-demand-bar";
    const demandPct = Math.round((s.project_count / maxSharedScale) * 85);
    demandBar.style.width = `${Math.max(3, demandPct)}%`;
    demandBar.title = `${s.project_count} project(s) require ${s.skill_name}`;
    demandCol.appendChild(demandBar);

    const demandNum = document.createElement("span");
    demandNum.className = "num-tabular";
    demandNum.style.fontSize = "0.82rem";
    demandNum.style.color = "var(--ink-muted)";
    demandNum.textContent = s.project_count;
    demandCol.appendChild(demandNum);

    row.appendChild(demandCol);

    observer.observe(row);
    container.appendChild(row);
  });
}

function renderRankedDepartments(depts, totalStudents) {
  const container = document.getElementById("dept-ranked-container");
  container.innerHTML = "";

  if (depts.length === 0) {
    container.innerHTML = '<div class="empty-notice">No department data recorded.</div>';
    return;
  }

  const sorted = [...depts].sort((a, b) => b.student_count - a.student_count);
  const maxStudents = sorted[0].student_count || 1;

  sorted.forEach((d, idx) => {
    const item = document.createElement("div");
    item.className = "dept-ranked-item";

    const nameBox = document.createElement("div");
    nameBox.style.display = "flex";
    nameBox.style.alignItems = "baseline";
    nameBox.style.gap = "0.45rem";

    const rank = document.createElement("span");
    rank.className = "num-tabular";
    rank.style.fontWeight = "700";
    rank.style.color = "var(--ink-muted)";
    rank.style.fontSize = "0.85rem";
    rank.textContent = `${idx + 1}.`;
    nameBox.appendChild(rank);

    const name = document.createElement("span");
    name.style.fontWeight = "600";
    name.style.fontSize = "0.88rem";
    name.style.color = "var(--ink-navy)";
    name.textContent = d.department_name;
    nameBox.appendChild(name);

    item.appendChild(nameBox);

    const track = document.createElement("div");
    track.className = "dept-bar-track";
    const fill = document.createElement("div");
    fill.className = "dept-bar-fill";
    fill.style.width = `${Math.round((d.student_count / maxStudents) * 100)}%`;
    track.appendChild(fill);
    item.appendChild(track);

    const statsBox = document.createElement("div");
    statsBox.style.textAlign = "right";

    const pct = totalStudents > 0 ? Math.round((d.student_count / totalStudents) * 100) : 0;
    const countSpan = document.createElement("span");
    countSpan.className = "num-tabular";
    countSpan.style.fontWeight = "600";
    countSpan.style.fontSize = "0.85rem";
    countSpan.textContent = `${d.student_count} (${pct}%)`;
    statsBox.appendChild(countSpan);

    item.appendChild(statsBox);

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
        <div class="empty-notice" style="margin: 0; padding: 1.5rem;">
          ${renderEmptyStateSVG()}
          <div>No students matched these criteria. Try adjusting the query terms or remove a skill requirement.</div>
        </div>
      `;
    } else {
      const first5 = students.slice(0, 5);
      first5.forEach((s, idx) => {
        const row = document.createElement("div");
        row.className = "ask-result-row";
        row.style.animationDelay = `${idx * 60}ms`; // Stagger under 300ms
        row.style.display = "flex";
        row.style.justifyContent = "space-between";
        row.style.alignItems = "center";
        row.style.padding = "0.75rem 1rem";
        row.style.background = "var(--surface)";
        row.style.border = "1px solid var(--border)";
        row.style.gap = "1rem";
        row.style.flexWrap = "wrap";

        const left = document.createElement("div");
        left.style.display = "flex";
        left.style.alignItems = "center";
        left.style.gap = "0.5rem";

        const dot = document.createElement("span");
        dot.className = `avail-dot avail-${s.available}`;
        left.appendChild(dot);

        const nameLink = document.createElement("a");
        nameLink.href = `/app/student.html?id=${s.id}`;
        nameLink.style.fontFamily = "var(--font-heading)";
        nameLink.style.fontWeight = "700";
        nameLink.style.color = "var(--ink-navy)";
        nameLink.textContent = s.full_name;
        left.appendChild(nameLink);

        const degree = document.createElement("span");
        degree.style.fontSize = "0.82rem";
        degree.style.color = "var(--ink-muted)";
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
          badge.style.background = "var(--paper)";
          badge.style.padding = "0.2rem 0.45rem";
          badge.style.border = "1px solid var(--border)";

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
    seeAllLink.className = "btn btn-secondary btn-sm";
    seeAllLink.textContent = `See all results (${students.length}) in student roster`;
    seeAllArea.appendChild(seeAllLink);

  } catch (err) {
    resultsList.innerHTML = `<div class="empty-notice" style="margin: 0; padding: 1rem; color: var(--coral);">${err.message || "Failed to execute smart search."}</div>`;
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Ask";
  }
}

document.addEventListener("DOMContentLoaded", initDashboard);
