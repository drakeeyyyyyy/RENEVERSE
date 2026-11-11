"use strict";

const DATABASE_NAME = "HopeERP";
const DATABASE_VERSION = 1;
const PASSWORD_ITERATIONS = 210000;

const loginPanel = document.querySelector("#login-panel");
const createPanel = document.querySelector("#create-panel");
const loginForm = document.querySelector("#login-form");
const createForm = document.querySelector("#create-form");
const createName = document.querySelector("#create-name");
const createPassword = document.querySelector("#create-password");
const confirmPassword = document.querySelector("#confirm-password");

function showPanel(panelName, updateLocation) {
  const showCreate = panelName === "create";
  loginPanel.hidden = showCreate;
  createPanel.hidden = !showCreate;
  document.title = showCreate ? "Create account | Hope ERP" : "Sign in | Hope ERP";

  document.querySelector("#login-status").textContent = "";
  document.querySelector("#create-status").textContent = "";

  if (updateLocation) {
    window.history.replaceState(null, "", showCreate ? "#create" : "#login");
  }

  (showCreate ? document.querySelector("#create-name") : document.querySelector("#login-email")).focus();
}

document.querySelectorAll("[data-view]").forEach((button) => {
  button.addEventListener("click", () => showPanel(button.dataset.view, true));
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

function validateName() {
  createName.setCustomValidity(createName.value.trim() ? "" : "Enter your full name.");
}

createName.addEventListener("input", validateName);
createPassword.addEventListener("input", validatePasswordMatch);
confirmPassword.addEventListener("input", validatePasswordMatch);

function openDatabase() {
  if (!("indexedDB" in window)) {
    return Promise.reject(new Error("This browser does not support local account storage."));
  }

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    let settled = false;

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains("users")) {
        const users = database.createObjectStore("users", {
          keyPath: "id",
          autoIncrement: true
        });
        users.createIndex("email", "email", { unique: true });
      }
    };

    request.onsuccess = () => {
      if (settled) {
        request.result.close();
        return;
      }
      settled = true;
      resolve(request.result);
    };
    request.onerror = () => {
      if (settled) return;
      settled = true;
      reject(request.error || new Error("Could not open the account database."));
    };
    request.onblocked = () => {
      if (settled) return;
      settled = true;
      reject(new Error("The account database is busy. Close other Hope ERP tabs and try again."));
    };
  });
}

function readUserByEmail(email) {
  return openDatabase().then((database) => new Promise((resolve, reject) => {
    const transaction = database.transaction("users", "readonly");
    const request = transaction.objectStore("users").index("email").get(email);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error || new Error("Could not read the account database."));
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => {
      database.close();
      reject(transaction.error || new Error("Could not read the account database."));
    };
  }));
}

function addUser(user) {
  return openDatabase().then((database) => new Promise((resolve, reject) => {
    const transaction = database.transaction("users", "readwrite");
    const request = transaction.objectStore("users").add(user);

    request.onerror = () => {
      if (request.error && request.error.name === "ConstraintError") {
        reject(new Error("An account with this email already exists."));
      } else {
        reject(request.error || new Error("Could not save the account."));
      }
    };
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      if (!request.error || request.error.name !== "ConstraintError") {
        reject(transaction.error || new Error("Could not save the account."));
      }
    };
    transaction.onabort = () => {
      database.close();
      if (!request.error || request.error.name !== "ConstraintError") {
        reject(transaction.error || new Error("Could not save the account."));
      }
    };
  }));
}

function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

async function hashPassword(password, salt) {
  if (!window.crypto || !window.crypto.subtle) {
    throw new Error("Secure password hashing is unavailable. Use a modern browser over HTTPS or localhost.");
  }

  const passwordKey = await window.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const hash = await window.crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: PASSWORD_ITERATIONS,
      hash: "SHA-256"
    },
    passwordKey,
    256
  );

  return bytesToHex(new Uint8Array(hash));
}

function setStatus(element, message, isError) {
  element.textContent = message;
  element.classList.toggle("form-status--error", isError);
}

function setSubmitting(form, isSubmitting) {
  const button = form.querySelector('button[type="submit"]');
  button.disabled = isSubmitting;
  button.setAttribute("aria-busy", String(isSubmitting));
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const status = document.querySelector("#login-status");
  const email = loginForm.elements.email.value.trim().toLowerCase();
  const password = loginForm.elements.password.value;

  setSubmitting(loginForm, true);
  setStatus(status, "Signing in…", false);

  try {
    const user = await readUserByEmail(email);
    if (!user || await hashPassword(password, hexToBytes(user.salt)) !== user.passwordHash) {
      throw new Error("The email or password is incorrect.");
    }

    setStatus(status, `Signed in successfully. Welcome, ${user.name}.`, false);
    loginForm.elements.password.value = "";
  } catch (error) {
    setStatus(status, error.message || "Sign-in failed. Please try again.", true);
  } finally {
    setSubmitting(loginForm, false);
  }
});

createForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  validateName();
  validatePasswordMatch();
  if (!createForm.reportValidity()) return;

  const status = document.querySelector("#create-status");
  const name = createName.value.trim();
  const email = createForm.elements.email.value.trim().toLowerCase();
  const password = createPassword.value;

  setSubmitting(createForm, true);
  setStatus(status, "Creating your account…", false);

  try {
    if (!window.crypto || !window.crypto.getRandomValues) {
      throw new Error("Secure password hashing is unavailable. Use a modern browser over HTTPS or localhost.");
    }
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const passwordHash = await hashPassword(password, salt);
    await addUser({
      name,
      email,
      salt: bytesToHex(salt),
      passwordHash,
      createdAt: new Date().toISOString()
    });

    createForm.reset();
    setStatus(status, "Your account was created. You can now sign in.", false);
    window.setTimeout(() => showPanel("login", true), 900);
  } catch (error) {
    setStatus(status, error.message || "Account creation failed. Please try again.", true);
  } finally {
    setSubmitting(createForm, false);
  }
});

showPanel(window.location.hash === "#create" ? "create" : "login", false);
