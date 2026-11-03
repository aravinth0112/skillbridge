/**
 * SkillBridge Projects Controller
 * UI Round A Enhancements:
 * - Single-line status chips, deadline chips with relative difference, and top 3 requirement gauges
 * - Right-side 3-step project wizard (Details, Requirements, Review)
 * - Quick deadline picks (2 weeks, 1 month, 3 months)
 * - Custom inline validation (zero native bubbles)
 * - Skeleton rows on load
 */

let allCatalogSkills = [];
let allProjectSkills = [];
let pendingRequirements = [];
let currentWizardStep = 1;
let builderLevel = 3;
let builderWeight = 3;

async function initProjectsPage() {
  const railContainer = document.getElementById("rail-container");
  if (railContainer) {
    railContainer.innerHTML = renderRailNav("projects");
  }

  const headerContainer = document.getElementById("header-container");
  if (headerContainer) {
    headerContainer.innerHTML = renderTopHeader();
  }

  setupRequirementBuilder();
  await loadCatalogAndProjects();
}

function setupRequirementBuilder() {
  const gaugeContainer = document.getElementById("builder-gauge-container");
  if (gaugeContainer) {
    gaugeContainer.innerHTML = "";
    const gaugeEl = createSkillGauge({
      level: builderLevel,
      mode: "interactive",
      skillName: "Requirement",
      onLevelChange: (newLevel) => {
        builderLevel = newLevel;
      }
    });
    gaugeContainer.appendChild(gaugeEl);
  }
}

function stepWeight(delta) {
  builderWeight = Math.max(1, Math.min(5, builderWeight + delta));
  setText("builder-weight-val", builderWeight);
}

function applyQuickPick(days) {
  const target = new Date();
  target.setDate(target.getDate() + days);
  const yyyy = target.getFullYear();
  const mm = String(target.getMonth() + 1).padStart(2, "0");
  const dd = String(target.getDate()).padStart(2, "0");
  document.getElementById("step-deadline").value = `${yyyy}-${mm}-${dd}`;
}

async function loadCatalogAndProjects() {
  try {
    const [skills] = await Promise.all([
      apiRequest("/skills/")
    ]);
    allCatalogSkills = skills || [];

    const select = document.getElementById("builder-skill");
    if (select) {
      select.innerHTML = '<option value="">Select skill...</option>';
      allCatalogSkills.forEach(s => {
        const opt = document.createElement("option");
        opt.value = s.id;
        opt.textContent = `${s.name} (${s.category})`;
        select.appendChild(opt);
      });
    }

    await loadProjects();
  } catch (err) {
    console.error("Failed to load catalog:", err);
  }
}

async function loadProjects(highlightProjectId = null) {
  const tbody = document.getElementById("projects-tbody");
  tbody.innerHTML = `<tr><td colspan="5">${renderSkeletonRows(3)}</td></tr>`;

  const statusFilter = document.getElementById("filter-status").value;
  const endpoint = statusFilter ? `/projects/?status=${encodeURIComponent(statusFilter)}` : "/projects/";

  try {
    const [projects, projectSkills] = await Promise.all([
      apiRequest(endpoint),
      apiRequest("/project-skills/?limit=100")
    ]);

    allProjectSkills = projectSkills || [];
    tbody.innerHTML = "";

    const countLabel = document.getElementById("projects-count");
    setText(countLabel, `${projects.length} project${projects.length === 1 ? "" : "s"} listed`);

    if (projects.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-notice">No projects match this filter. Change the status or click "New project" above to post one.</td></tr>';
      return;
    }

    projects.forEach(p => {
      const tr = document.createElement("tr");
      if (highlightProjectId && p.id === highlightProjectId) {
        tr.classList.add("newly-created-highlight");
        setTimeout(() => {
          tr.classList.remove("newly-created-highlight");
        }, 2000);
      }

      // Title & Overview
      const tdTitle = document.createElement("td");
      const link = document.createElement("a");
      link.href = `/app/project.html?id=${p.id}`;
      link.style.fontFamily = "var(--font-heading)";
      link.style.fontSize = "0.95rem";
      link.style.fontWeight = "700";
      link.style.color = "var(--ink-navy)";
      link.textContent = p.title;
      tdTitle.appendChild(link);

      const desc = document.createElement("div");
      desc.style.fontSize = "0.82rem";
      desc.style.color = "var(--ink-muted)";
      desc.textContent = p.description.length > 70 ? p.description.substring(0, 70) + "..." : p.description;
      tdTitle.appendChild(desc);
      tr.appendChild(tdTitle);

      // Status Chip (Single-line, nowrap)
      const tdStatus = document.createElement("td");
      const spanStatus = document.createElement("span");
      spanStatus.className = `status-pill status-${p.status}`;
      const statusLabels = {
        open: "Open",
        in_progress: "In progress",
        completed: "Completed"
      };
      spanStatus.textContent = statusLabels[p.status] || p.status;
      tdStatus.appendChild(spanStatus);
      tr.appendChild(tdStatus);

      // Application Deadline (Formatted with Relative Chip)
      const tdDeadline = document.createElement("td");
      tdDeadline.innerHTML = formatDateWithRelative(p.deadline).html;
      tr.appendChild(tdDeadline);

      // Top 3 Requirements Gauges
      const tdReqs = document.createElement("td");
      const pSkills = allProjectSkills.filter(ps => ps.project_id === p.id);
      if (pSkills.length === 0) {
        const noReq = document.createElement("span");
        noReq.style.fontSize = "0.82rem";
        noReq.style.color = "var(--ink-subtle)";
        noReq.textContent = "No requirements set";
        tdReqs.appendChild(noReq);
      } else {
        const top3 = pSkills.slice(0, 3);
        const reqsWrapper = document.createElement("div");
        reqsWrapper.style.display = "flex";
        reqsWrapper.style.flexWrap = "wrap";
        reqsWrapper.style.gap = "0.4rem";

        top3.forEach(ps => {
          const tag = document.createElement("div");
          tag.className = "compact-req-tag";
          tag.title = `${ps.skill_name || "Skill"}: Min Level ${ps.min_proficiency}/5 · Weight ${ps.weight}`;

          const name = document.createElement("strong");
          name.textContent = ps.skill_name || "Skill";
          tag.appendChild(name);

          const gauge = createSkillGauge({
            level: ps.min_proficiency,
            mode: "requirement",
            skillName: ps.skill_name || "Skill",
            compact: true
          });
          tag.appendChild(gauge);

          reqsWrapper.appendChild(tag);
        });

        tdReqs.appendChild(reqsWrapper);
      }
      tr.appendChild(tdReqs);

      // Single-line "Find matches" Button
      const tdAction = document.createElement("td");
      tdAction.style.textAlign = "right";
      const matchBtn = document.createElement("a");
      matchBtn.href = `/app/project.html?id=${p.id}`;
      matchBtn.className = "btn btn-secondary btn-sm";
      matchBtn.textContent = "Find matches";
      tdAction.appendChild(matchBtn);
      tr.appendChild(tdAction);

      tbody.appendChild(tr);
    });

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-notice">${err.message || "Failed to load projects."}</td></tr>`;
  }
}

// Wizard Step Navigation
function goToStep(step) {
  // Validate step 1 before proceeding to 2 or 3
  if (step > 1) {
    const titleIn = document.getElementById("step-title");
    const descIn = document.getElementById("step-desc");
    const emailIn = document.getElementById("step-email");

    clearFieldError(titleIn);
    clearFieldError(descIn);
    clearFieldError(emailIn);

    let hasErr = false;
    if (!titleIn.value.trim()) {
      showFieldError(titleIn, "Enter a project title");
      hasErr = true;
    }
    if (!descIn.value.trim()) {
      showFieldError(descIn, "Enter project description and deliverables");
      hasErr = true;
    }
    if (!emailIn.value.trim() || !emailIn.value.includes("@")) {
      showFieldError(emailIn, "Enter valid faculty contact email");
      hasErr = true;
    }

    if (hasErr) {
      currentWizardStep = 1;
      updateStepViews(1);
      return;
    }
  }

  // Populate Step 3 review if navigating there
  if (step === 3) {
    setText("review-title", document.getElementById("step-title").value.trim());
    setText("review-desc", document.getElementById("step-desc").value.trim());

    const statusMap = { open: "Open", in_progress: "In progress", completed: "Completed" };
    const statusVal = document.getElementById("step-status").value;
    const deadlineVal = document.getElementById("step-deadline").value;
    const emailVal = document.getElementById("step-email").value;

    setText("review-meta", `Status: ${statusMap[statusVal] || statusVal} · Deadline: ${deadlineVal || "None"} · Contact: ${emailVal}`);

    const reviewList = document.getElementById("review-reqs-list");
    reviewList.innerHTML = "";
    if (pendingRequirements.length === 0) {
      reviewList.innerHTML = '<div style="font-size:0.85rem; color:var(--ink-muted);">No required skills added. (You can add them later on the project page).</div>';
    } else {
      pendingRequirements.forEach(req => {
        const item = document.createElement("div");
        item.className = "pending-req-item";
        item.innerHTML = `<strong>${req.skill_name}</strong> <span>Min: ${req.min_proficiency}/5 · Weight: ${req.weight}/5</span>`;
        reviewList.appendChild(item);
      });
    }
  }

  currentWizardStep = step;
  updateStepViews(step);
}

function updateStepViews(step) {
  const container = document.getElementById("wizard-steps-container");
  if (container) {
    const offset = (step - 1) * 33.3333;
    container.style.transform = `translateX(-${offset}%)`;
  }

  document.getElementById("wizard-tab-1").classList.toggle("active", step === 1);
  document.getElementById("wizard-tab-2").classList.toggle("active", step === 2);
  document.getElementById("wizard-tab-3").classList.toggle("active", step === 3);
}

// Drawer Controls
function openNewProjectDrawer() {
  currentWizardStep = 1;
  updateStepViews(1);
  document.getElementById("new-project-backdrop").classList.add("active");
  document.getElementById("new-project-drawer").classList.add("active");
}

function closeNewProjectDrawer() {
  document.getElementById("new-project-backdrop").classList.remove("active");
  document.getElementById("new-project-drawer").classList.remove("active");
}

function addPendingRequirement() {
  const select = document.getElementById("builder-skill");
  const skillId = parseInt(select.value);
  const feedbackArea = document.getElementById("builder-feedback");

  if (!skillId) {
    showInlineNotice(feedbackArea, "Please choose a skill to add.", "error");
    return;
  }

  if (pendingRequirements.some(r => r.skill_id === skillId)) {
    showInlineNotice(feedbackArea, "This skill is already in the requirement list.", "error");
    return;
  }

  const skillObj = allCatalogSkills.find(s => s.id === skillId);
  pendingRequirements.push({
    skill_id: skillId,
    skill_name: skillObj ? skillObj.name : "Skill",
    min_proficiency: builderLevel,
    weight: builderWeight
  });

  renderPendingRequirements();
  select.value = "";
}

function removePendingRequirement(skillId) {
  pendingRequirements = pendingRequirements.filter(r => r.skill_id !== skillId);
  renderPendingRequirements();
}

function renderPendingRequirements() {
  const list = document.getElementById("pending-reqs-list");
  list.innerHTML = "";

  if (pendingRequirements.length === 0) {
    list.innerHTML = '<div style="font-size: 0.82rem; color: var(--ink-subtle);">No requirements added yet.</div>';
    return;
  }

  pendingRequirements.forEach(req => {
    const item = document.createElement("div");
    item.className = "pending-req-item";

    const left = document.createElement("div");
    left.style.display = "flex";
    left.style.alignItems = "center";
    left.style.gap = "0.5rem";

    const name = document.createElement("strong");
    name.textContent = req.skill_name;
    left.appendChild(name);

    const gauge = createSkillGauge({
      level: req.min_proficiency,
      mode: "requirement",
      skillName: req.skill_name,
      compact: true
    });
    left.appendChild(gauge);

    const wt = document.createElement("span");
    wt.className = "num-tabular";
    wt.style.color = "var(--ink-muted)";
    wt.textContent = `(Weight ${req.weight})`;
    left.appendChild(wt);

    item.appendChild(left);

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "btn btn-danger btn-sm";
    delBtn.textContent = "Remove";
    delBtn.onclick = () => removePendingRequirement(req.skill_id);
    item.appendChild(delBtn);

    list.appendChild(item);
  });
}

async function handleWizardSubmit(event) {
  event.preventDefault();
  const feedbackArea = document.getElementById("wizard-create-feedback");
  const submitBtn = document.getElementById("btn-create-submit");

  const title = document.getElementById("step-title").value.trim();
  const description = document.getElementById("step-desc").value.trim();
  const status = document.getElementById("step-status").value;
  const deadline = document.getElementById("step-deadline").value || null;
  const contact_email = document.getElementById("step-email").value.trim();

  submitBtn.disabled = true;
  submitBtn.textContent = "Creating...";

  try {
    // 1. Create Project
    const project = await apiRequest("/projects/", {
      method: "POST",
      body: JSON.stringify({
        title,
        description,
        status,
        deadline,
        contact_email
      })
    });

    // 2. Add Requirements
    let reqFailures = 0;
    if (pendingRequirements.length > 0) {
      for (const req of pendingRequirements) {
        try {
          await apiRequest("/project-skills/", {
            method: "POST",
            body: JSON.stringify({
              project_id: project.id,
              skill_id: req.skill_id,
              min_proficiency: req.min_proficiency,
              weight: req.weight
            })
          });
        } catch (e) {
          reqFailures++;
        }
      }
    }

    if (reqFailures > 0) {
      showInlineNotice(
        "projects-notice-area",
        `Project created, but ${reqFailures} requirement(s) could not be saved. You can complete them on the project page.`,
        "error"
      );
      setTimeout(() => {
        window.location.href = `/app/project.html?id=${project.id}`;
      }, 1500);
      return;
    }

    submitBtn.textContent = "Project created";
    showInlineNotice("projects-notice-area", `Project "${title}" created successfully.`, "success");

    setTimeout(() => {
      document.getElementById("wizard-form").reset();
      pendingRequirements = [];
      renderPendingRequirements();
      submitBtn.disabled = false;
      submitBtn.textContent = "Create project";
      closeNewProjectDrawer();
    }, 1200);

    await loadProjects(project.id);

  } catch (err) {
    submitBtn.disabled = false;
    submitBtn.textContent = "Create project";
    showInlineNotice(feedbackArea, err.message || "Failed to create project.", "error");
  }
}

document.addEventListener("DOMContentLoaded", initProjectsPage);
