const one = (selector, root = document) => root.querySelector(selector);
const all = (selector, root = document) => [...root.querySelectorAll(selector)];
const STORAGE_KEYS = {
  theme: "forma-theme",
  invites: "forma-invites",
};

const preloader = one("#preloader");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
window.addEventListener("load", async () => {
  try {
    if (document.fonts?.ready) {
      await Promise.race([document.fonts.ready, new Promise((resolve) => setTimeout(resolve, 900))]);
    }
  } catch (error) {
    console.warn("Display fonts could not be loaded.", error);
  }
  setTimeout(() => preloader?.classList.add("is-done"), reducedMotion ? 0 : 220);
});

function updateDateLabels() {
  const today = new Date();
  const weekday = (today.getDay() + 6) % 7;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - weekday);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const shortDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
  const weekLabel = weekStart.getMonth() === weekEnd.getMonth()
    ? `${shortDate.format(weekStart)} – ${weekEnd.getDate()}`
    : `${shortDate.format(weekStart)} – ${shortDate.format(weekEnd)}`;
  one(".eyebrow").lastChild.textContent = ` ${new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(today).toLocaleUpperCase()}`;
  one(".date-button > span").textContent = weekLabel;
  const friday = new Date(weekStart);
  friday.setDate(weekStart.getDate() + 4);
  one(".chart-tooltip strong").textContent = `Friday, ${shortDate.format(friday)}`;
}
updateDateLabels();

let toastTimer;
function showToast(message) {
  const toast = one("#toast");
  one("#toast-message").textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 3000);
}

function readLocal(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch (error) {
    console.warn(`Could not read local preference "${key}".`, error);
    return fallback;
  }
}

function writeLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn(`Could not save local preference "${key}".`, error);
    showToast("This change could not be saved in this browser.");
    return false;
  }
}

const themeToggle = one("#theme-toggle");
function setTheme(theme, persist = false) {
  const isDark = theme === "dark";
  document.body.classList.toggle("dark-theme", isDark);
  themeToggle.setAttribute("aria-pressed", String(isDark));
  if (persist) writeLocal(STORAGE_KEYS.theme, isDark ? "dark" : "light");
}
const savedTheme = readLocal(STORAGE_KEYS.theme, "light");
setTheme(savedTheme === "dark" ? "dark" : "light");
themeToggle.addEventListener("click", () => {
  setTheme(document.body.classList.contains("dark-theme") ? "light" : "dark", true);
});

const navLinks = all(".nav-link[href^='#']");
const navSections = navLinks
  .map((link) => one(link.getAttribute("href")))
  .filter(Boolean);
if ("IntersectionObserver" in window) {
  const sectionObserver = new IntersectionObserver((entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    navLinks.forEach((link) => {
      const isActive = link.getAttribute("href") === `#${visible.target.id}`;
      link.classList.toggle("active", isActive);
      if (isActive) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }, { rootMargin: "-18% 0px -64% 0px", threshold: [0, 0.1, 0.35] });
  navSections.forEach((section) => sectionObserver.observe(section));
}

let previousY = window.scrollY;
let scrollFrame = false;
const topbar = one("#topbar");
window.addEventListener("scroll", () => {
  if (scrollFrame) return;
  scrollFrame = true;
  requestAnimationFrame(() => {
    const currentY = window.scrollY;
    if (currentY < 90 || currentY < previousY - 3) topbar.classList.remove("is-hidden");
    else if (currentY > previousY + 3) topbar.classList.add("is-hidden");
    previousY = currentY;
    scrollFrame = false;
  });
}, { passive: true });

const searchInput = one("#global-search");
searchInput.addEventListener("input", () => {
  const query = searchInput.value.trim().toLocaleLowerCase();
  let visiblePeople = 0;
  all("#people-list tr").forEach((row) => {
    const matches = !query || `${row.dataset.search || ""} ${row.textContent}`.toLocaleLowerCase().includes(query);
    row.hidden = !matches;
    if (matches) visiblePeople += 1;
  });
  all(".project-item").forEach((item) => {
    item.hidden = Boolean(query) && !item.textContent.toLocaleLowerCase().includes(query);
  });
  one("#empty-search").hidden = visiblePeople > 0 || query.length === 0;
});

document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    searchInput.focus();
  }
  if (event.key === "Escape") {
    closeInviteModal();
    closeNotifications();
  }
  if (event.key === "Tab") document.body.classList.add("keyboard-focus");
});
document.addEventListener("pointerdown", () => document.body.classList.remove("keyboard-focus"), { once: true });

const notificationButton = one(".notification-trigger");
const notificationPopover = one("#notification-popover");
function closeNotifications() {
  notificationPopover.hidden = true;
  notificationButton.setAttribute("aria-expanded", "false");
}
notificationButton.addEventListener("click", (event) => {
  event.stopPropagation();
  const shouldOpen = notificationPopover.hidden;
  notificationPopover.hidden = !shouldOpen;
  notificationButton.setAttribute("aria-expanded", String(shouldOpen));
});
notificationPopover.addEventListener("click", (event) => event.stopPropagation());
document.addEventListener("click", closeNotifications);
one(".mark-read").addEventListener("click", () => {
  one(".notification-trigger i").hidden = true;
  one(".unread-label").textContent = "All caught up";
  showToast("You’re all caught up.");
  closeNotifications();
});

const inviteModal = one("#invite-modal");
const inviteForm = one("#invite-form");
const inviteName = one("#invite-name");
let previousFocus;
function openInviteModal() {
  previousFocus = document.activeElement;
  inviteModal.hidden = false;
  document.body.style.overflow = "hidden";
  inviteName.focus();
}
function closeInviteModal() {
  if (inviteModal.hidden) return;
  inviteModal.hidden = true;
  document.body.style.overflow = "";
  previousFocus?.focus();
}
one("#invite-button").addEventListener("click", openInviteModal);
one(".modal-close").addEventListener("click", closeInviteModal);
inviteModal.addEventListener("click", (event) => {
  if (event.target === inviteModal) closeInviteModal();
});

const emailIsValid = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
function makeInvitedRow(person) {
  const initials = person.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0].toUpperCase()).join("");
  const row = document.createElement("tr");
  row.dataset.search = `${person.name} ${person.email} ${person.team}`.toLocaleLowerCase();
  const personCell = document.createElement("td");
  const identity = document.createElement("span");
  identity.className = "person-cell";
  const avatar = document.createElement("span");
  avatar.className = "avatar person-avatar avatar-james";
  avatar.textContent = initials;
  const details = document.createElement("span");
  const name = document.createElement("strong");
  name.textContent = person.name;
  const email = document.createElement("small");
  email.textContent = person.email;
  details.append(name, email);
  identity.append(avatar, details);
  personCell.append(identity);

  const teamCell = document.createElement("td");
  const teamLabel = document.createElement("span");
  teamLabel.className = "team-label";
  const teamDot = document.createElement("i");
  teamDot.className = `team-dot ${person.team === "Design" ? "dot-design" : person.team === "Marketing" ? "dot-marketing" : "dot-product"}`;
  teamLabel.append(teamDot, document.createTextNode(person.team));
  teamCell.append(teamLabel);

  const statusCell = document.createElement("td");
  const status = document.createElement("span");
  status.className = "status-pill status-away";
  const statusDot = document.createElement("i");
  status.textContent = "Invited";
  status.prepend(statusDot);
  statusCell.append(status);

  const lastActive = document.createElement("td");
  lastActive.className = "last-active";
  lastActive.textContent = "Pending";
  const actionsCell = document.createElement("td");
  const more = document.createElement("button");
  more.className = "row-more";
  more.type = "button";
  more.setAttribute("aria-label", `More options for ${person.name}`);
  more.textContent = "···";
  more.addEventListener("click", () => showToast(`Invitation for ${person.name} is pending.`));
  actionsCell.append(more);
  row.append(personCell, teamCell, statusCell, lastActive, actionsCell);
  return row;
}

function restoreInvites() {
  const invites = readLocal(STORAGE_KEYS.invites, []);
  if (!Array.isArray(invites)) {
    console.warn("Saved Hope Inc. invitations are not a list and were not restored.");
    return;
  }
  invites
    .filter((person) => person && typeof person.name === "string" && typeof person.email === "string" && typeof person.team === "string")
    .forEach((person) => one("#people-list").append(makeInvitedRow(person)));
}
restoreInvites();
inviteForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!inviteForm.reportValidity()) return;
  const person = {
    name: one("#invite-name").value.trim(),
    email: one("#invite-email").value.trim(),
    team: one("#invite-team").value,
  };
  if (!person.name || !emailIsValid(person.email)) return;
  const currentInvites = readLocal(STORAGE_KEYS.invites, []);
  const invites = Array.isArray(currentInvites) ? currentInvites : [];
  if (invites.some((invite) => invite.email?.toLocaleLowerCase() === person.email.toLocaleLowerCase())) {
    showToast("This teammate is already in your preview.");
    return;
  }
  invites.push(person);
  const persisted = writeLocal(STORAGE_KEYS.invites, invites);
  one("#people-list").prepend(makeInvitedRow(person));
  one("#global-search").dispatchEvent(new Event("input"));
  inviteForm.reset();
  closeInviteModal();
  showToast(persisted
    ? `Invite added for ${person.name}. Email sending is not connected.`
    : `Invite added for this session only. Email sending is not connected.`);
});

const focusList = one(".focus-list");
function updateFocusProgress() {
  const tasks = all(".focus-task input[type='checkbox']", focusList);
  const complete = tasks.filter((task) => task.checked).length;
  const ratio = tasks.length ? complete / tasks.length : 0;
  one(".progress-ring span").textContent = `${complete}/${tasks.length}`;
  one(".ring-value").style.strokeDashoffset = String(119.4 * (1 - ratio));
  one(".focus-progress small").textContent = `${complete === tasks.length ? "All priorities" : `${complete} of ${tasks.length}`} ${complete === tasks.length ? "complete — lovely work" : "priorities done"}`;
}
focusList.addEventListener("change", (event) => {
  if (!event.target.matches("input[type='checkbox']")) return;
  event.target.closest(".focus-task").classList.toggle("completed-task", event.target.checked);
  updateFocusProgress();
});
updateFocusProgress();

one("#add-task-button").addEventListener("click", () => {
  if (one(".new-task-form")) return one(".new-task-input").focus();
  const form = document.createElement("form");
  form.className = "new-task-form";
  form.style.cssText = "display:flex;gap:6px;padding:9px 0 0 24px";
  const input = document.createElement("input");
  input.className = "new-task-input";
  input.setAttribute("aria-label", "New priority");
  input.placeholder = "What needs your focus?";
  input.required = true;
  input.style.cssText = "width:100%;min-width:0;padding:7px 8px;border:1px solid var(--line-strong);border-radius:5px;outline:0;color:var(--ink);background:var(--surface);font-size:10px";
  const submit = document.createElement("button");
  submit.className = "button button-primary";
  submit.type = "submit";
  submit.setAttribute("aria-label", "Add priority");
  submit.style.cssText = "min-height:30px;padding:0 8px";
  submit.innerHTML = '<svg><use href="#i-check"/></svg>';
  form.append(input, submit);
  focusList.append(form);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const title = input.value.trim();
    if (!title) return;
    const task = document.createElement("label");
    task.className = "focus-task";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    const check = document.createElement("span");
    check.className = "custom-check";
    check.innerHTML = '<svg><use href="#i-check"/></svg>';
    const copy = document.createElement("span");
    copy.className = "task-copy";
    const taskTitle = document.createElement("strong");
    taskTitle.textContent = title;
    const meta = document.createElement("small");
    meta.textContent = "Personal priority";
    copy.append(taskTitle, meta);
    task.append(checkbox, check, copy);
    form.remove();
    focusList.append(task);
    updateFocusProgress();
    showToast("Priority added to your focus list.");
  });
  input.focus();
});

one(".date-button").addEventListener("click", () => showToast(`You’re viewing this week, ${one(".date-button > span").textContent}.`));
one(".period-button").addEventListener("click", () => showToast("Showing activity for the current week."));
const accountPopover = one("#account-popover");
const accountButtons = [one(".profile-button"), one(".top-avatar")];
function closeAccountMenu() {
  accountPopover.hidden = true;
  accountButtons.forEach((button) => button.setAttribute("aria-expanded", "false"));
}
accountButtons.forEach((button) => button.addEventListener("click", (event) => {
  event.stopPropagation();
  const shouldOpen = accountPopover.hidden;
  closeNotifications();
  accountPopover.hidden = !shouldOpen;
  accountButtons.forEach((accountButton) => accountButton.setAttribute("aria-expanded", String(shouldOpen)));
}));
accountPopover.addEventListener("click", (event) => event.stopPropagation());
document.addEventListener("click", closeAccountMenu);
all(".row-more").forEach((button) => button.addEventListener("click", () => {
  const name = one("strong", button.closest("tr"))?.textContent || "Teammate";
  showToast(`More teammate details for ${name} coming soon.`);
}));
