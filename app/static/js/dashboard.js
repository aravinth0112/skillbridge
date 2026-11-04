/**
 * SkillBridge Dashboard Controller
 * Modern Clean SaaS Dashboard & Academic Matcher
 */

async function initDashboard() {
  const railContainer = document.getElementById("rail-container");
  if (railContainer) {
    railContainer.innerHTML = renderRailNav("dashboard");
  }

  const headerContainer = document.getElementById("header-container");
  if (headerContainer) {
    headerContainer.innerHTML = renderTopHeader();
  }

  // Expose global query handlers for top search bar and prompt chips
  window.runAskQuery = runAskQuery;
  window.clearAskResults = clearAskResults;

  await loadDashboardStats();

  // If redirected with ?ask= query from URL
  const urlParams = new URLSearchParams(window.location.search);
  const askQuery = urlParams.get("ask");
  if (askQuery) {
    const topAsk = document.getElementById("top-ask-input");
    if (topAsk) topAsk.value = askQuery;
    runAskQuery(askQuery);
  }
}

/**
 * Loads real platform statistics from /api/v1/dashboard/stats
 */
async function loadDashboardStats() {
  try {
    const stats = await apiRequest("/dashboard/stats");

    // 1. Dashboard Stat Cards (Real API values)
    animateCountUp("stat-students", stats.totals.students, 400);
    animateCountUp("stat-open-projects", stats.totals.open_projects || 0, 350);
    animateCountUp("stat-skills", stats.totals.skills, 400);
    animateCountUp("stat-shortlists", stats.totals.shortlists, 350);
    
    const verifiedPctEl = document.getElementById("stat-verified-pct");
    if (verifiedPctEl) {
      verifiedPctEl.textContent = `${stats.totals.verified_skills_pct || 0}%`;
    }

    // Hidden backward compatibility elements
    const setSafe = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };
    setSafe("total-students", stats.totals.students);
    setSafe("total-projects", stats.totals.projects);
    setSafe("total-skills", stats.totals.skills);
    setSafe("total-courses", stats.totals.courses);
    setSafe("total-shortlists", stats.totals.shortlists);
    setSafe("total-departments", stats.totals.departments);

    // 2. Supply vs Demand Benchmark
    renderSupplyDemandChart(stats.top_skills || []);

    // 3. Thin Bench Panel (Skills open projects need with 3 or fewer students)
    renderThinBench(stats.top_skills || []);

    // 4. Ranked Department Distribution
    renderRankedDepartments(stats.students_per_department || [], stats.totals.students);

    // 5. Recent Shortlists & Open Projects
    await Promise.all([
      loadRecentShortlists(),
      loadOpenProjects()
    ]);

  } catch (err) {
    console.error("Failed to load dashboard stats:", err);
  }
}

/**
 * Loads the latest 5 shortlists from /shortlists/
 */
async function loadRecentShortlists() {
  const container = document.getElementById("recent-shortlists-list");
  if (!container) return;

  try {
    const shortlists = await apiRequest("/shortlists/?limit=5");
    container.innerHTML = "";

    if (!shortlists || shortlists.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 1.5rem; color: var(--text-muted); font-size: 0.88rem;">
          No one shortlisted yet. Open a project and click Find matches.
        </div>
      `;
      return;
    }

    shortlists.slice(0, 5).forEach(sl => {
      const item = document.createElement("div");
      item.style.display = "flex";
      item.style.justifyContent = "space-between";
      item.style.alignItems = "center";
      item.style.padding = "0.75rem 1rem";
      item.style.background = "var(--bg-surface)";
      item.style.border = "1px solid var(--border)";
      item.style.borderRadius = "var(--radius-md)";
      item.style.gap = "0.75rem";
      item.style.flexWrap = "wrap";

      const left = document.createElement("div");
      left.style.display = "flex";
      left.style.flexDirection = "column";
      left.style.gap = "0.2rem";

      const topRow = document.createElement("div");
      topRow.style.display = "flex";
      topRow.style.alignItems = "center";
      topRow.style.gap = "0.5rem";

      const sLink = document.createElement("a");
      sLink.href = `/app/student.html?id=${sl.student_id}`;
      sLink.style.fontWeight = "700";
      sLink.style.fontSize = "0.9rem";
      sLink.style.color = "var(--text-primary)";
      sLink.style.textDecoration = "none";
      sLink.textContent = sl.student_name || `Student #${sl.student_id}`;
      topRow.appendChild(sLink);

      const statusBadge = document.createElement("span");
      statusBadge.className = `status-pill status-${sl.status}`;
      statusBadge.style.fontSize = "0.72rem";
      const statusLabels = {
        shortlisted: "Shortlisted",
        contacted: "Contacted",
        selected: "Selected"
      };
      statusBadge.textContent = statusLabels[sl.status] || sl.status;
      topRow.appendChild(statusBadge);

      left.appendChild(topRow);

      const pRow = document.createElement("div");
      pRow.style.fontSize = "0.8rem";
      pRow.style.color = "var(--text-muted)";
      const pLink = document.createElement("a");
      pLink.href = `/app/project.html?id=${sl.project_id}`;
      pLink.style.color = "var(--text-secondary)";
      pLink.style.textDecoration = "none";
      pLink.textContent = sl.project_title || `Project #${sl.project_id}`;
      pRow.appendChild(document.createTextNode("for "));
      pRow.appendChild(pLink);
      left.appendChild(pRow);

      item.appendChild(left);

      const right = document.createElement("div");
      right.style.display = "flex";
      right.style.alignItems = "center";
      right.style.gap = "0.75rem";

      if (sl.match_score !== null && sl.match_score !== undefined) {
        const score = document.createElement("span");
        score.style.fontWeight = "700";
        score.style.fontSize = "0.9rem";
        score.style.color = "var(--primary)";
        score.textContent = `${Math.round(sl.match_score)}%`;
        right.appendChild(score);
      }

      if (sl.created_at) {
        const dateSpan = document.createElement("span");
        dateSpan.style.fontSize = "0.75rem";
        dateSpan.style.color = "var(--text-muted)";
        const dateObj = new Date(sl.created_at);
        dateSpan.textContent = dateObj.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
        right.appendChild(dateSpan);
      }

      item.appendChild(right);
      container.appendChild(item);
    });

  } catch (err) {
    console.error("Failed to load recent shortlists:", err);
  }
}

/**
 * Loads the top 3 open projects from /projects/?status=open
 */
async function loadOpenProjects() {
  const container = document.getElementById("open-projects-list");
  if (!container) return;

  try {
    const projects = await apiRequest("/projects/?status=open");
    container.innerHTML = "";

    if (!projects || projects.length === 0) {
      container.innerHTML = `
        <div style="padding: 1rem; color: var(--text-muted); font-size: 0.85rem; text-align: center;">
          No open projects available.
        </div>
      `;
      return;
    }

    projects.slice(0, 3).forEach(p => {
      const item = document.createElement("div");
      item.style.display = "flex";
      item.style.justifyContent = "space-between";
      item.style.alignItems = "center";
      item.style.padding = "0.75rem 0.85rem";
      item.style.background = "var(--bg-surface)";
      item.style.border = "1px solid var(--border)";
      item.style.borderRadius = "var(--radius-md)";
      item.style.gap = "0.75rem";

      const left = document.createElement("div");
      left.style.display = "flex";
      left.style.flexDirection = "column";
      left.style.gap = "0.2rem";
      left.style.minWidth = "0";

      const pTitle = document.createElement("a");
      pTitle.href = `/app/project.html?id=${p.id}`;
      pTitle.style.fontWeight = "700";
      pTitle.style.fontSize = "0.88rem";
      pTitle.style.color = "var(--text-primary)";
      pTitle.style.textDecoration = "none";
      pTitle.style.whiteSpace = "nowrap";
      pTitle.style.overflow = "hidden";
      pTitle.style.textOverflow = "ellipsis";
      pTitle.textContent = p.title;
      left.appendChild(pTitle);

      const dInfo = formatDateWithChip(p.deadline);
      const meta = document.createElement("span");
      meta.style.fontSize = "0.75rem";
      meta.style.color = "var(--text-muted)";
      meta.textContent = `${dInfo.formatted} · ${dInfo.chipText}`;
      left.appendChild(meta);

      item.appendChild(left);

      const matchLink = document.createElement("a");
      matchLink.href = `/app/project.html?id=${p.id}`;
      matchLink.className = "btn btn-secondary btn-sm";
      matchLink.style.fontSize = "0.75rem";
      matchLink.style.whiteSpace = "nowrap";
      matchLink.textContent = "Find matches";
      item.appendChild(matchLink);

      container.appendChild(item);
    });

  } catch (err) {
    console.error("Failed to load open projects:", err);
  }
}

/**
 * Renders the Thin Bench card: skills with project demand > 0 and student supply <= 3
 */
function renderThinBench(skills) {
  const container = document.getElementById("thin-bench-container");
  if (!container) return;
  container.innerHTML = "";

  const thinSkills = (skills || []).filter(s => s.project_count > 0 && s.student_count <= 3);

  if (thinSkills.length === 0) {
    container.innerHTML = `
      <div style="padding: 1rem; color: var(--text-muted); font-size: 0.85rem; text-align: center;">
        No thin bench skills detected; all requested competencies have sufficient student supply.
      </div>
    `;
    return;
  }

  thinSkills.forEach(s => {
    const item = document.createElement("div");
    item.style.display = "flex";
    item.style.alignItems = "center";
    item.style.justifyContent = "space-between";
    item.style.padding = "0.65rem 0.85rem";
    item.style.background = "var(--bg-surface)";
    item.style.border = "1px solid var(--border)";
    item.style.borderRadius = "var(--radius-md)";
    item.style.gap = "0.75rem";

    const left = document.createElement("div");
    left.style.display = "flex";
    left.style.flexDirection = "column";
    left.style.gap = "0.15rem";

    const titleRow = document.createElement("div");
    titleRow.style.display = "flex";
    titleRow.style.alignItems = "center";
    titleRow.style.gap = "0.4rem";

    const name = document.createElement("strong");
    name.style.fontSize = "0.88rem";
    name.style.color = "var(--text-primary)";
    name.textContent = s.skill_name;
    titleRow.appendChild(name);

    const tag = document.createElement("span");
    tag.className = "thin-bench-tag";
    tag.textContent = "Thin bench";
    titleRow.appendChild(tag);
    left.appendChild(titleRow);

    const desc = document.createElement("div");
    desc.style.fontSize = "0.78rem";
    desc.style.color = "var(--text-secondary)";
    desc.textContent = `Needed by ${s.project_count} project${s.project_count === 1 ? '' : 's'} · only ${s.student_count} student${s.student_count === 1 ? '' : 's'} offer this`;
    left.appendChild(desc);

    item.appendChild(left);

    const action = document.createElement("a");
    action.href = `/app/students.html?skills=${encodeURIComponent(s.skill_name)}`;
    action.className = "btn btn-secondary btn-sm";
    action.style.fontSize = "0.75rem";
    action.style.whiteSpace = "nowrap";
    action.textContent = "View roster";
    item.appendChild(action);

    container.appendChild(item);
  });
}

/**
 * Renders Supply vs Demand Chart
 */
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

/**
 * Renders Students by Department Breakdown
 */
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

/**
 * Click handler for example queries
 */
function applySampleQuery(queryText) {
  const topAsk = document.getElementById("top-ask-input");
  if (topAsk) {
    topAsk.value = queryText;
  }
  runAskQuery(queryText);
}

/**
 * Executes Ask search and renders results in the inline card
 */
async function runAskQuery(query) {
  const resultsContainer = document.getElementById("ask-results-container");
  const filtersArea = document.getElementById("ask-interpreted-filters");
  const resultsList = document.getElementById("ask-results-list");
  const seeAllArea = document.getElementById("ask-see-all-container");

  if (!resultsContainer || !resultsList) return;

  resultsContainer.style.display = "block";
  resultsContainer.scrollIntoView({ behavior: "smooth", block: "start" });
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
  }
}

function clearAskResults() {
  const container = document.getElementById("ask-results-container");
  if (container) container.style.display = "none";
}

document.addEventListener("DOMContentLoaded", initDashboard);
