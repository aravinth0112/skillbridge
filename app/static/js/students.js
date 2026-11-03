/**
 * SkillBridge Student Roster Controller
 * UI Round A Enhancements:
 * - Searchable skill picker with chip tags
 * - 4-button segmented control for cohort year
 * - Segmented toggle for skill match logic (AND / OR)
 * - Switch toggle for availability
 * - Sort dropdown (Name, Year, Most skills, Best match)
 * - Compact roster rows with up to 3 compact gauges; click expands row inline to reveal all skills
 * - Custom inline validation replacing browser bubbles
 */

let allCourses = [];
let allDepartments = [];
let allSkills = [];
let selectedSkillIds = [];
let currentSkillMode = "OR";
let currentYearFilter = "";
let currentStudentsList = [];

async function initStudentsPage() {
  const railContainer = document.getElementById("rail-container");
  if (railContainer) {
    railContainer.innerHTML = renderRailNav("students");
  }

  setupSkillPicker();
  await loadFilterCatalogs();

  // Handle URL query parameters
  const urlParams = new URLSearchParams(window.location.search);
  const qSkills = urlParams.get("skills");
  const qCourse = urlParams.get("course_id");
  const qDept = urlParams.get("department_id");
  const qYear = urlParams.get("year");
  const qAvail = urlParams.get("available");
  const qMode = urlParams.get("mode");

  if (qCourse) document.getElementById("filter-course").value = qCourse;
  if (qDept) document.getElementById("filter-dept").value = qDept;
  if (qYear) setYearFilter(qYear);
  if (qAvail === "true") document.getElementById("filter-available").checked = true;
  if (qMode) setSkillMode(qMode.toUpperCase());

  if (qSkills) {
    const skillNames = qSkills.split(",");
    skillNames.forEach(name => {
      const found = allSkills.find(s => s.name.toLowerCase() === name.trim().toLowerCase());
      if (found && !selectedSkillIds.includes(found.id)) {
        selectedSkillIds.push(found.id);
      }
    });
    renderSkillChips();
  }

  await loadStudents();
}

function setupSkillPicker() {
  const input = document.getElementById("skill-search-input");
  const dropdown = document.getElementById("skill-dropdown");

  input.addEventListener("input", () => {
    const val = input.value.trim().toLowerCase();
    if (!val) {
      dropdown.classList.remove("open");
      dropdown.innerHTML = "";
      return;
    }

    const matches = allSkills.filter(s => 
      !selectedSkillIds.includes(s.id) &&
      (s.name.toLowerCase().includes(val) || s.category.toLowerCase().includes(val))
    ).slice(0, 8);

    if (matches.length === 0) {
      dropdown.innerHTML = '<div style="padding:0.5rem 0.75rem; font-size:0.82rem; color:var(--ink-muted);">No matching skills in catalog</div>';
    } else {
      dropdown.innerHTML = "";
      matches.forEach(m => {
        const item = document.createElement("div");
        item.className = "skill-dropdown-item";
        item.innerHTML = `<strong>${m.name}</strong> <span style="font-size:0.75rem; color:var(--ink-muted);">${m.category}</span>`;
        item.onclick = () => {
          addSkillChip(m.id);
          input.value = "";
          dropdown.classList.remove("open");
        };
        dropdown.appendChild(item);
      });
    }

    dropdown.classList.add("open");
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const firstItem = dropdown.querySelector(".skill-dropdown-item");
      if (firstItem) firstItem.click();
    } else if (e.key === "Escape") {
      dropdown.classList.remove("open");
    }
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".skill-picker")) {
      dropdown.classList.remove("open");
    }
  });
}

function addSkillChip(skillId) {
  if (!selectedSkillIds.includes(skillId)) {
    selectedSkillIds.push(skillId);
    renderSkillChips();
    loadStudents();
  }
}

function removeSkillChip(skillId, chipEl) {
  if (chipEl) {
    chipEl.classList.add("chip-removing");
    setTimeout(() => {
      selectedSkillIds = selectedSkillIds.filter(id => id !== skillId);
      renderSkillChips();
      loadStudents();
    }, 120);
  } else {
    selectedSkillIds = selectedSkillIds.filter(id => id !== skillId);
    renderSkillChips();
    loadStudents();
  }
}

function renderSkillChips() {
  const container = document.getElementById("selected-skills-chips");
  container.innerHTML = "";

  selectedSkillIds.forEach(id => {
    const sk = allSkills.find(s => s.id === id);
    if (!sk) return;

    const chip = document.createElement("span");
    chip.className = "skill-chip";

    const name = document.createElement("span");
    name.textContent = sk.name;
    chip.appendChild(name);

    const del = document.createElement("button");
    del.type = "button";
    del.className = "skill-chip-del";
    del.innerHTML = "×";
    del.setAttribute("aria-label", `Remove ${sk.name}`);
    del.onclick = (e) => {
      e.stopPropagation();
      removeSkillChip(id, chip);
    };
    chip.appendChild(del);

    container.appendChild(chip);
  });
}

function setSkillMode(mode) {
  currentSkillMode = mode;
  document.getElementById("mode-or").classList.toggle("active", mode === "OR");
  document.getElementById("mode-and").classList.toggle("active", mode === "AND");
  loadStudents();
}

function setYearFilter(yearStr) {
  currentYearFilter = yearStr;
  const buttons = document.querySelectorAll(".year-btn");
  buttons.forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-year") === yearStr);
  });
  loadStudents();
}

async function loadFilterCatalogs() {
  try {
    const [courses, depts, skills] = await Promise.all([
      apiRequest("/courses/"),
      apiRequest("/departments/"),
      apiRequest("/skills/")
    ]);

    allCourses = courses;
    allDepartments = depts;
    allSkills = skills;

    const courseSelect = document.getElementById("filter-course");
    courses.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = `${c.name} (${c.code})`;
      courseSelect.appendChild(opt);
    });

    const deptSelect = document.getElementById("filter-dept");
    depts.forEach(d => {
      const opt = document.createElement("option");
      opt.value = d.id;
      opt.textContent = d.name;
      deptSelect.appendChild(opt);
    });

    const drawerCourse = document.getElementById("add-student-course");
    courses.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = `${c.name} (${c.code})`;
      drawerCourse.appendChild(opt);
    });

  } catch (err) {
    console.error("Failed to load filter catalogs:", err);
  }
}

async function loadStudents() {
  const container = document.getElementById("roster-container");
  container.innerHTML = renderSkeletonRows(3);

  const courseId = document.getElementById("filter-course").value;
  const deptId = document.getElementById("filter-dept").value;
  const available = document.getElementById("filter-available").checked;

  const params = new URLSearchParams();
  if (courseId) params.append("course_id", courseId);
  if (deptId) params.append("department_id", deptId);
  if (currentYearFilter) params.append("year_of_study", currentYearFilter);
  if (available) params.append("available", "true");
  if (selectedSkillIds.length > 0) {
    params.append("skill_ids", selectedSkillIds.join(","));
    params.append("skill_match_mode", currentSkillMode);
  }

  try {
    const students = await apiRequest(`/students/search?${params.toString()}`);
    currentStudentsList = students || [];
    sortAndRenderRoster();
  } catch (err) {
    container.innerHTML = `<div class="empty-notice">${err.message || "Failed to search student records."}</div>`;
  }
}

function sortAndRenderRoster() {
  const sortMode = document.getElementById("sort-dropdown").value;
  const sorted = [...currentStudentsList];

  if (sortMode === "name") {
    sorted.sort((a, b) => a.full_name.localeCompare(b.full_name));
  } else if (sortMode === "year") {
    sorted.sort((a, b) => a.year_of_study - b.year_of_study);
  } else if (sortMode === "skills") {
    sorted.sort((a, b) => (b.skills ? b.skills.length : 0) - (a.skills ? a.skills.length : 0));
  } else if (sortMode === "match") {
    sorted.sort((a, b) => (b.matched_skills_count || 0) - (a.matched_skills_count || 0));
  }

  renderRoster(sorted);
}

function renderRoster(students) {
  const container = document.getElementById("roster-container");
  const countLabel = document.getElementById("roster-count-label");

  setText(countLabel, `${students.length} student${students.length === 1 ? "" : "s"} found`);

  if (!students || students.length === 0) {
    container.innerHTML = "";
    const empty = document.createElement("div");
    empty.className = "empty-notice";
    empty.textContent = "No students match. Remove a filter or add a student.";
    container.appendChild(empty);
    return;
  }

  flipAnimate(container, ".roster-row-container", () => {
    container.innerHTML = "";

    students.forEach(student => {
      const rowContainer = document.createElement("div");
      rowContainer.className = "roster-row-container";
      rowContainer.setAttribute("data-flip-id", `student-${student.id}`);

    const row = document.createElement("div");
    row.className = "roster-row";

    // Primary Info
    const primaryBox = document.createElement("div");
    primaryBox.className = "roster-primary";

    const nameLine = document.createElement("div");
    nameLine.style.display = "flex";
    nameLine.style.alignItems = "center";
    nameLine.style.gap = "0.45rem";

    const dot = document.createElement("span");
    dot.className = `avail-dot avail-${student.available}`;
    dot.title = student.available ? "Available for project match" : "In active project";
    nameLine.appendChild(dot);

    const nameSpan = document.createElement("span");
    nameSpan.style.fontFamily = "var(--font-heading)";
    nameSpan.style.fontSize = "1.05rem";
    nameSpan.style.fontWeight = "700";
    nameSpan.style.color = "var(--ink-navy)";
    nameSpan.textContent = student.full_name;
    nameLine.appendChild(nameSpan);
    primaryBox.appendChild(nameLine);

    const degreeLine = document.createElement("div");
    degreeLine.style.fontSize = "0.85rem";
    degreeLine.style.color = "var(--ink-muted)";
    degreeLine.textContent = `${student.course_name || "Degree"} · Year ${student.year_of_study} · ${student.reg_no}`;
    primaryBox.appendChild(degreeLine);

    row.appendChild(primaryBox);

    // Compact Top 3 Gauges (Skill Name + Number, Level Word and Verified on hover/focus)
    const skillsBox = document.createElement("div");
    skillsBox.className = "roster-skills";

    const topSkills = (student.skills || []).slice(0, 3);
    if (topSkills.length === 0) {
      const noneSpan = document.createElement("span");
      noneSpan.style.fontSize = "0.82rem";
      noneSpan.style.color = "var(--ink-subtle)";
      noneSpan.textContent = "No skills mapped yet";
      skillsBox.appendChild(noneSpan);
    } else {
      topSkills.forEach(sk => {
        const tag = document.createElement("div");
        tag.className = "compact-skill-tag";
        tag.title = `${sk.name}: ${LEVEL_WORDS[sk.proficiency]} (${sk.proficiency}/5)${sk.verified ? " · Verified" : ""}`;

        const name = document.createElement("span");
        name.className = "compact-skill-name";
        name.textContent = sk.name;
        tag.appendChild(name);

        const gauge = createSkillGauge({
          level: sk.proficiency,
          mode: "student",
          skillName: sk.name,
          compact: true
        });
        tag.appendChild(gauge);

        if (sk.verified) {
          const v = document.createElement("span");
          v.className = "verified-check";
          v.textContent = "✓";
          tag.appendChild(v);
        }

        skillsBox.appendChild(tag);
      });
    }

    row.appendChild(skillsBox);

    // View Profile Action
    const actionBox = document.createElement("div");
    const viewBtn = document.createElement("a");
    viewBtn.href = `/app/student.html?id=${student.id}`;
    viewBtn.className = "btn btn-secondary btn-sm";
    viewBtn.textContent = "View profile";
    viewBtn.onclick = (e) => e.stopPropagation();
    actionBox.appendChild(viewBtn);
    row.appendChild(actionBox);

    rowContainer.appendChild(row);

    // Inline Expandable Drawer (Reveals all skills & bio on row click)
    const expandedDetails = document.createElement("div");
    expandedDetails.className = "roster-expanded-details";

    if (student.bio) {
      const bioP = document.createElement("p");
      bioP.style.fontSize = "0.88rem";
      bioP.style.color = "var(--ink-navy)";
      bioP.style.marginBottom = "0.75rem";
      bioP.textContent = student.bio;
      expandedDetails.appendChild(bioP);
    }

    const expTitle = document.createElement("div");
    expTitle.style.fontWeight = "600";
    expTitle.style.fontSize = "0.85rem";
    expTitle.style.color = "var(--ink-muted)";
    expTitle.textContent = `All skills (${(student.skills || []).length}):`;
    expandedDetails.appendChild(expTitle);

    const skillsGrid = document.createElement("div");
    skillsGrid.className = "expanded-skills-grid";

    (student.skills || []).forEach(sk => {
      const item = document.createElement("div");
      item.style.display = "flex";
      item.style.justifyContent = "space-between";
      item.style.alignItems = "center";
      item.style.padding = "0.4rem 0.6rem";
      item.style.background = "var(--surface)";
      item.style.border = "1px solid var(--border)";

      const skLeft = document.createElement("div");
      skLeft.style.display = "flex";
      skLeft.style.alignItems = "center";
      skLeft.style.gap = "0.4rem";

      const skName = document.createElement("strong");
      skName.style.fontSize = "0.85rem";
      skName.textContent = sk.name;
      skLeft.appendChild(skName);

      if (sk.verified) {
        const v = document.createElement("span");
        v.className = "verified-check";
        v.textContent = "Verified";
        skLeft.appendChild(v);
      }
      item.appendChild(skLeft);

      const gauge = createSkillGauge({
        level: sk.proficiency,
        mode: "student",
        skillName: sk.name
      });
      item.appendChild(gauge);

      skillsGrid.appendChild(item);
    });

    expandedDetails.appendChild(skillsGrid);
    rowContainer.appendChild(expandedDetails);

    // Toggle expansion on click
    row.addEventListener("click", () => {
      expandedDetails.classList.toggle("open");
    });

    container.appendChild(rowContainer);
    });
  });
}

function handleFilterSubmit(event) {
  if (event && event.preventDefault) event.preventDefault();
  loadStudents();
}

function resetFilters() {
  document.getElementById("filter-form").reset();
  selectedSkillIds = [];
  renderSkillChips();
  setSkillMode("OR");
  setYearFilter("");
  document.getElementById("filter-available").checked = false;
  loadStudents();
}

// Side Drawer for Adding Student
function openAddStudentDrawer() {
  document.getElementById("add-drawer-backdrop").classList.add("active");
  document.getElementById("add-drawer").classList.add("active");
}

function closeAddStudentDrawer() {
  document.getElementById("add-drawer-backdrop").classList.remove("active");
  document.getElementById("add-drawer").classList.remove("active");
}

async function handleAddStudent(event) {
  event.preventDefault();
  const feedbackArea = document.getElementById("add-student-feedback");
  const createBtn = document.getElementById("btn-create-student");

  const nameInput = document.getElementById("add-student-name");
  const emailInput = document.getElementById("add-student-email");
  const regInput = document.getElementById("add-student-reg");
  const courseInput = document.getElementById("add-student-course");

  // Rule 1: Custom inline validation beside the field
  clearFieldError(nameInput);
  clearFieldError(emailInput);
  clearFieldError(regInput);
  clearFieldError(courseInput);

  let hasError = false;
  if (!nameInput.value.trim()) {
    showFieldError(nameInput, "Enter student full name");
    hasError = true;
  }
  if (!emailInput.value.trim() || !emailInput.value.includes("@")) {
    showFieldError(emailInput, "Enter valid university email");
    hasError = true;
  }
  if (!regInput.value.trim()) {
    showFieldError(regInput, "Enter registration number");
    hasError = true;
  }
  if (!courseInput.value) {
    showFieldError(courseInput, "Select enrolled degree program");
    hasError = true;
  }

  if (hasError) return;

  const payload = {
    full_name: nameInput.value.trim(),
    email: emailInput.value.trim(),
    reg_no: regInput.value.trim(),
    course_id: parseInt(courseInput.value),
    year_of_study: parseInt(document.getElementById("add-student-year").value),
    available: document.getElementById("add-student-avail").checked,
    bio: document.getElementById("add-student-bio").value.trim() || null
  };

  try {
    await apiRequest("/students/", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    createBtn.textContent = "Student saved";
    showInlineNotice(feedbackArea, "Student saved.", "success");

    setTimeout(() => {
      document.getElementById("add-student-form").reset();
      createBtn.textContent = "Add student";
      closeAddStudentDrawer();
    }, 1200);

    showInlineNotice("students-notice-area", `Student "${payload.full_name}" registered successfully.`, "success");
    await loadStudents();
  } catch (err) {
    showInlineNotice(feedbackArea, err.message || "Failed to add student.", "error");
  }
}

document.addEventListener("DOMContentLoaded", initStudentsPage);
