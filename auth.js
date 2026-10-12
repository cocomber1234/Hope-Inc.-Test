const mode = new URLSearchParams(window.location.search).get("mode") === "signup" ? "signup" : "login";
const one = (selector, root = document) => root.querySelector(selector);
const authMain = one(".auth-main");
const authForm = one("#auth-form");
const feedback = one("#auth-feedback");
const nameInput = one("#full-name");
const emailInput = one("#email");
const passwordInput = one("#password");
const confirmInput = one("#confirm-password");
const termsInput = one("#terms-row input");
const preloader = one("#auth-preloader");

window.addEventListener("load", async () => {
  try {
    if (document.fonts?.ready) {
      await Promise.race([document.fonts.ready, new Promise((resolve) => setTimeout(resolve, 900))]);
    }
  } catch (error) {
    console.warn("Hope Inc. display fonts could not be loaded.", error);
  }
  setTimeout(() => preloader.classList.add("is-done"), window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 180);
});

function setMode(nextMode) {
  const signingUp = nextMode === "signup";
  authMain.classList.toggle("is-signup", signingUp);
  const heading = one("#auth-heading");
  heading.dataset.mode = nextMode;
  one("#auth-eyebrow").textContent = signingUp ? "A GOOD PLACE TO BEGIN" : "WELCOME BACK";
  heading.textContent = signingUp ? "Let’s get started." : "Good to see you.";
  one("#auth-intro").textContent = signingUp
    ? "Create your Hope Inc. account and bring your team together."
    : "Sign in to pick up right where your team left off.";
  one("#submit-label").textContent = signingUp ? "Create your account" : "Sign in to your workspace";
  one("#login-tab").classList.toggle("is-active", !signingUp);
  one("#signup-tab").classList.toggle("is-active", signingUp);
  one("#login-tab").setAttribute("aria-selected", String(!signingUp));
  one("#signup-tab").setAttribute("aria-selected", String(signingUp));
  one("#top-switch-copy").innerHTML = signingUp
    ? 'Already have an account? <a href="./auth.html?mode=login">Sign in</a>'
    : 'New around here? <a href="./auth.html?mode=signup">Create an account</a>';
  one("#name-field").hidden = !signingUp;
  one("#confirm-field").hidden = !signingUp;
  one("#terms-row").hidden = !signingUp;
  one("#remember-row").hidden = signingUp;
  one("#forgot-link").hidden = signingUp;
  nameInput.required = signingUp;
  confirmInput.required = signingUp;
  termsInput.required = signingUp;
  passwordInput.autocomplete = signingUp ? "new-password" : "current-password";
  feedback.hidden = true;
  feedback.textContent = "";
  clearErrors();
  document.title = `${signingUp ? "Create account" : "Sign in"} — Hope Inc.`;
}

function clearErrors() {
  document.querySelectorAll(".field-group.has-error").forEach((field) => field.classList.remove("has-error"));
  document.querySelectorAll(".field-error").forEach((field) => { field.textContent = ""; });
  termsInput.setCustomValidity("");
}

function setError(input, message, errorElement) {
  const field = input.closest(".field-group");
  if (field) field.classList.add("has-error");
  errorElement.textContent = message;
  if (!input.closest("[hidden]")) input.focus();
}

function showFeedback(message, isError = false) {
  feedback.textContent = message;
  feedback.classList.toggle("is-error", isError);
  feedback.hidden = false;
}

setMode(mode);

document.querySelectorAll(".password-toggle").forEach((button) => {
  button.addEventListener("click", () => {
    const input = button.closest(".input-wrap").querySelector("input");
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    button.setAttribute("aria-label", show ? "Hide password" : "Show password");
    button.setAttribute("aria-pressed", String(show));
  });
});

one("#forgot-link").addEventListener("click", (event) => {
  event.preventDefault();
  if (!emailInput.value.trim()) {
    showFeedback("Enter your work email first. Password recovery isn’t connected in this preview.", true);
    emailInput.focus();
    return;
  }
  if (!emailInput.validity.valid) {
    showFeedback("Enter a valid email address. Password recovery isn’t connected in this preview.", true);
    emailInput.focus();
    return;
  }
  showFeedback("Password recovery isn’t connected in this preview. Your email wasn’t sent or saved.");
});

authForm.addEventListener("submit", (event) => {
  event.preventDefault();
  clearErrors();
  feedback.hidden = true;

  const signingUp = mode === "signup";
  const trimmedName = nameInput.value.trim();
  if (signingUp && trimmedName.length < 2) {
    setError(nameInput, "Please enter a name with at least 2 characters.", one("#name-error"));
    return;
  }
  if (!emailInput.value.trim() || !emailInput.validity.valid) {
    setError(emailInput, "Enter a valid work email address.", one("#email-error"));
    return;
  }
  if (passwordInput.value.length < 8) {
    setError(passwordInput, "Use at least 8 characters for your password.", one("#password-error"));
    return;
  }
  if (signingUp && confirmInput.value !== passwordInput.value) {
    setError(confirmInput, "Those passwords don’t match yet.", one("#confirm-error"));
    return;
  }
  if (signingUp && !termsInput.checked) {
    showFeedback("Please agree to the Terms of Service and Privacy Policy to continue.", true);
    termsInput.focus();
    return;
  }

  showFeedback(
    "This is a UI preview only. Authentication isn’t connected, and your credentials were not sent or saved. You can explore the dashboard instead.",
  );
  const exploreLink = document.createElement("a");
  exploreLink.href = "./index.html";
  exploreLink.textContent = " Open dashboard";
  exploreLink.style.cssText = "display:inline-block;margin-left:4px;color:#467e5d;font-weight:600;text-decoration:underline;text-underline-offset:2px";
  feedback.append(exploreLink);
});

authForm.addEventListener("input", (event) => {
  if (!event.target.matches("input")) return;
  const field = event.target.closest(".field-group");
  if (field?.classList.contains("has-error")) {
    field.classList.remove("has-error");
    const error = one(".field-error", field);
    if (error) error.textContent = "";
  }
  if (event.target === termsInput && termsInput.checked) {
    termsInput.setCustomValidity("");
    if (!feedback.hidden && feedback.classList.contains("is-error")) feedback.hidden = true;
  }
});
