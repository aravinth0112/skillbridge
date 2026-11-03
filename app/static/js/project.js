/**
 * SkillBridge Project Detail & Matcher Controller
 * UI Round A Enhancements:
 * - Deadline formatted with relative chip ("15 Dec 2026", "in 12 days", coral under 14 days, "overdue" if past)
 * - Replace confirm() with inline confirmations ("Delete project? Delete / Keep", "Remove Python? Delete / Keep")
 * - Zero browser validation bubbles
 * - Skeleton rows on load
 * - Sentence-case labels throughout
 */

const urlParams = new URLSearchParams(window.location.search);
const projectId = parseInt(urlParams.get("id"));

let currentProject = null;
let currentRequirements = [];
let allCatalogSkills = [];
let projectShortlists = [];

async function initProjectDetail() {
  const railContainer = document.getElementById("rail-container");
  if (railContainer) {
    railContainer.innerHTML = renderRailNav("projects");
  }

  const headerContainer = document.getElementById("header-container");
  if (headerContainer) {
    headerContainer.innerHTML = renderTopHeader();
  }

  if (!projectId || isNaN(projectId)) {
    showInlineNotice("project-notice-area", "Invalid or missing project identifier. Redirecting to projects list...", "error");
    setTimeout(() => { window.location.href = "/app/projects.html"; }, 1500);
    return;
  }

  setupPipelineDropZones();
  await loadSkillsCatalog();
  await refreshProjectData();
}

async function loadSkillsCatalog() {
  try {
    allCatalogSkills = await apiRequest("/skills/");
    const select = document.getElementById("add-req-select");
    select.innerHTML = '<option value="">Select skill...</option>';
    allCatalogSkills.forEach(s => {
      const opt = document.createElement("option");
      opt.value = s.id;
      opt.textContent = `${s.name} (${s.category})`;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error("Failed to load skills catalog:", err);
  }
}

async function refreshProjectData() {
  try {
    const [project, reqSkills, shortlists] = await Promise.all([
      apiRequest(`/projects/${projectId}`),
      apiRequest(`/project-skills/?project_id=${projectId}`),
      apiRequest(`/shortlists/?project_id=${projectId}`)
    ]);

    currentProject = project;
    currentRequirements = reqSkills;
    projectShortlists = shortlists;

    // Header info
    setText("proj-title", project.title);
    setText("proj-desc", project.description);
    setText("proj-email", `Contact: ${project.contact_email}`);

    // Deadline with relative chip (nowrap)
    const deadlineContainer = document.getElementById("proj-deadline-container");
    if (deadlineContainer) {
      const dateInfo = formatDateWithRelative(project.deadline);
      deadlineContainer.innerHTML = `<span>Application deadline:</span> ${dateInfo.html}`;
    }

    const statusBadge = document.getElementById("proj-status-badge");
    if (statusBadge) {
      statusBadge.className = `status-pill status-${project.status}`;
      const statusLabels = {
        open: "Open",
        in_progress: "In progress",
        completed: "Completed"
      };
      statusBadge.textContent = statusLabels[project.status] || project.status;
    }

    renderRequirementsLedger(reqSkills);
    renderShortlistPipeline(shortlists);

  } catch (err) {
    showInlineNotice("project-notice-area", "Failed to load project details. Please refresh the page.", "error");
  }
}

function renderRequirementsLedger(reqSkills) {
  const tbody = document.getElementById("req-skills-tbody");
  tbody.innerHTML = "";

  if (reqSkills.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 4;
    td.className = "empty-notice";
    td.textContent = "No skill requirements added yet. Add at least one requirement to run candidate matching.";
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  reqSkills.forEach(rs => {
    const tr = document.createElement("tr");

    // Skill Name
    const tdName = document.createElement("td");
    tdName.style.fontWeight = "600";
    tdName.textContent = rs.skill_name || "Skill";
    tr.appendChild(tdName);

    // 5-Segment Requirement Gauge
    const tdGauge = document.createElement("td");
    const gaugeEl = createSkillGauge({
      level: rs.min_proficiency,
      mode: "requirement",
      skillName: rs.skill_name || "Skill"
    });
    tdGauge.appendChild(gaugeEl);
    tr.appendChild(tdGauge);

    // Priority Weight
    const tdWeight = document.createElement("td");
    tdWeight.className = "num-tabular";
    tdWeight.textContent = `Weight ${rs.weight}/5`;
    tr.appendChild(tdWeight);

    // Action with Inline Confirmation (zero confirm() popup)
    const tdAct = document.createElement("td");
    tdAct.style.textAlign = "right";

    const actContainer = document.createElement("div");
    actContainer.style.display = "inline-flex";
    actContainer.style.alignItems = "center";
    actContainer.style.gap = "0.5rem";

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "btn btn-danger btn-sm";
    removeBtn.textContent = "Remove";
    removeBtn.onclick = () => {
      removeBtn.style.display = "none";
      showInlineConfirm(
        actContainer,
        `Remove ${rs.skill_name || "skill"}?`,
        async () => {
          tr.classList.add("row-collapsing");
          setTimeout(async () => {
            await executeRemoveRequirement(rs.id, rs.skill_name);
          }, 220);
        },
        () => {
          removeBtn.style.display = "inline-flex";
        }
      );
    };
    actContainer.appendChild(removeBtn);
    tdAct.appendChild(actContainer);
    tr.appendChild(tdAct);

    tbody.appendChild(tr);
  });
}

// Add Requirement with Inline Error Validation
async function handleAddRequirement(event) {
  event.preventDefault();
  const feedbackArea = document.getElementById("add-req-feedback");
  const skillSelect = document.getElementById("add-req-select");

  clearFieldError(skillSelect);

  const skillId = parseInt(skillSelect.value);
  const minProf = parseInt(document.getElementById("add-req-min").value);
  const weight = parseInt(document.getElementById("add-req-weight").value);

  if (!skillId) {
    showFieldError(skillSelect, "Select a valid skill from the list");
    return;
  }

  try {
    await apiRequest("/project-skills/", {
      method: "POST",
      body: JSON.stringify({
        project_id: projectId,
        skill_id: skillId,
        min_proficiency: minProf,
        weight: weight
      })
    });

    showInlineNotice(feedbackArea, "Skill requirement added to project.", "success");
    document.getElementById("add-req-form").reset();
    await refreshProjectData();
  } catch (err) {
    showInlineNotice(feedbackArea, err.message || "Failed to add requirement.", "error");
  }
}

// Remove Requirement
async function executeRemoveRequirement(requirementId, skillName) {
  try {
    await apiRequest(`/project-skills/${requirementId}`, { method: "DELETE" });
    showInlineNotice("project-notice-area", `Requirement for ${skillName || "skill"} removed.`, "success");
    await refreshProjectData();
  } catch (err) {
    showInlineNotice("project-notice-area", err.message || "Failed to remove requirement.", "error");
  }
}

// Find Matches
async function findMatches() {
  const container = document.getElementById("matches-container");
  container.innerHTML = renderSkeletonRows(2);

  if (currentRequirements.length === 0) {
    container.innerHTML = '<div class="empty-notice">Cannot find matches: this project has no required skills. Add at least one requirement first.</div>';
    return;
  }

  // Signature moment: Scan line sweep across requirements ledger
  const reqLedger = document.getElementById("req-skills-tbody");
  const reqTableContainer = reqLedger ? reqLedger.closest(".table-container") : null;
  if (reqTableContainer && !document.documentElement.classList.contains("motion-off")) {
    reqTableContainer.classList.add("scan-line-active");
    const scanOverlay = document.createElement("div");
    scanOverlay.className = "scan-line-overlay";
    reqTableContainer.appendChild(scanOverlay);
    setTimeout(() => {
      scanOverlay.remove();
      reqTableContainer.classList.remove("scan-line-active");
    }, 750);
  }

  try {
    const candidates = await apiRequest(`/matching/projects/${projectId}/students?min_score=0&limit=15`);
    container.innerHTML = "";

    if (candidates.length === 0) {
      container.innerHTML = '<div class="empty-notice">No student candidates found in the database.</div>';
      return;
    }

    candidates.forEach((cand, idx) => {
      const row = document.createElement("div");
      row.className = "panel match-candidate-row";
      row.style.marginBottom = "1rem";
      row.style.padding = "1.25rem";
      row.style.borderLeft = "4px solid var(--cobalt)";
      row.style.animationDelay = `${idx * 80}ms`;

      const header = document.createElement("div");
      header.style.display = "flex";
      header.style.justifyContent = "space-between";
      header.style.alignItems = "baseline";
      header.style.flexWrap = "wrap";
      header.style.gap = "0.75rem";
      header.style.marginBottom = "1rem";
      header.style.borderBottom = "1px solid var(--border-subtle)";
      header.style.paddingBottom = "0.75rem";

      const leftInfo = document.createElement("div");
      leftInfo.style.display = "flex";
      leftInfo.style.alignItems = "baseline";
      leftInfo.style.gap = "1rem";
      leftInfo.style.flexWrap = "wrap";

      const scoreSpan = document.createElement("span");
      scoreSpan.className = "score-val";
      scoreSpan.style.fontFamily = "var(--font-heading)";
      scoreSpan.style.fontSize = "1.6rem";
      scoreSpan.style.fontWeight = "700";
      scoreSpan.style.color = "var(--cobalt)";
      scoreSpan.textContent = "0%";
      leftInfo.appendChild(scoreSpan);
      animateCountUp(scoreSpan, cand.score, 600, "%");

      const candidateLink = document.createElement("a");
      candidateLink.href = `/app/student.html?id=${cand.student_id}`;
      candidateLink.style.fontFamily = "var(--font-heading)";
      candidateLink.style.fontSize = "1.15rem";
      candidateLink.style.fontWeight = "700";
      candidateLink.style.color = "var(--ink-navy)";
      candidateLink.textContent = cand.full_name;
      leftInfo.appendChild(candidateLink);

      const metaSpan = document.createElement("span");
      metaSpan.style.color = "var(--ink-muted)";
      metaSpan.style.fontSize = "0.88rem";
      metaSpan.textContent = `${cand.reg_no} · ${cand.course_name || "Degree"} · Year ${cand.year_of_study}`;
      leftInfo.appendChild(metaSpan);

      header.appendChild(leftInfo);

      const btnShortlist = document.createElement("button");
      btnShortlist.type = "button";
      btnShortlist.className = "btn btn-primary btn-sm";
      btnShortlist.textContent = "Shortlist";
      btnShortlist.onclick = () => shortlistCandidate(cand.student_id, cand.score, cand.full_name);
      header.appendChild(btnShortlist);

      row.appendChild(header);

      // Requirements Match Gauges Breakdown
      const reqBreakdown = document.createElement("div");
      reqBreakdown.style.display = "grid";
      reqBreakdown.style.gridTemplateColumns = "repeat(auto-fit, minmax(280px, 1fr))";
      reqBreakdown.style.gap = "0.85rem 1.5rem";

      currentRequirements.forEach((req, reqIdx) => {
        const item = document.createElement("div");
        item.style.display = "flex";
        item.style.alignItems = "center";
        item.style.justifyContent = "space-between";
        item.style.gap = "0.75rem";

        const skillTitle = document.createElement("span");
        skillTitle.style.fontWeight = "500";
        skillTitle.style.fontSize = "0.9rem";
        skillTitle.textContent = req.skill_name || `Skill #${req.skill_id}`;

        const matched = cand.matched_skills.find(m => m.skill === req.skill_name);
        const missing = cand.missing_skills.find(m => m.skill === req.skill_name);

        let studentLevel = 0;
        let isVerified = false;

        if (matched) {
          studentLevel = matched.student_level;
          isVerified = matched.verified;
        } else if (missing) {
          studentLevel = missing.student_level || 0;
        }

        const gauge = createSkillGauge({
          level: studentLevel,
          requiredLevel: req.min_proficiency,
          mode: "match",
          skillName: req.skill_name,
          animate: true,
          staggerIndex: (idx * 2) + reqIdx
        });

        if (isVerified) {
          const verBadge = document.createElement("span");
          verBadge.className = "verified-check";
          verBadge.textContent = "Verified";
          gauge.appendChild(verBadge);
        }

        item.appendChild(skillTitle);
        item.appendChild(gauge);
        reqBreakdown.appendChild(item);
      });

      row.appendChild(reqBreakdown);
      container.appendChild(row);
    });

  } catch (err) {
    container.innerHTML = `<div class="empty-notice">${err.message || "Failed to calculate matches. Make sure project has required skills."}</div>`;
  }
}

async function shortlistCandidate(candidateStudentId, matchScore, studentName) {
  try {
    await apiRequest("/shortlists/", {
      method: "POST",
      body: JSON.stringify({
        project_id: projectId,
        student_id: candidateStudentId,
        match_score: matchScore,
        status: "shortlisted"
      })
    });

    showInlineNotice("project-notice-area", `${studentName || "Student"} shortlisted.`, "success");
    await refreshProjectData();
  } catch (err) {
    showInlineNotice("project-notice-area", err.message || "Failed to shortlist candidate.", "error");
  }
}

function handleAutoShortlist() {
  const container = document.getElementById("project-notice-area");
  showInlineConfirm(
    container,
    "Auto-shortlist the top 5 matching candidates (min score 50%)?",
    async () => {
      try {
        const res = await apiRequest(`/matching/projects/${projectId}/auto-shortlist?top_n=5&min_score=50`, {
          method: "POST"
        });
        showInlineNotice("project-notice-area", `Auto-shortlist completed: added ${res.created_count} candidate(s), skipped ${res.skipped_count} already shortlisted.`, "success");
        await refreshProjectData();
      } catch (err) {
        showInlineNotice("project-notice-area", err.message || "Auto-shortlist failed.", "error");
      }
    }
  );
}

function renderShortlistPipeline(shortlists) {
  const stages = {
    shortlisted: [],
    contacted: [],
    selected: []
  };

  shortlists.forEach(sl => {
    if (stages[sl.status]) {
      stages[sl.status].push(sl);
    } else {
      stages.shortlisted.push(sl);
    }
  });

  setText("count-shortlisted", stages.shortlisted.length);
  setText("count-contacted", stages.contacted.length);
  setText("count-selected", stages.selected.length);

  renderPipelineColumn("cards-shortlisted", stages.shortlisted, "shortlisted");
  renderPipelineColumn("cards-contacted", stages.contacted, "contacted");
  renderPipelineColumn("cards-selected", stages.selected, "selected");
}

function renderPipelineColumn(containerId, list, stageName) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  if (list.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-notice";
    empty.style.margin = "0";
    empty.style.padding = "1.5rem 0.5rem";
    empty.style.fontSize = "0.85rem";
    empty.textContent = "No students in this stage";
    container.appendChild(empty);
    return;
  }

  list.forEach(item => {
    const card = document.createElement("div");
    card.className = "pipeline-card";
    card.draggable = true;
    card.setAttribute("data-shortlist-id", item.id);
    card.setAttribute("data-stage", stageName);

    card.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", JSON.stringify({ id: item.id, fromStage: stageName }));
      e.dataTransfer.effectAllowed = "move";
      card.classList.add("dragging");
    });

    card.addEventListener("dragend", () => {
      card.classList.remove("dragging");
    });

    const cardHeader = document.createElement("div");
    cardHeader.style.display = "flex";
    cardHeader.style.justifyContent = "space-between";
    cardHeader.style.alignItems = "baseline";

    const nameWrap = document.createElement("div");
    nameWrap.style.display = "flex";
    nameWrap.style.alignItems = "center";
    nameWrap.style.gap = "0.45rem";

    const link = document.createElement("a");
    link.href = `/app/student.html?id=${item.student_id}`;
    link.style.fontWeight = "600";
    link.style.color = "var(--ink-navy)";
    link.textContent = item.student_name || `Student #${item.student_id}`;
    nameWrap.appendChild(link);

    if (stageName === "selected") {
      nameWrap.insertAdjacentHTML("beforeend", getDrawCheckSVG());
    }
    cardHeader.appendChild(nameWrap);

    const score = document.createElement("span");
    score.className = "pipeline-card-score num-tabular";
    score.textContent = `${item.match_score}%`;
    cardHeader.appendChild(score);

    card.appendChild(cardHeader);

    if (item.notes) {
      const notesP = document.createElement("p");
      notesP.style.fontSize = "0.8rem";
      notesP.style.color = "var(--ink-muted)";
      notesP.style.marginTop = "0.35rem";
      notesP.textContent = item.notes;
      card.appendChild(notesP);
    }

    const actions = document.createElement("div");
    actions.className = "pipeline-actions";

    if (stageName === "contacted") {
      const backBtn = document.createElement("button");
      backBtn.type = "button";
      backBtn.className = "btn btn-secondary btn-sm";
      backBtn.textContent = "Move back";
      backBtn.onclick = () => updateShortlistStatus(item.id, "shortlisted");
      actions.appendChild(backBtn);
    } else if (stageName === "selected") {
      const backBtn = document.createElement("button");
      backBtn.type = "button";
      backBtn.className = "btn btn-secondary btn-sm";
      backBtn.textContent = "Move back";
      backBtn.onclick = () => updateShortlistStatus(item.id, "contacted");
      actions.appendChild(backBtn);
    }

    if (stageName === "shortlisted") {
      const fwdBtn = document.createElement("button");
      fwdBtn.type = "button";
      fwdBtn.className = "btn btn-primary btn-sm";
      fwdBtn.textContent = "Move forward";
      fwdBtn.onclick = () => updateShortlistStatus(item.id, "contacted");
      actions.appendChild(fwdBtn);
    } else if (stageName === "contacted") {
      const fwdBtn = document.createElement("button");
      fwdBtn.type = "button";
      fwdBtn.className = "btn btn-primary btn-sm";
      fwdBtn.textContent = "Move forward";
      fwdBtn.onclick = () => updateShortlistStatus(item.id, "selected");
      actions.appendChild(fwdBtn);
    }

    // Inline Confirmation for Remove Candidate
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "btn btn-danger btn-sm";
    removeBtn.textContent = "Remove from shortlist";
    removeBtn.onclick = () => {
      removeBtn.style.display = "none";
      showInlineConfirm(
        actions,
        `Remove ${item.student_name || "student"}?`,
        async () => {
          card.classList.add("row-collapsing");
          setTimeout(async () => {
            await executeRemoveShortlistCandidate(item.id, item.student_name);
          }, 220);
        },
        () => {
          removeBtn.style.display = "inline-flex";
        }
      );
    };
    actions.appendChild(removeBtn);

    card.appendChild(actions);
    container.appendChild(card);
  });
}

function setupPipelineDropZones() {
  const colMappings = [
    { id: "cards-shortlisted", stage: "shortlisted" },
    { id: "cards-contacted", stage: "contacted" },
    { id: "cards-selected", stage: "selected" }
  ];

  colMappings.forEach(({ id, stage }) => {
    const colCards = document.getElementById(id);
    const col = colCards ? colCards.closest(".pipeline-col") : null;
    if (!col || col.dataset.dropReady) return;
    col.dataset.dropReady = "true";

    col.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      col.classList.add("drag-over");
    });

    col.addEventListener("dragleave", (e) => {
      if (!col.contains(e.relatedTarget)) {
        col.classList.remove("drag-over");
      }
    });

    col.addEventListener("drop", async (e) => {
      e.preventDefault();
      col.classList.remove("drag-over");
      try {
        const raw = e.dataTransfer.getData("text/plain");
        if (!raw) return;
        const data = JSON.parse(raw);
        if (data.id && data.fromStage !== stage) {
          await updateShortlistStatus(data.id, stage);
        }
      } catch (err) {
        console.error("Drop handling error:", err);
      }
    });
  });
}

async function updateShortlistStatus(shortlistId, nextStatus) {
  const item = projectShortlists.find(s => s.id === shortlistId);
  const prevStatus = item ? item.status : null;

  // Optimistic UI update for immediate drag responsiveness
  if (item && prevStatus) {
    item.status = nextStatus;
    renderShortlistPipeline(projectShortlists);
  }

  try {
    await apiRequest(`/shortlists/${shortlistId}`, {
      method: "PUT",
      body: JSON.stringify({ status: nextStatus })
    });
    const statusLabels = {
      shortlisted: "Shortlisted",
      contacted: "Contacted",
      selected: "Selected"
    };
    showInlineNotice("project-notice-area", `Candidate status updated to ${statusLabels[nextStatus] || nextStatus}.`, "success");
    await refreshProjectData();
  } catch (err) {
    // Rollback UI on failure
    if (item && prevStatus) {
      item.status = prevStatus;
      renderShortlistPipeline(projectShortlists);
    }
    showInlineNotice("project-notice-area", `Failed to move candidate to ${nextStatus}: ${err.message || "Network error"}. Change reverted.`, "error");
  }
}

async function executeRemoveShortlistCandidate(shortlistId, studentName) {
  try {
    await apiRequest(`/shortlists/${shortlistId}`, { method: "DELETE" });
    showInlineNotice("project-notice-area", `${studentName || "Candidate"} removed from shortlist.`, "success");
    await refreshProjectData();
  } catch (err) {
    showInlineNotice("project-notice-area", err.message || "Failed to remove candidate.", "error");
  }
}

// Side Drawer for Editing Project
function openEditDrawer() {
  if (!currentProject) return;
  document.getElementById("edit-proj-title").value = currentProject.title;
  document.getElementById("edit-proj-desc").value = currentProject.description;
  document.getElementById("edit-proj-status").value = currentProject.status;
  document.getElementById("edit-proj-deadline").value = currentProject.deadline || "";
  document.getElementById("edit-proj-email").value = currentProject.contact_email;

  document.getElementById("edit-drawer-backdrop").classList.add("active");
  document.getElementById("edit-drawer").classList.add("active");
}

function closeEditDrawer() {
  document.getElementById("edit-drawer-backdrop").classList.remove("active");
  document.getElementById("edit-drawer").classList.remove("active");
}

async function handleSaveProject(event) {
  event.preventDefault();
  const feedbackArea = document.getElementById("edit-feedback-area");
  const saveBtn = document.getElementById("btn-save-project");

  const titleIn = document.getElementById("edit-proj-title");
  const descIn = document.getElementById("edit-proj-desc");
  const emailIn = document.getElementById("edit-proj-email");

  clearFieldError(titleIn);
  clearFieldError(descIn);
  clearFieldError(emailIn);

  let hasErr = false;
  if (!titleIn.value.trim()) {
    showFieldError(titleIn, "Enter project title");
    hasErr = true;
  }
  if (!descIn.value.trim()) {
    showFieldError(descIn, "Enter project description");
    hasErr = true;
  }
  if (!emailIn.value.trim() || !emailIn.value.includes("@")) {
    showFieldError(emailIn, "Enter valid contact email");
    hasErr = true;
  }

  if (hasErr) return;

  const payload = {
    title: titleIn.value.trim(),
    description: descIn.value.trim(),
    status: document.getElementById("edit-proj-status").value,
    deadline: document.getElementById("edit-proj-deadline").value || null,
    contact_email: emailIn.value.trim()
  };

  try {
    await apiRequest(`/projects/${projectId}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });

    saveBtn.innerHTML = `${getDrawCheckSVG()} Project saved`;
    showInlineNotice(feedbackArea, "Project saved.", "success");
    setTimeout(() => {
      closeEditDrawer();
      saveBtn.textContent = "Save project";
    }, 1200);

    await refreshProjectData();
  } catch (err) {
    showInlineNotice(feedbackArea, err.message || "Failed to save project changes.", "error");
  }
}

// Inline Confirmation for Delete Project (Replacing confirm())
function triggerDeleteProjectInline() {
  const container = document.getElementById("delete-proj-inline-area");
  const triggerBtn = document.getElementById("btn-delete-proj-trigger");
  triggerBtn.style.display = "none";

  showInlineConfirm(
    container,
    `Delete ${currentProject ? currentProject.title : "this project"}?`,
    async () => {
      try {
        await apiRequest(`/projects/${projectId}`, { method: "DELETE" });
        showInlineNotice("project-notice-area", "Project deleted. Redirecting...", "success");
        setTimeout(() => { window.location.href = "/app/projects.html"; }, 1000);
      } catch (err) {
        showInlineNotice("project-notice-area", err.message || "Failed to delete project.", "error");
        triggerBtn.style.display = "inline-flex";
      }
    },
    () => {
      triggerBtn.style.display = "inline-flex";
    }
  );
}

document.addEventListener("DOMContentLoaded", initProjectDetail);
