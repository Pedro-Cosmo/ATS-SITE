const TOKEN_STORAGE_KEY = "token";
const USER_STORAGE_KEY = "ligaats.devUser";
const DEV_ADMIN_EMAIL = "admin@teste";
const DEV_ADMIN_PASSWORD = "01234567";
const DEV_ADMIN_TOKEN = "dev-admin-token";

const saveAuthSession = () => {
  // TODO: substituir login fake por autenticacao real com Node.js + JWT.
  // Credenciais fixas apenas para desenvolvimento. Isto nao e seguranca real.
  window.localStorage.setItem(TOKEN_STORAGE_KEY, DEV_ADMIN_TOKEN);
  window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify({
    email: DEV_ADMIN_EMAIL,
    perfil: "admin",
    ambiente: "desenvolvimento",
  }));
};

const getAuthToken = () => window.localStorage.getItem(TOKEN_STORAGE_KEY);

const clearAuthSession = () => {
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(USER_STORAGE_KEY);
};

const authFetch = (url, options = {}) => {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(url, {
    ...options,
    headers,
  });
};

window.LigaAuth = {
  getAuthToken,
  clearAuthSession,
  authFetch,
};

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("login-form");
  if (!form) return;

  const status = document.getElementById("login-status");
  const submit = form.querySelector(".login-submit");

  const setStatus = (message, type = "") => {
    if (!status) return;
    status.textContent = message;
    status.classList.toggle("is-error", type === "error");
    status.classList.toggle("is-success", type === "success");
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const email = String(formData.get("email") || "").trim().toLowerCase();
    const password = String(formData.get("password") || "");

    if (!email || !password) {
      setStatus("Informe e-mail e senha.", "error");
      return;
    }

    if (submit) {
      submit.disabled = true;
    }
    setStatus("Entrando...");

    if (email === DEV_ADMIN_EMAIL && password === DEV_ADMIN_PASSWORD) {
      saveAuthSession();
      setStatus("Login realizado.", "success");

      const params = new URLSearchParams(window.location.search);
      window.location.href = params.get("redirect") || "/pages/admin.html";
      return;
    }

    // TODO: chamar endpoint real definido em data-auth-endpoint quando o backend existir.
    setStatus("E-mail ou senha inv\u00e1lidos.", "error");
    if (submit) {
      submit.disabled = false;
    }
  });
});
