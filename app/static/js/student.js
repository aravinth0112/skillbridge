/**
 * SkillBridge Student Profile Controller
 * UI Round A Enhancements:
 * - Inline confirmations ("Delete student? Delete / Keep", "Remove Python? Delete / Keep")
 * - Zero browser validation bubbles
 * - Skeleton rows on load
 * - Interactive 5-segment level meters with arrow keys and inline undo
 */

const urlParams = new URLSearchParams(window.location.search);
const studentId = parseInt(urlParams.get("id"));

let currentStudent = null;
let currentSkills = [];
let allCourses = [];
let allCatalogSkills = [];

async function initStudentProfile() {
  const railContainer = document.getElementById("rail-container");
  if (railContainer) {
    railContainer.innerHTML = renderRailNav("students");
  }

  const headerContainer = document.getElementById("header-container");
  if (headerContainer) {
    headerContainer.innerHTML = renderTopHeader();
  }

  if (!studentId || isNaN(studentId)) {
    showInlineNotice("profile-global-notice", "Invalid or missing student identifier. Redirecting to roster...", "error");
    setTimeout(() => { window.location.href = "/app/students.html"; }, 1500);
    return;
  }

  await loadCatalogs();
  await refreshStudentData();
}

async function loadCatalogs() {
  try {
    const [courses, catalog] = await Promise.all([
      apiRequest("/courses/"),
      apiRequest("/skills/")
    ]);

    allCourses = courses;
    allCatalogSkills = catalog;

    const courseSelect = document.getElementById("edit-course");
    courses.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = `${c.name} (${c.code})`;
      courseSelect.appendChild(opt);
    });

    const skillSelect = document.getElementById("add-skill-select");
    skillSelect.innerHTML = '<option value="">Select skill...</option>';
    catalog.forEach(s => {
      const opt = document.createElement("option");
      opt.value = s.id;
      opt.textContent = `${s.name} (${s.category})`;
      skillSelect.appendChild(opt);
    });

  } catch (err) {
    console.error("Failed to load catalogs:", err);
  }
}

async function refreshStudentData() {
  try {
    const [student, skills] = await Promise.all([
      apiRequest(`/students/${studentId}`),
      apiRequest(`/student-skills/?student_id=${studentId}`)
    ]);

    currentStudent = student;
    currentSkills = skills;

    setText("profile-name", student.full_name);
    setText("profile-reg-header", `Registration: ${student.reg_no} · ${student.course_name || "Degree"} · Year ${student.year_of_study}`);

    const availPill = document.getElementById("profile-avail-pill");
    if (availPill) {
      availPill.className = `status-pill status-${student.available ? "open" : "completed"}`;
      availPill.textContent = student.available ? "Available" : "Unavailable";
    }

    document.getElementById("edit-name").value = student.full_name;
    document.getElementById("edit-email").value = student.email;
    document.getElementById("edit-reg").value = student.reg_no;
    document.getElementById("edit-course").value = student.course_id;
    document.getElementById("edit-year").value = student.year_of_study;
    document.getElementById("edit-avail").checked = student.available;
    document.getElementById("edit-bio").value = student.bio || "";

    renderSkillsLedger(skills);

  } catch (err) {
    showInlineNotice("profile-global-notice", "Failed to load student profile.", "error");
  }
}

function renderSkillsLedger(skills) {
  const container = document.getElementById("skills-ledger-container");
  container.innerHTML = "";

  if (skills.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-notice";
    empty.textContent = "No skills mapped to this student yet. Use the form above to add a skill.";
    container.appendChild(empty);
    return;
  }

  skills.forEach(ss => {
    const card = document.createElement("div");
    card.className = "skill-card-item";

    // Left info
    const left = document.createElement("div");
    left.className = "skill-card-left";

    const name = document.createElement("span");
    name.className = "skill-card-name";
    name.textContent = ss.skill_name || `Skill #${ss.skill_id}`;
    left.appendChild(name);

    const cat = document.createElement("span");
    cat.className = "skill-card-cat";
    cat.textContent = ss.skill_category || "Technical Skill";
    left.appendChild(cat);

    card.appendChild(left);

    // Center: Interactive Clickable Skill Gauge
    const center = document.createElement("div");
    center.style.display = "flex";
    center.style.alignItems = "center";
    center.style.gap = "0.75rem";
    center.style.flexWrap = "wrap";

    const noticeArea = document.createElement("div");
    noticeArea.style.width = "100%";
    noticeArea.style.fontSize = "0.82rem";

    const gaugeEl = createSkillGauge({
      level: ss.proficiency,
      mode: "interactive",
      skillName: ss.skill_name || "Skill",
      onLevelChange: async (newLevel, undoCallback) => {
        try {
          await apiRequest(`/student-skills/${ss.id}`, {
            method: "PUT",
            body: JSON.stringify({ proficiency: newLevel })
          });
          ss.proficiency = newLevel;

          showInlineNotice(
            noticeArea,
            `${ss.skill_name || "Skill"} set to ${newLevel}.`,
            "info",
            undoCallback ? async () => {
              undoCallback();
              await apiRequest(`/student-skills/${ss.id}`, {
                method: "PUT",
                body: JSON.stringify({ proficiency: ss.proficiency })
              });
              showInlineNotice(noticeArea, "Reverted change.", "info");
            } : null
          );
        } catch (err) {
          showInlineNotice(noticeArea, err.message || "Failed to update level.", "error");
        }
      }
    });

    center.appendChild(gaugeEl);
    center.appendChild(noticeArea);
    card.appendChild(center);

    // Right: Verification toggle and inline delete confirmation
    const right = document.createElement("div");
    right.style.display = "flex";
    right.style.alignItems = "center";
    right.style.gap = "0.5rem";

    const verBtn = document.createElement("button");
    verBtn.type = "button";
    verBtn.className = "btn btn-secondary btn-sm";
    verBtn.style.color = ss.verified ? "var(--mint)" : "var(--ink-muted)";
    verBtn.textContent = ss.verified ? "Verified" : "Verify";
    verBtn.title = ss.verified ? "Click to unverify" : "Click to mark as faculty verified";
    verBtn.onclick = () => toggleSkillVerification(ss.id, !ss.verified, ss.skill_name);
    right.appendChild(verBtn);

    const delContainer = document.createElement("div");
    delContainer.style.display = "inline-flex";
    delContainer.style.alignItems = "center";

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "btn btn-danger btn-sm";
    delBtn.textContent = "Remove";
    delBtn.onclick = () => {
      delBtn.style.display = "none";
      showInlinePrompt(
        delContainer,
        `Remove ${ss.skill_name || "skill"}?`,
        async () => {
          card.classList.add("row-collapsing");
          setTimeout(async () => {
            await executeRemoveSkill(ss.id, ss.skill_name);
          }, 220);
        },
        () => {
          delBtn.style.display = "inline-flex";
        }
      );
    };
    delContainer.appendChild(delBtn);
    right.appendChild(delContainer);

    card.appendChild(right);
    container.appendChild(card);
  });
}

async function toggleSkillVerification(skillMapId, newVerifiedStatus, skillName) {
  try {
    await apiRequest(`/student-skills/${skillMapId}`, {
      method: "PUT",
      body: JSON.stringify({ verified: newVerifiedStatus })
    });
    showInlineNotice("profile-global-notice", `${skillName || "Skill"} verification updated.`, "success");
    await refreshStudentData();
  } catch (err) {
    showInlineNotice("profile-global-notice", err.message || "Failed to update verification status.", "error");
  }
}

async function executeRemoveSkill(skillMapId, skillName) {
  try {
    await apiRequest(`/student-skills/${skillMapId}`, { method: "DELETE" });
    showInlineNotice("profile-global-notice", `${skillName || "Skill"} removed from student profile.`, "success");
    await refreshStudentData();
  } catch (err) {
    showInlineNotice("profile-global-notice", err.message || "Failed to remove skill.", "error");
  }
}

async function handleAddSkill(event) {
  event.preventDefault();
  const feedbackArea = document.getElementById("add-skill-feedback");
  const skillSelect = document.getElementById("add-skill-select");

  clearFieldError(skillSelect);

  const skillId = parseInt(skillSelect.value);
  const proficiency = parseInt(document.getElementById("add-skill-prof").value);
  const verified = document.getElementById("add-skill-verified").checked;

  if (!skillId) {
    showFieldError(skillSelect, "Select a skill from the catalog");
    return;
  }

  try {
    await apiRequest("/student-skills/", {
      method: "POST",
      body: JSON.stringify({
        student_id: studentId,
        skill_id: skillId,
        proficiency: proficiency,
        verified: verified
      })
    });

    showInlineNotice(feedbackArea, "Skill mapped to student.", "success");
    document.getElementById("add-skill-form").reset();
    await refreshStudentData();
  } catch (err) {
    showInlineNotice(feedbackArea, err.message || "Failed to map skill.", "error");
  }
}

async function handleSaveStudent(event) {
  event.preventDefault();
  const feedbackArea = document.getElementById("profile-edit-feedback");
  const saveBtn = document.getElementById("btn-save-student");

  const nameIn = document.getElementById("edit-name");
  const emailIn = document.getElementById("edit-email");
  const regIn = document.getElementById("edit-reg");
  const courseIn = document.getElementById("edit-course");

  clearFieldError(nameIn);
  clearFieldError(emailIn);
  clearFieldError(regIn);
  clearFieldError(courseIn);

  let hasErr = false;
  if (!nameIn.value.trim()) {
    showFieldError(nameIn, "Enter student full name");
    hasErr = true;
  }
  if (!emailIn.value.trim() || !emailIn.value.includes("@")) {
    showFieldError(emailIn, "Enter valid university email");
    hasErr = true;
  }
  if (!regIn.value.trim()) {
    showFieldError(regIn, "Enter registration number");
    hasErr = true;
  }
  if (!courseIn.value) {
    showFieldError(courseIn, "Select enrolled degree program");
    hasErr = true;
  }

  if (hasErr) return;

  const payload = {
    full_name: nameIn.value.trim(),
    email: emailIn.value.trim(),
    reg_no: regIn.value.trim(),
    course_id: parseInt(courseIn.value),
    year_of_study: parseInt(document.getElementById("edit-year").value),
    available: document.getElementById("edit-avail").checked,
    bio: document.getElementById("edit-bio").value.trim() || null
  };

  try {
    await apiRequest(`/students/${studentId}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });

    saveBtn.innerHTML = `${getDrawCheckSVG()} Student saved`;
    showInlineNotice(feedbackArea, "Student saved.", "success");

    setTimeout(() => {
      saveBtn.textContent = "Save student";
    }, 2000);

    await refreshStudentData();
  } catch (err) {
    showInlineNotice(feedbackArea, err.message || "Failed to save student details.", "error");
  }
}

function triggerDeleteStudentInline() {
  const container = document.getElementById("delete-student-inline-container");
  const triggerBtn = document.getElementById("btn-delete-student-trigger");
  triggerBtn.style.display = "none";

  showInlinePrompt(
    container,
    `Delete ${currentStudent ? currentStudent.full_name : "this student"}?`,
    async () => {
      try {
        await apiRequest(`/students/${studentId}`, { method: "DELETE" });
        showInlineNotice("profile-global-notice", "Student deleted. Redirecting to roster...", "success");
        setTimeout(() => { window.location.href = "/app/students.html"; }, 1000);
      } catch (err) {
        showInlineNotice("profile-global-notice", err.message || "Failed to delete student.", "error");
        triggerBtn.style.display = "inline-flex";
      }
    },
    () => {
      triggerBtn.style.display = "inline-flex";
    }
  );
}

document.addEventListener("DOMContentLoaded", initStudentProfile);
