"use strict";

const loginPanel = document.querySelector("#login-panel");
const createPanel = document.querySelector("#create-panel");
const loginForm = document.querySelector("#login-form");
const createForm = document.querySelector("#create-form");
const createPassword = document.querySelector("#create-password");
const confirmPassword = document.querySelector("#confirm-password");

function showPanel(panelName) {
  const showCreate = panelName === "create";
  loginPanel.hidden = showCreate;
  createPanel.hidden = !showCreate;
  document.title = showCreate ? "Create account | Hope ERP" : "Sign in | Hope ERP";

  document.querySelector("#login-status").textContent = "";
  document.querySelector("#create-status").textContent = "";
  (showCreate ? document.querySelector("#create-name") : document.querySelector("#login-email")).focus();
}

document.querySelectorAll("[data-view]").forEach((button) => {
  button.addEventListener("click", () => showPanel(button.dataset.view));
});

document.querySelectorAll("[data-password-target]").forEach((button) => {
  button.addEventListener("click", () => {
    const input = document.getElementById(button.dataset.passwordTarget);
    const shouldShow = input.type === "password";
    input.type = shouldShow ? "text" : "password";
    button.textContent = shouldShow ? "HIDE" : "SHOW";
    button.setAttribute("aria-label", shouldShow ? "Hide password" : "Show password");
    button.setAttribute("aria-pressed", String(shouldShow));
  });
});

function validatePasswordMatch() {
  confirmPassword.setCustomValidity(
    confirmPassword.value && confirmPassword.value !== createPassword.value
      ? "Passwords do not match."
      : ""
  );
}

createPassword.addEventListener("input", validatePasswordMatch);
confirmPassword.addEventListener("input", validatePasswordMatch);

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  document.querySelector("#login-status").textContent =
    "Your details are valid. Connect an authentication service to enable sign-in.";
});

createForm.addEventListener("submit", (event) => {
  event.preventDefault();
  document.querySelector("#create-status").textContent =
    "Your details are valid. Connect a user service to create this account.";
});
