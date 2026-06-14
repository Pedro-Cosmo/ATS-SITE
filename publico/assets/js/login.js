const TOKEN_STORAGE_KEY = "ligaats.jwt";
const USER_STORAGE_KEY = "ligaats.user";

const getStorage = (remember) => (remember ? window.localStorage : window.sessionStorage);

const saveAuthSession = ({ token, user, remember }) => {
  const storage = getStorage(remember);
  const otherStorage = remember ? window.sessionStorage : window.localStorage;

  otherStorage.removeItem(TOKEN_STORAGE_KEY);
  otherStorage.removeItem(USER_STORAGE_KEY);

  storage.setItem(TOKEN_STORAGE_KEY, token);
  if (user) {
    storage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  }
};

const getAuthToken = () => (
  window.localStorage.getItem(TOKEN_STORAGE_KEY)
  || window.sessionStorage.getItem(TOKEN_STORAGE_KEY)
);

const clearAuthSession = () => {
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(USER_STORAGE_KEY);
  window.sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  window.sessionStorage.removeItem(USER_STORAGE_KEY);
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
  const endpoint = form.dataset.authEndpoint || "/api/auth/login";

  const setStatus = (message, type = "") => {
    if (!status) return;
    status.textContent = message;
    status.classList.toggle("is-error", type === "error");
    status.classList.toggle("is-success", type === "success");
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");
    const remember = formData.get("remember") === "on";

    if (!email || !password) {
      setStatus("Informe email e senha.", "error");
      return;
    }

    if (submit) {
      submit.disabled = true;
    }
    setStatus("Entrando...");

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      let payload = {};
      try {
        payload = await response.json();
      } catch (parseError) {
        payload = {};
      }

      if (!response.ok) {
        if (response.status === 404 || response.status === 405) {
          throw new Error("Servico de autenticacao indisponivel.");
        }

        const message = payload.message || payload.error || "Credenciais invalidas.";
        throw new Error(message);
      }

      const token = payload.token || payload.accessToken || payload.jwt;
      if (!token) {
        throw new Error("Resposta sem token JWT.");
      }

      saveAuthSession({
        token,
        user: payload.user,
        remember,
      });

      setStatus("Login realizado.", "success");

      const params = new URLSearchParams(window.location.search);
      window.location.href = params.get("redirect") || "/index.html";
    } catch (error) {
      const hasBackend = !String(error.message || "").includes("Failed to fetch");
      setStatus(
        hasBackend ? error.message : "Servico de autenticacao indisponivel.",
        "error"
      );
    } finally {
      if (submit) {
        submit.disabled = false;
      }
    }
  });
});
